// ── fetch-recipe.js ─────────────────────────────────────────────────────────
// Netlify server function to bypass CORS, retrieve recipe html, and parse JSON-LD structural graphs

const https = require('https');

exports.handler = async (event, context) => {
  // Guard against non-POST configuration pre-flights
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { url } = JSON.parse(event.body);
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL parameter is required' }),
      };
    }

    // Download the raw HTML content from the recipe source path safely server-side
    const html = await fetchHtmlContent(url);

    // Attempt Server-Side structured extraction to optimize performance load
    const jsonLdData = extractJsonLd(html);
    
    if (jsonLdData) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonLdData)
      };
    }

    // Fallback: Return raw html to client so client-side domestic regex systems can try fallback routines
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html })
    };

  } catch (error) {
    console.error('Server side fetch failure:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to access or parse target recipe address: ' + error.message }),
    };
  }
};

// Standard node runtime https consumer stack wrapper
function fetchHtmlContent(targetUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 7000
    };

    https.get(targetUrl, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect configurations cleanly
        return resolve(fetchHtmlContent(res.headers.location));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Server returned status code: ${res.statusCode}`));
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
}

// Server-side extraction of inline metadata targets without heavy DOM package dependencies like cheerio
function extractJsonLd(html) {
  const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const rawText = match[1].trim();
      const parsed = JSON.parse(rawText);
      const recipeNode = findRecipeNodeInGraph(parsed);
      
      if (recipeNode) {
        return normalizeRecipeObject(recipeNode);
      }
    } catch (e) {
      // Advance execution loops if singular script target contains corrupted array nodes
    }
  }
  return null;
}

function findRecipeNodeInGraph(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj['@type'] === 'Recipe' || (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) return obj;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findRecipeNodeInGraph(item);
      if (found) return found;
    }
  } else {
    if (obj['@graph'] && Array.isArray(obj['@graph'])) {
      return findRecipeNodeInGraph(obj['@graph']);
    }
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        const found = findRecipeNodeInGraph(obj[key]);
        if (found) return found;
      }
    }
  }
  return null;
}

function normalizeRecipeObject(node) {
  const title = node.name ? node.name.replace(/&amp;/g, '&').trim() : 'Untitled Live Recipe';
  
  let servings = 4;
  if (node.recipeYield) {
    const yieldMatch = String(node.recipeYield).match(/\d+/);
    if (yieldMatch) servings = parseInt(yieldMatch[0]);
  }

  // Pure clean structured ingredient arrays straight from schema fields safely
  const ingredients = (node.recipeIngredient || node.ingredients || []).map(ing => {
    return parseIngredientString(String(ing).replace(/\s+/g, ' ').trim());
  }).filter(i => i.name.length > 0);

  let steps = [];
  const rawInstructions = node.recipeInstructions || node.instructions || [];
  
  if (typeof rawInstructions === 'string') {
    steps = rawInstructions.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  } else if (Array.isArray(rawInstructions)) {
    const processSteps = (arr) => {
      arr.forEach(item => {
        if (typeof item === 'string') {
          if (item.trim().length > 0) steps.push(item.trim());
        } else if (item && typeof item === 'object') {
          if (item['@type'] === 'HowToStep' && item.text) {
            steps.push(item.text.trim());
          } else if (item.itemListElement && Array.isArray(item.itemListElement)) {
            processSteps(item.itemListElement);
          } else if (item.text) {
            steps.push(item.text.trim());
          }
        }
      });
    };
    processSteps(rawInstructions);
  }

  const macros = { cal: 0, protein: 0, carbs: 0, fat: 0 };
  if (node.nutrition && typeof node.nutrition === 'object') {
    const n = node.nutrition;
    if (n.calories) macros.cal = parseInt(String(n.calories).replace(/[^\d]/g, '')) || 0;
    if (n.proteinContent) macros.protein = parseInt(String(n.proteinContent).replace(/[^\d]/g, '')) || 0;
    if (n.carbohydrateContent) macros.carbs = parseInt(String(n.carbohydrateContent).replace(/[^\d]/g, '')) || 0;
    if (n.fatContent) macros.fat = parseInt(String(n.fatContent).replace(/[^\d]/g, '')) || 0;
  }

  return { title, servings, ingredients, steps, macros, source: 'schema.org' };
}

function parseIngredientString(text) {
  const UNITS = ['cup','cups','tbsp','tsp','tablespoon','tablespoons','teaspoon','teaspoons',
    'oz','ounce','ounces','lb','lbs','pound','pounds','g','gram','grams','kg','ml','liter','liters',
    'clove','cloves','slice','slices','bunch','can','cans','package','pkg','piece','pieces',
    'handful','pinch','dash','splash','sprig','sprigs'];
  const FRACS = {'½':0.5,'¼':0.25,'¾':0.75,'⅓':0.333,'⅔':0.667,'⅛':0.125,'⅜':0.375,'⅝':0.625,'⅞':0.875};

  let clean = text.replace(/^[-•*·]\s*/, '');
  let amount = '', unit = '';

  const fractionMatch = clean.match(/^([½¼¾⅓⅔⅛⅜⅝⅞])\s*/);
  if (fractionMatch) { 
    amount = String(FRACS[fractionMatch[1]] || 0); 
    clean = clean.slice(fractionMatch[0].length); 
  }
  
  // Cleanly identify pure digit/fraction borders without stripping character strings down inside names like garlic
  const numericMatch = clean.match(/^(\d+(?:[\/\.]\d+)?(?:\s*[½¼¾⅓⅔⅛⅜⅝⅞])?)\s*/);
  if (numericMatch) {
    const valueStr = numericMatch[1];
    if (valueStr.includes('/')) { 
      const parts = valueStr.split('/'); 
      amount = String(parseFloat(parts[0]) / parseFloat(parts[1])); 
    } else {
      amount = String(parseFloat(amount || 0) + parseFloat(valueStr));
    }
    clean = clean.slice(numericMatch[0].length);
  }
  
  // Boundary checks (\b) prevent splitting words containing units inside them (like "g" in "garlic")
  const unitRegex = new RegExp(`^\\b(${UNITS.join('|')})\\b\\.?\\s*`, 'i');
  const unitMatch = clean.match(unitRegex);
  if (unitMatch) { 
    unit = unitMatch[1].toLowerCase(); 
    clean = clean.slice(unitMatch[0].length); 
  }
  
  const name = clean.replace(/,.*$/, '').trim();
  return { amount, unit, name };
}

/**
 * Mise — fetch-recipe Netlify Function
 * 
 * Fetches a recipe URL server-side (bypasses browser CORS),
 * extracts schema.org/Recipe JSON-LD, falls back to HTML heuristics.
 * 
 * POST /.netlify/functions/fetch-recipe
 * Body: { "url": "https://www.allrecipes.com/recipe/..." }
 * Returns: { title, servings, ingredients[], steps[], macros{}, source }
 */

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let url;
  try {
    const body = JSON.parse(event.body || '{}');
    url = body.url;
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!url || !isValidUrl(url)) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid or missing URL' }) };
  }

  // Block non-recipe-ish domains and local network requests
  try {
    const parsed = new URL(url);
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blocked.includes(parsed.hostname)) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid URL' }) };
    }
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid URL' }) };
  }

  try {
    const html = await fetchPage(url);
    const recipe = extractRecipe(html, url);

    if (!recipe.title && !recipe.ingredients.length) {
      return {
        statusCode: 422,
        headers: HEADERS,
        body: JSON.stringify({ error: 'No recipe found on this page. Try copying the text and using Paste instead.' })
      };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify(recipe),
    };

  } catch (err) {
    console.error('fetch-recipe error:', err.message);
    // If the error message is our friendly one, pass it through
    const friendly = err.message.includes('blocks') || err.message.includes('not found') ||
                     err.message.includes('rate-limit') || err.message.includes('returned an error');
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        error: friendly
          ? err.message
          : 'Could not fetch this page. Try copying the recipe text and using Paste instead.'
      })
    };
  }
}

// ─── FETCH ────────────────────────────────────────────────────────────────────

// Rotate through a few realistic UAs — some sites block identical repeated requests
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];

async function fetchPage(url) {
  const ua      = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const headers = {
    'User-Agent':      ua,
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control':   'no-cache',
    'Pragma':          'no-cache',
    'Sec-Fetch-Dest':  'document',
    'Sec-Fetch-Mode':  'navigate',
    'Sec-Fetch-Site':  'none',
    'Upgrade-Insecure-Requests': '1',
  };

  // First attempt
  let res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(10000) });

  // Some sites return 403 on first hit but allow a retry — try once more
  if (res.status === 403 || res.status === 429) {
    await new Promise(r => setTimeout(r, 800));
    res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(10000) });
  }

  if (!res.ok) {
    const friendly = {
      403: 'This site blocks automated access. Copy the recipe text and use Paste instead.',
      404: 'Recipe page not found — check the URL.',
      429: 'This site is rate-limiting requests. Try again in a moment.',
      500: 'The recipe site returned an error. Try Paste instead.',
    };
    throw new Error(friendly[res.status] || `HTTP ${res.status}`);
  }

  return res.text();
}

// ─── EXTRACT ──────────────────────────────────────────────────────────────────

function extractRecipe(html, sourceUrl) {
  // 1. Try schema.org/Recipe JSON-LD first (most reliable)
  const jsonLd = extractJsonLd(html);
  if (jsonLd) return jsonLd;

  // 2. Try Open Graph / meta tags for at least a title
  const metaTitle = extractMetaTitle(html);

  // 3. Fall back to HTML heuristics (same logic as client-side parser)
  const heuristic = extractHeuristic(html);
  if (metaTitle && !heuristic.title) heuristic.title = metaTitle;

  heuristic.source = sourceUrl;
  return heuristic;
}

function extractJsonLd(html) {
  // Find all JSON-LD script blocks
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRe.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1]);

      // Handle @graph arrays (common on WordPress sites)
      if (data['@graph']) data = data['@graph'];
      if (Array.isArray(data)) {
        data = data.find(d => normalizeType(d['@type']) === 'recipe');
      }

      if (!data || normalizeType(data['@type']) !== 'recipe') continue;

      return parseSchemaRecipe(data);
    } catch {
      continue;
    }
  }
  return null;
}

function normalizeType(type) {
  if (!type) return '';
  const t = Array.isArray(type) ? type[0] : type;
  return t.toLowerCase().replace('http://schema.org/', '').replace('https://schema.org/', '');
}

function parseSchemaRecipe(data) {
  const title = stripHtml(data.name || '');

  // Servings
  let servings = 4;
  const yieldRaw = data.recipeYield;
  if (yieldRaw) {
    const yieldStr = Array.isArray(yieldRaw) ? yieldRaw[0] : yieldRaw;
    const yieldNum = parseInt(yieldStr);
    if (!isNaN(yieldNum)) servings = yieldNum;
  }

  // Ingredients
  const ingredients = (data.recipeIngredient || []).map(raw => {
    return parseIngredientString(stripHtml(raw));
  }).filter(i => i.name);

  // Steps
  const steps = [];
  const instructions = data.recipeInstructions || [];
  for (const step of instructions) {
    if (typeof step === 'string') {
      const clean = stripHtml(step).trim();
      if (clean) steps.push(clean);
    } else if (step['@type'] === 'HowToStep') {
      const clean = stripHtml(step.text || step.name || '').trim();
      if (clean) steps.push(clean);
    } else if (step['@type'] === 'HowToSection') {
      // Sections contain nested steps
      for (const s of (step.itemListElement || [])) {
        const clean = stripHtml(s.text || s.name || '').trim();
        if (clean) steps.push(clean);
      }
    }
  }

  // Macros — schema.org uses strings like "420 calories", "38 g"
  const n = data.nutrition || {};
  const macros = {
    cal: parseNutritionVal(n.calories),
    protein: parseNutritionVal(n.proteinContent),
    carbs: parseNutritionVal(n.carbohydrateContent),
    fat: parseNutritionVal(n.fatContent),
  };
  const hasMacros = Object.values(macros).some(v => v > 0);

  // Tags from keywords
  const tags = [];
  if (data.keywords) {
    const kw = typeof data.keywords === 'string'
      ? data.keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 5)
      : (Array.isArray(data.keywords) ? data.keywords.slice(0, 5) : []);
    tags.push(...kw);
  }
  if (data.recipeCategory) {
    const cats = Array.isArray(data.recipeCategory) ? data.recipeCategory : [data.recipeCategory];
    tags.push(...cats.map(c => c.trim()).filter(Boolean));
  }

  return {
    title,
    servings,
    ingredients,
    steps,
    macros: hasMacros ? macros : {},
    tags: [...new Set(tags)].slice(0, 6),
    source: 'schema.org',
  };
}

function parseNutritionVal(raw) {
  if (!raw) return 0;
  const match = String(raw).match(/(\d+(\.\d+)?)/);
  return match ? Math.round(parseFloat(match[1])) : 0;
}

// ─── HEURISTIC FALLBACK ───────────────────────────────────────────────────────

function extractMetaTitle(html) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return stripHtml(og[1]);
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title) return stripHtml(title[1]).replace(/\s*[-|].*$/, '').trim();
  return '';
}

function extractHeuristic(html) {
  // Strip scripts, styles, nav, footer to reduce noise
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Use same heuristics as client-side parser
  const UNIT_WORDS = ['cup','cups','tbsp','tsp','tablespoon','tablespoons','teaspoon','teaspoons',
    'oz','ounce','ounces','lb','lbs','pound','pounds','g','gram','grams','kg','ml',
    'clove','cloves','slice','slices','bunch','can','cans','package','pkg','pinch','dash','sprig'];

  const stepLineIndices = new Set();
  const steps = [];
  const ingredients = [];
  let title = '';
  let inSteps = false;

  // First pass: claim steps
  body.forEach((line, idx) => {
    if (/^(instruction|method|direction|preparation|how to)/i.test(line)) {
      inSteps = true; stepLineIndices.add(idx); return;
    }
    if (looksLikeStep(line)) {
      const clean = line.replace(/^\d+[\.\)\-]\s*/, '').trim();
      if (clean.length > 8) { steps.push(clean); stepLineIndices.add(idx); inSteps = true; }
    } else if (inSteps && line.length > 20 && !looksLikeIngredient(line, UNIT_WORDS)) {
      if (!line.match(/^[-•*·]/)) { steps.push(line); stepLineIndices.add(idx); }
    }
  });

  // Second pass: find title and ingredients
  for (let i = 0; i < Math.min(10, body.length); i++) {
    const l = body[i];
    if (!stepLineIndices.has(i) && !looksLikeIngredient(l, UNIT_WORDS) && l.length > 3 && l.length < 120) {
      title = l; break;
    }
  }

  const FRACS = {'½':0.5,'¼':0.25,'¾':0.75,'⅓':0.333,'⅔':0.667,'⅛':0.125,'⅜':0.375,'⅝':0.625,'⅞':0.875};

  body.forEach((line, idx) => {
    if (stepLineIndices.has(idx)) return;
    if (!looksLikeIngredient(line, UNIT_WORDS)) return;
    ingredients.push(parseIngredientString(line, FRACS, UNIT_WORDS));
  });

  return { title, servings: 4, ingredients: ingredients.filter(i => i.name), steps, macros: {}, tags: [] };
}

function looksLikeIngredient(line, unitWords) {
  if (/^\d+[\.\)]\s+[A-Z]/.test(line)) return false;
  if (/^(add|mix|stir|cook|bake|heat|pour|combine|place|remove|let|bring|reduce|season|drain|chop|dice|slice|preheat|whisk|fold|transfer|serve)\b/i.test(line)) return false;
  const units = unitWords || [];
  const l = line.replace(/^[-•*·]\s*/, '');
  return /^[\d½¼¾⅓⅔⅛⅜⅝⅞]/.test(l) ||
    /^(a |an |one |two |three |four |five |six |eight |ten |twelve )/i.test(l) ||
    new RegExp(`\\b(${units.join('|')})\\b`, 'i').test(l);
}

function looksLikeStep(line) {
  if (/^\d+[\.\)\-]\s+\S/.test(line)) return true;
  if (/^(add|mix|stir|cook|bake|heat|pour|combine|place|remove|let|bring|reduce|season|drain|chop|dice|slice|preheat|whisk|fold|transfer|serve)\b/i.test(line)) return true;
  return false;
}

function parseIngredientString(raw, fracs, unitWords) {
  const FRACS = fracs || {'½':0.5,'¼':0.25,'¾':0.75,'⅓':0.333,'⅔':0.667,'⅛':0.125};
  const UNITS = unitWords || ['cup','cups','tbsp','tsp','tablespoon','teaspoon','oz','lb','gram','g','clove','pinch','can','package'];

  let clean = raw.replace(/^[-•*·]\s*/, '').trim();
  let amount = '';
  let unit = '';

  const fracMatch = clean.match(/^([½¼¾⅓⅔⅛⅜⅝⅞])\s*/);
  if (fracMatch) { amount = String(FRACS[fracMatch[1]] || 0); clean = clean.slice(fracMatch[0].length); }

  const numMatch = clean.match(/^(\d+(?:[\/\.]\d+)?(?:\s*[½¼¾⅓⅔⅛⅜⅝⅞])?)\s*/);
  if (numMatch) {
    const numStr = numMatch[1];
    if (numStr.includes('/')) {
      const parts = numStr.split('/');
      amount = String(parseFloat(amount || 0) + parseFloat(parts[0]) / parseFloat(parts[1]));
    } else {
      amount = String(parseFloat(amount || 0) + parseFloat(numStr));
    }
    clean = clean.slice(numMatch[0].length);
  }

  const unitReg = new RegExp(`^(${UNITS.join('|')})\\.?\\s*`, 'i');
  const unitMatch = clean.match(unitReg);
  if (unitMatch) { unit = unitMatch[1].toLowerCase(); clean = clean.slice(unitMatch[0].length); }

  const name = clean.replace(/,.*$/, '').trim();
  return { amount, unit, name };
}

function stripHtml(str) {
  return String(str)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

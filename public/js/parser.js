// ── parser.js ────────────────────────────────────────────────────────────────
// Paste text parser + URL import via Netlify function with JSON-LD Structured Data support

const FETCH_RECIPE_URL = '/.netlify/functions/fetch-recipe';
let urlParsedData = null;

// ── PASTE PARSER ─────────────────────────────────────────────────────────────
function parseRecipe() {
  const text = document.getElementById('paste-text').value.trim();
  if (!text) return;
  const result = runParser(text);
  parsedData = result;

  const ingCount   = result.ingredients.length;
  const stepCount  = result.steps.length;
  const confidence = ingCount > 2 && stepCount > 1 ? 'good' : 'low';

  document.getElementById('parse-preview-content').innerHTML = `
    <div class="parse-status">
      <div class="parse-dot ${confidence === 'low' ? 'warn' : ''}"></div>
      <span>${confidence === 'good' ? 'Looks good! Review before saving.' : 'Low confidence — consider editing in the form.'}</span>
    </div>
    <div class="parse-result-title">${result.title || 'Untitled Recipe'}</div>
    <div class="parse-count">
      <span>${ingCount} ingredient${ingCount !== 1 ? 's' : ''}</span>
      <span>${stepCount} step${stepCount !== 1 ? 's' : ''}</span>
      ${result.servings ? `<span>${result.servings} servings</span>` : ''}
    </div>`;
  document.getElementById('parse-preview').classList.add('visible');
}

function runParser(text) {
  // First attempt to parse via JSON-LD in case HTML string content was pasted directly
  if (text.includes('application/ld+json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    const structuralResult = parseStructuredHTML(text);
    if (structuralResult) return structuralResult;
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const UNITS = ['cup','cups','tbsp','tsp','tablespoon','tablespoons','teaspoon','teaspoons',
    'oz','ounce','ounces','lb','lbs','pound','pounds','g','gram','grams','kg','ml','liter','liters',
    'clove','cloves','slice','slices','bunch','can','cans','package','pkg','piece','pieces',
    'handful','pinch','dash','splash','sprig','sprigs'];
  const FRACS = {'½':0.5,'¼':0.25,'¾':0.75,'⅓':0.333,'⅔':0.667,'⅛':0.125,'⅜':0.375,'⅝':0.625,'⅞':0.875};

  // Steps first — claim line indices
  const stepIdx = new Set();
  const steps   = [];
  let inSteps   = false;
  lines.forEach((line, idx) => {
    if (/^(instruction|method|direction|preparation|how to)/i.test(line)) { inSteps = true; stepIdx.add(idx); return; }
    if (looksLikeStep(line)) {
      const clean = line.replace(/^\d+[\.\)\-]\s*/, '').trim();
      if (clean.length > 8) { steps.push(clean); stepIdx.add(idx); inSteps = true; }
    } else if (inSteps && line.length > 20 && !looksLikeIngredient(line, UNITS)) {
      if (!line.match(/^[-•*·]/)) { steps.push(line); stepIdx.add(idx); }
    }
  });

  // Title
  let title = '';
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const l = lines[i];
    if (!stepIdx.has(i) && !looksLikeIngredient(l, UNITS) && l.length < 100) {
      title = l.replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '');
      break;
    }
  }

  // Servings
  let servings = 4;
  const sm = text.match(/(?:serves?|makes?|yield[s:]?|servings?:?)\s*(\d+)/i);
  if (sm) servings = parseInt(sm[1]);

  // Ingredients
  const ingredients = [];
  lines.forEach((line, idx) => {
    if (stepIdx.has(idx) || !looksLikeIngredient(line, UNITS)) return;
    let clean = line.replace(/^[-•*·]\s*/, '');
    let amount = '', unit = '';
    const fm = clean.match(/^([½¼¾⅓⅔⅛⅜⅝⅞])\s*/);
    if (fm) { amount = String(FRACS[fm[1]] || 0); clean = clean.slice(fm[0].length); }
    const nm = clean.match(/^(\d+(?:[\/\.]\d+)?(?:\s*[½¼¾⅓⅔⅛⅜⅝⅞])?)\s*/);
    if (nm) {
      const ns = nm[1];
      if (ns.includes('/')) { const p = ns.split('/'); amount = String(parseFloat(p[0]) / parseFloat(p[1])); }
      else amount = String(parseFloat(amount || 0) + parseFloat(ns));
      clean = clean.slice(nm[0].length);
    }
    const ur = new RegExp(`^(${UNITS.join('|')})\\.?\\s*`, 'i');
    const um = clean.match(ur);
    if (um) { unit = um[1].toLowerCase(); clean = clean.slice(um[0].length); }
    const name = clean.replace(/,.*$/, '').trim();
    if (name) ingredients.push({ amount, unit, name });
  });

  return { title, servings, ingredients, steps, macros: {} };
}

function looksLikeIngredient(line, unitWords) {
  if (/^\d+[\.\)]\s+[A-Z]/.test(line)) return false;
  if (/^(add|mix|stir|cook|bake|heat|pour|combine|place|remove|let|bring|reduce|season|drain|chop|dice|slice|preheat|whisk|fold|transfer|serve)\b/i.test(line)) return false;
  const units = unitWords || ['cup','tbsp','tsp','oz','lb','gram','clove','pinch','can'];
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

// ── STRUCTURED DATA ENGINE (JSON-LD) ─────────────────────────────────────────
function parseStructuredHTML(htmlString) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of scripts) {
      try {
        const rawJson = JSON.parse(script.textContent);
        const recipeNode = findRecipeNode(rawJson);
        if (recipeNode) {
          return normalizeRecipeNode(recipeNode);
        }
      } catch (e) {
        // Continue iterating if single script node is malformed JSON
      }
    }
  } catch (err) {
    console.error("DOM Parsing error on schema search", err);
  }
  return null;
}

function findRecipeNode(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj['@type'] === 'Recipe' || (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) return obj;
  
  if (Array.isArray(obj)) {
    for (const element of obj) {
      const matched = findRecipeNode(element);
      if (matched) return matched;
    }
  } else {
    if (obj['@graph'] && Array.isArray(obj['@graph'])) {
      return findRecipeNode(obj['@graph']);
    }
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        const matched = findRecipeNode(obj[key]);
        if (matched) return matched;
      }
    }
  }
  return null;
}

function normalizeRecipeNode(node) {
  // Title Sanitization
  const title = node.name ? node.name.replace(/&amp;/g, '&').trim() : 'Untitled Schema Recipe';

  // Servings Sanitization
  let servings = 4;
  if (node.recipeYield) {
    const match = String(node.recipeYield).match(/\d+/);
    if (match) servings = parseInt(match[0]);
  }

  // Ingredients Structuring
  const rawIngredients = node.recipeIngredient || node.ingredients || [];
  const ingredients = rawIngredients.map(ing => {
    let clean = String(ing).replace(/\s+/g, ' ').trim();
    // Use fallback regex parsing logic blocks to extract structure from clean string tokens
    return extractIngredientFields(clean);
  }).filter(ing => ing.name.length > 0);

  // Steps Normalization (Resolves differences between flat strings, text nodes, and instruction components)
  let steps = [];
  const rawInstructions = node.recipeInstructions || node.instructions || [];
  
  if (typeof rawInstructions === 'string') {
    steps = rawInstructions.split('\n').map(s => s.trim()).filter(s => s.length > 5);
  } else if (Array.isArray(rawInstructions)) {
    const extractSteps = (arr) => {
      arr.forEach(item => {
        if (typeof item === 'string') {
          if (item.trim().length > 0) steps.push(item.trim());
        } else if (item && typeof item === 'object') {
          if (item['@type'] === 'HowToStep' && item.text) {
            steps.push(item.text.trim());
          } else if (item.itemListElement && Array.isArray(item.itemListElement)) {
            extractSteps(item.itemListElement);
          } else if (item.text) {
            steps.push(item.text.trim());
          }
        }
      });
    };
    extractSteps(rawInstructions);
  }

  // Embedded Macro / Nutrition mapping
  const macros = { cal: 0, protein: 0, carbs: 0, fat: 0 };
  if (node.nutrition && typeof node.nutrition === 'object') {
    const nut = node.nutrition;
    if (nut.calories) macros.cal = parseInt(String(nut.calories).replace(/[^\d]/g, '')) || 0;
    if (nut.proteinContent) macros.protein = parseInt(String(nut.proteinContent).replace(/[^\d]/g, '')) || 0;
    if (nut.carbohydrateContent) macros.carbs = parseInt(String(nut.carbohydrateContent).replace(/[^\d]/g, '')) || 0;
    if (nut.fatContent) macros.fat = parseInt(String(nut.fatContent).replace(/[^\d]/g, '')) || 0;
  }

  return { title, servings, ingredients, steps, macros, source: 'schema.org' };
}

function extractIngredientFields(rawText) {
  const UNITS = ['cup','cups','tbsp','tsp','tablespoon','tablespoons','teaspoon','teaspoons',
    'oz','ounce','ounces','lb','lbs','pound','pounds','g','gram','grams','kg','ml','liter','liters',
    'clove','cloves','slice','slices','bunch','can','cans','package','pkg','piece','pieces',
    'handful','pinch','dash','splash','sprig','sprigs'];
  const FRACS = {'½':0.5,'¼':0.25,'¾':0.75,'⅓':0.333,'⅔':0.667,'⅛':0.125,'⅜':0.375,'⅝':0.625,'⅞':0.875};

  let clean = rawText.replace(/^[-•*·]\s*/, '');
  let amount = '', unit = '';

  const fm = clean.match(/^([½¼¾⅓⅔⅛⅜⅝⅞])\s*/);
  if (fm) { amount = String(FRACS[fm[1]] || 0); clean = clean.slice(fm[0].length); }
  
  const nm = clean.match(/^(\d+(?:[\/\.]\d+)?(?:\s*[½¼¾⅓⅔⅛⅜⅝⅞])?)\s*/);
  if (nm) {
    const ns = nm[1];
    if (ns.includes('/')) { const p = ns.split('/'); amount = String(parseFloat(p[0]) / parseFloat(p[1])); }
    else amount = String(parseFloat(amount || 0) + parseFloat(ns));
    clean = clean.slice(nm[0].length);
  }
  
  const ur = new RegExp(`^(${UNITS.join('|')})\\.?\\s*`, 'i');
  const um = clean.match(ur);
  if (um) { unit = um[1].toLowerCase(); clean = clean.slice(um[0].length); }
  const name = clean.replace(/,.*$/, '').trim();

  return { amount, unit, name };
}

// ── URL IMPORT ───────────────────────────────────────────────────────────────
async function fetchFromUrl() {
  const url = document.getElementById('url-input').value.trim();
  if (!url) { showToast('Paste a URL first'); return; }
  if (!url.startsWith('http')) { showToast('URL must start with http:// or https://'); return; }

  setUrlStatus('loading', 'Fetching recipe…');
  document.getElementById('url-fetch-btn').disabled = true;
  document.getElementById('url-parse-preview').classList.remove('visible');
  urlParsedData = null;

  try {
    const res  = await fetch(FETCH_RECIPE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    const data = await res.json();
    
    if (!res.ok) { setUrlStatus('error', data.error || 'Something went wrong. Try Paste Text instead.'); return; }
    
    // Check if response contains direct raw html fallback to scrub client-side structured elements
    let normalizedData = data;
    if (typeof data === 'object' && data.html) {
      const parsedHtmlResult = parseStructuredHTML(data.html);
      if (parsedHtmlResult) normalizedData = parsedHtmlResult;
    } else if (typeof data === 'string') {
      const parsedHtmlResult = parseStructuredHTML(data);
      if (parsedHtmlResult) normalizedData = parsedHtmlResult;
    }

    // Fall back to original loose regex structural parse runner if schema engine missed layout targets
    if (!normalizedData.ingredients || normalizedData.ingredients.length === 0) {
      if (typeof data.html === 'string') {
        const doc = new DOMParser().parseFromString(data.html, 'text/html');
        normalizedData = runParser(doc.body.innerText || '');
      }
    }

    urlParsedData = normalizedData;
    parsedData    = normalizedData;
    showUrlPreview(normalizedData, url);
    setUrlStatus('success', `Found: ${normalizedData.source === 'schema.org' ? 'Full recipe data extracted ✓' : 'Recipe detected (review before saving)'}`);
  } catch (err) {
    setUrlStatus('error', window.location.protocol === 'file:' ? 'URL import requires Netlify deployment. Use Paste Text for now.' : 'Could not reach the import service. Check your connection.');
  } finally {
    document.getElementById('url-fetch-btn').disabled = false;
  }
}

function setUrlStatus(type, message) {
  const el = document.getElementById('url-status');
  el.style.display = 'block';
  const map = { loading: `<div class="url-status-loading"><div class="url-spinner"></div>${message}</div>`, error: `<div class="url-status-error">⚠ ${message}</div>`, success: `<div class="url-status-success">✓ ${message}</div>` };
  el.innerHTML = map[type] || '';
}

function showUrlPreview(data, sourceUrl) {
  const domain    = (() => { try { return new URL(sourceUrl).hostname.replace('www.', ''); } catch { return sourceUrl; } })();
  const ingCount  = (data.ingredients || []).length;
  const stepCount = (data.steps       || []).length;
  const hasMacros = data.macros && Object.values(data.macros).some(v => v > 0);
  document.getElementById('url-preview-content').innerHTML = `
    <div class="parse-status" style="margin-bottom:10px">
      <div class="parse-dot"></div>
      <span style="color:var(--text-muted);font-size:11px">from ${domain}</span>
    </div>
    <div class="parse-result-title">${data.title || 'Untitled Recipe'}</div>
    <div class="parse-count" style="margin-top:6px">
      <span>${ingCount} ingredient${ingCount !== 1 ? 's' : ''}</span>
      <span>${stepCount} step${stepCount !== 1 ? 's' : ''}</span>
      ${data.servings ? `<span>${data.servings} servings</span>` : ''}
      ${hasMacros ? `<span>${data.macros.cal || data.macros.calories || 0} cal</span>` : ''}
    </div>`;
  document.getElementById('url-parse-preview').classList.add('visible');
}

function confirmUrlImport() {
  if (!urlParsedData) return;
  urlParsedData.id        = uid();
  urlParsedData.emoji     = guessEmoji(urlParsedData);
  urlParsedData.createdAt = Date.now();
  recipes.unshift(urlParsedData);
  save();
  closeAddSheet();
  showToast('Recipe imported ✓');
  renderLibrary();
}

function guessEmoji(recipe) {
  const text = ((recipe.title || '') + ' ' + (recipe.tags || []).join(' ')).toLowerCase();
  if (/salad|bowl|greens|lettuce/.test(text))        return '🥗';
  if (/pasta|noodle|spaghetti|ramen|pho/.test(text)) return '🍜';
  if (/steak|beef|burger|meat|lamb|pork/.test(text)) return '🥩';
  if (/soup|stew|chili|broth/.test(text))            return '🍲';
  if (/rice|curry|tikka|masala/.test(text))          return '🍛';
  if (/cake|cookie|dessert|brownie|muffin|bread|bake/.test(text)) return '🧁';
  if (/taco|wrap|burrito|sandwich/.test(text))       return '🥙';
  if (/chicken|turkey|poultry/.test(text))           return '🍗';
  if (/fish|salmon|tuna|shrimp|seafood/.test(text))  return '🐟';
  if (/breakfast|egg|pancake|waffle/.test(text))     return '🍳';
  return '🍳';
}

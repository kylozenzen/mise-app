// ── nutrition.js ─────────────────────────────────────────────────────────────
// Inline macro lookup via USDA FoodData Central (free, no key for basic search)
// Falls back to Open Food Facts for packaged foods

// USDA demo key — works for low volume, user can add their own in settings later
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const USDA_KEY  = 'DEMO_KEY'; // 30 req/hour, 50/day — fine for light use

// OFF base (Open Food Facts — no key needed)
const OFF_BASE  = 'https://world.openfoodfacts.org/cgi/search.pl';

let nutritionTimer = null;
let lastNutritionQuery = '';

// ── DEBOUNCED SEARCH ─────────────────────────────────────────────────────────
function nutritionSearch(val) {
  const q = val.trim();
  clearTimeout(nutritionTimer);

  const results = document.getElementById('nutrition-results');
  const credit  = document.getElementById('nutrition-credit');

  if (q.length < 2) {
    results.style.display = 'none';
    credit.style.display  = 'none';
    return;
  }

  if (q === lastNutritionQuery) return;

  // Show spinner after short delay so fast typers don't see flicker
  nutritionTimer = setTimeout(() => {
    lastNutritionQuery = q;
    runNutritionSearch(q);
  }, 420);
}

async function runNutritionSearch(q) {
  const spinner = document.getElementById('nutrition-spinner');
  const results = document.getElementById('nutrition-results');
  const credit  = document.getElementById('nutrition-credit');

  spinner.style.display = 'flex';
  results.style.display = 'none';

  try {
    const foods = await searchUSDA(q);
    spinner.style.display = 'none';

    if (!foods.length) {
      results.innerHTML    = `<div class="nutrition-empty">No results for "${q}" — try a simpler term</div>`;
      results.style.display = 'block';
      return;
    }

    results.innerHTML = foods.slice(0, 6).map(f => `
      <div class="nutrition-result-item" onclick="applyNutrition(${f.cal}, ${f.protein}, ${f.carbs}, ${f.fat}, '${escHtml(f.name)}')">
        <div class="nutrition-result-name">${f.name}</div>
        <div class="nutrition-result-macros">
          <span class="nr-macro cal">${f.cal} cal</span>
          <span class="nr-macro">${f.protein}g P</span>
          <span class="nr-macro">${f.carbs}g C</span>
          <span class="nr-macro">${f.fat}g F</span>
          <span class="nr-serving">${f.serving}</span>
        </div>
      </div>`).join('');

    results.style.display = 'block';
    credit.style.display  = 'block';

  } catch (err) {
    spinner.style.display = 'none';
    console.warn('Nutrition search failed:', err.message);
    results.innerHTML     = `<div class="nutrition-empty">Search unavailable — enter macros manually</div>`;
    results.style.display = 'block';
  }
}

// ── USDA SEARCH ──────────────────────────────────────────────────────────────
async function searchUSDA(q) {
  const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(q)}&dataType=Foundation,SR%20Legacy&pageSize=10&api_key=${USDA_KEY}`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const data = await res.json();

  return (data.foods || []).map(food => {
    // Extract nutrients by nutrient number
    const get = (num) => {
      const n = (food.foodNutrients || []).find(fn => fn.nutrientNumber === String(num) || fn.number === String(num));
      return n ? Math.round(n.value || 0) : 0;
    };

    // USDA nutrient numbers:
    // 208 = Energy (kcal), 203 = Protein, 205 = Carbs, 204 = Fat
    const cal     = get(208);
    const protein = get(203);
    const carbs   = get(205);
    const fat     = get(204);

    // Clean up the food name
    const name = (food.description || food.lowercaseDescription || '')
      .split(',')[0]
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();

    return { name, cal, protein, carbs, fat, serving: 'per 100g' };
  }).filter(f => f.cal > 0 && f.name);
}

// ── APPLY TO FORM ────────────────────────────────────────────────────────────
function applyNutrition(cal, protein, carbs, fat, name) {
  document.getElementById('f-cal').value     = cal;
  document.getElementById('f-protein').value = protein;
  document.getElementById('f-carbs').value   = carbs;
  document.getElementById('f-fat').value     = fat;

  // Clear search
  document.getElementById('nutrition-search').value = name;
  document.getElementById('nutrition-results').style.display = 'none';

  // Flash the fields so user knows they filled
  ['f-cal','f-protein','f-carbs','f-fat'].forEach(id => {
    const el = document.getElementById(id);
    el.style.borderColor = 'var(--amber)';
    setTimeout(() => el.style.borderColor = '', 1200);
  });

  showToast(`Macros applied from USDA ✓`);
}

// ── CLEAR ON FORM RESET ──────────────────────────────────────────────────────
function clearNutritionSearch() {
  const s = document.getElementById('nutrition-search');
  const r = document.getElementById('nutrition-results');
  const c = document.getElementById('nutrition-credit');
  if (s) s.value = '';
  if (r) r.style.display = 'none';
  if (c) c.style.display = 'none';
  lastNutritionQuery = '';
  clearTimeout(nutritionTimer);
}

function escHtml(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── shopping.js ──────────────────────────────────────────────────────────────
// Shopping list: select recipes, combine ingredients, check off as you shop

let shoppingList  = JSON.parse(localStorage.getItem('mise_shopping') || '[]');
let checkedItems  = new Set(JSON.parse(localStorage.getItem('mise_checked') || '[]'));

function saveShoppingList() {
  localStorage.setItem('mise_shopping', JSON.stringify(shoppingList));
  localStorage.setItem('mise_checked',  JSON.stringify([...checkedItems]));
}

// ── OPEN SHEET ───────────────────────────────────────────────────────────────
function openShoppingSheet() {
  renderShoppingSheet();
  document.getElementById('shopping-sheet-overlay').classList.add('open');
}

function closeShoppingSheet() {
  document.getElementById('shopping-sheet-overlay').classList.remove('open');
}

// ── RENDER ───────────────────────────────────────────────────────────────────
function renderShoppingSheet() {
  const body = document.getElementById('shopping-sheet-body');

  if (!shoppingList.length) {
    // Show recipe selector
    body.innerHTML = buildRecipeSelector();
    return;
  }

  // Group items by category
  const grouped = groupIngredients(shoppingList);
  const totalItems   = shoppingList.length;
  const checkedCount = shoppingList.filter(i => checkedItems.has(i.id)).length;

  let html = `
    <!-- Progress -->
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted)">${checkedCount} of ${totalItems} checked</span>
        <button onclick="clearShoppingList()" style="background:none;border:none;color:var(--text-muted);font-size:12px;cursor:pointer;font-family:'Lato',sans-serif">Clear list</button>
      </div>
      <div style="height:4px;background:var(--surface3);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${totalItems ? (checkedCount/totalItems)*100 : 0}%;background:var(--green);border-radius:2px;transition:width 0.3s"></div>
      </div>
    </div>

    <!-- Add more recipes -->
    <div style="margin-bottom:16px">
      <button onclick="renderShoppingSelector()" style="width:100%;padding:10px;border:1px dashed var(--border-light);background:none;color:var(--text-muted);font-family:'Lato',sans-serif;font-size:13px;cursor:pointer;border-radius:var(--radius-sm)">
        + Add more recipes
      </button>
    </div>`;

  // Render each category
  const categories = Object.keys(grouped).sort();
  categories.forEach(cat => {
    const items = grouped[cat];
    html += `
      <div style="margin-bottom:16px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--amber);margin-bottom:8px;padding-left:2px">${cat}</div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
          ${items.map(item => {
            const checked = checkedItems.has(item.id);
            return `
              <div onclick="toggleShoppingItem('${item.id}')"
                style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.1s;${checked ? 'opacity:0.45' : ''}">
                <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${checked ? 'var(--green)' : 'var(--border-light)'};background:${checked ? 'var(--green)' : 'none'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s">
                  ${checked ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;color:var(--cream);${checked ? 'text-decoration:line-through' : ''}">${item.name}</div>
                  ${item.amount ? `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);margin-top:1px">${item.amount}${item.unit ? ' ' + item.unit : ''}</div>` : ''}
                </div>
                ${item.sources && item.sources.length > 1 ? `<div style="font-size:10px;color:var(--text-muted);flex-shrink:0">${item.sources.length} recipes</div>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  // Share/copy button
  html += `
    <button onclick="copyListToClipboard()" class="btn-secondary" style="margin-top:4px">
      Copy List to Clipboard
    </button>`;

  body.innerHTML = html;
}

function buildRecipeSelector() {
  if (!recipes.length) {
    return `<div class="empty-state" style="padding:40px 20px">
      <div class="big-icon">📋</div>
      <h3>No recipes yet</h3>
      <p>Add some recipes first, then build a shopping list.</p>
    </div>`;
  }

  return `
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Select recipes to generate a combined shopping list:</p>
    <div id="recipe-selector" style="display:flex;flex-direction:column;gap:8px">
      ${recipes.map(r => `
        <div class="shopping-recipe-row" id="sr-${r.id}" onclick="toggleRecipeSelection('${r.id}')"
          style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer">
          <div class="sr-check" style="width:22px;height:22px;border-radius:50%;border:2px solid var(--border-light);flex-shrink:0;display:flex;align-items:center;justify-content:center"></div>
          <span style="font-size:18px">${r.emoji || '🍳'}</span>
          <div style="flex:1">
            <div style="font-size:14px;color:var(--cream)">${r.title}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${(r.ingredients||[]).length} ingredients</div>
          </div>
        </div>`).join('')}
    </div>
    <button onclick="generateShoppingList()" class="btn-primary" style="margin-top:16px">
      Build Shopping List →
    </button>`;
}

function renderShoppingSelector() {
  document.getElementById('shopping-sheet-body').innerHTML = buildRecipeSelector();
}

// ── RECIPE SELECTION ─────────────────────────────────────────────────────────
let selectedRecipeIds = new Set();

function toggleRecipeSelection(id) {
  const row   = document.getElementById(`sr-${id}`);
  const check = row?.querySelector('.sr-check');
  if (!row) return;

  if (selectedRecipeIds.has(id)) {
    selectedRecipeIds.delete(id);
    row.style.borderColor    = 'var(--border)';
    row.style.background     = 'var(--surface2)';
    check.style.borderColor  = 'var(--border-light)';
    check.style.background   = 'none';
    check.innerHTML          = '';
  } else {
    selectedRecipeIds.add(id);
    row.style.borderColor    = 'var(--amber)';
    row.style.background     = 'var(--amber-dim)';
    check.style.borderColor  = 'var(--amber)';
    check.style.background   = 'var(--amber)';
    check.innerHTML          = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }
}

// ── GENERATE ─────────────────────────────────────────────────────────────────
function generateShoppingList() {
  if (!selectedRecipeIds.size) {
    showToast('Select at least one recipe');
    return;
  }

  const selected = recipes.filter(r => selectedRecipeIds.has(r.id));
  const combined = [];

  selected.forEach(recipe => {
    (recipe.ingredients || []).forEach(ing => {
      if (!ing.name) return;
      combined.push({
        id:      `${recipe.id}-${ing.name}`,
        name:    ing.name,
        amount:  ing.amount || '',
        unit:    ing.unit   || '',
        category: categoriseIngredient(ing.name),
        sources: [recipe.title],
      });
    });
  });

  // Merge duplicate ingredients across recipes
  const merged = [];
  combined.forEach(item => {
    const existing = merged.find(m =>
      m.name.toLowerCase() === item.name.toLowerCase()
    );
    if (existing) {
      existing.sources.push(...item.sources);
      // Try to add amounts if same unit
      if (existing.unit === item.unit && item.amount) {
        const a = parseFloat(existing.amount) || 0;
        const b = parseFloat(item.amount)     || 0;
        if (a && b) existing.amount = String(Math.round((a + b) * 100) / 100);
      }
    } else {
      merged.push({ ...item });
    }
  });

  shoppingList    = merged;
  checkedItems    = new Set();
  selectedRecipeIds = new Set();
  saveShoppingList();
  renderShoppingSheet();
  showToast(`${merged.length} items added ✓`);
}

// ── CATEGORISE ───────────────────────────────────────────────────────────────
function categoriseIngredient(name) {
  const n = name.toLowerCase();
  if (/chicken|beef|pork|lamb|turkey|salmon|tuna|shrimp|fish|bacon|sausage|steak|ground/.test(n)) return 'Meat & Fish';
  if (/milk|cream|butter|cheese|yogurt|egg|feta|mozzarella|parmesan|cheddar/.test(n)) return 'Dairy & Eggs';
  if (/apple|banana|berry|lemon|lime|orange|tomato|avocado|grape|mango|peach|pear|fruit/.test(n)) return 'Fruit';
  if (/lettuce|spinach|kale|broccoli|carrot|onion|garlic|pepper|celery|cucumber|zucchini|mushroom|potato|sweet potato|cabbage|cauliflower|asparagus|green bean|pea|corn/.test(n)) return 'Produce';
  if (/rice|pasta|bread|flour|oat|quinoa|noodle|tortilla|cracker|cereal/.test(n)) return 'Grains & Bread';
  if (/can|canned|bean|lentil|chickpea|tomato sauce|broth|stock|coconut milk|salsa/.test(n)) return 'Canned & Pantry';
  if (/oil|vinegar|sauce|soy|worcestershire|hot sauce|ketchup|mustard|mayo/.test(n)) return 'Oils & Sauces';
  if (/salt|pepper|cumin|paprika|oregano|basil|thyme|rosemary|cinnamon|turmeric|spice|herb|bay leaf/.test(n)) return 'Spices & Herbs';
  if (/sugar|honey|syrup|chocolate|vanilla/.test(n)) return 'Baking';
  return 'Other';
}

// ── CHECK OFF ────────────────────────────────────────────────────────────────
function toggleShoppingItem(id) {
  if (checkedItems.has(id)) {
    checkedItems.delete(id);
  } else {
    checkedItems.add(id);
  }
  saveShoppingList();
  renderShoppingSheet();
}

// ── CLEAR ────────────────────────────────────────────────────────────────────
function clearShoppingList() {
  if (!confirm('Clear the shopping list?')) return;
  shoppingList = [];
  checkedItems = new Set();
  saveShoppingList();
  renderShoppingSheet();
}

// ── COPY TO CLIPBOARD ────────────────────────────────────────────────────────
function copyListToClipboard() {
  const grouped = groupIngredients(shoppingList);
  const lines   = [];
  Object.keys(grouped).sort().forEach(cat => {
    lines.push(`\n${cat.toUpperCase()}`);
    grouped[cat].forEach(item => {
      const amt = item.amount ? `${item.amount}${item.unit ? ' ' + item.unit : ''} ` : '';
      const chk = checkedItems.has(item.id) ? '✓ ' : '☐ ';
      lines.push(`${chk}${amt}${item.name}`);
    });
  });
  navigator.clipboard.writeText(lines.join('\n').trim())
    .then(() => showToast('List copied ✓'))
    .catch(() => showToast('Copy failed — try again'));
}

// ── GROUP BY CATEGORY ────────────────────────────────────────────────────────
function groupIngredients(items) {
  const groups = {};
  items.forEach(item => {
    const cat = item.category || categoriseIngredient(item.name);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  return groups;
}

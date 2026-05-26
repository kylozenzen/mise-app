// ── detail.js ────────────────────────────────────────────────────────────────
// Recipe detail view, serving scaler, delete

let currentRecipeId = null;
let currentServings = 1;
let baseServings    = 1;

function openDetail(id) {
  const r = recipes.find(x => x.id === id);
  if (!r) return;
  currentRecipeId = id;
  currentServings = r.servings || 1;
  baseServings    = r.servings || 1;
  renderDetail(r, currentServings);
  switchView('detail');
  document.getElementById('detail-edit-btn').onclick = () => openEditSheet(id);
}

function renderDetail(r, servings) {
  const scale     = servings / (r.servings || 1);
  const hasMacros = r.macros && (r.macros.cal || r.macros.protein);

  const macroHTML = hasMacros ? `
    <div class="detail-section">
      <div class="section-label">Macros · per serving</div>
      <div class="macros-strip">
        ${macroPill('Calories', Math.round((r.macros.cal     || 0) * scale))}
        ${macroPill('Protein',  Math.round((r.macros.protein || 0) * scale) + 'g')}
        ${macroPill('Carbs',    Math.round((r.macros.carbs   || 0) * scale) + 'g')}
        ${macroPill('Fat',      Math.round((r.macros.fat     || 0) * scale) + 'g')}
      </div>
    </div>` : '';

  const tagsHTML = (r.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

  const ingsHTML = (r.ingredients || []).map(ing => {
    const amt = scaleAmount(ing.amount, scale);
    return `
      <div class="ingredient-list-item">
        <span class="ing-amount">${amt} ${ing.unit || ''}</span>
        <span class="ing-name">${ing.name}</span>
      </div>`;
  }).join('');

  const stepsHTML = (r.steps || []).map((s, i) => `
    <div class="step-item">
      <div class="step-item-num">${i + 1}</div>
      <div class="step-item-text">${s}</div>
    </div>`).join('');

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-hero">
      <div class="detail-emoji">${r.emoji || '🍳'}</div>
      <div class="detail-title">${r.title}</div>
      ${tagsHTML ? `<div class="detail-tags">${tagsHTML}</div>` : ''}
      <div class="servings-control">
        <span class="servings-label">Servings</span>
        <button class="servings-btn" onclick="changeServings(-1)">−</button>
        <span class="servings-val" id="servings-val">${servings}</span>
        <button class="servings-btn" onclick="changeServings(1)">+</button>
      </div>
    </div>
    ${macroHTML}
    ${ingsHTML ? `<div class="detail-section"><div class="section-label">Ingredients</div>${ingsHTML}</div>` : ''}
    ${stepsHTML ? `<div class="detail-section"><div class="section-label">Method</div>${stepsHTML}</div>` : ''}
    <div class="detail-actions">
      <button class="action-btn" onclick="openEditSheet('${r.id}')">Edit</button>
      <button class="add-to-plan-btn" onclick="openATPSheet('${r.id}')">+ Add to Plan</button>
      <button class="action-btn danger" onclick="deleteRecipe('${r.id}')">Delete</button>
    </div>
  `;
}

function macroPill(label, val) {
  return `<div class="macro-pill">
    <span class="macro-pill-val">${val}</span>
    <span class="macro-pill-label">${label}</span>
  </div>`;
}

function scaleAmount(amount, scale) {
  if (!amount) return '';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  const scaled = num * scale;
  if (scaled <= 0) return '0';
  if (scaled < 1) {
    const fracs = [[1/8,'⅛'],[1/4,'¼'],[1/3,'⅓'],[3/8,'⅜'],[1/2,'½'],[2/3,'⅔'],[3/4,'¾']];
    for (const [v, s] of fracs) {
      if (Math.abs(scaled - v) < 0.05) return s;
    }
  }
  return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
}

function changeServings(delta) {
  const r = recipes.find(x => x.id === currentRecipeId);
  if (!r) return;
  currentServings = Math.max(1, currentServings + delta);
  renderDetail(r, currentServings);
}

function deleteRecipe(id) {
  if (!confirm('Delete this recipe?')) return;
  recipes = recipes.filter(r => r.id !== id);
  save();
  goBack();
  showToast('Recipe deleted');
}

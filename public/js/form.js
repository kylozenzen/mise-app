// ── form.js ──────────────────────────────────────────────────────────────────
// Add / edit recipe sheet: form, ingredient rows, steps, tags, emoji

let formTags     = [];
let selectedEmoji = '🍳';
let parsedData   = null;
let editingId    = null;

// ── SHEET OPEN / CLOSE ───────────────────────────────────────────────────────
function openAddSheet() {
  document.getElementById('sheet-main-title').textContent = 'Add Recipe';
  editingId = null;
  resetForm();
  document.getElementById('add-sheet-overlay').classList.add('open');
}

function closeAddSheet() {
  document.getElementById('add-sheet-overlay').classList.remove('open');
  resetForm();
}

function resetForm() {
  document.getElementById('paste-text').value = '';
  document.getElementById('parse-preview').classList.remove('visible');
  document.getElementById('url-input').value = '';
  document.getElementById('url-status').style.display = 'none';
  document.getElementById('url-parse-preview').classList.remove('visible');
  urlParsedData = null;
  document.getElementById('f-title').value    = '';
  document.getElementById('f-servings').value = '';
  document.getElementById('ingredient-rows').innerHTML = '';
  document.getElementById('step-rows').innerHTML       = '';
  formTags = [];
  renderTagChips();
  document.getElementById('macros-toggle').checked = false;
  toggleMacros(false);
  document.getElementById('f-cal').value     = '';
  document.getElementById('f-protein').value = '';
  document.getElementById('f-carbs').value   = '';
  document.getElementById('f-fat').value     = '';
  clearNutritionSearch();
  selectedEmoji = '🍳';
  document.querySelectorAll('.emoji-opt').forEach((e, i) => e.classList.toggle('selected', i === 0));
  parsedData = null;
  switchMethod('paste', true);
}

// ── METHOD TABS ──────────────────────────────────────────────────────────────
function switchMethod(method, silent = false) {
  document.getElementById('method-paste').style.display = method === 'paste' ? 'block' : 'none';
  document.getElementById('method-url').style.display   = method === 'url'   ? 'block' : 'none';
  document.getElementById('method-form').style.display  = method === 'form'  ? 'block' : 'none';
  document.querySelectorAll('.method-tab').forEach((t, i) => {
    t.classList.toggle('active',
      (i === 0 && method === 'paste') ||
      (i === 1 && method === 'url')   ||
      (i === 2 && method === 'form')
    );
  });
  if (method === 'form' && parsedData && !silent) {
    document.getElementById('f-title').value    = parsedData.title    || '';
    document.getElementById('f-servings').value = parsedData.servings || 4;
    if (parsedData.tags && parsedData.tags.length) {
      formTags = [...parsedData.tags];
      renderTagChips();
    }
    document.getElementById('ingredient-rows').innerHTML = '';
    (parsedData.ingredients || []).forEach(i => addIngredientRow(i));
    document.getElementById('step-rows').innerHTML = '';
    (parsedData.steps || []).forEach(s => addStepRow(s));
    if (parsedData.macros && Object.values(parsedData.macros).some(v => v > 0)) {
      document.getElementById('macros-toggle').checked = true;
      toggleMacros(true);
      document.getElementById('f-cal').value     = parsedData.macros.cal     || '';
      document.getElementById('f-protein').value = parsedData.macros.protein || '';
      document.getElementById('f-carbs').value   = parsedData.macros.carbs   || '';
      document.getElementById('f-fat').value     = parsedData.macros.fat     || '';
    }
  }
}

// ── INGREDIENT ROWS ──────────────────────────────────────────────────────────
function addIngredientRow(val = {}) {
  const rows = document.getElementById('ingredient-rows');
  const div  = document.createElement('div');
  div.className = 'ingredient-row';
  div.innerHTML = `
    <input type="text" placeholder="Amt"        value="${val.amount || ''}">
    <input type="text" placeholder="Unit"       value="${val.unit   || ''}">
    <input type="text" placeholder="Ingredient" value="${val.name   || ''}">
    <button class="remove-btn" onclick="this.parentElement.remove()">×</button>`;
  rows.appendChild(div);
}

// ── STEPS ────────────────────────────────────────────────────────────────────
function addStepRow(val = '') {
  const rows  = document.getElementById('step-rows');
  const count = rows.children.length + 1;
  const div   = document.createElement('div');
  div.className = 'step-row';
  div.innerHTML = `
    <div class="step-num">${count}</div>
    <textarea placeholder="Step ${count}…" rows="2">${val}</textarea>
    <button class="remove-btn" onclick="this.parentElement.remove(); renumberSteps()">×</button>`;
  rows.appendChild(div);
}

function renumberSteps() {
  document.querySelectorAll('#step-rows .step-num').forEach((n, i) => n.textContent = i + 1);
}

// ── TAGS ─────────────────────────────────────────────────────────────────────
function handleTagInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/,/g, '');
    if (val && !formTags.includes(val)) {
      formTags.push(val);
      renderTagChips();
    }
    e.target.value = '';
  }
}

function renderTagChips() {
  const wrap  = document.getElementById('tags-wrap');
  const input = document.getElementById('tag-input');
  wrap.innerHTML = '';
  formTags.forEach((t, i) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${t}<button onclick="removeTag(${i})">×</button>`;
    wrap.appendChild(chip);
  });
  wrap.appendChild(input);
}

function removeTag(i) {
  formTags.splice(i, 1);
  renderTagChips();
}

// ── EMOJI ────────────────────────────────────────────────────────────────────
function selectEmoji(el) {
  document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedEmoji = el.dataset.emoji;
}

// ── MACROS TOGGLE ────────────────────────────────────────────────────────────
function toggleMacros(on) {
  document.getElementById('macros-section').style.display = on ? 'block' : 'none';
}

// ── SAVE ─────────────────────────────────────────────────────────────────────
function saveFormRecipe() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { showToast('Add a title first'); return; }

  const ingredients = [...document.querySelectorAll('#ingredient-rows .ingredient-row')].map(row => {
    const inputs = row.querySelectorAll('input');
    return { amount: inputs[0].value.trim(), unit: inputs[1].value.trim(), name: inputs[2].value.trim() };
  }).filter(i => i.name);

  const steps = [...document.querySelectorAll('#step-rows textarea')].map(t => t.value.trim()).filter(Boolean);

  const hasMacros = document.getElementById('macros-toggle').checked;
  const macros = hasMacros ? {
    cal:     parseInt(document.getElementById('f-cal').value)     || 0,
    protein: parseInt(document.getElementById('f-protein').value) || 0,
    carbs:   parseInt(document.getElementById('f-carbs').value)   || 0,
    fat:     parseInt(document.getElementById('f-fat').value)     || 0,
  } : {};

  const recipe = {
    id:        editingId || uid(),
    emoji:     selectedEmoji,
    title,
    servings:  parseInt(document.getElementById('f-servings').value) || 4,
    tags:      [...formTags],
    ingredients,
    steps,
    macros,
    createdAt: Date.now(),
  };

  if (editingId) {
    const idx = recipes.findIndex(r => r.id === editingId);
    if (idx > -1) recipes[idx] = recipe;
    editingId = null;
  } else {
    recipes.unshift(recipe);
  }

  save();
  closeAddSheet();
  showToast('Recipe saved ✓');
  renderLibrary();
}

// ── EDIT ─────────────────────────────────────────────────────────────────────
function openEditSheet(id) {
  const r = recipes.find(x => x.id === id);
  if (!r) return;
  editingId = id;
  openAddSheet();
  switchMethod('form');
  document.getElementById('sheet-main-title').textContent = 'Edit Recipe';

  document.getElementById('f-title').value    = r.title    || '';
  document.getElementById('f-servings').value = r.servings || 4;
  formTags = [...(r.tags || [])];
  renderTagChips();
  selectedEmoji = r.emoji || '🍳';
  document.querySelectorAll('.emoji-opt').forEach(e => e.classList.toggle('selected', e.dataset.emoji === selectedEmoji));

  document.getElementById('ingredient-rows').innerHTML = '';
  (r.ingredients || []).forEach(i => addIngredientRow(i));
  document.getElementById('step-rows').innerHTML = '';
  (r.steps || []).forEach(s => addStepRow(s));

  const hasMacros = r.macros && Object.values(r.macros).some(v => v > 0);
  document.getElementById('macros-toggle').checked = hasMacros;
  toggleMacros(hasMacros);
  if (hasMacros) {
    document.getElementById('f-cal').value     = r.macros.cal     || '';
    document.getElementById('f-protein').value = r.macros.protein || '';
    document.getElementById('f-carbs').value   = r.macros.carbs   || '';
    document.getElementById('f-fat').value     = r.macros.fat     || '';
  }
}

// ── PASTE CONFIRM ────────────────────────────────────────────────────────────
function confirmPaste() {
  if (!parsedData) return;
  parsedData.id        = uid();
  parsedData.emoji     = '🍳';
  parsedData.createdAt = Date.now();
  recipes.unshift(parsedData);
  save();
  closeAddSheet();
  showToast('Recipe saved ✓');
  renderLibrary();
}

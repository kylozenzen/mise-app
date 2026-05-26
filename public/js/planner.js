// ── planner.js ───────────────────────────────────────────────────────────────
// Meal planner: week strip, day view, macro bars, picker sheet, Add to Plan

const SLOTS       = ['breakfast','lunch','dinner','snack'];
const SLOT_LABELS = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snack:'Snack' };
const SLOT_ICONS  = { breakfast:'☀️', lunch:'🌤️', dinner:'🌙', snack:'🍎' };
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_LABELS= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let activeDayKey = null;
let pickerSlot   = null;
let atpRecipeId  = null;

// ── WEEK HELPERS ─────────────────────────────────────────────────────────────
function getWeekDays() {
  const today = new Date();
  const dow   = today.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dow + i);
    return d;
  });
}

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDayMeals(k) {
  if (!mealPlan[k]) mealPlan[k] = {};
  return SLOTS.map(s => ({ slot: s, items: mealPlan[k][s] || [] }));
}

function calcTotals(dayMeals) {
  const t = { cal: 0, protein: 0, carbs: 0, fat: 0 };
  dayMeals.forEach(({ items }) => {
    items.forEach(item => {
      if (item.macros) {
        t.cal     += item.macros.cal     || 0;
        t.protein += item.macros.protein || 0;
        t.carbs   += item.macros.carbs   || 0;
        t.fat     += item.macros.fat     || 0;
      }
    });
  });
  return t;
}

// ── INIT PLANNER ─────────────────────────────────────────────────────────────
function initPlanner() {
  const days  = getWeekDays();
  const today = new Date();
  activeDayKey = activeDayKey || dayKey(today);

  const first = days[0], last = days[6];
  document.getElementById('planner-week-label').textContent =
    `${MONTH_LABELS[first.getMonth()]} ${first.getDate()} – ${MONTH_LABELS[last.getMonth()]} ${last.getDate()}`;

  const strip = document.getElementById('week-strip');
  strip.innerHTML = '';
  days.forEach(d => {
    const k      = dayKey(d);
    const meals  = getDayMeals(k);
    const hasM   = meals.some(s => s.items.length > 0);
    const chip   = document.createElement('div');
    chip.className = `week-chip${k === activeDayKey ? ' active' : ''}${hasM ? ' has-meals' : ''}`;
    chip.innerHTML = `
      <span class="week-chip-day">${DAY_LABELS[d.getDay()]}</span>
      <span class="week-chip-date" style="${dayKey(d) === dayKey(today) ? 'color:var(--amber-bright)' : ''}">${d.getDate()}</span>
      <div class="week-chip-dot"></div>`;
    chip.onclick = () => { activeDayKey = k; initPlanner(); };
    strip.appendChild(chip);
  });

  renderDayView(activeDayKey);
}

// ── DAY VIEW ─────────────────────────────────────────────────────────────────
function renderDayView(k) {
  const dayMeals = getDayMeals(k);
  const totals   = calcTotals(dayMeals);
  const d        = new Date(k + 'T12:00:00');
  const isToday  = k === dayKey(new Date());
  const dayTitle = isToday ? 'Today' : `${DAY_LABELS[d.getDay()]}, ${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
  let html = '';

  // Weekly summary
  html += `<div class="weekly-summary"><div class="ws-title">This Week</div><div class="ws-grid">`;
  getWeekDays().forEach(wd => {
    const wk      = dayKey(wd);
    const wTotals = calcTotals(getDayMeals(wk));
    const pct     = goals.cal > 0 ? Math.min((wTotals.cal / goals.cal) * 100, 100) : 0;
    const over    = wTotals.cal > goals.cal * 1.05;
    const on      = !over && wTotals.cal >= goals.cal * 0.9;
    html += `
      <div class="ws-day-col" onclick="activeDayKey='${wk}';initPlanner()" style="cursor:pointer">
        <div class="ws-day-label" style="${wk === activeDayKey ? 'color:var(--amber-bright)' : ''}">${DAY_LABELS[wd.getDay()].slice(0,1)}</div>
        <div class="ws-cal-bar"><div class="ws-cal-fill ${over?'over':on?'on':''}" style="height:${pct}%"></div></div>
        <div class="ws-cal-val">${wTotals.cal > 0 ? wTotals.cal : ''}</div>
      </div>`;
  });
  html += `</div></div>`;

  // Goals panel
  html += `
    <div class="goals-panel">
      <button class="goals-toggle-btn" id="goals-toggle-btn" onclick="toggleGoalsPanel()">
        Daily Goals
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="goals-body" id="goals-body">
        <div class="goals-grid">
          ${['cal','protein','carbs','fat'].map(k2 => `
            <div>
              <label>${k2 === 'cal' ? 'Calories' : k2.charAt(0).toUpperCase()+k2.slice(1)+' (g)'}</label>
              <input type="number" value="${goals[k2]}" onchange="updateGoal('${k2}',this.value)"
                style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 12px;color:var(--cream);font-family:'Lato',sans-serif;font-size:14px;outline:none;width:100%;margin-top:6px">
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  // Macro bar
  html += `
    <div class="daily-macro-bar">
      <div class="dmb-header">
        <span class="dmb-title">${dayTitle}</span>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="dmb-cal">${totals.cal} <span style="color:var(--text-muted);font-size:10px">/ ${goals.cal} cal</span></span>
          <button onclick="openCopyDaySheet('${k}')" style="background:none;border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:4px 8px;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.5px;cursor:pointer;white-space:nowrap" title="Copy this day's meals to another day">Copy Day</button>
        </div>
      </div>
      <div class="dmb-rows">
        ${macroBar('Protein', totals.protein, goals.protein, 'g')}
        ${macroBar('Carbs',   totals.carbs,   goals.carbs,   'g')}
        ${macroBar('Fat',     totals.fat,     goals.fat,     'g')}
      </div>
    </div>`;

  // Meal slots
  SLOTS.forEach(slot => {
    const items = (mealPlan[k] && mealPlan[k][slot]) || [];
    html += `
      <div class="meal-slot-group">
        <div class="meal-slot-label">${SLOT_ICONS[slot]} ${SLOT_LABELS[slot]}</div>
        <div class="meal-slot-card">
          ${items.map((item, idx) => `
            <div class="meal-slot-item">
              <span class="meal-slot-emoji">${item.emoji || '🍽️'}</span>
              <div class="meal-slot-info">
                <div class="meal-slot-name">${item.name}</div>
                ${item.macros && item.macros.cal ? `<div class="meal-slot-macros">${item.macros.cal}cal · ${item.macros.protein||0}g P · ${item.macros.carbs||0}g C · ${item.macros.fat||0}g F</div>` : ''}
              </div>
              <button class="meal-remove-btn" onclick="removeMealItem('${k}','${slot}',${idx})">×</button>
            </div>`).join('')}
          <button class="add-meal-btn" onclick="openPickerSheet('${k}','${slot}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add to ${SLOT_LABELS[slot]}
          </button>
        </div>
      </div>`;
  });

  document.getElementById('day-view').innerHTML = html;
}

function macroBar(label, current, goal, unit) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const over = current > goal * 1.05;
  const on   = !over && current >= goal * 0.9;
  return `
    <div class="dmb-row">
      <span class="dmb-label">${label}</span>
      <div class="dmb-bar-wrap"><div class="dmb-bar-fill ${over?'over':on?'on':''}" style="width:${pct}%"></div></div>
      <span class="dmb-val">${current}${unit}</span>
    </div>`;
}

function removeMealItem(k, slot, idx) {
  if (!mealPlan[k] || !mealPlan[k][slot]) return;
  mealPlan[k][slot].splice(idx, 1);
  savePlan();
  initPlanner();
}

function updateGoal(key, val) {
  goals[key] = parseInt(val) || 0;
  saveGoals();
  renderDayView(activeDayKey);
}

function toggleGoalsPanel() {
  document.getElementById('goals-toggle-btn')?.classList.toggle('open');
  document.getElementById('goals-body')?.classList.toggle('open');
}

// ── PICKER SHEET ─────────────────────────────────────────────────────────────
function openPickerSheet(k, slot) {
  pickerSlot = { dayKey: k, slot };
  document.getElementById('picker-sheet-title').textContent = `Add to ${SLOT_LABELS[slot]}`;
  document.getElementById('picker-search-input').value = '';
  ['qa-name','qa-cal','qa-protein','qa-carbs','qa-fat'].forEach(id => document.getElementById(id).value = '');
  filterPickerRecipes('');
  document.getElementById('picker-sheet-overlay').classList.add('open');
}

function closePickerSheet() {
  document.getElementById('picker-sheet-overlay').classList.remove('open');
  pickerSlot = null;
}

function filterPickerRecipes(q) {
  const lower    = q.toLowerCase();
  const filtered = recipes.filter(r => r.title.toLowerCase().includes(lower));
  const list     = document.getElementById('picker-recipe-list');
  if (!filtered.length) { list.innerHTML = `<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px 0">No recipes match</p>`; return; }
  list.innerHTML = filtered.map(r => {
    const m = r.macros || {};
    const ms = m.cal ? `${m.cal}cal · ${m.protein||0}g P · ${m.carbs||0}g C · ${m.fat||0}g F` : 'No macros';
    return `
      <div class="picker-recipe-item" onclick="addRecipeToSlot('${r.id}')">
        <span class="picker-recipe-emoji">${r.emoji || '🍳'}</span>
        <div class="picker-recipe-info">
          <div class="picker-recipe-name">${r.title}</div>
          <div class="picker-recipe-macros">${ms}</div>
        </div>
      </div>`;
  }).join('');
}

function addRecipeToSlot(recipeId) {
  if (!pickerSlot) return;
  const r = recipes.find(x => x.id === recipeId);
  if (!r) return;
  const { dayKey: k, slot } = pickerSlot;
  if (!mealPlan[k]) mealPlan[k] = {};
  if (!mealPlan[k][slot]) mealPlan[k][slot] = [];
  mealPlan[k][slot].push({ name: r.title, emoji: r.emoji || '🍳', recipeId: r.id, macros: r.macros || {} });
  savePlan();
  closePickerSheet();
  initPlanner();
  showToast(`Added to ${SLOT_LABELS[slot]} ✓`);
}

function addQuickMeal() {
  if (!pickerSlot) return;
  const name = document.getElementById('qa-name').value.trim();
  if (!name) { showToast('Add a meal name first'); return; }
  const { dayKey: k, slot } = pickerSlot;
  if (!mealPlan[k]) mealPlan[k] = {};
  if (!mealPlan[k][slot]) mealPlan[k][slot] = [];
  mealPlan[k][slot].push({
    name, emoji: '🍽️',
    macros: {
      cal:     parseInt(document.getElementById('qa-cal').value)     || 0,
      protein: parseInt(document.getElementById('qa-protein').value) || 0,
      carbs:   parseInt(document.getElementById('qa-carbs').value)   || 0,
      fat:     parseInt(document.getElementById('qa-fat').value)     || 0,
    }
  });
  savePlan();
  closePickerSheet();
  initPlanner();
  showToast(`Added to ${SLOT_LABELS[slot]} ✓`);
}

// ── ADD TO PLAN SHEET (from recipe detail) ───────────────────────────────────
function openATPSheet(recipeId) {
  atpRecipeId = recipeId;
  const r = recipes.find(x => x.id === recipeId);
  if (!r) return;
  document.getElementById('atp-sheet-title').textContent = `Add "${r.title}"`;
  const today = new Date();
  document.getElementById('atp-sheet-body').innerHTML = getWeekDays().map(d => {
    const k       = dayKey(d);
    const isToday = k === dayKey(today);
    return `<div style="margin-bottom:12px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">
        ${DAY_LABELS[d.getDay()]} ${d.getDate()}${isToday ? ' <span style="color:var(--amber)">· Today</span>' : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${SLOTS.map(slot => `
          <button onclick="atpAddToSlot('${k}','${slot}')"
            style="padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface2);color:var(--cream-dim);font-family:'Lato',sans-serif;font-size:12px;cursor:pointer;text-align:left">
            ${SLOT_ICONS[slot]} ${SLOT_LABELS[slot]}
          </button>`).join('')}
      </div>
    </div>`;
  }).join('');
  document.getElementById('add-to-plan-overlay').classList.add('open');
}

function closeATPSheet() {
  document.getElementById('add-to-plan-overlay').classList.remove('open');
  atpRecipeId = null;
}

function atpAddToSlot(k, slot) {
  const r = recipes.find(x => x.id === atpRecipeId);
  if (!r) return;
  if (!mealPlan[k]) mealPlan[k] = {};
  if (!mealPlan[k][slot]) mealPlan[k][slot] = [];
  mealPlan[k][slot].push({ name: r.title, emoji: r.emoji || '🍳', recipeId: r.id, macros: r.macros || {} });
  savePlan();
  closeATPSheet();
  showToast(`Added to ${SLOT_LABELS[slot]} ✓`);
}

// ── COPY DAY ─────────────────────────────────────────────────────────────────
let copySourceKey = null;

function openCopyDaySheet(fromKey) {
  const sourceMeals = getDayMeals(fromKey);
  const totalItems  = sourceMeals.reduce((n, s) => n + s.items.length, 0);

  if (totalItems === 0) {
    showToast('No meals to copy — add some first');
    return;
  }

  copySourceKey = fromKey;
  const d       = new Date(fromKey + 'T12:00:00');
  const fromLabel = `${DAY_LABELS[d.getDay()]} ${d.getDate()}`;

  const days  = getWeekDays();
  const today = new Date();

  let html = `<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Copy <strong style="color:var(--cream)">${totalItems} meal${totalItems !== 1 ? 's' : ''}</strong> from ${fromLabel} to:</p>`;

  html += `<div style="display:flex;flex-direction:column;gap:8px">`;
  days.forEach(wd => {
    const k = dayKey(wd);
    if (k === fromKey) return; // skip source day
    const isToday  = k === dayKey(today);
    const existing = getDayMeals(k).reduce((n, s) => n + s.items.length, 0);
    const label    = `${DAY_LABELS[wd.getDay()]}, ${MONTH_LABELS[wd.getMonth()]} ${wd.getDate()}${isToday ? ' · Today' : ''}`;
    html += `
      <button onclick="executeCopyDay('${k}')"
        style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;text-align:left;width:100%;transition:border-color 0.15s">
        <span style="font-size:14px;color:var(--cream)">${label}</span>
        ${existing > 0 ? `<span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text-muted)">${existing} existing</span>` : ''}
      </button>`;
  });
  html += `</div>`;

  // Reuse ATP overlay for simplicity
  document.getElementById('atp-sheet-title').textContent = 'Copy Day To…';
  document.getElementById('atp-sheet-body').innerHTML = html;
  document.getElementById('add-to-plan-overlay').classList.add('open');
}

function executeCopyDay(toKey) {
  if (!copySourceKey) return;
  const source = mealPlan[copySourceKey] || {};

  if (!mealPlan[toKey]) mealPlan[toKey] = {};

  // Deep copy each slot — append to existing meals
  SLOTS.forEach(slot => {
    if (!source[slot] || !source[slot].length) return;
    if (!mealPlan[toKey][slot]) mealPlan[toKey][slot] = [];
    // Clone items so they're independent
    const cloned = JSON.parse(JSON.stringify(source[slot]));
    mealPlan[toKey][slot].push(...cloned);
  });

  savePlan();
  document.getElementById('add-to-plan-overlay').classList.remove('open');
  copySourceKey = null;
  initPlanner();

  const d = new Date(toKey + 'T12:00:00');
  showToast(`Copied to ${DAY_LABELS[d.getDay()]} ✓`);
}

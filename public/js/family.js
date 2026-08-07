// ── family.js ────────────────────────────────────────────────────────────────
// Mise 2.0 Family Mode: command center, kid adaptations, smart nutrition nudges,
// dinner rescue, family reactions, and low-pressure kitchen notes.

(() => {
  'use strict';

  const FAMILY_KEY = 'mise_family_v2';
  const THEME_MIGRATION_KEY = 'mise_family_theme_migrated';
  const REACTIONS = {
    loved: { emoji: '😍', label: 'Loved it' },
    okay:  { emoji: '🙂', label: 'Ate some' },
    meh:   { emoji: '😐', label: 'Picked at it' },
    nope:  { emoji: '🙅', label: 'Nope' },
  };

  let familyState = loadFamilyState();
  let activeFamilyDayKey = todayKey();

  function defaults() {
    return {
      version: 2,
      preferences: {
        kidLabel: 'Kid',
        nutritionNudges: true,
      },
      recipeMeta: {},
      notes: [],
    };
  }

  function loadFamilyState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FAMILY_KEY) || 'null');
      const base = defaults();
      if (!parsed || typeof parsed !== 'object') return base;
      return {
        ...base,
        ...parsed,
        preferences: { ...base.preferences, ...(parsed.preferences || {}) },
        recipeMeta: parsed.recipeMeta || {},
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      };
    } catch (err) {
      console.warn('Mise Family Mode state could not be loaded:', err);
      return defaults();
    }
  }

  function saveFamilyState() {
    localStorage.setItem(FAMILY_KEY, JSON.stringify(familyState));
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function keyForDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dateFromKey(key) {
    return new Date(`${key}T12:00:00`);
  }

  function formatDay(key, long = false) {
    const d = dateFromKey(key);
    if (long) return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }

  function formatTodayEyebrow() {
    return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  }

  function getRecipe(recipeId) {
    if (!recipeId || typeof recipes === 'undefined') return null;
    return recipes.find(r => String(r.id) === String(recipeId)) || null;
  }

  function getRecipeMeta(recipeId) {
    if (!recipeId) return { kidMod: '', reactions: [] };
    familyState.recipeMeta[recipeId] ||= { kidMod: '', reactions: [] };
    const meta = familyState.recipeMeta[recipeId];
    if (!Array.isArray(meta.reactions)) meta.reactions = [];
    return meta;
  }

  function getDinner(key = todayKey()) {
    const items = mealPlan?.[key]?.dinner || [];
    return items[0] || null;
  }

  function getDayTotals(key) {
    const totals = { cal: 0, protein: 0, carbs: 0, fat: 0 };
    const slots = mealPlan?.[key] || {};
    Object.values(slots).forEach(items => {
      if (!Array.isArray(items)) return;
      items.forEach(item => {
        const m = item?.macros || {};
        totals.cal += Number(m.cal) || 0;
        totals.protein += Number(m.protein) || 0;
        totals.carbs += Number(m.carbs) || 0;
        totals.fat += Number(m.fat) || 0;
      });
    });
    return totals;
  }

  function getCurrentWeekKeys() {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setHours(12, 0, 0, 0);
    sunday.setDate(today.getDate() - today.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return keyForDate(d);
    });
  }

  function nutritionExists(macros) {
    if (!macros) return false;
    return ['cal', 'protein', 'carbs', 'fat'].some(k => Number(macros[k]) > 0);
  }

  function buildNudges(key, dinner) {
    if (!familyState.preferences.nutritionNudges) return [];
    if (!dinner) {
      return [{ tone: 'neutral', icon: '✨', title: 'No numbers needed yet', text: 'Plan dinner first. Nutrition nudges only show up when they are actually useful.' }];
    }

    const m = dinner.macros || {};
    if (!nutritionExists(m)) {
      return [{ tone: 'neutral', icon: '🌿', title: 'Nutrition can stay optional', text: 'This meal has no nutrition data. Mise will never make you enter it, but adding it later unlocks smarter balance nudges.' }];
    }

    const g = typeof goals !== 'undefined' ? goals : { cal: 2000, protein: 150, carbs: 200, fat: 65 };
    const totals = getDayTotals(key);
    const dinnerShare = 0.35;
    const nudges = [];

    const checks = [
      { key: 'protein', label: 'protein', unit: 'g', lowIcon: '💪', highIcon: '✅' },
      { key: 'carbs', label: 'carbs', unit: 'g', lowIcon: '⚡', highIcon: '🍚' },
      { key: 'fat', label: 'fat', unit: 'g', lowIcon: '🥑', highIcon: '⚖️' },
    ];

    checks.forEach(c => {
      const goal = Number(g[c.key]) || 0;
      const value = Number(m[c.key]) || 0;
      if (!goal || !value) return;
      const dinnerTarget = goal * dinnerShare;
      if (value < dinnerTarget * 0.65) {
        const remaining = Math.max(0, Math.round(goal - totals[c.key]));
        const suggestions = {
          protein: 'An extra lean protein, Greek yogurt, cottage cheese, or a protein-forward snack could help.',
          carbs: 'If you need more energy, rice, fruit, potatoes, or another easy carb can round things out.',
          fat: 'That is not automatically a problem — just know this meal is relatively lean.',
        };
        nudges.push({
          tone: 'watch', icon: c.lowIcon,
          title: `A little light on ${c.label}`,
          text: remaining > 0
            ? `Based on what is currently planned today, you still have about ${remaining}${c.unit} to your goal. ${suggestions[c.key]}`
            : suggestions[c.key],
        });
      } else if (value > dinnerTarget * 1.45) {
        const copy = {
          protein: 'Protein is doing plenty of work here. No need to chase more just for the number.',
          carbs: 'This is a carb-forward dinner. If that matters today, keep sides and later snacks simpler.',
          fat: 'This dinner is fat-forward. If that matters today, lighter sides or sauces can balance the rest of the day.',
        };
        nudges.push({ tone: c.key === 'protein' ? 'good' : 'watch', icon: c.highIcon, title: `Higher in ${c.label}`, text: copy[c.key] });
      }
    });

    const calories = Number(m.cal) || 0;
    const calGoal = Number(g.cal) || 0;
    if (calories && calGoal && calories > calGoal * 0.45) {
      nudges.push({ tone: 'watch', icon: '🔥', title: 'Bigger dinner', text: `This meal is about ${Math.round((calories / calGoal) * 100)}% of your daily calorie target. Totally workable — just useful context for the rest of the day.` });
    }

    if (!nudges.length) {
      nudges.push({ tone: 'good', icon: '✓', title: 'Looks pretty balanced', text: 'Nothing jumps out as unusually high or low compared with your current goals. Dinner can just be dinner.' });
    }

    return nudges.slice(0, 2);
  }

  function renderMacroLine(macros) {
    if (!nutritionExists(macros)) return '<span>No nutrition data</span>';
    const bits = [];
    if (Number(macros.protein)) bits.push(`${Math.round(macros.protein)}g protein`);
    if (Number(macros.cal)) bits.push(`${Math.round(macros.cal)} cal`);
    if (Number(macros.carbs)) bits.push(`${Math.round(macros.carbs)}g carbs`);
    return `<span>${esc(bits.slice(0, 3).join(' · '))}</span>`;
  }

  function lastReaction(recipeId) {
    const reactions = getRecipeMeta(recipeId).reactions;
    return reactions[reactions.length - 1] || null;
  }

  function reactionSummary(recipeId) {
    const reactions = getRecipeMeta(recipeId).reactions;
    if (!reactions.length) return 'Not rated yet';
    const loved = reactions.filter(r => r.reaction === 'loved').length;
    const positive = reactions.filter(r => r.reaction === 'loved' || r.reaction === 'okay').length;
    if (loved >= 2) return `${loved} family wins`;
    if (positive) return `Worked ${positive}×`;
    return REACTIONS[reactions[reactions.length - 1].reaction]?.label || 'Tried before';
  }

  function renderHome() {
    const root = document.getElementById('family-home-content');
    if (!root) return;

    const key = activeFamilyDayKey || todayKey();
    const dinner = getDinner(key);
    const recipe = dinner?.recipeId ? getRecipe(dinner.recipeId) : null;
    const recipeId = dinner?.recipeId || null;
    const meta = recipeId ? getRecipeMeta(recipeId) : null;
    const kidLabel = familyState.preferences.kidLabel || 'Kid';
    const nudges = buildNudges(key, dinner);
    const isToday = key === todayKey();
    const weekKeys = getCurrentWeekKeys();
    const unplannedDinnerKeys = weekKeys.filter(k => !getDinner(k));

    root.innerHTML = `
      <section class="family-intro">
        <div class="family-eyebrow">${esc(isToday ? formatTodayEyebrow() : formatDay(key, true).toUpperCase())}</div>
        <h2>${isToday ? 'Dinner, handled.' : esc(formatDay(key, true))}</h2>
        <p>${isToday ? 'One meal for the family, with the details that make it actually work.' : 'Plan the family version first. The numbers can stay in the background.'}</p>
      </section>

      ${dinner ? renderTonightCard(key, dinner, recipe, meta, kidLabel, nudges) : renderGapCard(key, isToday)}

      <section class="family-section">
        <div class="family-section-head">
          <div>
            <span class="family-kicker">THIS WEEK</span>
            <h3>Seven dinners. One glance.</h3>
          </div>
          <button class="family-text-btn" onclick="familyOpenPlanner()">Full planner →</button>
        </div>
        <div class="family-week-strip">
          ${weekKeys.map(k => renderWeekDay(k)).join('')}
        </div>
        ${unplannedDinnerKeys.length ? `<button class="family-gap-banner" onclick="familyOpenRescue('${unplannedDinnerKeys[0]}')"><span>⚡ ${unplannedDinnerKeys.length} dinner ${unplannedDinnerKeys.length === 1 ? 'gap' : 'gaps'} this week</span><strong>Fix the next one →</strong></button>` : `<div class="family-all-planned">✓ Dinner is covered all week. Tiny miracle.</div>`}
      </section>

      ${renderFamilyWins()}
      ${renderKitchenNotes()}

      <section class="family-footer-note">
        <span>🌿</span>
        <p>Smart nudges use the goals and nutrition you already have in Mise. They are planning cues, not rules — and you can turn them off anytime.</p>
      </section>
    `;
  }

  function renderTonightCard(key, dinner, recipe, meta, kidLabel, nudges) {
    const recipeId = dinner?.recipeId || '';
    const title = dinner?.name || recipe?.title || 'Dinner';
    const emoji = dinner?.emoji || recipe?.emoji || '🍽️';
    const kidMod = meta?.kidMod || '';
    const last = recipeId ? lastReaction(recipeId) : null;

    return `
      <section class="family-tonight-card">
        <div class="family-card-topline">
          <span class="family-status-pill">TONIGHT</span>
          <button class="family-more-btn" onclick="familyOpenRescue('${key}')">Swap</button>
        </div>
        <div class="family-meal-title-row">
          <div class="family-meal-emoji">${esc(emoji)}</div>
          <div>
            <h3>${esc(title)}</h3>
            <div class="family-meal-meta">${renderMacroLine(dinner.macros || recipe?.macros || {})}</div>
          </div>
        </div>

        <button class="family-kid-card ${kidMod ? 'has-mod' : ''}" onclick="familyEditKidMod('${esc(recipeId)}','${key}')">
          <span class="family-kid-icon">☺</span>
          <span class="family-kid-copy">
            <strong>${esc(kidLabel)} version</strong>
            <small>${kidMod ? esc(kidMod) : 'Add the small change that makes this meal work for your kid.'}</small>
          </span>
          <span class="family-kid-arrow">›</span>
        </button>

        <div class="family-nudge-stack">
          ${nudges.map(n => `<div class="family-nudge ${n.tone}"><span class="family-nudge-icon">${n.icon}</span><div><strong>${esc(n.title)}</strong><p>${esc(n.text)}</p></div></div>`).join('')}
        </div>

        <div class="family-card-actions">
          ${recipeId ? `<button class="family-primary-btn" onclick="familyOpenRecipe('${esc(recipeId)}')">Open recipe</button>` : `<button class="family-primary-btn" onclick="familyOpenPlannerForDay('${key}')">Open in planner</button>`}
          <button class="family-secondary-btn" onclick="familyOpenRescue('${key}')">Dinner rescue</button>
        </div>

        ${recipeId ? `
          <div class="family-reaction-box">
            <div>
              <strong>How'd it go?</strong>
              <span>${last ? `${REACTIONS[last.reaction]?.emoji || ''} ${REACTIONS[last.reaction]?.label || ''} last time` : 'Teach Mise what actually works.'}</span>
            </div>
            <div class="family-reactions">
              ${Object.entries(REACTIONS).map(([keyName, data]) => `<button title="${esc(data.label)}" onclick="familyRateMeal('${esc(recipeId)}','${keyName}')">${data.emoji}</button>`).join('')}
            </div>
          </div>` : ''}
      </section>
    `;
  }

  function renderGapCard(key, isToday) {
    return `
      <section class="family-gap-card">
        <div class="family-gap-icon">🍽️</div>
        <span class="family-status-pill coral">${isToday ? 'TONIGHT' : esc(formatDay(key).toUpperCase())} · OPEN</span>
        <h3>${isToday ? 'No dinner plan. That’s fixable.' : 'This dinner is still open.'}</h3>
        <p>Pick a proven family meal, grab a high-protein fallback, or just put “takeout” on the calendar and move on with your life.</p>
        <div class="family-card-actions">
          <button class="family-primary-btn coral" onclick="familyOpenRescue('${key}')">⚡ Rescue dinner</button>
          <button class="family-secondary-btn" onclick="familyOpenPlannerForDay('${key}')">Plan it myself</button>
        </div>
      </section>
    `;
  }

  function renderWeekDay(key) {
    const dinner = getDinner(key);
    const active = key === activeFamilyDayKey;
    const today = key === todayKey();
    const d = dateFromKey(key);
    return `
      <button class="family-day-chip ${active ? 'active' : ''} ${dinner ? 'planned' : 'open'}" onclick="familySelectDay('${key}')">
        <span>${formatDay(key).slice(0, 1)}</span>
        <strong>${d.getDate()}</strong>
        <i>${dinner ? '✓' : '·'}</i>
        ${today ? '<em>Today</em>' : ''}
      </button>
    `;
  }

  function renderFamilyWins() {
    const wins = Object.entries(familyState.recipeMeta)
      .map(([recipeId, meta]) => {
        const r = getRecipe(recipeId);
        const reactions = meta?.reactions || [];
        const loved = reactions.filter(x => x.reaction === 'loved').length;
        const positive = reactions.filter(x => x.reaction === 'loved' || x.reaction === 'okay').length;
        return r ? { recipe: r, loved, positive, total: reactions.length } : null;
      })
      .filter(Boolean)
      .filter(x => x.positive > 0)
      .sort((a, b) => (b.loved * 3 + b.positive) - (a.loved * 3 + a.positive))
      .slice(0, 3);

    return `
      <section class="family-section">
        <div class="family-section-head">
          <div><span class="family-kicker">FAMILY MEMORY</span><h3>Meals that earned a comeback.</h3></div>
          <button class="family-text-btn" onclick="familyOpenMeals()">Meals →</button>
        </div>
        ${wins.length ? `<div class="family-win-list">${wins.map(w => `
          <button class="family-win" onclick="familyOpenRecipe('${esc(w.recipe.id)}')">
            <span class="family-win-emoji">${esc(w.recipe.emoji || '🍳')}</span>
            <span><strong>${esc(w.recipe.title)}</strong><small>😍 ${esc(reactionSummary(w.recipe.id))}</small></span>
            <span>›</span>
          </button>`).join('')}</div>` : `
          <div class="family-empty-soft">
            <span>😍</span><div><strong>Your family wins will show up here.</strong><p>Rate dinner after you eat. Mise will start remembering the meals worth repeating.</p></div>
          </div>`}
      </section>
    `;
  }

  function renderKitchenNotes() {
    return `
      <section class="family-section">
        <div class="family-section-head">
          <div><span class="family-kicker">KITCHEN BRAIN</span><h3>Remember it before it disappears.</h3></div>
          <span class="family-zero-pressure">Zero pressure</span>
        </div>
        <form class="family-note-form" onsubmit="familyAddNote(event)">
          <input id="family-note-input" type="text" autocomplete="off" placeholder="Use the ground beef · sauce on side · takeout Friday">
          <button type="submit">Add</button>
        </form>
        <div class="family-note-list">
          ${familyState.notes.length ? familyState.notes.slice(0, 5).map(note => `<div class="family-note"><span>${esc(note.text)}</span><button onclick="familyDeleteNote('${esc(note.id)}')" aria-label="Delete note">×</button></div>`).join('') : '<div class="family-note-empty">No notes. Your brain gets the night off.</div>'}
        </div>
      </section>
    `;
  }

  function rescueCandidates() {
    const list = Array.isArray(recipes) ? recipes.slice() : [];
    return list
      .map(recipe => {
        const meta = getRecipeMeta(recipe.id);
        const reactions = meta.reactions || [];
        const loved = reactions.filter(r => r.reaction === 'loved').length;
        const okay = reactions.filter(r => r.reaction === 'okay').length;
        const tags = (recipe.tags || []).map(x => String(x).toLowerCase());
        const protein = Number(recipe.macros?.protein) || 0;
        const quick = tags.some(t => t.includes('quick') || t.includes('easy') || t.includes('15') || t.includes('30'));
        const score = loved * 8 + okay * 3 + (quick ? 3 : 0) + (protein >= 30 ? 2 : 0) + Math.random();
        let reason = 'From your saved meals';
        if (loved) reason = `😍 Loved ${loved}×`;
        else if (quick) reason = '⚡ Quick fallback';
        else if (protein >= 30) reason = `💪 ${Math.round(protein)}g protein`;
        return { recipe, score, reason };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  function openRescue(dayKey) {
    const overlay = document.getElementById('family-rescue-overlay');
    if (!overlay) return;
    overlay.dataset.dayKey = dayKey || todayKey();
    const candidates = rescueCandidates();
    document.getElementById('family-rescue-day').textContent = formatDay(overlay.dataset.dayKey, true);
    document.getElementById('family-rescue-list').innerHTML = candidates.length
      ? candidates.map(c => `<button class="family-rescue-option" onclick="familyAssignDinner('${esc(c.recipe.id)}','${esc(overlay.dataset.dayKey)}')"><span class="family-rescue-emoji">${esc(c.recipe.emoji || '🍳')}</span><span><strong>${esc(c.recipe.title)}</strong><small>${esc(c.reason)}${getRecipeMeta(c.recipe.id).kidMod ? ' · Kid version saved' : ''}</small></span><span>Use it</span></button>`).join('')
      : `<div class="family-empty-soft"><span>🍳</span><div><strong>No saved meals yet.</strong><p>Add a recipe first, or use the regular planner to add a quick meal.</p></div></div>`;
    overlay.classList.add('open');
  }

  function closeRescue() {
    document.getElementById('family-rescue-overlay')?.classList.remove('open');
  }

  function assignDinner(recipeId, dayKey) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return;
    mealPlan[dayKey] ||= {};
    mealPlan[dayKey].dinner = [{
      name: recipe.title,
      emoji: recipe.emoji || '🍳',
      recipeId: recipe.id,
      macros: recipe.macros || {},
    }];
    savePlan();
    activeFamilyDayKey = dayKey;
    closeRescue();
    renderHome();
    if (typeof showToast === 'function') showToast(`${recipe.title} is on the plan ✓`);
  }

  function openKidMod(recipeId, dayKey) {
    if (!recipeId) {
      if (typeof showToast === 'function') showToast('Save this as a recipe to add a reusable kid version.');
      return;
    }
    const recipe = getRecipe(recipeId);
    const meta = getRecipeMeta(recipeId);
    const overlay = document.getElementById('family-kid-overlay');
    overlay.dataset.recipeId = recipeId;
    overlay.dataset.dayKey = dayKey || todayKey();
    document.getElementById('family-kid-title').textContent = recipe?.title || 'Kid version';
    document.getElementById('family-kid-input').value = meta.kidMod || '';
    overlay.classList.add('open');
    setTimeout(() => document.getElementById('family-kid-input')?.focus(), 120);
  }

  function saveKidMod(event) {
    event.preventDefault();
    const overlay = document.getElementById('family-kid-overlay');
    const recipeId = overlay.dataset.recipeId;
    const value = document.getElementById('family-kid-input').value.trim();
    getRecipeMeta(recipeId).kidMod = value;
    saveFamilyState();
    overlay.classList.remove('open');
    renderHome();
    injectFamilyDetail(currentRecipe);
    if (typeof showToast === 'function') showToast('Kid version saved ✓');
  }

  function rateMeal(recipeId, reaction) {
    if (!REACTIONS[reaction]) return;
    const meta = getRecipeMeta(recipeId);
    meta.reactions.push({ reaction, at: new Date().toISOString() });
    if (meta.reactions.length > 30) meta.reactions = meta.reactions.slice(-30);
    saveFamilyState();
    renderHome();
    if (typeof showToast === 'function') showToast(`${REACTIONS[reaction].emoji} Mise will remember that.`);
  }

  function addNote(event) {
    event.preventDefault();
    const input = document.getElementById('family-note-input');
    const text = input?.value.trim();
    if (!text) return;
    familyState.notes.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, createdAt: new Date().toISOString() });
    familyState.notes = familyState.notes.slice(0, 30);
    saveFamilyState();
    renderHome();
  }

  function deleteNote(id) {
    familyState.notes = familyState.notes.filter(n => n.id !== id);
    saveFamilyState();
    renderHome();
  }

  function openSettings() {
    const overlay = document.getElementById('family-settings-overlay');
    document.getElementById('family-kid-label-input').value = familyState.preferences.kidLabel || 'Kid';
    document.getElementById('family-nudges-toggle').checked = familyState.preferences.nutritionNudges !== false;
    overlay.classList.add('open');
  }

  function saveFamilySettings(event) {
    event.preventDefault();
    familyState.preferences.kidLabel = document.getElementById('family-kid-label-input').value.trim() || 'Kid';
    familyState.preferences.nutritionNudges = document.getElementById('family-nudges-toggle').checked;
    saveFamilyState();
    document.getElementById('family-settings-overlay').classList.remove('open');
    renderHome();
    if (typeof showToast === 'function') showToast('Family preferences saved ✓');
  }

  function openPlanner(dayKey) {
    if (dayKey && typeof activeDayKey !== 'undefined') activeDayKey = dayKey;
    switchView('planner');
    if (dayKey && typeof renderDayView === 'function') {
      try { renderDayView(dayKey); } catch (_) { /* planner will render normally */ }
    }
  }

  function openRecipe(recipeId) {
    if (typeof renderRecipeDetail === 'function') renderRecipeDetail(recipeId);
  }

  function selectDay(key) {
    activeFamilyDayKey = key;
    renderHome();
    document.getElementById('family-home-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function installHomeView() {
    const app = document.getElementById('app');
    const library = document.getElementById('view-library');
    if (!app || !library || document.getElementById('view-home')) return;

    const home = document.createElement('div');
    home.id = 'view-home';
    home.className = 'view active family-view';
    home.innerHTML = `
      <header class="family-topbar">
        <div class="family-brand">
          <span class="family-brand-mark">🌱</span>
          <span><strong>Mise.</strong><small>One dinner. Everybody fed.</small></span>
        </div>
        <div class="family-top-actions">
          <span class="family-parent-pill">✦ Parent Mode</span>
          <button class="family-settings-btn" onclick="familyOpenSettings()" aria-label="Family settings">⚙</button>
        </div>
      </header>
      <div class="family-scroll" id="family-home-scroll"><main id="family-home-content"></main></div>`;
    app.insertBefore(home, library);
    library.classList.remove('active');

    const nav = document.getElementById('bottom-nav');
    if (nav) {
      nav.innerHTML = `
        <button class="nav-tab active" id="tab-home" onclick="switchView('home')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
          Home
        </button>
        <button class="nav-tab" id="tab-planner" onclick="switchView('planner')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Plan
        </button>
        <button class="nav-tab" id="tab-library" onclick="switchView('library')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          Meals
        </button>`;
    }
  }

  function installOverlays() {
    if (document.getElementById('family-rescue-overlay')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="family-overlay" id="family-rescue-overlay" onclick="if(event.target===this) familyCloseRescue()">
        <div class="family-modal">
          <div class="family-modal-handle"></div>
          <div class="family-modal-head"><div><span class="family-kicker">DINNER RESCUE</span><h3 id="family-rescue-day">Tonight</h3></div><button onclick="familyCloseRescue()">×</button></div>
          <p class="family-modal-lede">No feed of endless recipes. Just a few saved meals that make sense right now.</p>
          <div class="family-rescue-list" id="family-rescue-list"></div>
          <button class="family-secondary-btn full" onclick="familyCloseRescue(); familyOpenPlanner()">Use the full planner</button>
        </div>
      </div>

      <div class="family-overlay" id="family-kid-overlay" onclick="if(event.target===this) this.classList.remove('open')">
        <div class="family-modal compact">
          <div class="family-modal-handle"></div>
          <div class="family-modal-head"><div><span class="family-kicker">KID VERSION</span><h3 id="family-kid-title">Dinner</h3></div><button onclick="document.getElementById('family-kid-overlay').classList.remove('open')">×</button></div>
          <p class="family-modal-lede">Save the small adaptation that prevents you from cooking an entirely separate dinner.</p>
          <form onsubmit="familySaveKidMod(event)">
            <label class="family-field-label" for="family-kid-input">What changes for the kid plate?</label>
            <textarea id="family-kid-input" class="family-textarea" rows="4" placeholder="Sauce on side · deconstructed · plain noodles · shredded chicken"></textarea>
            <div class="family-chip-suggestions">
              <button type="button" onclick="familyAppendKidMod('Sauce on side')">Sauce on side</button>
              <button type="button" onclick="familyAppendKidMod('Deconstructed')">Deconstructed</button>
              <button type="button" onclick="familyAppendKidMod('Keep it plain')">Keep it plain</button>
            </div>
            <button class="family-primary-btn full" type="submit">Save kid version</button>
          </form>
        </div>
      </div>

      <div class="family-overlay" id="family-settings-overlay" onclick="if(event.target===this) this.classList.remove('open')">
        <div class="family-modal compact">
          <div class="family-modal-handle"></div>
          <div class="family-modal-head"><div><span class="family-kicker">FAMILY MODE</span><h3>Make Mise yours</h3></div><button onclick="document.getElementById('family-settings-overlay').classList.remove('open')">×</button></div>
          <form onsubmit="familySaveSettings(event)">
            <label class="family-field-label" for="family-kid-label-input">Kid label or name</label>
            <input id="family-kid-label-input" class="family-input" type="text" maxlength="24" placeholder="Kid">
            <label class="family-toggle-row"><span><strong>Smart nutrition nudges</strong><small>Use existing nutrition + goals to flag meals that run high or low.</small></span><input id="family-nudges-toggle" type="checkbox" checked></label>
            <button class="family-primary-btn full" type="submit">Save preferences</button>
            <button class="family-secondary-btn full" type="button" onclick="document.getElementById('family-settings-overlay').classList.remove('open'); openSettingsSheet()">Open Mise settings</button>
          </form>
        </div>
      </div>`;
    while (wrap.firstElementChild) document.body.appendChild(wrap.firstElementChild);
  }

  function patchRouting() {
    if (window.__miseFamilyRoutingPatched) return;
    window.__miseFamilyRoutingPatched = true;
    const originalSwitchView = window.switchView;
    window.switchView = function(name) {
      if (name === 'home') {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-home')?.classList.add('active');
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-home')?.classList.add('active');
        activeFamilyDayKey = todayKey();
        renderHome();
        return;
      }
      originalSwitchView(name);
    };
  }

  function patchRecipeDetail() {
    if (window.__miseFamilyDetailPatched || typeof window.renderRecipeDetail !== 'function') return;
    window.__miseFamilyDetailPatched = true;
    const originalRender = window.renderRecipeDetail;
    window.renderRecipeDetail = function(recipeOrId) {
      originalRender(recipeOrId);
      setTimeout(() => injectFamilyDetail(window.currentRecipe || recipeOrId), 0);
    };
  }

  function injectFamilyDetail(recipeOrId) {
    const container = document.getElementById('detail-content');
    if (!container || !container.closest('.view.active')) return;
    const recipe = typeof recipeOrId === 'object' ? recipeOrId : getRecipe(recipeOrId);
    if (!recipe || String(recipe.id).startsWith('shared-')) return;
    container.querySelector('.family-detail-card')?.remove();
    const meta = getRecipeMeta(recipe.id);
    const card = document.createElement('section');
    card.className = 'family-detail-card';
    card.innerHTML = `
      <div class="family-detail-head"><span class="family-kicker">FAMILY MODE</span><span>😍 ${esc(reactionSummary(recipe.id))}</span></div>
      <h3>Make one dinner work for everyone.</h3>
      <button class="family-kid-card ${meta.kidMod ? 'has-mod' : ''}" onclick="familyEditKidMod('${esc(recipe.id)}','${todayKey()}')">
        <span class="family-kid-icon">☺</span><span class="family-kid-copy"><strong>${esc(familyState.preferences.kidLabel || 'Kid')} version</strong><small>${meta.kidMod ? esc(meta.kidMod) : 'Add a kid adaptation for this recipe.'}</small></span><span class="family-kid-arrow">›</span>
      </button>`;
    container.insertBefore(card, container.firstChild);
  }

  function updateOnboardingCopy() {
    const tag = document.querySelector('.ob-tagline');
    if (tag) tag.textContent = 'One dinner. Everybody fed.';
    const firstHead = document.querySelector('#ob-slide-0 .ob-feature-text h4');
    if (firstHead) firstHead.textContent = 'Save the meals that work';
    const plannerHead = document.querySelectorAll('#ob-slide-0 .ob-feature-text h4')[1];
    if (plannerHead) plannerHead.textContent = 'Plan family dinner first';
    const plannerBody = document.querySelectorAll('#ob-slide-0 .ob-feature-text p')[1];
    if (plannerBody) plannerBody.textContent = 'Plan the week, remember kid adaptations, and let Mise flag the meals that may need a little balancing.';
    document.querySelectorAll('.settings-row-sub').forEach(el => {
      if (el.textContent.includes('Version 1.0')) el.textContent = 'Version 2.0 · Nobody Creative';
    });
  }

  function migrateVisualIdentity() {
    if (!localStorage.getItem(THEME_MIGRATION_KEY)) {
      localStorage.setItem(THEME_MIGRATION_KEY, '1');
      if (typeof setTheme === 'function') setTheme('garden', false);
      else localStorage.setItem('mise_theme', 'garden');
    }
    document.body.classList.add('mise-family-mode');
    document.title = 'Mise — One dinner. Everybody fed.';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', 'Family dinner planning with kid adaptations, smart nutrition nudges, recipes, shopping lists, and dinner rescue.');
  }

  function initFamilyMode() {
    migrateVisualIdentity();
    installHomeView();
    installOverlays();
    patchRouting();
    patchRecipeDetail();
    updateOnboardingCopy();
    renderHome();
  }

  window.familyOpenPlanner = () => openPlanner(activeFamilyDayKey);
  window.familyOpenPlannerForDay = key => openPlanner(key);
  window.familyOpenMeals = () => switchView('library');
  window.familyOpenRecipe = openRecipe;
  window.familySelectDay = selectDay;
  window.familyOpenRescue = openRescue;
  window.familyCloseRescue = closeRescue;
  window.familyAssignDinner = assignDinner;
  window.familyEditKidMod = openKidMod;
  window.familySaveKidMod = saveKidMod;
  window.familyRateMeal = rateMeal;
  window.familyAddNote = addNote;
  window.familyDeleteNote = deleteNote;
  window.familyOpenSettings = openSettings;
  window.familySaveSettings = saveFamilySettings;
  window.familyAppendKidMod = text => {
    const input = document.getElementById('family-kid-input');
    if (!input) return;
    const current = input.value.trim();
    input.value = current ? `${current}; ${text}` : text;
    input.focus();
  };

  initFamilyMode();
})();

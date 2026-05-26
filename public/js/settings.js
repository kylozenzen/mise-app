// ── settings.js ──────────────────────────────────────────────────────────────
// Onboarding, themes, export, clear data

// ── ONBOARDING ───────────────────────────────────────────────────────────────
let obSlide = 0;
const OB_TOTAL = 2;

function obCheck() {
  if (localStorage.getItem('mise_onboarded')) {
    document.getElementById('onboarding').classList.add('hidden');
  }
}

function obNext() {
  if (obSlide < OB_TOTAL - 1) {
    document.getElementById(`ob-slide-${obSlide}`).classList.add('exit');
    document.getElementById(`ob-slide-${obSlide}`).classList.remove('active');
    document.getElementById(`ob-dot-${obSlide}`).classList.remove('active');
    obSlide++;
    document.getElementById(`ob-slide-${obSlide}`).classList.add('active');
    document.getElementById(`ob-dot-${obSlide}`).classList.add('active');
    document.getElementById('ob-next-btn').textContent = 'Get Cooking →';
  } else {
    obFinish();
  }
}

function obFinish() {
  localStorage.setItem('mise_onboarded', '1');
  document.getElementById('onboarding').classList.add('hidden');
}

function obReplay() {
  closeSettingsSheet();
  obSlide = 0;
  document.querySelectorAll('.ob-slide').forEach((s, i) => {
    s.classList.remove('active', 'exit');
    if (i === 0) s.classList.add('active');
  });
  document.querySelectorAll('.ob-dot').forEach((d, i) => d.classList.toggle('active', i === 0));
  document.getElementById('ob-next-btn').textContent = 'Next →';
  document.getElementById('onboarding').classList.remove('hidden');
}

// ── SETTINGS SHEET ───────────────────────────────────────────────────────────
function openSettingsSheet() {
  document.getElementById('settings-sheet-overlay').classList.add('open');
}

function closeSettingsSheet() {
  document.getElementById('settings-sheet-overlay').classList.remove('open');
}

// ── THEMES ───────────────────────────────────────────────────────────────────
const THEME_COLORS = {
  ember:    '#0f0d09',
  midnight: '#0a0e1a',
  garden:   '#f5f2eb',
  dusk:     '#12091e',
  flame:    '#0a0a0a',
  spice:    '#f7efe4',
  volt:     '#000000',
};

function setTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('mise_theme', name);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', THEME_COLORS[name] || '#0f0d09');

  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === name);
    const label = el.querySelector('.theme-swatch-name');
    if (label) {
      const base = label.dataset.base || label.textContent.replace(' ✓', '');
      label.dataset.base = base;
      label.textContent  = el.dataset.theme === name ? base + ' ✓' : base;
    }
  });

  showToast(`${name.charAt(0).toUpperCase() + name.slice(1)} theme applied`);
}

function loadTheme() {
  setTheme(localStorage.getItem('mise_theme') || 'ember');
}

// ── DATA ─────────────────────────────────────────────────────────────────────
function exportData() {
  const blob = new Blob([JSON.stringify({ recipes, mealPlan, goals, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `mise-backup-${new Date().toISOString().slice(0,10)}.json` });
  a.click();
  URL.revokeObjectURL(url);
  showToast('Recipes exported ✓');
}

function clearAllData() {
  if (!confirm('This will delete all recipes and meal plans. Are you sure?')) return;
  ['mise_recipes','mise_mealplan','mise_goals','mise_onboarded'].forEach(k => localStorage.removeItem(k));
  location.reload();
}

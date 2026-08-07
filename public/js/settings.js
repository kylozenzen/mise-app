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
  garden:   '#FBF9F5',
  dusk:     '#12091e',
  flame:    '#0a0a0a',
  spice:    '#f7efe4',
  volt:     '#000000',
};

function setTheme(name, showNotification = true) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('mise_theme', name);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', THEME_COLORS[name] || '#FBF9F5');

  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === name);
    const label = el.querySelector('.theme-swatch-name');
    if (label) {
      const base = label.dataset.base || label.textContent.replace(' ✓', '');
      label.dataset.base = base;
      label.textContent  = el.dataset.theme === name ? base + ' ✓' : base;
    }
  });

  if (showNotification) {
    showToast(`${name.charAt(0).toUpperCase() + name.slice(1)} theme applied`);
  }
}

function loadTheme() {
  // Family-first Mise defaults to the warm Garden identity. Existing theme choices persist.
  setTheme(localStorage.getItem('mise_theme') || 'garden', false);
}

// ── DATA ─────────────────────────────────────────────────────────────────────
function exportData() {
  let family = null;
  try { family = JSON.parse(localStorage.getItem('mise_family_v2') || 'null'); } catch (_) { family = null; }
  const blob = new Blob([JSON.stringify({ recipes, mealPlan, goals, family, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `mise-backup-${new Date().toISOString().slice(0,10)}.json` });
  a.click();
  URL.revokeObjectURL(url);
  showToast('Mise data exported ✓');
}

function clearAllData() {
  if (!confirm('This will delete all recipes, meal plans, family notes, and meal feedback. Are you sure?')) return;
  ['mise_recipes','mise_mealplan','mise_goals','mise_onboarded','mise_family_v2','mise_family_theme_migrated'].forEach(k => localStorage.removeItem(k));
  location.reload();
}

// ── MISE 2.0 FAMILY MODE ASSETS ─────────────────────────────────────────────
function loadFamilyModeAssets() {
  if (!document.getElementById('mise-family-css')) {
    const link = document.createElement('link');
    link.id = 'mise-family-css';
    link.rel = 'stylesheet';
    link.href = '/css/family.css';
    document.head.appendChild(link);
  }

  if (!document.getElementById('mise-family-js')) {
    const script = document.createElement('script');
    script.id = 'mise-family-js';
    script.src = '/js/family.js';
    script.defer = true;
    document.body.appendChild(script);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', loadFamilyModeAssets, { once: true });
} else {
  loadFamilyModeAssets();
}

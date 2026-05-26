// ── app.js ───────────────────────────────────────────────────────────────────
// Shell: view routing, nav, toast, uid, SW registration, init

// ── UTILS ────────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// ── VIEW ROUTING ─────────────────────────────────────────────────────────────
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  if (name === 'planner') initPlanner();
}

function goBack() {
  switchView('library');
  renderLibrary();
}

function handleOverlayClick(e, id) {
  if (e.target.id === id) {
    // Close whichever sheet is open
    document.getElementById(id).classList.remove('open');
  }
}

// ── TOAST ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── KEYBOARD / VIEWPORT FIX ──────────────────────────────────────────────────
// When the mobile keyboard opens, the visual viewport shrinks.
// We detect this and shift any open sheet up so inputs stay visible.
function initViewportHandler() {
  if (!window.visualViewport) return;

  let lastHeight = window.visualViewport.height;

  function onViewportChange() {
    const vh       = window.visualViewport.height;
    const shrink   = lastHeight - vh;
    lastHeight     = vh;

    const sheets   = document.querySelectorAll('.sheet-overlay.open .sheet');
    const isOpen   = shrink > 80; // keyboard appeared (> 80px shrink)
    const isClosed = shrink < -80; // keyboard dismissed

    if (isOpen || isClosed) {
      sheets.forEach(sheet => {
        if (isOpen) {
          const offset = Math.max(0, shrink - 20); // 20px breathing room
          document.documentElement.style.setProperty('--kb-offset', `-${offset}px`);
          sheet.classList.add('keyboard-open');
        } else {
          document.documentElement.style.setProperty('--kb-offset', '0px');
          sheet.classList.remove('keyboard-open');
        }
      });
    }
  }

  window.visualViewport.addEventListener('resize', onViewportChange);

  // Also scroll focused input into view after a short delay
  document.addEventListener('focusin', e => {
    if (e.target.matches('input, textarea, select')) {
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 320); // wait for keyboard animation
    }
  });

  // Reset offset when sheets close
  document.addEventListener('click', e => {
    if (e.target.classList.contains('sheet-overlay') || e.target.closest('.icon-btn[onclick*="close"]')) {
      document.documentElement.style.setProperty('--kb-offset', '0px');
      document.querySelectorAll('.sheet').forEach(s => s.classList.remove('keyboard-open'));
      lastHeight = window.visualViewport.height;
    }
  });
}

// ── SERVICE WORKER ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Mise SW registered:', reg.scope))
      .catch(err => console.warn('SW registration failed:', err));
  });
}

// ── INIT ─────────────────────────────────────────────────────────────────────
loadTheme();
seedIfEmpty();
renderLibrary();
obCheck();
initViewportHandler();

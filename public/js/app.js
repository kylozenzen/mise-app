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
function initViewportHandler() {
  if (!window.visualViewport) return;

  let lastHeight = window.visualViewport.height;

  function onViewportChange() {
    const vh       = window.visualViewport.height;
    const shrink   = lastHeight - vh;
    lastHeight     = vh;

    const sheets   = document.querySelectorAll('.sheet-overlay.open .sheet');
    const isOpen   = shrink > 80;
    const isClosed = shrink < -80;

    if (isOpen || isClosed) {
      sheets.forEach(sheet => {
        if (isOpen) {
          const offset = Math.max(0, shrink - 20);
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

  document.addEventListener('focusin', e => {
    if (e.target.matches('input, textarea, select')) {
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 320);
    }
  });

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

// ── NEW: INTERCEPT QUICK-SHARE DEEP LINKS ────────────────────────────────────
(function checkIncomingShares() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('shared') === '1' && urlParams.get('data')) {
    try {
      // Unpack base64 compression parameters
      const decodedData = decodeURIComponent(atob(urlParams.get('data')));
      const sharedRecipe = JSON.parse(decodedData);
      
      // Enforce unique temporary runtime namespace identifier tag
      sharedRecipe.id = 'shared-' + Date.now();
      
      setTimeout(() => {
        // Scrape address parameters away so page reloads don't loop the user
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Push object schema straight to detail engine
        renderRecipeDetail(sharedRecipe);
      }, 150);
      
    } catch (err) {
      console.error("Deep link unpacking crash:", err);
      showToast("Could not parse shared recipe payload link.");
    }
  }
})();

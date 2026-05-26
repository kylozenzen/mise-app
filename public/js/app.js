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

// ── NEW OPTION B INTERCEPT ROUTER ENGINE ──────────────────────────────────────
(async function interceptSharedLinks() {
  const urlParams = new URLSearchParams(window.location.search);
  const blobShortId = urlParams.get('id');
  const fallbackRawData = urlParams.get('data');

  // Guard execution paths if no link identifiers are present
  if (!blobShortId && !fallbackRawData) return;

  try {
    let targetRecipe = null;

    // A. Handle standard cloud blob lookups natively
    if (blobShortId) {
      showToast('Opening shared recipe… 🍳');
      const res = await fetch(`/.netlify/functions/share-store?id=${blobShortId}`);
      if (!res.ok) throw new Error('Shared file could not be read from cloud bucket storage');
      targetRecipe = await res.json();
    } 
    // B. Revert safely to local client-side base64 strings if using legacy strings
    else if (fallbackRawData) {
      const decoded = decodeURIComponent(atob(fallbackRawData));
      targetRecipe = JSON.parse(decoded);
    }

    if (targetRecipe) {
      targetRecipe.id = 'shared-' + (blobShortId || Date.now());
      
      setTimeout(() => {
        // Scrub active address variables away cleanly so browser updates don't lock loop
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Suppress onboarding modals if a shared file entry link was triggered
        const onboardingNode = document.getElementById('onboarding');
        if (onboardingNode) onboardingNode.classList.add('hidden');

        if (typeof renderRecipeDetail === 'function') {
          renderRecipeDetail(targetRecipe);
        }
      }, 250);
    }

  } catch (err) {
    console.error("Shared system loading error:", err);
    showToast("Mise couldn't open this shared link.");
  }
})();

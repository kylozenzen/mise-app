// ── install.js ───────────────────────────────────────────────────────────────
// PWA install banner, native prompt, and iOS instructions

const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIosSafari  = /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
let deferredInstallPrompt = null;

// ── BANNER ───────────────────────────────────────────────────────────────────
function addInstallBannerStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #install-banner { position:fixed;left:12px;right:12px;bottom:76px;z-index:90;display:flex;align-items:center;gap:10px;max-width:460px;margin:0 auto;padding:12px 12px 12px 14px;background:var(--surface);border:1px solid var(--border-light);border-radius:var(--radius);color:var(--cream); }
    #install-banner-copy { flex:1;font-size:12px;line-height:1.4;color:var(--cream-dim); }
    #install-banner-copy strong { color:var(--cream); }
    #install-banner .btn-secondary { width:auto;margin:0;padding:8px 12px;font-size:11px; }
    #install-banner-dismiss { flex-shrink:0;border:0;background:transparent;color:var(--text-muted);font-size:20px;line-height:1;cursor:pointer;padding:4px; }
    @media (min-width:768px) { #install-banner { left:104px;right:auto;bottom:20px;margin:0;width:360px; } }
  `;
  document.head.appendChild(style);
}

function hideInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.remove();
}

function dismissInstallBanner() {
  localStorage.setItem('mise_install_dismissed', '1');
  hideInstallBanner();
}

function showInstallBanner() {
  if (isStandalone || localStorage.getItem('mise_install_dismissed') || document.getElementById('install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.innerHTML = `<div id="install-banner-copy"><strong>Install Mise</strong> — works offline, opens like an app</div>
    <button class="btn-secondary" onclick="triggerInstallFlow()">Install</button>
    <button id="install-banner-dismiss" onclick="dismissInstallBanner()" aria-label="Dismiss install prompt">×</button>`;
  document.body.appendChild(banner);
}

// ── INSTALL FLOW ─────────────────────────────────────────────────────────────
async function triggerInstallFlow() {
  if (isStandalone) return;
  if (!deferredInstallPrompt) {
    openInstallInstructions();
    return;
  }

  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  localStorage.setItem('mise_install_dismissed', '1');
  hideInstallBanner();
  if (choice.outcome === 'accepted') showToast('Mise installed ✓');
}

function openInstallInstructions() {
  closeSettingsSheet();
  if (document.getElementById('install-instructions-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay open';
  overlay.id = 'install-instructions-overlay';
  overlay.onclick = event => {
    if (event.target === overlay) closeInstallInstructions();
  };
  overlay.innerHTML = `<div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-header">
      <span class="sheet-title">Install Mise</span>
      <button class="icon-btn" onclick="closeInstallInstructions()" aria-label="Close install instructions">×</button>
    </div>
    <div class="sheet-body">
      <p style="margin:0;color:var(--cream-dim);font-size:14px;line-height:1.7">Tap the Share button, then choose <strong style="color:var(--cream)">Add to Home Screen</strong>.</p>
    </div>
  </div>`;
  document.getElementById('app').appendChild(overlay);
}

function closeInstallInstructions() {
  const overlay = document.getElementById('install-instructions-overlay');
  if (overlay) overlay.remove();
}

function updateInstallSettingsRow() {
  const row = document.getElementById('install-settings-row');
  if (row) row.hidden = isStandalone;
}

// ── EVENTS ───────────────────────────────────────────────────────────────────
addInstallBannerStyles();
updateInstallSettingsRow();

if (!isStandalone) {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    localStorage.setItem('mise_install_dismissed', '1');
    hideInstallBanner();
    const row = document.getElementById('install-settings-row');
    if (row) row.hidden = true;
  });

  if (isIosSafari) showInstallBanner();
}

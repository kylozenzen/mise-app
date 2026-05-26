// ── library.js ───────────────────────────────────────────────────────────────
// Recipe library: render, search, tag filter

let activeTag = null;

function renderLibrary(filter = '') {
  renderTagStrip();

  const content = document.getElementById('library-content');
  const q = filter.toLowerCase();

  const filtered = recipes.filter(r => {
    const matchText = !q ||
      r.title.toLowerCase().includes(q) ||
      (r.tags || []).some(t => t.toLowerCase().includes(q));
    const matchTag = !activeTag ||
      (r.tags || []).some(t => t.toLowerCase() === activeTag.toLowerCase());
    return matchText && matchTag;
  });

  if (!filtered.length && !recipes.length) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="big-icon">🍽️</div>
        <h3>No recipes yet</h3>
        <p>Tap + to add your first recipe by pasting text or filling out a form.</p>
      </div>`;
    return;
  }

  if (!filtered.length) {
    const reason = activeTag ? `tagged "${activeTag}"` : `matching "${filter}"`;
    content.innerHTML = `<div class="empty-state"><p style="color:var(--text-muted)">No recipes ${reason}</p></div>`;
    return;
  }

  let html = '<div class="library-grid">';
  filtered.forEach((r, i) => { html += recipeCardHTML(r, i); });
  html += '</div>';
  content.innerHTML = html;
}

function renderTagStrip() {
  const strip = document.getElementById('tag-filter-strip');
  if (!strip) return;

  // Collect all unique tags across all recipes
  const allTags = [...new Set(
    recipes.flatMap(r => r.tags || [])
  )].sort();

  if (!allTags.length) {
    strip.innerHTML = '';
    strip.style.display = 'none';
    return;
  }

  strip.style.display = 'flex';
  strip.innerHTML = [
    `<button class="tag-filter-chip ${!activeTag ? 'active' : ''}" onclick="setActiveTag(null)">All</button>`,
    ...allTags.map(t =>
      `<button class="tag-filter-chip ${activeTag === t ? 'active' : ''}" onclick="setActiveTag('${t}')">${t}</button>`
    )
  ].join('');
}

function setActiveTag(tag) {
  activeTag = tag;
  renderLibrary(document.getElementById('search-input')?.value || '');
}

function filterRecipes(val) {
  renderLibrary(val);
}

function recipeCardHTML(r, i) {
  const hasMacros = r.macros && (r.macros.cal || r.macros.protein);
  const tagsHTML  = (r.tags || []).slice(0, 2).map(t =>
    `<span class="tag ${activeTag === t ? 'tag-active' : ''}">${t}</span>`
  ).join('');
  const macroTag  = hasMacros ? `<span class="tag macro">${r.macros.cal}cal</span>` : '';
  return `
    <div class="recipe-card" onclick="openDetail('${r.id}')" style="animation-delay:${i * 40}ms">
      <div class="recipe-card-emoji">${r.emoji || '🍳'}</div>
      <div class="recipe-card-title">${r.title}</div>
      <div class="recipe-card-meta">
        ${macroTag}${tagsHTML}
        ${r.servings ? `<span class="tag">×${r.servings}</span>` : ''}
      </div>
    </div>`;
}

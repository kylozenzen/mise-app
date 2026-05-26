// ── detail.js ────────────────────────────────────────────────────────────────
// Render recipe details, scale servings, add to planner, edit/delete hooks

let currentRecipe = null;

// ALIAS FOR BACKWARD COMPATIBILITY WITH LIBRARY.JS CLICK HANDLERS
function openDetail(id) {
  renderRecipeDetail(id);
}

function renderRecipeDetail(recipeOrId) {
  let recipe = null;

  // Polymorphic check with loose comparison matching (==) to handle string vs number ID mismatches
  if (typeof recipeOrId === 'string' || typeof recipeOrId === 'number') {
    if (typeof recipes !== 'undefined' && Array.isArray(recipes)) {
      recipe = recipes.find(r => r.id == recipeOrId);
    }
  } else if (recipeOrId && typeof recipeOrId === 'object') {
    recipe = recipeOrId;
  }

  // ABSOLUTE FALLBACK: If lookup fails but we have a valid object backup structure, use it.
  if (!recipe && recipeOrId && typeof recipeOrId === 'object') {
    recipe = recipeOrId;
  }

  // Strict UI Guard Clause: Force a fallback title if an incomplete object slips through
  if (!recipe) {
    recipe = {
      id: recipeOrId || 'unknown',
      title: 'Untitled Recipe Layout',
      servings: 4,
      ingredients: [],
      steps: [],
      tags: [],
      emoji: '🍳'
    };
  }

  currentRecipe = recipe;
  
  // Force view routing switch before DOM rendering to prevent frozen animation states
  switchView('detail');

  const container = document.getElementById('detail-content');
  if (!container) return;

  const hasMacros = recipe.macros && Object.values(recipe.macros).some(v => v > 0);
  const isSharedView = String(recipe.id).startsWith('shared-');

  // Edit action routing hook visibility guard
  const editButton = document.getElementById('detail-edit-btn');
  if (editButton) {
    editButton.style.display = isSharedView ? 'none' : 'block';
    editButton.onclick = () => {
      if (typeof openEditSheet === 'function') openEditSheet(recipe.id);
    };
  }

  let html = '';

  // Injected Save Call-To-Action Banner if viewing external payload string
  if (isSharedView) {
    html += `
      <div class="shared-recipe-banner" style="background:var(--surface2);padding:16px;border:1px dashed var(--amber);margin-bottom:20px;border-radius:var(--radius-sm);text-align:center">
        <p style="margin:0 0 12px 0;font-size:13px;color:var(--cream-dim)">You are viewing a shared recipe preview.</p>
        <button class="btn-primary" onclick="saveSharedToLibrary()" style="width:100%">
          📥 Save to My Recipes
        </button>
      </div>
    `;
  }

  html += `
    <div class="detail-header">
      <div class="detail-emoji">${recipe.emoji || '🍳'}</div>
      <div class="detail-meta-wrap">
        <h2 class="detail-title">${recipe.title || 'Untitled Recipe'}</h2>
        <div class="detail-tags">
          ${(recipe.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    </div>

    <div class="detail-controls" style="display:flex;align-items:center;justify-content:between;margin:16px 20px;gap:12px">
      <div class="servings-control" style="margin:0">
        <span class="servings-label">Servings</span>
        <button class="servings-btn" onclick="scaleRecipe(-1)">−</button>
        <span class="servings-val" id="detail-servings">${recipe.servings || 4}</span>
        <button class="servings-btn" onclick="scaleRecipe(1)">+</button>
      </div>
      
      <div style="display:flex;gap:8px;margin-left:auto">
        <button class="add-to-plan-btn" onclick="if(typeof openATPSheet === 'function') openATPSheet('${recipe.id}')" style="padding:0 14px;height:44px;font-size:13px;margin:0" ${isSharedView ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>
          📅 Plan
        </button>
        <button class="icon-btn" onclick="shareCurrentRecipe()" title="Share Link" style="width:44px;height:44px;border:1px solid var(--border)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:18px;height:18px">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  if (hasMacros) {
    html += `
      <div class="detail-section">
        <div class="section-label">Macros · per serving</div>
        <div class="macros-strip">
          <div class="macro-pill"><span class="macro-pill-val" id="m-cal">${recipe.macros.cal || 0}</span><span class="macro-pill-label">Calories</span></div>
          <div class="macro-pill"><span class="macro-pill-val" id="m-protein">${recipe.macros.protein || 0}g</span><span class="macro-pill-label">Protein</span></div>
          <div class="macro-pill"><span class="macro-pill-val" id="m-carbs">${recipe.macros.carbs || 0}g</span><span class="macro-pill-label">Carbs</span></div>
          <div class="macro-pill"><span class="macro-pill-val" id="m-fat">${recipe.macros.fat || 0}g</span><span class="macro-pill-label">Fat</span></div>
        </div>
      </div>
    `;
  }

  // Ingredients with inline list completion toggle class bindings
  if (recipe.ingredients && recipe.ingredients.length) {
    html += `<div class="detail-section"><div class="section-label">Ingredients</div>`;
    recipe.ingredients.forEach((ing) => {
      const amtStr = ing.amount ? `<span class="ing-amount" data-base="${ing.amount}">${formatAmount(parseFloat(ing.amount))}</span> ` : '';
      const unitStr = ing.unit ? `<span class="ing-unit" style="color:var(--amber-bright);font-family:'DM Mono',monospace;font-size:13px">${ing.unit}</span> ` : '';
      html += `
        <div class="ingredient-list-item" onclick="this.classList.toggle('strike-completed')" style="user-select:none">
          ${amtStr}${unitStr}
          <span class="ing-name" style="text-align:right">${ing.name}</span>
        </div>`;
    });
    html += `</div>`;
  }

  // Method steps rendering pass
  if (recipe.steps && recipe.steps.length) {
    html += `<div class="detail-section"><div class="section-label">Method</div>`;
    recipe.steps.forEach((step, i) => {
      html += `
        <div class="step-item" onclick="this.classList.toggle('strike-completed')" style="user-select:none">
          <div class="step-item-num">${i + 1}</div>
          <div class="step-item-text">${step}</div>
        </div>`;
    });
    html += `</div>`;
  }

  // Footer cleanup control array action rows
  html += `
    <div class="detail-actions">
      <button class="action-btn danger" onclick="deleteRecipe('${recipe.id}')" ${isSharedView ? 'disabled style="opacity:0.3;cursor:not-allowed"' : ''}>Delete Recipe</button>
    </div>
  `;

  container.innerHTML = html;
}

function scaleRecipe(dir) {
  const el = document.getElementById('detail-servings');
  if (!el || !currentRecipe) return;
  let current = parseInt(el.textContent) || 4;
  let base = currentRecipe.servings || 4;
  let next = current + dir;
  if (next < 1) next = 1;
  el.textContent = next;

  const factor = next / base;

  // Scale embedded visual quantity fields instantly inside active DOM list elements
  document.querySelectorAll('.ing-amount').forEach(span => {
    const baseAmt = parseFloat(span.dataset.base);
    if (!isNaN(baseAmt)) {
      span.textContent = formatAmount(baseAmt * factor);
    }
  });
}

function formatAmount(num) {
  if (num === 0 || isNaN(num)) return '';
  if (Number.isInteger(num)) return String(num);
  const decimals = num % 1;
  if (Math.abs(decimals - 0.5) < 0.01) return Math.floor(num) > 0 ? `${Math.floor(num)} ½` : '½';
  if (Math.abs(decimals - 0.25) < 0.01) return Math.floor(num) > 0 ? `${Math.floor(num)} ¼` : '¼';
  if (Math.abs(decimals - 0.75) < 0.01) return Math.floor(num) > 0 ? `${Math.floor(num)} ¾` : '¾';
  if (Math.abs(decimals - 0.33) < 0.05) return Math.floor(num) > 0 ? `${Math.floor(num)} ⅓` : '⅓';
  if (Math.abs(decimals - 0.66) < 0.05) return Math.floor(num) > 0 ? `${Math.floor(num)} ⅔` : '⅔';
  return num.toFixed(1).replace(/\.0$/, '');
}

// ── SHARE SERIALIZATION MATRIX CONTROLLER ───────────────────────────────
function shareCurrentRecipe() {
  if (!currentRecipe) return;

  try {
    const jsonStr = JSON.stringify(currentRecipe);
    const encodedPayload = btoa(encodeURIComponent(jsonStr));
    const finalDeepLink = `${window.location.origin}/index.html?shared=1&data=${encodedPayload}`;

    if (navigator.share) {
      navigator.share({
        title: `Mise — ${currentRecipe.title}`,
        text: `Check out this recipe for ${currentRecipe.title}!`,
        url: finalDeepLink
      }).catch(err => console.log('Share canceled or blocked:', err));
    } else {
      navigator.clipboard.writeText(finalDeepLink).then(() => {
        showToast('Link copied to your clipboard! 📋');
      });
    }
  } catch (e) {
    console.error("Compression link breakdown:", e);
    showToast('Failed to build shared deep link metadata.');
  }
}

// ── IMPORT INTERCEPT COMMIT HANDLER ─────────────────────────────────────
function saveSharedToLibrary() {
  if (!currentRecipe) return;
  
  const localizedCopy = JSON.parse(JSON.stringify(currentRecipe));
  if (typeof uid === 'function') {
    localizedCopy.id = uid();
  } else {
    localizedCopy.id = Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }
  localizedCopy.createdAt = Date.now();
  
  if (typeof recipes !== 'undefined' && Array.isArray(recipes)) {
    recipes.unshift(localizedCopy);
    if (typeof save === 'function') save();
  }
  
  showToast('Recipe added to your personal collection! 🍳');
  
  switchView('library');
  if (typeof renderLibrary === 'function') renderLibrary();
}

function deleteRecipe(id) {
  if (!confirm('Delete this recipe?')) return;
  if (typeof recipes !== 'undefined' && Array.isArray(recipes)) {
    recipes = recipes.filter(r => r.id !== id);
    if (typeof save === 'function') save();
  }
  goBack();
  showToast('Recipe deleted');
}

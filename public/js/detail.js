// ── detail.js ────────────────────────────────────────────────────────────────
// Render recipe details, scale servings, add to planner, edit/delete hooks

let currentRecipe = null;

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
      if (typeof openEditForm === 'function') openEditForm(recipe.id);
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
          ${(recipe.tags || []).map(t => `<span class="detail-tag">#${t}</span>`).join('')}
        </div>
      </div>
    </div>

    <div class="detail-controls">
      <div class="scaler-wrap">
        <span class="scaler-label">Servings</span>
        <div class="scaler">
          <button onclick="scaleRecipe(-1)">−</button>
          <span id="detail-servings">${recipe.servings || 4}</span>
          <button onclick="scaleRecipe(1)">+</button>
        </div>
      </div>
      
      <div style="display:flex;gap:8px">
        <button class="btn-secondary" onclick="if(typeof openATPSheet === 'function') openATPSheet('${recipe.id}')" style="padding:0 14px;height:36px;font-size:12px" ${isSharedView ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>
          📅 Plan
        </button>
        <button class="icon-btn" onclick="shareCurrentRecipe()" title="Share Link" style="border:1px solid var(--border);background:var(--surface2);width:36px;height:36px;display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  if (hasMacros) {
    html += `
      <div class="detail-macros-card">
        <div class="detail-macro"><span class="detail-macro-val" id="m-cal">${recipe.macros.cal || 0}</span><span class="detail-macro-lbl">Calories</span></div>
        <div class="detail-macro"><span class="detail-macro-val" id="m-protein">${recipe.macros.protein || 0}g</span><span class="detail-macro-lbl">Protein</span></div>
        <div class="detail-macro"><span class="detail-macro-val" id="m-carbs">${recipe.macros.carbs || 0}g</span><span class="detail-macro-lbl">Carbs</span></div>
        <div class="detail-macro"><span class="detail-macro-val" id="m-fat">${recipe.macros.fat || 0}g</span><span class="detail-macro-lbl">Fat</span></div>
      </div>
    `;
  }

  // Ingredients with inline list completion toggle class bindings
  html += `<div class="detail-section-title">Ingredients</div><ul class="detail-ingredients">`;
  (recipe.ingredients || []).forEach((ing) => {
    const amtStr = ing.amount ? `<span class="ing-amt" data-base="${ing.amount}">${formatAmount(parseFloat(ing.amount))}</span> ` : '';
    const unitStr = ing.unit ? `<span class="ing-unit">${ing.unit}</span> ` : '';
    html += `<li onclick="this.classList.toggle('strike-completed')">${amtStr}${unitStr}<span class="ing-name">${ing.name}</span></li>`;
  });
  html += `</ul>`;

  html += `<div class="detail-section-title">Steps</div><ol class="detail-steps">`;
  (recipe.steps || []).forEach(step => {
    html += `<li onclick="this.classList.toggle('strike-completed')">${step}</li>`;
  });
  html += `</ol>`;

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
  document.querySelectorAll('.ing-amt').forEach(span => {
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

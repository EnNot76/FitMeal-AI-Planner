// ============================
// CONFIG
// ============================

// URL base del backend Express (Render).
// - Se apri la pagina direttamente da Render (https://fitmeal-ai-planner.onrender.com)
//   puoi lasciare vuoto: API_BASE = '' e le fetch useranno /api/...
// - Se usi GitHub Pages, metti qui l'URL completo del backend Render.
const API_BASE = ''; // esempio per Pages: 'https://fitmeal-ai-planner.onrender.com'

// ============================
// DATI E STATO
// ============================

const RECIPES_DB = [
  { id: 1, name: "Omelette di Albumi e Spinaci", ingredients: ["albumi", "spinaci", "olio", "parmigiano"], type: "Colazione", difficulty: "Facile", macros: { p: 26, c: 3, f: 6, kcal: 170 }, tags: ["high-protein", "low-carb"] },
  { id: 2, name: "Pollo Grigliato con Broccoli", ingredients: ["pollo", "broccoli", "olio", "limone"], type: "Pranzo", difficulty: "Facile", macros: { p: 42, c: 8, f: 5, kcal: 245 }, tags: ["high-protein", "low-carb", "low-fat"] },
  { id: 3, name: "Salmone al Vapore con Asparagi", ingredients: ["salmone", "asparagi", "olio"], type: "Cena", difficulty: "Facile", macros: { p: 34, c: 4, f: 18, kcal: 314 }, tags: ["high-protein", "low-carb"] },
  { id: 4, name: "Tartare di Manzo Light", ingredients: ["manzo", "limone", "senape", "olio", "capperi"], type: "Cena", difficulty: "Media", macros: { p: 28, c: 1, f: 9, kcal: 197 }, tags: ["high-protein", "low-carb"] },
  { id: 5, name: "Fiocchi di Latte con Noci e Berries", ingredients: ["fiocchi di latte", "noci", "mirtilli", "miele"], type: "Spuntino", difficulty: "Facile", macros: { p: 18, c: 15, f: 8, kcal: 204 }, tags: ["high-protein"] },
  { id: 6, name: "Riso Basmati con Tonno e Zucchine", ingredients: ["riso", "tonno", "zucchine", "olio"], type: "Pranzo", difficulty: "Facile", macros: { p: 30, c: 45, f: 6, kcal: 354 }, tags: ["high-protein", "low-fat"] },
  { id: 7, name: "Shaker Proteico Avena e Banana", ingredients: ["latte", "proteine in polvere", "avena", "banana"], type: "Colazione", difficulty: "Facile", macros: { p: 38, c: 35, f: 4, kcal: 328 }, tags: ["high-protein", "low-fat"] },
  { id: 8, name: "Frittata al Forno con Feta", ingredients: ["uova", "zucchine", "feta", "cipolla"], type: "Cena", difficulty: "Facile", macros: { p: 22, c: 6, f: 14, kcal: 238 }, tags: ["high-protein"] },
  { id: 9, name: "Merluzzo in Umido al Pomodoro", ingredients: ["merluzzo", "pomodoro", "origano", "aglio", "olio"], type: "Cena", difficulty: "Facile", macros: { p: 24, c: 5, f: 4, kcal: 152 }, tags: ["high-protein", "low-carb", "low-fat"] },
  { id: 10, name: "Pancake Proteici Fit", ingredients: ["albumi", "avena", "yogurt greco", "banana"], type: "Colazione", difficulty: "Media", macros: { p: 25, c: 28, f: 3, kcal: 239 }, tags: ["high-protein", "low-fat"] },
];

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const MEAL_TYPES = ["Colazione", "Pranzo", "Cena"];

let activeTab = 'pantry';
let pantry = ['pollo', 'broccoli', 'albumi', 'riso', 'tonno'];
let macroFilter = 'all';
let weeklyPlan = {};

let aiRecipe = null;
let isGeneratingRecipe = false;
let recipeError = '';

let chatMessages = [
  {
    role: 'assistant',
    text: 'Ciao atleta! Sono il tuo Coach & Chef Nutrizionista. Chiedimi pure come ottimizzare i macro della tua dispensa, cosa mangiare pre/post-workout o come sostituire gli ingredienti! 🏋️‍♂️🍳'
  }
];
let isSendingMsg = false;

// ============================
// UTILS
// ============================

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function filteredAndSuggestedRecipes() {
  return RECIPES_DB.map(recipe => {
    const ownedIngredients = recipe.ingredients.filter(ing => pantry.includes(ing));
    const missingIngredients = recipe.ingredients.filter(ing => !pantry.includes(ing));
    const matchPercentage = Math.round((ownedIngredients.length / recipe.ingredients.length) * 100);
    return { ...recipe, ownedIngredients, missingIngredients, matchPercentage };
  })
    .filter(recipe => macroFilter === 'all' ? true : recipe.tags.includes(macroFilter))
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

// ============================
// RENDER ENTRY POINT
// ============================

function render() {
  renderMain();
  renderTabs();
}

function renderMain() {
  const main = document.getElementById('main-content');
  if (!main) return;

  let html = '';

  if (recipeError) {
    html += `
      <div class="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start gap-3 animate-scaleIn shadow-sm">
        <div class="text-red-500 shrink-0 mt-0.5">⚠️</div>
        <p class="text-xs font-semibold flex-1">${escapeHtml(recipeError)}</p>
        <button id="btn-close-error" class="text-red-400 hover:text-red-600 text-xs">✕</button>
      </div>
    `;
  }

  if (isGeneratingRecipe) {
    html += `
      <div class="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 my-4 shadow-sm animate-pulse">
        <div class="animate-spin text-indigo-500 mx-auto text-3xl">✨</div>
        <h3 class="text-base font-bold text-slate-800">Il Nutrizionista IA sta calcolando il bilanciamento ideale...</h3>
        <div class="flex justify-center gap-1">
          <span class="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style="animation-delay:0.1s"></span>
          <span class="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style="animation-delay:0.2s"></span>
          <span class="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style="animation-delay:0.3s"></span>
        </div>
      </div>
    `;
  }

  if (activeTab === 'pantry') {
    html += buildPantrySection();
  } else if (activeTab === 'recipes') {
    html += buildRecipesSection();
  } else if (activeTab === 'coach') {
    html += buildCoachSection();
  } else if (activeTab === 'planner') {
    html += buildPlannerSection();
  }

  main.innerHTML = html;
  attachSectionEvents();
}

// ============================
// TAB BAR
// ============================

function renderTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const tab = btn.getAttribute('data-tab');
    btn.classList.remove('tab-active');
    if (tab === activeTab) {
      btn.classList.add('tab-active');
    }
    btn.onclick = () => {
      activeTab = tab;
      render();
    };
  });
}

// ============================
// SECTION: DISPENSA
// ============================

function buildPantrySection() {
  return `
    <section class="space-y-4">
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
          I tuoi mattoni nutrizionali (Dispensa)
        </h2>
        <div class="flex gap-2 mb-4">
          <input
            id="input-pantry"
            type="text"
            placeholder="Es. pollo, tonno, albumi, riso..."
            class="flex-1 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
          />
          <button id="btn-add-pantry"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl font-bold text-sm">
            Aggiungi
          </button>
        </div>
        <div id="pantry-list" class="flex flex-wrap gap-2 text-xs"></div>
      </div>

      <div class="bg-gradient-to-br from-indigo-50 to-violet-50/50 p-5 rounded-3xl border border-indigo-100 flex items-center justify-between gap-4 shadow-sm">
        <div class="space-y-1">
          <div class="flex items-center gap-1.5 text-indigo-600 text-xs font-black uppercase tracking-wider">
            🎯 <span>Ottimizzazione Obiettivi</span>
          </div>
          <p class="text-slate-600 text-xs leading-relaxed max-w-sm">
            L'app calcolerà i macronutrienti esatti per darti il massimo supporto durante l'ipertrofia o la definizione.
          </p>
        </div>
      </div>
    </section>
  `;
}

function renderPantryList() {
  const pantryListEl = document.getElementById('pantry-list');
  if (!pantryListEl) return;
  pantryListEl.innerHTML = pantry.map(item => `
    <span class="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold uppercase tracking-wide">
      ${escapeHtml(item)}
      <button data-remove="${escapeHtml(item)}" class="text-slate-400 hover:text-red-500 text-[10px]">✕</button>
    </span>
  `).join('');

  document.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-remove');
      const idx = pantry.indexOf(val);
      if (idx >= 0) {
        pantry.splice(idx, 1);
        render();
      }
    });
  });
}

// ============================
// SECTION: RICETTE
// ============================

function buildFilterButtonsHtml() {
  const filters = [
    { label: 'Tutte', value: 'all' },
    { label: '💪 High Protein', value: 'high-protein' },
    { label: '🥑 Low Carb', value: 'low-carb' },
    { label: '🏃‍♂️ Low Fat', value: 'low-fat' }
  ];
  return filters.map(f => `
    <button data-filter="${f.value}"
      class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border ${
        macroFilter === f.value
          ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-100'
          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
      }">
      ${escapeHtml(f.label)}
    </button>
  `).join('');
}

function buildRecipesSection() {
  const recipes = filteredAndSuggestedRecipes();
  return `
    <section class="space-y-4">
      <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        ${buildFilterButtonsHtml()}
      </div>

      <section id="ai-recipe-section">
        ${aiRecipe ? buildAiRecipeCard(aiRecipe) : `
          <div class="text-[11px] text-slate-500">
            Nessuna ricetta IA ancora generata. Clicca “Analizza Macro IA ✨” in alto per crearne una.
          </div>
        `}
      </section>

      <div class="space-y-3">
        ${recipes.map(buildRecipeCardHtml).join('')}
      </div>
    </section>
  `;
}

function buildAiRecipeCard(recipe) {
  return `
    <div class="bg-gradient-to-b from-indigo-50/70 to-white border border-indigo-100 p-5 rounded-3xl shadow-md space-y-4 animate-scaleIn">
      <div>
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <span class="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
            RICETTA NUTRIZIONISTA IA ✨
          </span>
          <span class="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
            ${escapeHtml(recipe.type || '')}
          </span>
        </div>
        <h3 class="text-xl font-black text-slate-900">${escapeHtml(recipe.name || '')}</h3>
      </div>

      <div class="grid grid-cols-4 gap-2 text-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span class="text-[8px] font-black tracking-wider text-slate-400 block uppercase">PRO</span>
          <span class="text-xs font-black text-indigo-600">${recipe.macros?.p ?? '?'} g</span>
        </div>
        <div>
          <span class="text-[8px] font-black tracking-wider text-slate-400 block uppercase">CARB</span>
          <span class="text-xs font-black text-amber-600">${recipe.macros?.c ?? '?'} g</span>
        </div>
        <div>
          <span class="text-[8px] font-black tracking-wider text-slate-400 block uppercase">GRASSI</span>
          <span class="text-xs font-black text-emerald-600">${recipe.macros?.f ?? '?'} g</span>
        </div>
        <div>
          <span class="text-[8px] font-black tracking-wider text-slate-400 block uppercase">CALORIE</span>
          <span class="text-xs font-black text-rose-600">${recipe.macros?.kcal ?? '?'} kcal</span>
        </div>
      </div>

      <div class="text-xs text-indigo-900 bg-indigo-50 p-3 rounded-xl border border-indigo-100 leading-relaxed font-medium">
        <strong>Focus Performance:</strong> ${escapeHtml(recipe.fitnessBenefit || '')}
      </div>

      <div class="text-[11px] mt-2">
        <div class="font-bold text-slate-600 mb-1">Preparazione:</div>
        <ol class="list-decimal ml-4 space-y-1">
          ${(recipe.instructions || []).map(step => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
      </div>

      ${buildAddToPlanButtonHtml(recipe.name || '')}
    </div>
  `;
}

function buildRecipeCardHtml(recipe) {
  return `
    <div class="bg-white border border-slate-200 p-4 rounded-3xl space-y-3 shadow-sm">
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded border border-indigo-100">
              ${recipe.matchPercentage}% Ingredienti
            </span>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              ${escapeHtml(recipe.type)}
            </span>
          </div>
          <h4 class="font-extrabold text-slate-900 text-sm">${escapeHtml(recipe.name)}</h4>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-1 text-center bg-slate-50 p-2 rounded-xl text-[11px] font-semibold border border-slate-100">
        <div><span class="text-slate-400 block text-[9px] font-bold">P</span> <span class="text-indigo-600">${recipe.macros.p}g</span></div>
        <div><span class="text-slate-400 block text-[9px] font-bold">C</span> <span class="text-amber-600">${recipe.macros.c}g</span></div>
        <div><span class="text-slate-400 block text-[9px] font-bold">F</span> <span class="text-emerald-600">${recipe.macros.f}g</span></div>
        <div><span class="text-slate-400 block text-[9px] font-bold">KCAL</span> <span class="text-rose-600">${recipe.macros.kcal}</span></div>
      </div>
      <div class="text-[11px] text-slate-500 font-medium">
        ${recipe.missingIngredients.length > 0
          ? `<p><span class="text-rose-500 font-bold">Manca: </span>${escapeHtml(recipe.missingIngredients.join(', '))}</p>`
          : ''}
      </div>
      ${buildAddToPlanButtonHtml(recipe.name)}
    </div>
  `;
}

function buildAddToPlanButtonHtml(recipeName) {
  return `
    <div class="w-full">
      <button data-open-plan="${escapeHtml(recipeName)}"
        class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold py-1.5 rounded-xl text-slate-600">
        Aggiungi al Piano Settimanale
      </button>
      <div class="plan-dropdown hidden mt-2 bg-slate-50 border border-slate-200 p-2 rounded-xl grid grid-cols-2 gap-1">
        ${DAYS.map(day => `
          <div class="flex justify-between items-center p-1 bg-white rounded-lg border border-slate-100 shadow-sm">
            <span class="text-[10px] text-slate-500 font-bold">${escapeHtml(day.substring(0, 3))}</span>
            <div class="flex gap-1">
              <button data-add="${escapeHtml(day)}-Pranzo-${escapeHtml(recipeName)}"
                class="p-1 bg-slate-50 rounded hover:bg-indigo-50 text-orange-500 border border-slate-100">☀️</button>
              <button data-add="${escapeHtml(day)}-Cena-${escapeHtml(recipeName)}"
                class="p-1 bg-slate-50 rounded hover:bg-indigo-50 text-indigo-600 border border-slate-100">🌙</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ============================
// SECTION: COACH IA
// ============================

function buildCoachSection() {
  return `
    <section class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col h-[60vh]">
      <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
        Coach Nutrizionale IA
      </h2>
      <div id="chat-box"
        class="flex-1 min-h-[150px] max-h-[240px] overflow-y-auto border border-slate-100 rounded-xl p-2 text-xs space-y-2 bg-slate-50 scrollbar-none">
      </div>
      <div class="mt-2 flex gap-2">
        <input id="chat-input" type="text"
          placeholder="Chiedi qualcosa al Coach (pre-workout, macro, ecc.)"
          class="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs" />
        <button id="chat-send"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 rounded-xl text-xs font-bold">
          Invia
        </button>
      </div>
      <div id="chat-status" class="text-[10px] text-slate-400 mt-1"></div>
    </section>
  `;
}

function renderChat() {
  const box = document.getElementById('chat-box');
  if (!box) return;
  box.innerHTML = chatMessages.map(m => `
    <div class="flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}">
      <div class="max-w-[80%] rounded-xl px-3 py-2 text-xs ${
        m.role === 'user'
          ? 'bg-indigo-600 text-white rounded-br-none'
          : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
      }">
        ${escapeHtml(m.text)}
      </div>
    </div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}

// ============================
// SECTION: PLANNER
// ============================

function buildPlannerSection() {
  return `
    <section class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-500">
          Pianificazione Allenamento & Nutrizione
        </h2>
        <button id="btn-clear-plan"
          class="text-[10px] bg-red-50 border border-red-200 text-red-600 font-bold px-2 py-1.5 rounded-md hover:bg-red-100">
          Svuota Piano
        </button>
      </div>
      <div class="space-y-3">
        ${DAYS.map(day => `
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div class="bg-slate-50 px-4 py-2 border-b border-slate-200/80">
              <span class="text-xs font-black text-indigo-600 uppercase tracking-wide">
                ${escapeHtml(day)}
              </span>
            </div>
            <div class="divide-y divide-slate-100 text-xs font-semibold">
              ${MEAL_TYPES.map(type => {
                const key = `${day}-${type}`;
                const meal = weeklyPlan[key];
                return `
                  <div class="px-4 py-3 flex justify-between items-center">
                    <span class="text-[10px] text-slate-400 font-bold uppercase w-20">
                      ${escapeHtml(type)}
                    </span>
                    <span class="${meal ? 'text-slate-800' : 'text-slate-400 italic'}">
                      ${meal ? escapeHtml(meal) : 'Riposo Nutrizionale'}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

// ============================
// EVENTI SEZIONI
// ============================

function attachSectionEvents() {
  // chiudi errore
  const btnCloseError = document.getElementById('btn-close-error');
  if (btnCloseError) {
    btnCloseError.addEventListener('click', () => {
      recipeError = '';
      render();
    });
  }

  // Dispensa
  if (activeTab === 'pantry') {
    const inputPantry = document.getElementById('input-pantry');
    const btnAddPantry = document.getElementById('btn-add-pantry');
    if (inputPantry && btnAddPantry) {
      btnAddPantry.addEventListener('click', () => {
        const v = inputPantry.value.trim().toLowerCase();
        if (v && !pantry.includes(v)) {
          pantry.push(v);
          inputPantry.value = '';
          render();
        }
      });
      inputPantry.addEventListener('keydown', e => {
        if (e.key === 'Enter') btnAddPantry.click();
      });
    }
    renderPantryList();
  }

  // Ricette: filtri, piano
  if (activeTab === 'recipes') {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        macroFilter = btn.getAttribute('data-filter');
        render();
      });
    });

    document.querySelectorAll('[data-open-plan]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.nextElementSibling;
        document.querySelectorAll('.plan-dropdown').forEach(d => d.classList.add('hidden'));
        if (panel) panel.classList.toggle('hidden');
      });
    });

    document.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const parts = btn.getAttribute('data-add').split('-');
        const day = parts[0];
        const meal = parts[1];
        const recipe = parts.slice(2).join('-'); // in caso di '-' nel nome
        weeklyPlan[`${day}-${meal}`] = recipe;
        activeTab = 'planner';
        render();
      });
    });
  }

  // Planner
  if (activeTab === 'planner') {
    const btnClearPlan = document.getElementById('btn-clear-plan');
    if (btnClearPlan) {
      btnClearPlan.addEventListener('click', () => {
        weeklyPlan = {};
        render();
      });
    }
  }

  // Coach IA
  if (activeTab === 'coach') {
    renderChat();
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatStatus = document.getElementById('chat-status');

    async function sendChat() {
      const text = chatInput.value.trim();
      if (!text || isSendingMsg) return;

      chatInput.value = '';
      chatMessages.push({ role: 'user', text });
      renderChat();
      if (chatStatus) chatStatus.textContent = 'Il Coach sta analizzando i macro...';
      isSendingMsg = true;

      try {
        const res = await fetch(`${API_BASE}/api/gemini-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            pantry,
            history: chatMessages
          })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        chatMessages.push({
          role: 'assistant',
          text: data.reply || 'Errore di comunicazione con i tuoi muscoli. Riprova!'
        });
      } catch (err) {
        console.error(err);
        chatMessages.push({
          role: 'assistant',
          text: 'Connessione di rete debole o errore server. Riprova ad inviare la domanda.'
        });
      } finally {
        isSendingMsg = false;
        renderChat();
        if (chatStatus) chatStatus.textContent = '';
      }
    }

    if (chatSend && chatInput) {
      chatSend.addEventListener('click', sendChat);
      chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendChat();
      });
    }
  }

  // Pulsante header: Analizza Macro IA
  const btnGenerate = document.getElementById('btn-generate-recipe');
  if (btnGenerate) {
    btnGenerate.onclick = generateRecipe;
  }
}

// ============================
// API: RICETTA IA
// ============================

async function generateRecipe() {
  if (!pantry.length) {
    recipeError = "Metti qualcosa in dispensa prima di chiedere i macro all'IA!";
    render();
    return;
  }

  recipeError = '';
  aiRecipe = null;
  isGeneratingRecipe = true;
  activeTab = 'recipes';
  render();

  try {
    const res = await fetch(`${API_BASE}/api/gemini-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pantry })
    });

    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }

    const recipe = await res.json();
    aiRecipe = recipe;
  } catch (err) {
    console.error(err);
    recipeError = "Errore nella generazione dei macro. Riprova tra poco.";
  } finally {
    isGeneratingRecipe = false;
    activeTab = 'recipes';
    render();
  }
}

// ============================
// INIT
// ============================

document.addEventListener('DOMContentLoaded', () => {
  render();
});

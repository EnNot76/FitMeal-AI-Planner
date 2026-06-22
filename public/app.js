const pantry = ['pollo', 'broccoli', 'albumi', 'riso', 'tonno'];
const chatMessages = [
  {
    role: 'assistant',
    text: 'Ciao atleta! Sono il tuo Coach & Chef Nutrizionista. Chiedimi pure come ottimizzare i macro della tua dispensa, cosa mangiare pre/post-workout o come sostituire gli ingredienti! 🏋️‍♂️🍳'
  }
];

const pantryListEl = document.getElementById('pantry-list');
const pantryInputEl = document.getElementById('input-pantry');
const btnAddPantry = document.getElementById('btn-add-pantry');

const btnGenerateRecipe = document.getElementById('btn-generate-recipe');
const recipeLoadingEl = document.getElementById('recipe-loading');
const recipeErrorEl = document.getElementById('recipe-error');
const recipeContainerEl = document.getElementById('recipe-container');

const chatBoxEl = document.getElementById('chat-box');
const chatInputEl = document.getElementById('chat-input');
const chatSendEl = document.getElementById('chat-send');
const chatStatusEl = document.getElementById('chat-status');

// ---- Utils ----
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

// ---- Pantry UI ----
function renderPantry() {
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
        renderPantry();
      }
    });
  });
}

btnAddPantry.addEventListener('click', () => {
  const v = pantryInputEl.value.trim().toLowerCase();
  if (v && !pantry.includes(v)) {
    pantry.push(v);
    pantryInputEl.value = '';
    renderPantry();
  }
});

pantryInputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnAddPantry.click();
});

// ---- Recipe ----
async function generateRecipe() {
  if (!pantry.length) {
    recipeErrorEl.textContent = "Metti qualcosa in dispensa prima di chiedere i macro all'IA!";
    recipeErrorEl.classList.remove('hidden');
    return;
  }

  recipeErrorEl.classList.add('hidden');
  recipeContainerEl.innerHTML = '';
  recipeLoadingEl.classList.remove('hidden');

  try {
    const res = await fetch('/api/gemini-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pantry })
    });

    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }

    const recipe = await res.json();
    // render semplice
    recipeContainerEl.innerHTML = `
      <div class="space-y-1">
        <div class="text-[10px] text-slate-500 uppercase">Tipo: ${escapeHtml(recipe.type)}</div>
        <h3 class="text-sm font-black text-slate-900">${escapeHtml(recipe.name)}</h3>
        <div class="text-[11px] text-slate-500">Difficoltà: ${escapeHtml(recipe.difficulty)}</div>
      </div>
      <div class="text-[11px]">
        <div class="font-bold text-slate-600 mt-2 mb-1">Macronutrienti (per porzione):</div>
        <div>Proteine: <span class="font-semibold text-indigo-600">${recipe.macros.p} g</span></div>
        <div>Carboidrati: <span class="font-semibold text-amber-600">${recipe.macros.c} g</span></div>
        <div>Grassi: <span class="font-semibold text-emerald-600">${recipe.macros.f} g</span></div>
        <div>Calorie: <span class="font-semibold text-rose-600">${recipe.macros.kcal} kcal</span></div>
      </div>
      <div class="text-[11px] mt-2">
        <div class="font-bold text-slate-600 mb-1">Focus Performance:</div>
        <p>${escapeHtml(recipe.fitnessBenefit)}</p>
      </div>
      <div class="text-[11px] mt-2">
        <div class="font-bold text-slate-600 mb-1">Preparazione:</div>
        <ol class="list-decimal ml-4 space-y-1">
          ${(recipe.instructions || []).map(step => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
      </div>
    `;
  } catch (err) {
    console.error(err);
    recipeErrorEl.textContent = "Errore nella generazione dei macro. Riprova tra poco.";
    recipeErrorEl.classList.remove('hidden');
  } finally {
    recipeLoadingEl.classList.add('hidden');
  }
}

btnGenerateRecipe.addEventListener('click', generateRecipe);

// ---- Chat ----
function renderChat() {
  chatBoxEl.innerHTML = chatMessages.map(m => `
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
  chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
}

async function sendChat() {
  const text = chatInputEl.value.trim();
  if (!text) return;

  chatInputEl.value = '';
  chatMessages.push({ role: 'user', text });
  renderChat();

  chatStatusEl.textContent = 'Il Coach sta analizzando i macro...';

  try {
    const res = await fetch('/api/gemini-chat', {
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
    chatMessages.push({ role: 'assistant', text: data.reply || 'Errore di comunicazione. Riprova!' });
  } catch (err) {
    console.error(err);
    chatMessages.push({
      role: 'assistant',
      text: 'Connessione di rete debole o errore server. Riprova ad inviare la domanda.'
    });
  } finally {
    chatStatusEl.textContent = '';
    renderChat();
  }
}

chatSendEl.addEventListener('click', sendChat);
chatInputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChat();
});

// ---- Init ----
renderPantry();
renderChat();

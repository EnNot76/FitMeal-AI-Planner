import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, ChefHat, Calendar, ShoppingCart, X, Sun, Moon, 
  Utensils, Sparkles, Send, Loader2, AlertCircle, BookmarkPlus,
  Dumbbell, Flame, Target, Award
} from 'lucide-react';

// --- DATABASE RICETTE PER SPORTIVI (Database con Macronutrienti) ---
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

const fitnessRecipeSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    type: { type: "STRING" }, 
    difficulty: { type: "STRING" }, 
    ingredients: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    missingIngredients: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    instructions: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    macros: {
      type: "OBJECT",
      properties: {
        p: { type: "NUMBER", description: "Grammi di proteine stimati" },
        c: { type: "NUMBER", description: "Grammi di carboidrati stimati" },
        f: { type: "NUMBER", description: "Grammi di grassi stimati" },
        kcal: { type: "NUMBER", description: "Calorie totali stimate" }
      },
      required: ["p", "c", "f", "kcal"]
    },
    fitnessBenefit: { type: "STRING", description: "Spiegazione del perché questa ricetta è ottima per il recupero o la performance sportiva" }
  },
  required: ["name", "type", "difficulty", "ingredients", "missingIngredients", "instructions", "macros", "fitnessBenefit"]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('pantry'); // pantry, recipes, ai-chef, planner
  const [pantryItems, setPantryItems] = useState(['pollo', 'broccoli', 'albumi', 'riso', 'tonno']);
  const [newItem, setNewItem] = useState('');
  const [macroFilter, setMacroFilter] = useState('all'); // all, high-protein, low-carb, low-fat
  
  const [weeklyPlan, setWeeklyPlan] = useState({});
  const [aiRecipe, setAiRecipe] = useState(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState(null);

  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Ciao atleta! Sono il tuo Coach & Chef Nutrizionista. Chiedimi pure come ottimizzare i macro della tua dispensa, cosa mangiare pre/post-workout o come sostituire gli ingredienti! 🏋️‍♂️🍳' }
  ]);
  const [userMsg, setUserMsg] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSendingMsg]);

  // --- CLIENT API GEMINI ---
  const callGemini = async (prompt, systemInstruction = "", responseSchema = null) => {
    const apiKey = ""; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    
    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    
    if (responseSchema) {
      payload.generationConfig = {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      };
    }

    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        return result;
      } catch (error) {
        if (i === 4) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  // --- CHIAMATA AI: GENERATORE RICETTE FIT ---
  const generateAiRecipe = async () => {
    if (pantryItems.length === 0) {
      setRecipeError("Metti qualcosa in dispensa prima di chiedere i macro all'IA!");
      return;
    }

    setIsGeneratingRecipe(true);
    setRecipeError(null);
    setAiRecipe(null);

    const pantryString = pantryItems.join(', ');
    const systemPrompt = "Sei un Biologo Nutrizionista Sportivo e Chef di altissimo livello. Il tuo compito è ideare una ricetta adatta ad atleti (focalizzata su parametri ad alto contenuto proteico, a basso contenuto di carboidrati o a basso contenuto di grassi) basandoti sugli ingredienti dell'utente. Calcola una stima realistica dei macronutrienti per porzione singola. Rispondi in italiano compilando rigorosamente lo schema JSON.";
    const userPrompt = `Dispensa attuale: ${pantryString}. Genera una ricetta fit personalizzata, calcola i macronutrienti accuratamente e descrivi l'utilità sportiva.`;

    try {
      const data = await callGemini(userPrompt, systemPrompt, fitnessRecipeSchema);
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) {
        setAiRecipe(JSON.parse(textResponse));
        setActiveTab('recipes');
      } else {
        throw new Error("Nessun dato ricevuto dall'IA");
      }
    } catch (err) {
      console.error(err);
      setRecipeError("Errore nella generazione dei macro. Riprova tra poco.");
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  // --- CHIAMATA AI: COACH CHAT ---
  const handleSendMessage = async () => {
    if (!userMsg.trim() || isSendingMsg) return;

    const messageToSend = userMsg;
    setUserMsg('');
    setChatMessages(prev => [...prev, { role: 'user', text: messageToSend }]);
    setIsSendingMsg(true);

    const pantryString = pantryItems.join(', ');
    const systemPrompt = `Sei il "Coach Nutrizionale FitPrep ✨", un esperto di nutrizione per sportivi, bodybuilding e fitness in generale. Rispondi in modo motivante, preciso ed estremamente tecnico riguardo a calorie e macronutrienti, tenendo conto che l'utente ha attualmente a disposizione questi ingredienti: ${pantryString}.`;
    
    const historyContext = chatMessages.slice(-6).map(m => `${m.role === 'user' ? 'Atleta' : 'Coach'}: ${m.text}`).join('\n');
    const fullPrompt = `${historyContext}\nAtleta: ${messageToSend}\nCoach:`;

    try {
      const data = await callGemini(fullPrompt, systemPrompt);
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Errore di comunicazione con i tuoi muscoli. Riprova!";
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Connessione di rete debole. Riprova ad inviare la domanda." }]);
    } finally {
      setIsSendingMsg(false);
    }
  };

  // --- LOGICA DISPENSA ---
  const addPantryItem = () => {
    if (newItem.trim() !== '' && !pantryItems.includes(newItem.toLowerCase())) {
      setPantryItems([...pantryItems, newItem.toLowerCase()]);
      setNewItem('');
    }
  };

  const removePantryItem = (item) => {
    setPantryItems(pantryItems.filter(i => i !== item));
  };

  // --- FILTRO E CALCOLO RICETTE ---
  const filteredAndSuggestedRecipes = useMemo(() => {
    return RECIPES_DB.map(recipe => {
      const ownedIngredients = recipe.ingredients.filter(ing => pantryItems.includes(ing));
      const missingIngredients = recipe.ingredients.filter(ing => !pantryItems.includes(ing));
      const matchPercentage = Math.round((ownedIngredients.length / recipe.ingredients.length) * 100);
      
      return { ...recipe, ownedIngredients, missingIngredients, matchPercentage };
    })
    .filter(recipe => {
      if (macroFilter === 'all') return true;
      return recipe.tags.includes(macroFilter);
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [pantryItems, macroFilter]);

  const addToPlan = (day, mealType, recipeName) => {
    setWeeklyPlan(prev => ({ ...prev, [`${day}-${mealType}`]: recipeName }));
    setActiveTab('planner');
  };

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center justify-center w-full py-3 transition-all ${
        activeTab === id 
          ? 'text-indigo-600 border-t-2 border-indigo-600 bg-indigo-50/50' 
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon size={20} className="mb-1" />
      <span className="text-[11px] font-bold tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-20 selection:bg-indigo-500 selection:text-white">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-md bg-opacity-95 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-200">
              <Dumbbell size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">FitPrep</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">SvuotaFrigo Performance</p>
            </div>
          </div>
          
          <button
            onClick={generateAiRecipe}
            disabled={isGeneratingRecipe || pantryItems.length === 0}
            className="flex items-center gap-1.5 text-xs font-black py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100"
          >
            {isGeneratingRecipe ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
            <span>Analizza Macro IA ✨</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-4">
        
        {recipeError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start gap-3 animate-scaleIn shadow-sm">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-semibold flex-1">{recipeError}</p>
            <button onClick={() => setRecipeError(null)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
          </div>
        )}

        {isGeneratingRecipe && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 my-8 shadow-sm animate-pulse">
            <Sparkles className="animate-spin text-indigo-500 mx-auto" size={32} />
            <h3 className="text-base font-bold text-slate-800">Il Nutrizionista IA sta calcolando il bilanciamento ideale...</h3>
            <div className="flex justify-center gap-1">
              <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
              <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
            </div>
          </div>
        )}

        {/* VISTA 1: DISPENSA ATLETA */}
        {activeTab === 'pantry' && !isGeneratingRecipe && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">I tuoi mattoni nutrizionali (Dispensa)</h2>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPantryItem()}
                  placeholder="Es. Pollo, Tonno, Albumi, Riso..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all text-slate-800 placeholder:text-slate-400"
                />
                <button onClick={addPantryItem} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl font-bold transition-all"><Plus size={18} /></button>
              </div>

              <div className="flex flex-wrap gap-2">
                {pantryItems.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wide shadow-sm">
                    {item}
                    <button onClick={() => removePantryItem(item)} className="text-slate-400 hover:text-red-500 ml-1"><X size={12} /></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-violet-50/50 p-5 rounded-3xl border border-indigo-100 flex items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-black uppercase tracking-wider">
                  <Target size={14} /> <span>Ottimizzazione Obiettivi</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed max-w-sm">
                  L'app calcolerà i macronutrienti esatti per darti il massimo supporto durante l'ipertrofia o la definizione.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: RICETTE CON MACRO E FILTRI */}
        {activeTab === 'recipes' && !isGeneratingRecipe && (
          <div className="space-y-4">
            
            {/* Filtri Macro dei Menu Locali */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <FilterButton active={macroFilter === 'all'} onClick={() => setMacroFilter('all')} label="Tutte" />
              <FilterButton active={macroFilter === 'high-protein'} onClick={() => setMacroFilter('high-protein')} label="💪 High Protein" />
              <FilterButton active={macroFilter === 'low-carb'} onClick={() => setMacroFilter('low-carb')} label="🥑 Low Carb" />
              <FilterButton active={macroFilter === 'low-fat'} onClick={() => setMacroFilter('low-fat')} label="🏃‍♂️ Low Fat" />
            </div>

            {/* Ricetta generata dall'IA */}
            {aiRecipe && (
              <div className="bg-gradient-to-b from-indigo-50/70 to-white border border-indigo-100 p-5 rounded-3xl shadow-md space-y-4 animate-scaleIn">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">RICETTA NUTRIZIONISTA IA ✨</span>
                    <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">{aiRecipe.type}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{aiRecipe.name}</h3>
                </div>

                {/* Griglia Macro IA */}
                <div className="grid grid-cols-4 gap-2 text-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                  <MacroDisplay label="PRO" value={`${aiRecipe.macros.p}g`} color="text-indigo-600" />
                  <MacroDisplay label="CARB" value={`${aiRecipe.macros.c}g`} color="text-amber-600" />
                  <MacroDisplay label="GRASSI" value={`${aiRecipe.macros.f}g`} color="text-emerald-600" />
                  <MacroDisplay label="CALORIE" value={`${aiRecipe.macros.kcal}`} color="text-rose-600" icon={<Flame size={10} />} />
                </div>

                <div className="text-xs text-indigo-900 bg-indigo-50 p-3 rounded-xl border border-indigo-100 leading-relaxed font-medium">
                  <strong>Focus Performance:</strong> {aiRecipe.fitnessBenefit}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preparazione Fit:</h4>
                  <ol className="list-decimal pl-4 text-xs text-slate-600 space-y-1.5 font-medium">
                    {aiRecipe.instructions.map((step, idx) => <li key={idx}>{step}</li>)}
                  </ol>
                </div>

                <RecipeCardAddToPlanButton recipeName={aiRecipe.name} addToPlan={addToPlan} />
              </div>
            )}

            {/* Elenco Database Locale */}
            <div className="space-y-3">
              {filteredAndSuggestedRecipes.map(recipe => (
                <div key={recipe.id} className="bg-white border border-slate-200 p-4 rounded-3xl space-y-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded border border-indigo-100">{recipe.matchPercentage}% Ingredienti</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{recipe.type}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{recipe.name}</h4>
                    </div>
                  </div>

                  {/* Macro local */}
                  <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-2 rounded-xl text-[11px] font-semibold border border-slate-100">
                    <div><span className="text-slate-400 block text-[9px] font-bold">P</span> <span className="text-indigo-600">{recipe.macros.p}g</span></div>
                    <div><span className="text-slate-400 block text-[9px] font-bold">C</span> <span className="text-amber-600">{recipe.macros.c}g</span></div>
                    <div><span className="text-slate-400 block text-[9px] font-bold">F</span> <span className="text-emerald-600">{recipe.macros.f}g</span></div>
                    <div><span className="text-slate-400 block text-[9px] font-bold">KCAL</span> <span className="text-rose-600">{recipe.macros.kcal}</span></div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium">
                    {recipe.missingIngredients.length > 0 && <p><span className="text-rose-500 font-bold">Manca: </span>{recipe.missingIngredients.join(', ')}</p>}
                  </div>

                  <RecipeCardAddToPlanButton recipeName={recipe.name} addToPlan={addToPlan} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA 3: COACH & CHAT IA */}
        {activeTab === 'ai-chef' && !isGeneratingRecipe && (
          <div className="bg-white rounded-3xl border border-slate-200 h-[60vh] flex flex-col overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-indigo-50 to-white p-4 border-b border-slate-200 flex items-center gap-3">
              <Award className="text-indigo-600" size={20} />
              <div>
                <h3 className="font-black text-sm text-slate-900">Coach Nutrizionale Fit IA ✨</h3>
                <p className="text-[10px] text-slate-500">Chiedi consigli su integrazione, timing dei pasti o ipertrofia</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed font-medium shadow-sm ${
                    msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200/60 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isSendingMsg && <div className="text-slate-500 text-[10px] animate-pulse">Il Coach sta analizzando i macro...</div>}
              <div ref={chatEndRef} />
            </div>

            <div className="p-2.5 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                value={userMsg}
                onChange={(e) => setUserMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Cosa posso cucinare pre-workout con quello che ho?"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button onClick={handleSendMessage} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors"><Send size={14} /></button>
            </div>
          </div>
        )}

        {/* VISTA 4: MEAL PREP PLANNER */}
        {activeTab === 'planner' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Pianificazione Allenamento &amp; Nutrizione</h2>
              <button onClick={() => setWeeklyPlan({})} className="text-[10px] bg-red-50 border border-red-200 text-red-600 font-bold px-2 py-1.5 rounded-md hover:bg-red-100 transition-colors">Svuota Piano</button>
            </div>

            <div className="space-y-3">
              {DAYS.map(day => (
                <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200/80"><span className="text-xs font-black text-indigo-600 uppercase tracking-wide">{day}</span></div>
                  <div className="divide-y divide-slate-100 text-xs font-semibold">
                    {MEAL_TYPES.map(type => {
                      const meal = weeklyPlan[`${day}-${type}`];
                      return (
                        <div key={type} className="px-4 py-3 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase w-14">{type}</span>
                          <span className={`font-semibold ${meal ? 'text-slate-800' : 'text-slate-400 italic font-medium'}`}>{meal || 'Riposo Nutrizionale'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Navigazione Inferiore */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-20 shadow-lg">
        <div className="max-w-2xl mx-auto flex justify-between">
          <TabButton id="pantry" label="Dispensa" icon={ShoppingCart} />
          <TabButton id="recipes" label="Ricette Fit" icon={ChefHat} />
          <TabButton id="ai-chef" label="Coach IA" icon={Sparkles} />
          <TabButton id="planner" label="Meal Prep" icon={Calendar} />
        </div>
      </nav>

    </div>
  );
}

// Sottocomponenti ausiliari di supporto UI
function FilterButton({ active, onClick, label }) {
  return (
    <button 
      onClick={onClick} 
      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
        active ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-100' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );
}

function MacroDisplay({ label, value, color, icon = null }) {
  return (
    <div>
      <span className="text-[8px] font-black tracking-wider text-slate-400 block uppercase">{label}</span>
      <span className={`text-xs font-black ${color} flex items-center justify-center gap-0.5`}>{icon}{value}</span>
    </div>
  );
}

function RecipeCardAddToPlanButton({ recipeName, addToPlan }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button onClick={() => setOpen(!open)} className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold py-1.5 rounded-xl text-slate-600 transition-all">
        Aggiungi al Piano Settimanale
      </button>
      {open && (
        <div className="mt-2 bg-slate-50 border border-slate-200 p-2 rounded-xl grid grid-cols-2 gap-1">
          {DAYS.map(day => (
            <div key={day} className="flex justify-between items-center p-1 bg-white rounded-lg border border-slate-100 shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold">{day.substring(0,3)}</span>
              <div className="flex gap-1">
                <button onClick={() => { addToPlan(day, 'Pranzo', recipeName); setOpen(false); }} className="p-1 bg-slate-50 rounded hover:bg-indigo-50 text-orange-500 border border-slate-100"><Sun size={12} /></button>
                <button onClick={() => { addToPlan(day, 'Cena', recipeName); setOpen(false); }} className="p-1 bg-slate-50 rounded hover:bg-indigo-50 text-indigo-600 border border-slate-100"><Moon size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

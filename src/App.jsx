import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, ChefHat, Calendar, ShoppingCart, X, Sun, Moon, 
  Utensils, Sparkles, Send, Loader2, RefreshCw, AlertCircle, BookmarkPlus 
} from 'lucide-react';

// --- DATABASE RICETTE (Mock Data di Base) ---
const RECIPES_DB = [
  { id: 1, name: "Carbonara Classica", ingredients: ["pasta", "uova", "guanciale", "pecorino", "pepe"], type: "primo", difficulty: "Media" },
  { id: 2, name: "Pasta al Pomodoro", ingredients: ["pasta", "pomodoro", "basilico", "olio", "aglio"], type: "primo", difficulty: "Facile" },
  { id: 3, name: "Frittata di Zucchine", ingredients: ["uova", "zucchine", "cipolla", "parmigiano", "olio"], type: "secondo", difficulty: "Facile" },
  { id: 4, name: "Insalata Caprese", ingredients: ["pomodoro", "mozzarella", "basilico", "olio"], type: "secondo", difficulty: "Facile" },
  { id: 5, name: "Risotto ai Funghi", ingredients: ["riso", "funghi", "brodo", "cipolla", "vino", "burro"], type: "primo", difficulty: "Media" },
  { id: 6, name: "Pollo al Curry", ingredients: ["pollo", "curry", "riso", "panna", "cipolla"], type: "secondo", difficulty: "Media" },
  { id: 7, name: "Bruschette Miste", ingredients: ["pane", "pomodoro", "aglio", "olio", "origano"], type: "antipasto", difficulty: "Facile" },
  { id: 8, name: "Tiramisù", ingredients: ["uova", "mascarpone", "savoiardi", "caffè", "zucchero", "cacao"], type: "dolce", difficulty: "Media" },
  { id: 9, name: "Pasta e Ceci", ingredients: ["pasta", "ceci", "rosmarino", "aglio", "olio"], type: "primo", difficulty: "Facile" },
  { id: 10, name: "Tortilla di Patate", ingredients: ["uova", "patate", "cipolla", "olio"], type: "secondo", difficulty: "Media" },
  { id: 11, name: "Pancake Semplici", ingredients: ["uova", "farina", "latte", "zucchero", "burro"], type: "colazione", difficulty: "Facile" },
  { id: 12, name: "Yogurt e Frutta", ingredients: ["yogurt", "frutta", "miele", "cereali"], type: "colazione", difficulty: "Facile" },
];

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const MEAL_TYPES = ["Colazione", "Pranzo", "Cena"];

// Schema di risposta strutturata per la generazione delle ricette tramite Gemini
const recipeSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    type: { type: "STRING" }, // es. Primo, Secondo, Dolce, Spuntino
    difficulty: { type: "STRING" }, // Facile, Media, Difficile
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
    tip: { type: "STRING" } // Consiglio dello chef antispreco
  },
  required: ["name", "type", "difficulty", "ingredients", "missingIngredients", "instructions", "tip"]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('pantry'); // pantry, recipes, ai-chef, planner
  const [pantryItems, setPantryItems] = useState(['pasta', 'uova', 'pomodoro', 'cipolla']);
  const [newItem, setNewItem] = useState('');
  
  // Stato del piano settimanale
  const [weeklyPlan, setWeeklyPlan] = useState({});

  // Stati per le funzionalità Gemini API
  const [aiRecipe, setAiRecipe] = useState(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState(null);

  // Stato della Chat con lo Chef IA
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Ciao! Sono il tuo Chef virtuale antispreco. Chiedimi pure consigli su come usare i tuoi ingredienti, sostituzioni ideali o trucchi in cucina! 🍳' }
  ]);
  const [userMsg, setUserMsg] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll per la chat dello chef
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSendingMsg]);

  // --- CLIENT API GEMINI CON RETRY ED EXPONENTIAL BACKOFF ---
  const callGemini = async (prompt, systemInstruction = "", responseSchema = null) => {
    const apiKey = ""; // Gestito automaticamente dall'ambiente a runtime
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

  // --- CHIAMATA AI: GENERATORE RICETTE ---
  const generateAiRecipe = async () => {
    if (pantryItems.length === 0) {
      setRecipeError("Aggiungi prima almeno un ingrediente alla dispensa!");
      return;
    }

    setIsGeneratingRecipe(true);
    setRecipeError(null);
    setAiRecipe(null);

    const pantryString = pantryItems.join(', ');
    const systemPrompt = "Sei uno chef stellato ed esperto di cucina antispreco. Il tuo compito è inventare una ricetta deliziosa usando principalmente gli ingredienti indicati dall'utente. Cerca di usare il più possibile gli ingredienti forniti. Se necessario, puoi aggiungere piccoli ingredienti base che quasi tutti hanno in casa (come olio, sale, pepe, acqua, aglio, cipolla, farina). Rispondi RIGOROSAMENTE in lingua italiana compilando lo schema JSON fornito.";
    const userPrompt = `I miei ingredienti in dispensa sono: ${pantryString}. Genera una ricetta fantastica e fantasiosa adatta a questi ingredienti.`;

    try {
      const data = await callGemini(userPrompt, systemPrompt, recipeSchema);
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) {
        const parsedRecipe = JSON.parse(textResponse);
        setAiRecipe(parsedRecipe);
        setActiveTab('recipes'); // Passa al tab ricette per mostrarla
      } else {
        throw new Error("Nessuna risposta ricevuta dall'IA");
      }
    } catch (err) {
      console.error(err);
      setRecipeError("Errore durante la generazione della ricetta con IA. Riprova tra poco.");
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  // --- CHIAMATA AI: CHAT DELLO CHEF ---
  const handleSendMessage = async () => {
    if (!userMsg.trim() || isSendingMsg) return;

    const messageToSend = userMsg;
    setUserMsg('');
    setChatMessages(prev => [...prev, { role: 'user', text: messageToSend }]);
    setIsSendingMsg(true);

    const pantryString = pantryItems.join(', ');
    const systemPrompt = `Sei lo "Chef Personale SvuotaFrigo ✨", un assistente di cucina estremamente amichevole, preparato e creativo. Il tuo obiettivo è suggerire modifiche, sostituzioni di ingredienti, trucchi di cottura e idee rapide basandoti principalmente sulla dispensa dell'utente. Cerca di mantenere le risposte concise, cordiali e ricche di consigli pratici in italiano. La dispensa attuale dell'utente contiene: ${pantryString}.`;
    
    // Costruisci uno storico minimale della chat per dare contesto al modello
    const historyContext = chatMessages.slice(-6).map(m => `${m.role === 'user' ? 'Utente' : 'Chef'}: ${m.text}`).join('\n');
    const fullPrompt = `${historyContext}\nUtente: ${messageToSend}\nChef:`;

    try {
      const data = await callGemini(fullPrompt, systemPrompt);
      const chefReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Scusami, ho avuto un piccolo vuoto di memoria culinario. Puoi ripetere?";
      setChatMessages(prev => [...prev, { role: 'assistant', text: chefReply }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Uffa, la mia connessione alla cucina si è interrotta temporaneamente! Riprova a chiedermelo." }]);
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addPantryItem();
  };

  // --- LOGICA SUGGERIMENTI DI RICETTE ---
  const suggestedRecipes = useMemo(() => {
    return RECIPES_DB.map(recipe => {
      const ownedIngredients = recipe.ingredients.filter(ing => pantryItems.includes(ing));
      const missingIngredients = recipe.ingredients.filter(ing => !pantryItems.includes(ing));
      const matchPercentage = Math.round((ownedIngredients.length / recipe.ingredients.length) * 100);
      
      return { ...recipe, ownedIngredients, missingIngredients, matchPercentage };
    }).sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [pantryItems]);

  const addToPlan = (day, mealType, recipeName) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [`${day}-${mealType}`]: recipeName
    }));
    setActiveTab('planner');
  };

  const removeFromPlan = (day, mealType) => {
    setWeeklyPlan(prev => {
      const newState = { ...prev };
      delete newState[`${day}-${mealType}`];
      return newState;
    });
  };

  // Bottoni di Navigazione Inferiore
  const TabButton = ({ id, label, icon: Icon, isSpecial }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        if (id === 'ai-chef') {
          setRecipeError(null);
        }
      }}
      className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 relative ${
        activeTab === id 
          ? isSpecial ? 'text-violet-600 border-t-2 border-violet-600 bg-violet-50' : 'text-emerald-600 border-t-2 border-emerald-600 bg-emerald-50'
          : isSpecial ? 'text-violet-400 hover:text-violet-600' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <Icon size={22} className="mb-1" />
      <span className="text-[11px] font-medium">{label}</span>
      {isSpecial && (
        <span className="absolute top-1.5 right-1/4 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-800 pb-20">
      
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <ChefHat className="text-emerald-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">SvuotaFrigo</h1>
              <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Meal Prep &amp; Assistente IA</p>
            </div>
          </div>
          
          <button
            onClick={generateAiRecipe}
            disabled={isGeneratingRecipe || pantryItems.length === 0}
            className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl shadow-sm transition-all ${
              pantryItems.length === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-violet-200'
            }`}
          >
            {isGeneratingRecipe ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Sparkles size={14} />
            )}
            <span>Crea Ricetta IA ✨</span>
          </button>
        </div>
      </header>

      {/* Area principale del contenuto */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-4">
        
        {/* Errore globale delle chiamate AI */}
        {recipeError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-scaleIn">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-semibold">{recipeError}</p>
            </div>
            <button onClick={() => setRecipeError(null)} className="text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* loader a tutto schermo durante la generazione ricetta */}
        {isGeneratingRecipe && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-6 my-10 animate-pulse">
            <div className="mx-auto bg-violet-100 text-violet-600 p-4 rounded-full w-16 h-16 flex items-center justify-center">
              <Sparkles className="animate-bounce" size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-800">Lo Chef IA sta cucinando l'idea... 🧑‍🍳</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Analizziamo la tua dispensa ({pantryItems.join(', ')}) per creare una ricetta zero-sprechi e bilanciata.
              </p>
            </div>
            <div className="flex justify-center gap-1">
              <span className="h-2 w-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
              <span className="h-2 w-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="h-2 w-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
            </div>
          </div>
        )}

        {/* VISTA 1: DISPENSA */}
        {activeTab === 'pantry' && !isGeneratingRecipe && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Cosa c'è in cucina oggi?</h2>
              <p className="text-xs text-gray-400 mb-4">Aggiungi o rimuovi ingredienti per aggiornare le idee culinarie.</p>
              
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Es. Pasta, Uova, Zucchine..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-sm transition-all"
                />
                <button 
                  onClick={addPantryItem}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl transition-colors shadow-lg shadow-emerald-100"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {pantryItems.length === 0 ? (
                  <div className="text-center w-full py-8 text-gray-400">
                    <p className="italic text-sm">La tua dispensa digitale è deserta. Inizia ad aggiungere elementi!</p>
                  </div>
                ) : (
                  pantryItems.map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm animate-scaleIn">
                      <span>{item}</span>
                      <button onClick={() => removePantryItem(item)} className="text-emerald-500 hover:text-emerald-700 ml-0.5">
                        <X size={14} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Banner IA Promozionale */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-6 rounded-3xl border border-violet-100 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
                <Sparkles size={120} className="text-violet-600" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="bg-violet-100 text-violet-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">INTEGRAZIONE IA</span>
                  <h3 className="font-extrabold text-violet-950 text-base">Vuoi ricette personalizzate?</h3>
                  <p className="text-violet-800 text-xs leading-relaxed max-w-md">
                    Usa il generatore magico per creare istantaneamente una ricetta basata ESATTAMENTE su quello che hai a casa!
                  </p>
                </div>
                <button 
                  onClick={generateAiRecipe}
                  disabled={pantryItems.length === 0}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md shadow-violet-200 transition-all shrink-0 flex items-center gap-1"
                >
                  <Sparkles size={14} />
                  Prova Ora ✨
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: RICETTE */}
        {activeTab === 'recipes' && !isGeneratingRecipe && (
          <div className="space-y-4">
            
            {/* Sezione per la ricetta generata dall'IA */}
            {aiRecipe && (
              <div className="space-y-3 animate-scaleIn">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-bold text-violet-500 tracking-wider uppercase flex items-center gap-1.5">
                    <Sparkles size={14} /> Ricetta Magica Creata ✨
                  </h3>
                  <button 
                    onClick={() => setAiRecipe(null)} 
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    Rimuovi
                  </button>
                </div>

                <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-3xl p-6 shadow-xl shadow-indigo-100 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] bg-violet-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Chef IA 🧑‍🍳
                      </span>
                      <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                        {aiRecipe.type}
                      </span>
                      <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                        Difficoltà: {aiRecipe.difficulty}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">{aiRecipe.name}</h2>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-3">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-violet-100">Ingredienti Utilizzati:</h4>
                      <ul className="text-sm list-disc pl-4 mt-1 font-medium text-white/95">
                        {aiRecipe.ingredients.map((ing, i) => (
                          <li key={i} className="capitalize">{ing}</li>
                        ))}
                      </ul>
                    </div>

                    {aiRecipe.missingIngredients && aiRecipe.missingIngredients.length > 0 && (
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-red-200">Eventuali Ingredienti Mancanti Consigliati:</h4>
                        <ul className="text-sm list-disc pl-4 mt-1 font-medium text-red-100">
                          {aiRecipe.missingIngredients.map((ing, i) => (
                            <li key={i} className="capitalize">{ing}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-violet-100">Preparazione:</h4>
                    <ol className="text-sm space-y-2.5 list-decimal pl-4 text-white/90">
                      {aiRecipe.instructions.map((step, idx) => (
                        <li key={idx} className="leading-relaxed pl-1">{step}</li>
                      ))}
                    </ol>
                  </div>

                  {aiRecipe.tip && (
                    <div className="bg-white/10 p-3 rounded-xl text-xs italic text-violet-50 border-l-2 border-white/40">
                      💡 <strong>Consiglio Antispreco dello Chef:</strong> {aiRecipe.tip}
                    </div>
                  )}

                  {/* Pulsante rapido per aggiungere la ricetta generata dal bot al Meal Prep */}
                  <div className="pt-2">
                    <RecipeCardAddToPlanButton recipeName={aiRecipe.name} addToPlan={addToPlan} isDarkBg={true} />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <h2 className="text-lg font-bold text-gray-800 px-1 mb-3">Tutte le Ricette Classiche</h2>
              <div className="space-y-4">
                {suggestedRecipes.map(recipe => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    addToPlan={addToPlan} 
                  />
                ))}
              </div>
            </div>
            
            {suggestedRecipes.length === 0 && !aiRecipe && (
              <div className="text-center py-10 text-gray-400 bg-white rounded-3xl border border-gray-100">
                <p className="text-sm">Nessuna ricetta tradizionale disponibile. Aggiungi ingredienti in dispensa o creane una personalizzata con l'IA!</p>
              </div>
            )}
          </div>
        )}

        {/* VISTA 3: CHAT CON LO CHEF IA */}
        {activeTab === 'ai-chef' && !isGeneratingRecipe && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 h-[65vh] flex flex-col overflow-hidden animate-scaleIn">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 flex items-center gap-3 shrink-0">
              <div className="bg-white/20 p-2 rounded-full">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Chef Personale IA SvuotaFrigo ✨</h3>
                <p className="text-[10px] text-white/80 font-medium">Chiedi consigli, sostituzioni e ricette al volo</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-scaleIn`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-violet-600 text-white rounded-br-none font-medium' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isSendingMsg && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-white text-gray-500 border border-gray-100 rounded-2xl rounded-bl-none p-3 text-xs flex items-center gap-2">
                    <Loader2 className="animate-spin text-violet-500" size={14} />
                    <span>Lo chef sta scrivendo...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-gray-100 bg-white flex gap-2 items-center">
              <input
                type="text"
                value={userMsg}
                onChange={(e) => setUserMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder="Es: Non ho il guanciale per la carbonara, cosa uso?"
                className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!userMsg.trim() || isSendingMsg}
                className="bg-violet-600 hover:bg-violet-700 disabled:bg-gray-100 text-white disabled:text-gray-400 p-3 rounded-xl shadow-md transition-all shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        {/* VISTA 4: PLANNER */}
        {activeTab === 'planner' && !isGeneratingRecipe && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Il tuo piano settimanale</h2>
                <p className="text-xs text-gray-400">Pianifica le tue colazioni, pranzi e cene</p>
              </div>
              <button 
                onClick={() => setWeeklyPlan({})}
                className="text-xs text-red-500 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Reset Piano
              </button>
            </div>

            <div className="space-y-4">
              {DAYS.map(day => (
                <div key={day} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-emerald-50/50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                    <span className="font-extrabold text-emerald-950 text-sm tracking-wide">{day}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {MEAL_TYPES.map(type => {
                      const meal = weeklyPlan[`${day}-${type}`];
                      return (
                        <div key={type} className="px-5 py-3 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase w-16 tracking-wider">
                              {type}
                            </span>
                            {meal ? (
                              <span className="text-gray-800 font-semibold text-sm">{meal}</span>
                            ) : (
                              <span className="text-gray-300 italic text-xs">Non pianificato</span>
                            )}
                          </div>
                          {meal && (
                            <button 
                              onClick={() => removeFromPlan(day, type)}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-20 shadow-lg">
        <div className="max-w-3xl mx-auto flex justify-between">
          <TabButton id="pantry" label="Dispensa" icon={ShoppingCart} />
          <TabButton id="recipes" label="Ricette" icon={ChefHat} />
          <TabButton id="ai-chef" label="Chef IA ✨" icon={Sparkles} isSpecial={true} />
          <TabButton id="planner" label="Piano" icon={Calendar} />
        </div>
      </nav>

    </div>
  );
}

// Sottocomponente per aggiungere facilmente una ricetta al piano settimanale
function RecipeCardAddToPlanButton({ recipeName, addToPlan, isDarkBg = false }) {
  const [showPlanMenu, setShowPlanMenu] = useState(false);

  return (
    <div className="w-full">
      <button 
        onClick={() => setShowPlanMenu(!showPlanMenu)}
        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
          isDarkBg 
            ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-inner' 
            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100'
        }`}
      >
        <BookmarkPlus size={14} />
        Pianifica nel Meal Prep
      </button>

      {showPlanMenu && (
        <div className={`mt-3 rounded-2xl p-3 animate-fadeIn border ${
          isDarkBg 
            ? 'bg-indigo-900/50 border-indigo-700/50 text-white' 
            : 'bg-slate-50 border-gray-100 text-gray-800'
        }`}>
          <p className="text-[10px] font-bold uppercase text-center mb-2 tracking-wider opacity-85">Scegli quando pianificare</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DAYS.map(day => (
              <div key={day} className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold opacity-75">{day.substring(0,3)}</span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      addToPlan(day, 'Pranzo', recipeName);
                      setShowPlanMenu(false);
                    }} 
                    className="flex-1 bg-white hover:bg-orange-100 text-gray-700 border border-gray-200 text-xs py-1 rounded-lg flex items-center justify-center" 
                    title="Aggiungi a Pranzo"
                  >
                    <Sun size={12} className="text-orange-500" />
                  </button>
                  <button 
                    onClick={() => {
                      addToPlan(day, 'Cena', recipeName);
                      setShowPlanMenu(false);
                    }} 
                    className="flex-1 bg-white hover:bg-indigo-100 text-gray-700 border border-gray-200 text-xs py-1 rounded-lg flex items-center justify-center" 
                    title="Aggiungi a Cena"
                  >
                    <Moon size={12} className="text-indigo-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Sottocomponente: Card di una ricetta predefinita
function RecipeCard({ recipe, addToPlan }) {
  const isHighMatch = recipe.matchPercentage >= 75;
  const isMediumMatch = recipe.matchPercentage >= 40 && recipe.matchPercentage < 75;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isHighMatch ? 'bg-emerald-100 text-emerald-800' : 
                isMediumMatch ? 'bg-amber-100 text-amber-800' : 
                'bg-red-50 text-red-600'
              }`}>
                {recipe.matchPercentage}% Match
              </span>
              <span className="text-xs text-gray-400 px-2 border-l border-gray-200 font-semibold">{recipe.type}</span>
              <span className="text-xs text-gray-400 font-medium">Difficoltà: {recipe.difficulty}</span>
            </div>
            <h3 className="font-extrabold text-base text-gray-900">{recipe.name}</h3>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {recipe.missingIngredients.length > 0 && (
            <div className="text-xs font-medium">
              <span className="text-red-500 font-bold">Manca: </span>
              <span className="text-gray-500">{recipe.missingIngredients.join(", ")}</span>
            </div>
          )}
           <div className="text-xs font-medium">
              <span className="text-emerald-600 font-bold">Hai in frigo: </span>
              <span className="text-gray-500">{recipe.ownedIngredients.join(", ")}</span>
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <RecipeCardAddToPlanButton recipeName={recipe.name} addToPlan={addToPlan} />
        </div>
      </div>
    </div>
  );
}

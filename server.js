import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.GEMINI_API_KEY;
// Modello attuale; cambialo se necessario in base alla doc Google [web:119][web:2]
const GEMINI_MODEL = 'gemini-2.0-flash';

// Middleware
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Chiamata generica a Gemini (senza responseSchema)
async function callGemini({ prompt, systemInstruction = '' }) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  if (systemInstruction) {
    payload.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }

  return res.json();
}

// --- /api/gemini-recipe ---
app.post('/api/gemini-recipe', async (req, res) => {
  try {
    const pantryArr = Array.isArray(req.body.pantry) ? req.body.pantry : [];
    const pantryString = pantryArr.join(', ');

    const systemPrompt =
      "Sei un Biologo Nutrizionista Sportivo e Chef di altissimo livello. " +
      "Devi restituire SOLO un JSON valido (senza testo aggiuntivo) con la seguente struttura: " +
      "{ \"name\": string, \"type\": string, \"difficulty\": string, " +
      "\"ingredients\": string[], \"missingIngredients\": string[], " +
      "\"instructions\": string[], " +
      "\"macros\": { \"p\": number, \"c\": number, \"f\": number, \"kcal\": number }, " +
      "\"fitnessBenefit\": string }. " +
      "Non aggiungere spiegazioni fuori dal JSON.";

    const userPrompt =
      `Dispensa attuale: ${pantryString}. ` +
      `Genera una ricetta fit personalizzata per atleti (high-protein, low-carb o low-fat), ` +
      `calcola i macronutrienti accuratamente e descrivi l'utilità sportiva. ` +
      `Rispondi SOLO con il JSON descritto.`;

    const data = await callGemini({
      prompt: userPrompt,
      systemInstruction: systemPrompt
    });

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      return res.status(500).json({ error: 'Nessun contenuto da Gemini' });
    }

    let recipe;
    try {
      recipe = JSON.parse(textResponse);
    } catch (err) {
      console.error('JSON parse error (recipe):', err, textResponse);
      return res.status(500).json({ error: 'Risposta Gemini non in JSON valido' });
    }

    res.json(recipe);
  } catch (err) {
    console.error('Gemini recipe error:', err);
    res.status(500).json({ error: 'Errore nella generazione della ricetta' });
  }
});

// --- /api/gemini-chat ---
app.post('/api/gemini-chat', async (req, res) => {
  try {
    const { message, pantry, history } = req.body;
    const pantryArr = Array.isArray(pantry) ? pantry : [];
    const historyArr = Array.isArray(history) ? history : [];

    const pantryString = pantryArr.join(', ');

    const systemPrompt =
      `Sei il "Coach Nutrizionale FitPrep ✨", un esperto di nutrizione per sportivi, ` +
      `bodybuilding e fitness. Rispondi in italiano, in modo motivante ma tecnico, ` +
      `citando macro (kcal, proteine, carboidrati, grassi) e timing dei pasti. ` +
      `L'utente ha a disposizione questi ingredienti: ${pantryString}.`;

    const historyContext = historyArr
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'Atleta' : 'Coach'}: ${m.text}`)
      .join('\n');

    const fullPrompt = `${historyContext}\nAtleta: ${message}\nCoach:`;

    const data = await callGemini({
      prompt: fullPrompt,
      systemInstruction: systemPrompt
    });

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Errore di comunicazione con i tuoi muscoli. Riprova!';

    res.json({ reply });
  } catch (err) {
    console.error('Gemini chat error:', err);
    res.status(500).json({ error: 'Errore nella risposta del Coach IA' });
  }
});

// Fallback: index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FitPrep server running on port ${PORT}`);
});

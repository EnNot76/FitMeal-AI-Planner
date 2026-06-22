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

// ATTENZIONE: metti la chiave qui o in .env (consigliato)
const API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6IHKA0XgwUR6TuqzIOVyK4qSIk-4VoHf27QCWuLCqzR9Q";
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

// CORS per il frontend (stesso dominio:localhost:3000)
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Schema ricetta (stesso tuo fitnessRecipeSchema)
const fitnessRecipeSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    type: { type: "STRING" },
    difficulty: { type: "STRING" },
    ingredients: { type: "ARRAY", items: { type: "STRING" } },
    missingIngredients: { type: "ARRAY", items: { type: "STRING" } },
    instructions: { type: "ARRAY", items: { type: "STRING" } },
    macros: {
      type: "OBJECT",
      properties: {
        p: { type: "NUMBER" },
        c: { type: "NUMBER" },
        f: { type: "NUMBER" },
        kcal: { type: "NUMBER" }
      },
      required: ["p", "c", "f", "kcal"]
    },
    fitnessBenefit: { type: "STRING" }
  },
  required: [
    "name", "type", "difficulty",
    "ingredients", "missingIngredients", "instructions",
    "macros", "fitnessBenefit"
  ]
};

async function callGemini({ prompt, systemInstruction = "", responseSchema = null }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  if (responseSchema) {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseSchema
    };
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

// --- ROUTE: ricetta AI ---
app.post('/api/gemini-recipe', async (req, res) => {
  try {
    const pantry = Array.isArray(req.body.pantry) ? req.body.pantry : [];
    const pantryString = pantry.join(', ');

    const systemPrompt =
      "Sei un Biologo Nutrizionista Sportivo e Chef di altissimo livello. " +
      "Il tuo compito è ideare una ricetta adatta ad atleti (high-protein, low-carb o low-fat) " +
      "basandoti sugli ingredienti dell'utente. " +
      "Calcola una stima realistica dei macronutrienti per porzione singola. " +
      "Rispondi in italiano compilando rigorosamente lo schema JSON.";

    const userPrompt =
      `Dispensa attuale: ${pantryString}. ` +
      `Genera una ricetta fit personalizzata, calcola i macronutrienti accuratamente e descrivi l'utilità sportiva.`;

    const data = await callGemini({
      prompt: userPrompt,
      systemInstruction: systemPrompt,
      responseSchema: fitnessRecipeSchema
    });

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      return res.status(500).json({ error: 'Nessun contenuto da Gemini' });
    }

    const recipe = JSON.parse(textResponse);
    res.json(recipe);
  } catch (err) {
    console.error('Gemini recipe error:', err);
    res.status(500).json({ error: 'Errore nella generazione della ricetta' });
  }
});

// --- ROUTE: chat coach ---
app.post('/api/gemini-chat', async (req, res) => {
  try {
    const { message, pantry, history } = req.body;

    const pantryArr = Array.isArray(pantry) ? pantry : [];
    const historyArr = Array.isArray(history) ? history : [];

    const pantryString = pantryArr.join(', ');

    const systemPrompt =
      `Sei il "Coach Nutrizionale FitPrep ✨", un esperto di nutrizione per sportivi, ` +
      `bodybuilding e fitness. Rispondi in modo motivante, preciso ed estremamente tecnico ` +
      `riguardo a calorie e macronutrienti, tenendo conto che l'utente ha a disposizione: ${pantryString}.`;

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
      "Errore di comunicazione con i tuoi muscoli. Riprova!";

    res.json({ reply });
  } catch (err) {
    console.error('Gemini chat error:', err);
    res.status(500).json({ error: 'Errore nella risposta del Coach IA' });
  }
});

// Fallback: index.html per qualsiasi route non API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FitPrep server running on http://localhost:${PORT}`);
});

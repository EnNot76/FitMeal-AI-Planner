# FitMeal AI Planner

App React + Vite per sportivi, focalizzata su ricette low-carb, low-fat e high-protein.

## Cosa contiene

- App React rifattorizzata in componenti
- Database ricette sostituito con pasti sportivi coerenti con i macro target
- HTML completo pronto per Vite/React
- Generazione ricette AI con schema JSON
- Planner settimanale e chat coach AI

## Struttura

- `index.html` contenitore root
- `src/main.jsx` bootstrap React
- `src/App.jsx` app principale
- `src/components/` componenti UI
- `src/data/recipes.js` database ricette e costanti
- `src/styles.css` stile applicativo

## Avvio

```bash
npm install
cp .env.example .env
# inserisci la tua chiave API Gemini in .env
npm run dev
```

## Note tecniche

La chiamata Gemini è attualmente lato client tramite `VITE_GEMINI_API_KEY`, utile per prototipo e test. Per una versione commerciale conviene spostare la chiamata dietro backend o serverless proxy per non esporre la chiave nel browser.

## Migliorie consigliate

- Backend proxy per Gemini
- Calcolo macro reale via USDA FoodData Central o Edamam
- Profilo atleta con obiettivo, peso e target proteico
- Lista spesa automatica derivata dal piano settimanale
- Salvataggio cloud del meal plan

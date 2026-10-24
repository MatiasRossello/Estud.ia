# estud.ia

Subí un JSON con preguntas, armá tests aleatorios, repasá las falladas y competí en el ranking.

## Correr local

```bash
npm install
cp .env.example .env   # completar OPENROUTER_API_KEY (https://openrouter.ai/keys)
npm run dev            # web en http://localhost:5173, API Node en :3001
```

Producción: `npm run build && npm start` (Express sirve `dist/` y `/api/grade` en `PORT`, por defecto 3001).
En Vercel, `api/grade.js` expone la misma corrección como función serverless; configurar las 4 variables de `.env`.

## Arquitectura

- **Frontend** React + Vite (`src/`). El progreso, el historial de intentos, el id de jugador y el token de dueño viven en `localStorage` (`estudia:v1`).
- **Supabase** (proyecto `estud-ia`): tablas `tests` y `leaderboard` sin acceso directo; todo pasa por funciones RPC (`create_test`, `list_my_tests`, `set_test_public`, `submit_score`, …) que validan el token de dueño. No hay login: los tests pertenecen al navegador que los subió.
- **Node** (`server/`): `/api/grade` corrige respuestas escritas. Primero compara normalizado (sin tildes ni mayúsculas); si no coincide, le pide un puntaje 0–1 a un modelo gratis de OpenRouter (`OPENROUTER_MODEL`, con fallback a otros `:free`). Sin API key usa similitud de texto local.

## Puntaje

Por pregunta: `acierto (0..1) × 1000 × (1 − tiempo/límite / 2)`. Responder al instante da 1000 y al agotar el límite, 500. Los límites van de 15 s (V/F) a 60 s (respuesta escrita). Una respuesta escrita cuenta como correcta con ≥ 70 % de la IA. El ranking solo toma el primer intento con el banco completo y guarda el mejor puntaje de cada jugador.

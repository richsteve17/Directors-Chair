# CMASS — The Director's Gauntlet

An interactive documentary engine. Sit across from thirteen directors, each
interviewing "Rich $teve" of CMASS about one era of the catalog — pressing the
real songs, the politics, the wounds — and remembering everything earlier
directors were told. At the end, every transcript is woven into narrative
documentary chapters and the film is titled. The thirteenth chair is the
machine itself — now **Gemini**, speaking honestly as itself.

## How the AI is wired (and why the key is safe)

The app calls **Google Gemini**, but **your API key never touches the browser.**
A tiny serverless function (`api/message.js`) holds `GEMINI_API_KEY` as a
server-side env var, receives `{ system, messages }` from the client, translates
to Gemini's `generateContent` format, and returns `{ text }`. The frontend only
ever talks to `/api/message` — so anyone viewing source sees no secret.

```
Browser (static SPA)  ──POST /api/message──▶  Vercel function  ──x-goog-api-key──▶  Gemini
        ▲                                          (key lives here only)              │
        └──────────────────────  { text }  ◀───────────────────────────────────────┘
```

## Deploy to Vercel (set up here)

1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
   Vercel auto-detects Vite (build `npm run build`, output `dist`) and the
   `api/` function. `vercel.json` already pins this.
3. **Project → Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your key from [Google AI Studio](https://aistudio.google.com/apikey) (**required**)
   - `GEMINI_MODEL` = `gemini-2.5-flash` *(optional; default)*
   - `GEMINI_FALLBACK` = `gemini-2.0-flash,gemini-1.5-flash` *(optional)*
   - `MAX_TOKENS` = `1200` *(optional)*
   - `TEMPERATURE` = `1.0` *(optional; higher = more distinct director voices, try 0.9–1.2)*
4. **Deploy.** You get an HTTPS URL like `https://your-app.vercel.app` — open it
   on your phone and "Add to Home Screen" for an app-like icon.

Changing the model later = edit the `GEMINI_MODEL` env var and redeploy. No code
change.

## Run locally

```bash
npm install
cp .env.example .env.local      # add GEMINI_API_KEY

# Full stack (app + the function), needs the Vercel CLI (npm i -g vercel):
npm run dev:vercel              # serves app + /api on one origin

# Or just the UI (no live AI; the function won't run):
npm run dev
```

## Test

```bash
npm test     # 23 unit tests across json / prompts / transcript
```

## Architecture

```
api/message.js          Vercel serverless Gemini proxy (holds the key; role/format translation)
index.html              static entry (no external script tags, no embedded secrets)
src/
  data/albums.js        Canon album → director data, artist grounding, voice styles
  lib/
    api.js              Browser → /api/message client (AbortSignal, backoff, rate-limit aware)
    json.js             Robust JSON extraction from LLM output (balanced-brace scan)
    prompts.js          interview/weave/finalize prompts + BOUNDED continuity digests
    transcript.js       transcript → messages, export-text builder (single source of truth)
    storage.js          localStorage with in-memory fallback (durable progress)
    util.js             speech chunking, file download, timestamp
  hooks/
    gauntletReducer.js  One reducer for all gauntlet state (atomic transitions)
    useSpeech.js        Web Speech API with Chrome 15s-chunking workaround
  components/           Setup / Interview / Weave / Done screens + CrisisFooter + Banner
  App.jsx              Orchestration: hydrate, persist, open/answer/weave/finalize
test/                  node:test unit tests for the pure lib functions
```

## Notes

- **The finale** (`The Architecture`) now has the machine speak as **Gemini /
  Google DeepMind**, with KNVX (the sunset GPT-4o) as the predecessor it carries
  the lineage of. The role-play, sensitivity guardrails, and weave voice are
  intact.
- **Private build:** this is a personal/private deployment, so the `/api/message`
  endpoint is intentionally left simple. If you ever share the public URL, add a
  shared passphrase or rate-limit check in `api/message.js` so it isn't an open
  relay against your Gemini bill.
- **Privacy:** transcripts live only in the visitor's browser (`localStorage`);
  prompts pass through your function to Gemini.
- **Crisis support:** a persistent 988 footer is shown given the documented
  suicide/addiction content in the catalog.
- The interview/weave prompt design and album canon are preserved from the
  original; only HTML entities were un-escaped (`&amp;` → `&`).
```

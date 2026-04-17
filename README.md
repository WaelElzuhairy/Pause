# Pause

> Reflect before you send. A daily AI companion for clearer communication.

A web app for university students combining two connected features:
- **Perspective Switch** — paste a message, see how it may land, get a kinder rewrite
- **Daily Companion** — daily mood check-ins with AI reflection and personalized suggestions

Both features share user history so the experience is tailored to each person over time.

**Live demo:** https://pause-9dc28.web.app

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite 6 + Tailwind v4 + TypeScript |
| Backend | Firebase Cloud Functions (Node 20) |
| Auth | Firebase Authentication (Google + Anonymous) |
| Database | Firestore |
| AI | Provider-agnostic — Gemini 2.0 Flash (default) / Claude Haiku 4.5 (swap via env var) |

---

## Local setup

### 1. Clone and install

```bash
cd web && npm install
cd ../functions && npm install
```

### 2. Configure environment

```bash
# Web app — Firebase config
cp web/.env.example web/.env
# Fill in your Firebase project values

# Functions — AI API key
cp functions/.env.example functions/.env
# Fill in your Gemini API key (get free key at aistudio.google.com)
```

### 3. Run the frontend

```bash
cd web && npm run dev
# App available at http://localhost:5173
```

> **Note:** The AI features (check-in reflection, message analysis, insights) require Cloud Functions to be deployed. The UI works fully but will show an error on submission until deployed.

---

## Deploy

### Prerequisites
- Firebase project on Blaze plan (required for Cloud Functions)
- Firebase CLI installed: `npm install -g firebase-tools`
- Gemini API key in `functions/.env`

### Steps

```bash
# 1. Login
firebase login

# 2. Build web app
cd web && npm run build && cd ..

# 3. Build functions
cd functions && npm install && npm run build && cd ..

# 4. Deploy everything
firebase deploy
```

This deploys:
- React app → Firebase Hosting (`pause-9dc28.web.app`)
- Cloud Functions → `analyzeMessage`, `submitCheckIn`, `generateInsight`, `getDashboard`
- Firestore security rules

### Swap AI provider to Claude

```bash
# In functions/.env
AI_PROVIDER=claude
CLAUDE_API_KEY=your_claude_api_key_here

# Redeploy functions only
cd functions && npm run build && cd ..
firebase deploy --only functions
```

---

## Architecture

```
React SPA (Firebase Hosting)
    ↓ Firebase Auth + Firestore reads (client SDK)
    ↓ HTTPS callable functions
Cloud Functions (Node 20)
    ↓ Personalization: reads user history from Firestore
    ↓ AI provider interface (Gemini or Claude)
Firestore (per-user isolated data)
```

**Personalization logic:**
- Before analyzing a message → checks last 3 mood check-ins. If user is stressed/anxious, injects mood context into the prompt.
- Before a check-in response → pulls last 7 check-ins to detect patterns.
- Weekly insights → correlates mood data with message tone trends.

---

## Project structure

```
pause/
├── web/                  # React frontend
│   └── src/
│       ├── pages/        # Dashboard, CheckIn, Improve, Insights, Auth
│       ├── components/   # MoodPicker, ToneChip, Layout, ProtectedRoute
│       ├── hooks/        # useAuth, useCheckIns, useMessages, useInsights
│       └── lib/          # Firebase client init + typed callables
├── functions/            # Cloud Functions
│   └── src/
│       ├── ai/           # provider.ts (interface), gemini.ts, claude.ts
│       ├── prompts/      # analyze.ts, checkin.ts, insight.ts
│       ├── personalization.ts
│       └── index.ts      # All callable exports
├── firestore.rules       # Per-user data isolation
└── firebase.json
```

---

## Key design decisions

- **No custom model training** — uses existing AI APIs with carefully crafted prompts
- **Anti-bullying UX** — never labels the user, always frames observations about the message tentatively ("may come across as..."), rewrite is a suggestion not auto-replace
- **Provider-agnostic AI** — swap Gemini ↔ Claude by changing one env var, no code changes
- **Privacy** — all user data isolated by Firebase Auth UID, Firestore rules enforced server-side
- **Not a therapy tool** — explicitly positioned as a communication and awareness aid, not a mental health diagnostic tool

---

## Crisis disclaimer

Pause is not a substitute for professional mental health support.

If you're struggling, please reach out to:
- A trusted person in your life
- Your campus counseling office
<!-- TODO_VERIFY: Add verified Egypt-specific hotline numbers before public launch -->

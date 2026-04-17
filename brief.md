# Pause — Brief

**Type:** Student/competition web app  
**Owner:** Wael Zuhairy  
**Status:** In development (Phase 1)

## What it is
Two-feature AI app for university students:
1. **Perspective Switch** — paste a message → see how it lands → get a kinder rewrite
2. **Daily Companion** — daily mood check-in → AI reflection + one actionable suggestion

Both features share user history to personalize outputs.

## Stack
- **Frontend:** React (Vite) + Tailwind v4 + TypeScript
- **Backend:** Firebase Cloud Functions (Node 20, TypeScript)
- **Auth:** Firebase Auth — Google + Anonymous→link upgrade
- **DB:** Firestore (per-user isolated)
- **AI:** Provider-agnostic — Gemini 2.0 Flash (default, free) | Claude Haiku 4.5 (swap via env)

## Deliverables
- [ ] Live URL (Firebase Hosting)
- [ ] GitHub repo
- [ ] Pitch deck (after build)

## Key decisions
- Start on Gemini free tier, swap to Claude Haiku by changing `AI_PROVIDER` env var
- Anti-bullying UX: never label the user, always frame tentatively ("may come across as...")
- Rewrite is a *suggestion* — user can "Use rewrite", "Edit yourself", or "Send anyway"
- Crisis disclaimer uses Egypt-specific resources — **verify hotlines before public deploy**

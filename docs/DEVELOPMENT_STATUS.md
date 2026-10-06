# Development Status

Read top-to-bottom before starting a session. Add a new entry at the top after meaningful work.

---

## 2026-10-06 — Phase 3: first real Gemini-backed chat endpoint

- **AI integration:** Added a backend AI service interface and Gemini provider using Google's maintained `@google/genai` SDK (`2.27.0`) and the configurable `GEMINI_MODEL` (default `gemini-3.8-flash`). The Gemini API key is read only by the backend.
- **Endpoint:** `POST /api/ask` requires the existing Supabase `requireAuth` middleware, accepts a bounded message and optional bounded recent history, and returns `{ answer, sources: [] }`. Sources are empty because verified retrieval has not been implemented.
- **Frontend:** Existing chat now posts the current message to `/api/ask` with the access token from the current Supabase session. It shows a pending state and displays API errors. Removed regex-based school answers; unsupported school-specific questions are instructed to use the verified-information fallback. Existing personal schedule parsing remains limited to explicit personal event intents.
- **Configuration:** `backend/.env.example` documents `GEMINI_API_KEY` and `GEMINI_MODEL`. Root `.gitignore` ignores backend `.env` files while allowing `.env.example`.
- **Files:** Added `backend/src/services/ai/{AIService, GeminiProvider, index}.ts` and `backend/package-lock.json`; modified backend config/server/dependencies/env example, `src/App.tsx`, and this status file.
- **Verified:** Backend TypeScript typecheck and build pass; frontend Vite production build passes; a local `POST /api/ask` without Authorization returned `401 UNAUTHENTICATED`. The `tsx watch` development command could not start in this execution environment (`uv_os_get_passwd returned ENOMEM`), so the built backend was used for the auth check.
- **Not verified here:** No `backend/.env` or Gemini key is configured in the workspace, and no authenticated user token was available. Live Gemini responses, signed-in calls, expired-token behavior, model/API failure and rate-limit behavior remain to be tested with local credentials.
- **Limitations:** No RAG, knowledge base, verified school context, source citations, schedule retrieval, or embeddings. Gemini can answer general questions but must refuse school-specific claims without supplied verified context.
- **Next phase:** Build an approved school knowledge base and RAG using Supabase/Postgres/pgvector, then pass retrieved verified excerpts and source metadata to the provider.

---

## 2026-10-05 — Phase 2: real authentication (Supabase Auth)

- **Frontend:** `src/Login.tsx` (login, forgot password, set-new-password), `src/auth.ts` (`useAuth`: session restore, sign in/out, password reset), `src/lib/supabase.ts`, `src/user.ts`. `App.tsx` now renders Login unless a valid Supabase session exists; the hardcoded demo student and the fake sign-out toast are gone.
- **Fail closed:** without `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` the app shows Login with sign-in disabled. University SSO is shown disabled (not configured).
- **Per-user local data:** conversations, calendar and schoolwork are stored under `eagledesk.student.v2.<user id>`, so users on a shared browser do not see each other's data. Old un-keyed demo data is not migrated.
- **Backend:** `backend/` (Express + TypeScript). `requireAuth` verifies the bearer token with Supabase Auth on every request (401 invalid, 503 if the auth service is unreachable or unconfigured). Only `GET /api/health` and `GET /api/me` exist so far.
- **Verified:** `npx tsc --noEmit` (frontend and backend), `npm run build`, and 27 browser checks against a local stand-in for the Supabase Auth HTTP API. **Not yet verified against a real Supabase project.**
- **Still mocked:** the chat replies (regex), the demo calendar, Student ID / Program / Section ("Not set" until a profiles table exists), the Contact Staff list, and the Knowledge Base (no admin UI or database yet).
- **Docs conflict (still unresolved):** `CLAUDE.md` and several older planning docs still describe the prior stack/scope. Update them in a documentation pass so they match the current React/TypeScript frontend, Express backend, and future Supabase/Postgres knowledge-base plan.

---

## 2026-10-05 — EagleDesk student workflow prototype

- Reworked the existing React/Vite demo into searchable, persistent chat sessions with a responsive app shell and student profile menu.
- Added personal calendar entries, schoolwork CRUD/status controls, and in-app/browser reminder processing backed by browser local storage.
- Kept official demo school dates read-only and separate from personal items; no Supabase, authentication, AI API, or server-side scheduler is connected yet.
- Verified with `npm run build` and `npx tsc --noEmit`.

## 2026-09-19 — Architecture simplified

- **DECISION:** Simplified the planned stack to HTML/CSS/JavaScript + Node.js/Express + Supabase PostgreSQL/Auth + Gemini API.
- **REMOVED FROM MVP:** React, TypeScript, Tailwind, pgvector, embeddings, complex RAG layers, and full ticketing workflow.
- **HELP FLOW:** Student describes problem → AI classifies → backend searches verified knowledge → Gemini generates troubleshooting steps → student can request human help if unresolved.
- **SUPPORT REQUESTS:** Kept as a simple human-help record rather than a ticketing system.
- **KNOWLEDGE:** MVP uses normal PostgreSQL search/filtering. Semantic/vector retrieval is a future option.
- **DOCUMENTS UPDATED:** PROJECT_CONTEXT.md, ARCHITECTURE.md, DATABASE.md, API_CONTRACT.md, AI_RAG.md, SECURITY.md, and CLAUDE.md.

## Previous

### Frontend prototype

- Static HTML/CSS/JS prototype built for the core student screens.
- Prototype includes dashboard, AI Helpdesk chat, conversations, profile, notifications, and settings.
- Chat responses are currently hardcoded demo responses and are not connected to a real AI API.
- Prototype should be reused as the visual starting point instead of immediately rewriting it into React.

## Next Up

- [ ] Clean the prototype to match the simplified MVP flow.
- [ ] Create the basic Express backend.
- [ ] Connect Supabase Auth.
- [ ] Create the initial PostgreSQL schema.
- [ ] Seed a small verified IT knowledge base.
- [ ] Implement `POST /api/ask`.
- [ ] Connect the prototype chat to the real API.
- [ ] Add simple human-help requests.
- [ ] Add admin knowledge management.
- [ ] Test AI grounding and security.

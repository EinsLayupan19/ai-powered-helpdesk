# Development Status

Read top-to-bottom before starting a session. Add a new entry at the top after meaningful work.

---

## 2026-10-06 — Phase 4: local verified knowledge retrieval

- **Knowledge layer:** Added a `KnowledgeService` abstraction and deterministic local lexical search. The only schedule ingested is the task-approved 3BSIT-1 timetable, represented as a section-scoped document (`schedule-3bsit-1`). Relevance is measured by normalized token overlap with a minimum threshold.
- **Safety:** Retrieval requires an explicit matching section for a section-specific schedule. Unknown school questions with no matching document return the exact verified-information fallback without calling Gemini. General questions continue to Gemini with no school context. The Gemini system instruction separates verified context from untrusted history/user content and prohibits cross-section inference.
- **Endpoint and sources:** Protected `POST /api/ask` still uses `requireAuth`; it now injects retrieved documents into Gemini and returns source metadata (`id`, `title`, `category`) for retrieved context. Supabase authentication was not changed.
- **Approved knowledge scope:** Only the supplied 3BSIT-1 schedule is ingested. Existing `docs/KNOWLEDGE_BASE.md` also contains schedules for other sections and old academic calendars; those were excluded to honor this phase's explicit 3BSIT-2 fallback and current-calendar safety requirements. No current approved calendar file was found, so calendar retrieval is unavailable.
- **Files:** Added `backend/src/services/knowledge/{types, LocalKnowledgeService, index}` and `backend/test/knowledge.test.mjs`; changed `backend/src/services/ai/AIService.ts`, `GeminiProvider.ts`, `backend/src/server.ts`, backend test script, and this status file.
- **Verified:** Automated tests cover the 3BSIT-1 schedule, ITL314 time/room, ITL313 room, 3BSIT-2 isolation, general HTML classification, cashier/policy fallback, schedule-invention refusal, and missing-section fallback. Backend typecheck/build and frontend build pass. Live Gemini output still requires valid local backend credentials.
- **Limitations:** This is lexical retrieval, not vector RAG. The local approved corpus currently contains only the supplied 3BSIT-1 schedule; cashier identity, policies, and current calendar information are unavailable. Sources reference the schedule document only. No embeddings, database retrieval, or admin ingestion UI.
- **Next phase:** Add approved knowledge sources as structured documents and tests, then implement vector or hybrid retrieval only after an approved current source corpus is ready.

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

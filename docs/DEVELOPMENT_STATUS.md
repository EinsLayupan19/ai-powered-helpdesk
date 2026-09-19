# Development Status

Read top-to-bottom before starting a session. Add a new entry at the top after meaningful work.

---

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

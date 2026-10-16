# EagleDesk

**AI-Powered School Helpdesk System**

EagleDesk is a web-based school helpdesk designed to help students find school-related information, procedures, schedules, and announcements through a simple conversational interface.

The project is being developed as an academic project for **New Era University**.

> 🚧 **Status:** Work in Progress

## Features

- 💬 **AI Helpdesk** — Ask questions about school-related information in a conversational interface.
- 📚 **School Information** — Access verified procedures and commonly requested school information.
- 🗓️ **Academic Calendar** — Provides calendar information while distinguishing current and historical academic calendars.
- 🏫 **Class Schedules** — Supports section-based class schedule information.
- 📢 **School Announcements** — Directs users to official school announcements when appropriate.
- 👨‍🏫 **Faculty & Office Guidance** — Helps students identify the appropriate office, faculty member, or school system for a concern.
- 🌙 **Light/Dark Interface** — Simple interface with theme support.
- 📱 **Responsive Design** — Designed for use across different screen sizes.

## Tech Stack

| Part | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Sign-in | Supabase Auth (email and password; accounts are created in the Supabase dashboard, there is no sign-up screen) |
| Backend | Node.js 22.12+, Express 4, TypeScript |
| AI | Google Gemini through the backend only (`@google/genai`, default model `gemini-3.5-flash-lite`) |
| Knowledge | Verified school knowledge searched by the backend: by default the entries in `backend/src/services/knowledge/corpus.ts` (copied from `docs/KNOWLEDGE_BASE.md`) plus the 3BSIT-1 to 3BSIT-6 schedules, or the Supabase `knowledge_entries` table (`KNOWLEDGE_SOURCE=supabase`, only rows marked `verified`) |
| Database | Supabase PostgreSQL migrations in `supabase/migrations/`. Chats, calendar and schoolwork are still stored per user in the browser (localStorage). |
| Tests | Node's built-in test runner (`npm test` in `backend/`) |

## Project Structure

```
ai-powered-helpdesk/
├── src/                 React frontend (App.tsx, Login.tsx, auth.ts, components/)
├── public/              Logo and static files
├── backend/
│   ├── src/             Express API: app.ts (routes), server.ts (startup), middleware/, services/ai, services/knowledge
│   └── test/            Backend tests
├── supabase/            SQL migrations, seed, rollback
├── docs/                Project documentation (start with DEVELOPMENT_STATUS.md)
├── render.yaml          Deployment blueprint (Render)
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 22.12 or newer and npm
- A Supabase project (URL and publishable key)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Frontend

```bash
git clone https://github.com/EinsLayupan19/ai-powered-helpdesk.git
cd ai-powered-helpdesk
npm install
cp .env.example .env.local     # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env           # then fill in SUPABASE_URL, SUPABASE_ANON_KEY (publishable key) and GEMINI_API_KEY
```

Never put the Gemini key or a Supabase service-role key in the frontend env file. Both env files are git-ignored.

### 3. Run (two terminals)

```bash
npm run dev --prefix backend   # API on http://localhost:3001
npm run dev                    # app on http://localhost:5173 (Vite forwards /api to the backend)
```

### Checks

```bash
npx tsc --noEmit && npm run build          # frontend type check and production build
npm run typecheck --prefix backend         # backend type check
npm test --prefix backend                  # backend tests
```

## Deploy

In production one Node server serves both the built frontend and `/api` from the same address, so the browser's
relative `/api/ask` calls work with no CORS setup. `render.yaml` describes this for [Render](https://render.com):

1. Push the branch you want to deploy to GitHub.
2. In Render: **New > Blueprint**, pick this repository and branch.
3. Fill in the values Render asks for:
   - `VITE_SUPABASE_URL` and `SUPABASE_URL`: your Supabase project URL (the same value twice)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_ANON_KEY`: the publishable key (the same value twice; never the service-role key)
   - `GEMINI_API_KEY`: your Gemini key
4. After the first deploy, in Supabase go to **Authentication > URL Configuration**: set **Site URL** to your Render
   address (for example `https://eagledesk.onrender.com`) and add the same address under **Redirect URLs**. Without
   this, password-reset emails link back to localhost.
5. Create a student account in Supabase (**Authentication > Users > Add user**) to sign in.

Build and start commands (also usable on any other Node host):

```bash
npm ci --include=dev && npm run build && npm ci --include=dev --prefix backend && npm run build --prefix backend
npm start --prefix backend
```

Notes:

- Health check: `GET /api/health`.
- Each student can ask 30 questions per 10 minutes. The counter lives in server memory, which is accurate for one
  instance; also set a usage limit for the Gemini key in Google AI Studio.
- On Render's free plan the service sleeps after a period without traffic, so the first visit after a pause takes
  noticeably longer to load.

## Knowledge Base

EagleDesk uses a maintained knowledge base for school-related information, including:

- Student procedures
- School offices and locations
- Enrollment and clearance guidance
- Student ID procedures
- Grade-related guidance
- Academic calendars
- Class schedules
- Official announcement sources

The system should **not invent school policies, dates, fees, office locations, or procedures**. When information may have changed, users should be directed to the appropriate official school source or faculty member.

See `docs/KNOWLEDGE_BASE.md`.

## Academic Calendar Handling

EagleDesk may contain both current and historical academic calendars.

Historical calendars are kept for reference and should not be presented as the current academic calendar. Current-date questions should use the latest approved calendar available to the system.

## Development

This project is currently under active development.

Development documentation is maintained in the `docs/` directory, while project instructions and development guidelines are documented in `CLAUDE.md`.

## Roadmap

- [x] Initial web interface
- [x] School knowledge base
- [x] Academic calendar support
- [x] Class schedule information
- [x] AI question-answering integration (Gemini through the backend)
- [x] Backend API (Express)
- [x] Authentication (Supabase Auth, verified on every API request)
- [ ] Database integration (migrations written; chats and schedules still live in the browser)
- [x] Knowledge retrieval from the verified knowledge base (local mode, keyword ranking)
- [ ] Supabase knowledge retrieval in use (built; the table has no verified entries yet)
- [x] Automated backend tests
- [ ] Deployment (configuration ready in `render.yaml`; not deployed yet)

## Purpose

EagleDesk aims to make school-related information easier to find by giving students a single, simple place to ask questions instead of searching through multiple sources.

## Disclaimer

EagleDesk is an academic project and is not an official New Era University system. Information provided by the system should be verified through official university channels when necessary.

## Author

**Zirk Eins B. Layupan**

BS Information Technology  
New Era University

---

*EagleDesk — making school information easier to find.*

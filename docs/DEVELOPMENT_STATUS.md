# Development Status

Read top-to-bottom before starting a session. Add a new entry at the top after meaningful work.

## 2026-10-16 — Login: student ID + password, Continue with Google, NEU accounts only

- **Supersedes the entry below** where it mentions email sign-in in the login field: the field is now **Student ID** only (digits auto-format to `12-34567-890`, numeric keypad on phones), with **Continue with Google** below it ("NEU Google accounts (@neu.edu.ph) only."). Email/password sign-in is no longer offered in the UI.
- **Google:** `signInWithOAuth({ provider: "google", queryParams: { hd: "neu.edu.ph", prompt: "select_account" } })`, back to the app's origin. `hd` is only a hint, so any session whose email is not exactly `@neu.edu.ph` is signed out at once with a message, and errors Supabase/Google return in the URL are shown and removed from the address bar.
- **NEU-only on the server:** `requireAuth` answers `403 NOT_NEU_ACCOUNT` for any valid session outside `@neu.edu.ph` (look-alike domains and missing emails fail; letter case is ignored). Student ID sign-in also refuses an ID linked to a non-NEU email.
- **Forgot password by student ID:** `POST /api/auth/student-reset` emails the reset link to the account's university address via Supabase, never shows it, gives the same answer for unknown IDs and non-NEU accounts (no email sent), keeps the 0.7 s floor, and has its own per-device and per-ID limits.
- **Owner setup needed:** enable the Google provider in Supabase (Google Cloud OAuth client with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`) and add the app addresses under Redirect URLs. Today Supabase answers "Unsupported provider: provider is not enabled". Student ID sign-in still needs `SUPABASE_SERVICE_ROLE_KEY` and `profiles.student_number`.
- **Verified:** backend 166/166 (NEU-only middleware incl. look-alike domain, missing email and letter case; NEU check in student sign-in; reset service against a fake Supabase incl. `/auth/v1/recover`, unknown ID, non-NEU, rate limit, outage and timing floor; reset route incl. no-store, validation, not set up, limits); frontend typecheck and build. In a headless browser against the local server: labels, numeric keypad hint, auto-formatting, empty/partial ID messages, student ID and forgot password without the key, Continue with Google sends the browser to the project's `/auth/v1/authorize?provider=google&hd=neu.edu.ph&prompt=select_account` with the app as `redirect_to`, a returned Google error is shown and cleaned from the URL, a planted fake Gmail session is signed out and removed from storage while a fake `@neu.edu.ph` session reaches the app. No JavaScript errors.
- **Not verified:** a real Google sign-in and a real student ID sign-in or reset (Google provider not enabled; no service-role key here).

## 2026-10-16 — Sign in with a student ID or an @neu.edu.ph email

- **Login page:** one field, "Student ID or university email" (placeholder `12-34567-890 or name@neu.edu.ph`). An ID in `NN-NNNNN-NNN` format goes to the new backend route; an `@neu.edu.ph` email signs in with Supabase Auth as before; anything else gets a message explaining both options. Forgot password needs the email (reset links are emailed).
- **Backend:** `POST /api/auth/student-sign-in` (`backend/src/services/auth/`). Looks up `profiles.student_number` with `SUPABASE_SERVICE_ROLE_KEY` (backend only; one query plus `auth.admin.getUserById`, single attempt, 8 s timeout), then calls Supabase's normal password sign-in with the anon key and returns only the session. Unknown ID and wrong password give the same 401, every attempt takes at least 0.7 s, attempts are limited to 10 per device and 5 per student ID per 15 minutes, and responses are `no-store`. Without a real service-role key (checked with `isPrivilegedSupabaseKey`) the route answers 503 "Student ID sign-in isn't set up yet. Sign in with your university email." and a startup warning explains why (the key is never printed).
- **Owner setup for student IDs:** add `SUPABASE_SERVICE_ROLE_KEY` in Render's Environment (not in `render.yaml`) and fill `profiles.student_number` per student. Note: every student ID sign-in reaches Supabase from the server's one IP, so Supabase's per-IP sign-in limit is shared by all student-ID logins; fine for a demo, worth revisiting at real scale.
- **Verified:** backend 156/156 (new: 8 sign-in tests against a fake Supabase incl. key separation, same answer for unknown ID and wrong password, timing floor, rate limit/outage mapping, key check; 8 route tests incl. validation, no-store, per-ID and per-device limits); frontend typecheck and build; in a headless browser against the local server: label and placeholder, empty submit, Gmail address, malformed ID, student ID without the key (503 message), a made-up `@neu.edu.ph` email against the real Supabase project ("Incorrect email or password."), and forgot password with an ID. No JavaScript errors.
- **Not verified:** a real student-ID sign-in end to end (needs the service-role key and a filled `student_number`, neither available here).

## 2026-10-16 — Local knowledge base connected (school questions answer again)

- **Problem:** almost every school question answered "I don't have enough verified information to answer that accurately." Cause: since `4a0ef13`, school questions only use verified knowledge, but local mode knew only the 3BSIT-1 schedule, and the local `backend/.env` used `KNOWLEDGE_SOURCE=supabase`, whose `knowledge_entries` table holds only the two draft seed rows (RLS returns verified rows only). Before `4a0ef13`, every question went to Gemini unguided, which is why it seemed to work.
- **Fix:** `backend/src/services/knowledge/corpus.ts` holds 22 entries copied from `docs/KNOWLEDGE_BASE.md` ("verified student procedures provided by the project owner"), each with ranking keywords. Local mode ranks them with `rankEntries` for non-schedule questions. Schedules now cover 3BSIT-1 to 3BSIT-6 from section 14; 3BSIT-5 and 3BSIT-6 rooms are empty in the source and shown as "Room not listed". A schedule question without a section asks for the section (KB schedule rule 1) and mentions Automate; an unknown section or course gets the exact fallback plus the Automate hint. Gemini may add one pointer after the fallback when a retrieved entry names the official source.
- **Local config:** `backend/.env` now uses `KNOWLEDGE_SOURCE=local` (not committed; Render already used `local`). Supabase mode is unchanged and still needs entries marked `verified` by the owner.
- **Verified:** backend 140/140 (new `knowledge-corpus.test.mjs`: 23 common questions retrieve the right entry, general questions retrieve nothing, every Q&A answer appears verbatim in `KNOWLEDGE_BASE.md`; schedule and route tests updated for six sections); frontend typecheck and build. Live through the real route, real knowledge and real Gemini (only sign-in stubbed): lost ID, tuition payment, guidance office, good moral, CSD contact, AY 2024–2025 midterms (dates match the KB), section prompt, 3BSIT-4 schedule, HTML; midterms (no current dates in the KB) gives the fallback plus the official calendar link; a cashier's name, a BSIT tuition price, and a prompt-injection attempt all get the fallback with nothing invented.
- **Keep in sync:** when `docs/KNOWLEDGE_BASE.md` changes, update `corpus.ts`; the verbatim-answer test catches drift in the Q&A entries.

## 2026-10-16 — Deployment readiness (one Node service) and live Gemini fix

- **Live Gemini finding:** `gemini-3.8-flash` (the previous default) failed every live check today: 503 "high demand" three times and one 20-second timeout. `gemini-3.5-flash-lite` answered every check (4/4) in about 2 to 2.7 seconds with no thinking tokens. The default model is now `gemini-3.5-flash-lite` (`config.ts`, both `.env.example` files, and the local `backend/.env` model line; no key was changed).
- **GeminiProvider:** the 20-second timeout now aborts the SDK request (`abortSignal`), so a timed-out call no longer keeps running in the background; one retry after 1 second on HTTP 500/503, inside the same 20-second deadline; no retry on 400/429; output budget raised from 512 to 1024 tokens (a 474-token live answer was close to the old cap). Errors are still never forwarded.
- **Production serving:** `createApp` takes an optional `staticDir`. `server.ts` passes the repo-root `dist/` when `dist/index.html` exists, so one server serves the built frontend and `/api` from the same origin (no CORS, no frontend change). Hashed `assets/` are cached for a year, `index.html` is `no-cache`, other page paths fall back to the app, missing assets stay 404, unknown `/api` routes stay JSON 404s. Without a build (normal development) nothing changes.
- **Hardening:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` on every response; `trust proxy` = 1 hop; per-student rate limit on `/api/ask` (30 per 10 minutes, in memory, `429 RATE_LIMITED` with `Retry-After`), counted only after authentication. No CSP yet.
- **Build blocker fixed:** the uncommitted root `package-lock.json` had lost every `@supabase/*` entry (plus `tslib` and `iceberg-js`) while `package.json` still requires `@supabase/supabase-js`, so `npm ci` failed. The diff was deletions only; the committed lock was restored (`@supabase/supabase-js` 2.117.2, the installed and tested version).
- **Deploy config:** `render.yaml` (Render Blueprint: one free web service, build and start commands, `/api/health` check, secrets as `sync: false`); `engines.node >=22.12.0` in both `package.json` files (required by Vite 8 and supabase-js 2.117).
- **Docs:** README setup, deploy steps, and an accurate roadmap; `API_CONTRACT.md` now documents the implemented `/api/ask` request and every error code (including the new `RATE_LIMITED` and the earlier `KNOWLEDGE_UNAVAILABLE`), above the planned design. `backend/.env.example` uses placeholders and lists `KNOWLEDGE_SOURCE=local`.
- **Cleanup:** stopped tracking an accidentally committed PowerShell cache (`Microsoft/Windows/PowerShell/ModuleAnalysisCache`, now git-ignored; the file stays on disk).
- **Verified:** backend typecheck; backend suite 105/105 (87 existing plus 8 provider tests and 10 deployment tests); frontend typecheck and build; live Gemini answers through the real provider. Clean-copy production rehearsal (only repository files, no `node_modules`, `dist`, or env files; settings passed as environment variables): the exact `render.yaml` build command succeeds; the start command serves `/`, hashed assets with long-term caching, the logo, deep links, JSON 404s, and the security headers; `/api/health` returns ok; `/api/ask` returns 401 without a token and 401 for a forged token checked against the real Supabase project. The built bundle contains no Gemini key and no secret or service-role key (only the public publishable key and library code that checks key prefixes).
- **Not verified:** a signed-in `/api/ask` round trip in the deployed or rehearsed app (needs a real student account; no credentials were used), the hosted Render build itself, and the Supabase URL configuration for password-reset links (manual dashboard step, listed in README).
- **Committed:** the Oct 10 work and this session's work went to `phase-2-auth` as separate commits, each checked out in a clean worktree and verified (frontend typecheck and build, backend typecheck and tests: 21, 21, 21, 48, 87, 95, 105, 105 passing). Note: the previously pushed `phase-2-auth` (`4a0ef13`) failed the frontend typecheck (missing `Message`/`StructuredSchedule` types); the redesign commit restores them. Commits from now on use the owner's GitHub no-reply email so they count on the profile.

## 2026-10-10 — Stage 2: Supabase knowledge retrieval (backend, off by default)

- **Switch:** `KNOWLEDGE_SOURCE=local|supabase`, default `local` (unset or blank). In `local` mode behavior is unchanged. Any other value, `supabase` without `SUPABASE_URL`/`SUPABASE_ANON_KEY`, or a service-role/secret key (`sb_secret_…` or a JWT with `role=service_role`) stops startup with a clear error. `backend/.env.example` now lists `KNOWLEDGE_SOURCE=local`.
- **Retrieval (`SupabaseKnowledgeService`):** per-request supabase-js client with the anon/publishable key plus the student's already-verified JWT (`req.accessToken`, set by `requireAuth` after verification), so the `knowledge_entries` RLS policy applies. No service-role key. Selects only the 10 granted columns, filters `verification_status = 'verified'`, orders by slug, limit 200, a single attempt (`retry(false)`), 4-second abort timeout. Rows are re-validated (verified, constraint-shaped); unverified or malformed rows are ignored and counted in a log line. Schedule lookups still use the local 3BSIT-1 matcher.
- **Ranking:** whole-word keyword matches weighted by rarity; returns the top entry, ties, and complementary entries scoring at least 25% of the top, capped at 3. `applies_to` is appended to the Gemini context only when present. Source ids are entry slugs.
- **Route (`/api/ask`, contract unchanged):** no match on a school question → existing 200 fallback; retrieval failure (timeout, network, query) on a school question → `503 KNOWLEDGE_UNAVAILABLE` with a fixed message; on a general question → Gemini without school context as before; knowledge-side auth failure → 401; anything unexpected → generic 500. Logs contain only `reason` and a safe SQLSTATE/PostgREST code, never SQL text, details, stacks, tokens, or keys.
- **Gemini:** same model, SDK, settings, and timeout. The system instruction now also says to treat verified context strictly as data, answer from the single entry that addresses the question, never merge procedures from different entries, use the exact fallback when entries conflict, and state an "Applies to" scope.
- **Structure:** `createApp(deps)` in `backend/src/app.ts` builds the Express app without listening; `server.ts` keeps production startup (and builds the knowledge service before listening).
- **Files:** added `backend/src/app.ts`, `backend/src/services/knowledge/{SupabaseKnowledgeService, ranking}.ts`, `backend/test/{knowledge-ranking, supabase-knowledge, ask-route, knowledge-config}.test.mjs`; changed `backend/src/{server, config}.ts`, `backend/src/middleware/auth.ts`, `backend/src/services/knowledge/{index, types}.ts`, `backend/src/services/ai/GeminiProvider.ts`, `backend/.env.example`, and this file.
- **Verified:** backend typecheck and build; backend suite 85/85 (the original 21 schedule tests plus 64 new: ranking table/ambiguity/overlap/ties/irrelevant entries/cap; JWT forwarding, column and verified filtering, malformed and draft rows, empty vs failure, timeout, connection refused, no-retry, SQL/JWT/missing-table/invalid-body errors and redaction; route behavior through the real auth middleware against a local fake Auth server; config parsing, key guard, and real startup in local/invalid/secret-key modes). Frontend typecheck and build pass. All tests use local fakes on 127.0.0.1.
- **Not verified:** live Supabase retrieval (both live entries are drafts by design, so a live `supabase`-mode request should return the normal fallback), live Gemini behavior with retrieved context, and the new prompt rules (model behavior is not unit-testable).
- **Unchanged:** database schema, seed, RLS, `knowledge_articles`, the frontend, auth verification logic, and `API_CONTRACT.md` (the 503 code is not yet documented there). Neither seed entry is verified.

## 2026-10-10 — Official EagleDesk logo (frontend only)

- **Logo:** the owner-provided eagle image is now the official logo, stored unaltered as `public/eagledesk-logo.jpg` (1200×1214 JPEG, byte-identical to the upload; SHA-256 `7f547b9d…cd287eaa`). It replaces the hand-drawn SVG eagle everywhere through the existing `Eagle` component in `src/brand.tsx`: sidebar (36px), chat title (30px, 26px on phones), assistant avatar (32px), welcome screen (104px, 88px on phones), sign-in and set-password screens (84px), loading screen, and the favicon/apple-touch icon in `index.html`.
- **Presentation:** the JPEG has a pure white background, so it sits on a matching white rounded tile (28% radius) at 80% of the tile with `object-fit: contain`. Nothing is cropped, stretched, or recolored. The welcome/sign-in "orb" is now an indigo/violet glow behind the tile; the rest of the navy/violet UI is unchanged.
- **Verified:** frontend typecheck and production build pass (the logo is copied to `dist/` unchanged). Headless Edge matrix, 58 screens at 320/375/768/1024/1440 in both themes, reports no overflow or console errors; each visible logo loads at 1200×1214, uses `object-fit: contain`, and has at least a 10% margin inside its tile.
- **Not changed:** authentication, backend, database, storage keys, and user data.
- **Note:** a transparent PNG of the same artwork would let the eagle sit directly on the dark surfaces without the white tile; none was provided, and the JPEG was not edited.

## 2026-10-10 — Midnight visual redesign and chat UX improvements (frontend only)

- **Direction:** premium AI-chat look from the approved reference. Midnight canvas with restrained indigo/violet ambient light (lavender wash in light mode), an inset rounded application panel, one gradient family (New chat, user bubbles, send button, active/focus), eagle "orb" on welcome and sign-in, DM Sans and the gold-beak eagle kept. Fake features from the reference (model picker, file/image/voice buttons, upgrade card) were deliberately not added.
- **Layout:** Recent chats moved into the sidebar at 1280px and above (same search, grouping, selection, and deletion); below 1280px history stays a slide-over drawer opened from the chat header. Sidebar has a gradient New chat button and a profile footer (name and email).
- **Chat:** failed requests are no longer saved as AI replies; they show an error card with Retry, and Retry never duplicates the student's message (schedule proposals are still auto-added once). Answers render safe Markdown-like formatting (`src/components/FormattedText.tsx`: paragraphs, bold, lists; no HTML is interpreted). Multiline auto-growing composer (Enter sends, Shift+Enter new line). History search empty state. New messages carry optional `createdAt`; AI messages carry optional `sources` only when the API returns well-formed ones. Older saved messages load unchanged.
- **Secondary screens:** add/edit personal calendar events (existing event shape; untouched fields keep their saved values, e.g. a "9am" time), confirmation dialogs before deleting chats, schoolwork, and events and before clearing notifications (`ConfirmDialog` in `src/components/Dialog.tsx`, rendered into the themed app root), accessible Light/Dark switch (native radios, same theme key, dark default), save toasts, ~44px touch targets on touch screens, inline SVG favicon (fixes a 404).
- **Unchanged (verified):** `auth.ts`, `lib/`, `user.ts`, `main.tsx`, backend, Supabase migration, env files, dependencies, storage keys, and existing data shapes (apart from the two approved optional fields).
- **Verified:** frontend and backend typecheck, production build, backend tests 21/21; formatter unit checks 17/17; headless Edge end-to-end checks with `/api/ask` intercepted in the test browser (failure, Retry, success with sources, legacy data, proposal auto-add) 26/26; feature regression against localStorage (sidebar history, calendar add/edit/validate/delete, confirmations, theme switch, dialog focus) 24/24; 58 rendered screens at 320/375/768/1024/1440px in both themes with no overflow, console errors, hidden headers, narrow backdrops, or focus escaping dialogs; touch-target and reduced-motion checks; 64 contrast pairs pass. Two verified backups were taken outside the repo before editing.
- **Not verified:** real Supabase sign-in (tests used a fake local session), real Gemini answers, screen readers, physical touch devices.

## 2026-10-10 — UI redesign ("Quiet Academic"), presentation only

- **Design system:** rewrote `src/index.css` as readable, sectioned CSS with documented tokens for light and dark (dark stays default), a fixed radius rule (8px controls, 12px containers, round only for avatars and badges), a type scale, a z-index scale, a visible 2px focus ring, and `prefers-reduced-motion` support. All 48 checked text, control, and focus pairings meet WCAG AA in both themes (lowest text pair 4.91:1; previously light muted text was 3.03:1 and dark accent text 3.35:1). Tailwind now scans only `src/` (it was generating unused utilities from `.agents/` and `docs/`).
- **Accessibility:** new `src/components/Dialog.tsx` (dialog role, focus trap, Escape, focus restore) used by the schoolwork form; new `src/components/useDismiss.ts` (Escape and outside click with focus restore) used by the profile menu; `aria-current` on both navigations; unread count announced; toast announced through a persistent live region; chat input, search, and theme select have real labels; typing indicator announced; calendar day cells expose "today" and "has events" to screen readers.
- **Layout:** labeled sidebar at 1280px and wider (icon rail with keyboard-visible tooltips below that); chat history is a slide-over drawer on phones; the profile menu opens next to whichever trigger was used; AI answers keep line breaks; pages share one centered content column.
- **Fixes within UI scope:** Settings "Sign out" now calls the real sign-out (it showed a fake demo alert); calendar "today" uses local time and the calendar opens on the current month; removed the decorative "online" dot and em/en dashes from UI strings; overdue badge on pending schoolwork; notification permission state shown in Settings.
- **Content:** replaced four unverified staff emails with offices from `KNOWLEDGE_BASE.md` (CSD, OSAS, Guidance and Counseling, Cashier, general information) plus a source note; replaced five invented "official calendar" dates with a link to the official NEU calendar.
- **Unchanged (verified byte-identical against HEAD):** AI request and chat persistence, schoolwork/calendar/proposal logic, reminders, storage keys and formats, theme storage, auth gating; `auth.ts`, `lib/`, `user.ts`, backend, and dependencies untouched.
- **Verified:** frontend typecheck, production build, backend typecheck and tests (21/21), class-coverage check, dash scan, contrast check, dev-server smoke test.
- **Rendered check (headless Edge, local dev server, throwaway profile, fake local session and demo data; no network auth):** 19 screens at 375, 900, 1024, 1280, and 1440px in both themes, with automated checks for horizontal overflow, document scroll on chat pages, off-screen chat header, dialog backdrop width, and focus inside the open dialog. Bugs found and fixed: visually-hidden labels escaped the message scroller and scrolled the whole page on phones; the dialog backdrop was capped at the content width; uneven gap in the calendar's right column; double padding on mobile Settings; empty Privacy control row; wrapping event dates; duplicate profile entry points on wider screens (the top-right avatar is now phone-only); two-line chat subtitle on phones; notification timestamps showed seconds.
- **Not verified:** screen-reader testing, real touch devices, and live sign-in against the dev project.

## 2026-10-10 — Phase 3 preparation: revised migration proposal (no files, code, or schema changes)

- **0200 redesigned:** removed linked calendar copies of schoolwork entirely; the calendar API will merge standalone `calendar_events` with `schoolwork` at read time, so copies can't drift or be tampered with. Reminders reference their item through owner-bound composite foreign keys; deleting an item clears the link (`ON DELETE SET NULL (col)`, PostgreSQL 15+) and keeps reminder history. UI impact: schoolwork entries on the calendar are managed from the Schoolwork page.
- **0300:** adds nullable `messages.metadata` and `messages.reply_to`. Every AI row must answer exactly one user message in the same conversation (check, unique constraint, and a `SECURITY DEFINER` validation trigger in a non-exposed `private` schema that applies to all roles, including `service_role`). Students still cannot write `metadata`, `reply_to`, or AI rows.
- **0400 corrected:** removed the `USING (true)` conversation policy and all writer `SELECT` access. The writer can only insert AI rows that pass the 0300 rules. Correction to the previous report: the database cannot bind an insert to "the student of this request"; that ownership is established by the backend's RLS-checked user-message insert under the student's JWT. A leaked writer credential can still answer an unanswered user message whose UUID it knows (documented limitation).
- **Verified locally only (PGlite / PostgreSQL 16.4, Supabase stub):** 81/81 checks pass; negative controls (no validation trigger, no revokes) fail 6 checks each, as expected. Rollback scripts restore the 0100-only schema while keeping chat text. Live-project verification queries are listed in the proposal; nothing has been run against the live database.

## 2026-10-10 — Phase 3 preparation: migration review (no code or schema changes)

- **Live dev project (anonymous, read-only probes):** `profiles`, `knowledge_articles`, `conversations`, and `messages` exist; `anon` gets `42501 permission denied` on select and insert. `schoolwork`, `calendar_events`, and `notifications` do not exist (no name conflicts). The Supabase CLI is not installed and the repo is not linked, so `20261010000100` was applied outside the CLI's migration history.
- **Drafted, not saved to `supabase/migrations/`, not applied:** `0200` personal schedule tables (composite owner foreign keys, a caller-privilege trigger that keeps each schoolwork item's calendar copy in sync, once-per-item reminder uniqueness, cascades), `0300` nullable `messages.metadata` (AI rows only, not writable by students), and `0400` a least-privilege `eagledesk_ai_writer` database login as an alternative to a service-role key.
- **Verified locally only:** all drafts plus the applied `0100` ran in PGlite (in-memory Postgres) with a Supabase role/auth stub; 58/58 ownership, RLS, grant, constraint, and cascade checks passed. A negative control without the `0200` revokes produced 7 expected failures. This is not proof against the live project; the same checks must be repeated there with the two test users.

## 2026-10-10 — Phase 3 preparation: security audit (no code or schema changes)

- **AI message inserts:** the `messages` insert policy for `authenticated` requires `role = 'user'`, so only an RLS-bypassing role (`service_role`) can store `role = 'ai'` rows. This prevents students from forging assistant turns that would later be replayed to Gemini as trusted history.
- **service_role grants:** the initial migration revokes from `public`, `anon`, and `authenticated` only. Supabase default privileges usually give `service_role` full access to new `public` tables, so the "narrow" message insert grant is likely redundant, not a restriction. Needs read-only verification in the SQL editor.
- **JWT validation:** `requireAuth` verifies the bearer token with Supabase Auth (`auth.getUser`) before `/api/me` and `/api/ask`. No privileged database operation exists yet, and no backend code connects to Postgres.
- **Client-supplied history:** `/api/ask` accepts an optional `history` array that may contain `assistant` turns. The frontend does not send it, but a direct API caller could forge assistant context. Phase 3 should build history from the database and stop accepting it from the client.
- **Isolation today:** conversations, messages, and profiles are owner-scoped by RLS in the database (but the app does not use them yet). Calendar events, schoolwork, reminders, and notifications exist only in per-user-keyed browser `localStorage`, which is not a security boundary on a shared browser profile.
- **Proposed:** an additive migration for `schoolwork`, `calendar_events`, and `notifications` with owner RLS, column-scoped grants, and indexes (SQL in the Phase 3 prep report; not written to `supabase/migrations/` and not applied).
- **Migration risk:** confirm how `20261010000100` was applied. If it was applied through the SQL editor, `supabase db push` would try to re-run it unless migration history is repaired first.
- **Other gaps:** `/api/ask` has no rate limiting; AI schedule cards (`schedule`/`proposal`) cannot persist in `messages.content` without a separate decision.

## 2026-10-10 — Phase 2: switched local config to the development project

- `.env.local` and `backend/.env` now point to `https://bxdcetupmhwcoksnlqxg.supabase.co`, both using a `sb_publishable_` key (verified by prefix; no secret/service-role key in either file). Gemini variables unchanged.
- Verified: public `GET /auth/v1/settings` returns 200 with the configured key (invalid-key control returns 401). The local backend reaches the new project's Auth: `/api/me` returns 401 with no token or an invalid token, not 503.
- `backend/.env.example` now uses placeholders instead of the previous project's URL.
- Not yet verified: a real sign-in against the new project (requires test users), profile auto-creation trigger, and RLS behavior with two users.

## 2026-10-10 — Phase 1: baseline typecheck fix

- Restored the `Message` type (now including `schedule`) and added the missing `StructuredSchedule` type in `src/App.tsx`; commit `4a0ef13` had replaced the `Message` line. No runtime behavior change.
- Verified: frontend `tsc --noEmit` passes, backend `tsc --noEmit` passes, `npm run build` passes, backend tests 21/21 pass.
- Verified `.env.local` and `backend/.env` are git-ignored and were never committed; no secret patterns found in tracked files.
- Note: at this point local env files still pointed to the previous project; see Phase 2.

## 2026-10-10 — Database proposal security review

- Tightened proposed message grants: students can read their own conversation messages and insert only `user` messages; they cannot update or directly delete messages. A narrow `service_role` insert grant is reserved for a future backend-only Gemini response path.
- Restricted profile self-service updates to `full_name`; a database trigger creates blank profiles for new Auth users. Official student details require a trusted source/process, and existing users need a separately reviewed backfill.
- Confirmed published, verified knowledge remains authenticated read-only. Expanded the implementation plan with the server-side trust boundary, code work still required, migration review, rollback strategy, limitations, and open decisions.
- **Not implemented/applied:** no application integration, SQL execution, live database connection, or Auth/Gemini changes. localStorage remains in place.

## 2026-10-10 — Initial database foundation prepared for review

- Added a proposed SQL migration for `profiles`, `knowledge_articles`, `conversations`, and `messages`, with ownership relationships, indexes, constraints, timestamp triggers, grants, and RLS policies.
- Added `docs/DATABASE_IMPLEMENTATION_PLAN.md` describing scope, current-code integration work, and review questions. Clarified in `docs/DATABASE.md` that its broader table list is a target design, not implemented schema.
- **Not applied:** no SQL was executed and no live Supabase connection was made. The confirmed live `public` schema has no tables or views.
- **Application status unchanged:** Supabase Auth and Gemini integration remain as they were. Chat/workspace data remains in per-user browser `localStorage`; knowledge retrieval remains local code. The app is not database-backed.
- **Next:** review the migration and design decisions before any local validation or live database change. After approval, connect and test selected application flows as separate work.

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

# Initial PostgreSQL implementation plan

## Status

This remains a proposal. `supabase/migrations/20261010000100_initial_core_tables.sql` has not been executed or applied. The confirmed live `public` schema has no tables or views. EagleDesk is **not database-integrated**: chat/workspace state remains in per-user browser `localStorage`, and the backend uses `LocalKnowledgeService`. Authentication and Gemini behavior are unchanged.

## Scope, columns, and relationships

The migration proposes only these four tables:

- `profiles`: `id` is the Auth user's UUID and primary key; `full_name`, `student_number`, `program`, `section`, `created_at`, and `updated_at`. `id` references `auth.users(id)` with cascade on account deletion. Student number is nullable and unique when present. Students may update only `full_name`; institutional fields have no student update grant.
- `knowledge_articles`: UUID `id`, title, category, keyword array, problem description, troubleshooting steps, source, publication flag, verification time, optional Auth creator, and timestamps. A check requires `verified_at` for published articles. Creator is set null if their Auth identity is deleted.
- `conversations`: UUID `id`, Auth `user_id`, title, and timestamps. Deleting an Auth user cascades to their conversations.
- `messages`: UUID `id`, `conversation_id`, role (`user` or `ai`), content, and creation time. Conversation deletion cascades to messages. Ownership is derived through the parent conversation, not a duplicated message owner field.

All tables have primary keys and timestamp defaults. Text fields have bounds; role is constrained. Indexes support recent conversations by owner, chronological messages by conversation, published/verified article lookup by category, and article creator FK lookup. Update triggers maintain `updated_at` on profiles, conversations, and articles. The Auth insert trigger creates a blank profile without copying user-editable metadata into official fields.

## Access model and grants

RLS is enabled on every table. The migration first revokes table privileges from `PUBLIC`, `anon`, and `authenticated`, then grants only the following authenticated access:

- Profiles: `SELECT`; `UPDATE(full_name)` only. There is no student `INSERT` grant, so students cannot claim institutional values or create another profile row. The row policy limits reads/updates to `auth.uid() = id`. Column grants prevent updating `student_number`, `program`, `section`, or the linked ID.
- Conversations: `SELECT`, `DELETE`, `INSERT(user_id,title)`, and `UPDATE(title)`. RLS requires `user_id = auth.uid()` for every operation. Generated IDs and timestamps cannot be supplied through column-level insert grants.
- Messages: authenticated students receive `SELECT` and `INSERT(conversation_id,role,content)` only. The select policy checks parent ownership. The insert policy also checks parent ownership and requires `role = 'user'`. No authenticated `UPDATE` or direct `DELETE` grant/policy exists. A student's user message cannot be changed into an AI response; deleting a conversation cascades its messages. `service_role` receives only a column-scoped message insert grant for the trusted backend path; it is a privileged Supabase role that bypasses RLS, so the key and its use must remain strictly server-side.
- Knowledge articles: `SELECT` only, with RLS requiring both `is_published` and non-null `verified_at`. There are no authenticated write grants or policies, so students cannot publish content or set verification timestamps.

The migration creates a `SECURITY DEFINER` Auth insert trigger to create blank profiles. Its fixed empty search path, schema-qualified table reference, and revoked direct execute privileges limit its use to the trigger path. It copies no Auth metadata. Existing Auth identities will not fire an insert trigger retroactively; a separately reviewed one-time backfill is needed if profile rows are desired for existing users.

## Trusted write paths

The current backend does not connect to PostgreSQL. `backend/src/middleware/auth.ts` verifies the bearer token with Supabase Auth using the anon key, and `backend/src/server.ts` calls Gemini but does not persist either side of a conversation. The frontend uses the publishable key for Auth only and stores workspace data in localStorage.

When persistence is implemented, a future backend route should accept the user's message and conversation ID, verify the bearer token as it already does, and use a caller-scoped Supabase client/JWT for student-owned conversation and `role='user'` message operations. The backend, not the browser, calls Gemini. After confirming the conversation belongs to the authenticated user through that caller-scoped client, a server-only privileged client uses its narrow message-column insert grant to save the generated `role='ai'` response. The service-role secret must live only in backend deployment secrets, never in Vite variables, frontend bundles, or responses. The route must not accept AI content from the browser. Because service-role access bypasses RLS, backend ownership checks, fixed operation scope, input validation, secret rotation, and careful error handling are required. This proposal does not implement that client or route.

Profile rows for new Auth users are created by the migration trigger. The student may maintain only `full_name`. `student_number`, `program`, and `section` require a future trusted institutional import or reviewed backend/admin process; no source of truth or admin authorization model is currently implemented. Knowledge article creation, edits, verification, and publication likewise need a future trusted content-management workflow, such as a backend-only administrative process with tightly controlled service-role access. No admin role or write endpoint is added here.

## Application changes required later

- `src/App.tsx`: replace or augment chat list/load/create/message/delete localStorage behavior with authenticated API calls. Do not remove existing localStorage until a separately reviewed cutover and migration plan.
- `backend/src/server.ts`: add conversation ownership and persistence operations around the existing `/api/ask` flow; current request has `message` and optional `history`, not a durable conversation ID. Persist the user turn and Gemini response using the distinct caller-scoped and trusted server paths above.
- `backend/src/config.ts` and server deployment configuration: only if the privileged AI-response path is approved, accept a service-role secret in server environment. Never expose it to the frontend. Current auth and Gemini configuration remain unchanged.
- `backend/src/services/knowledge/LocalKnowledgeService.ts`: a future database knowledge implementation must query only published, verified articles and preserve existing section-safety behavior. The current 3BSIT-1 schedule remains local until a separate data approval and tested retrieval change.
- `src/user.ts` and backend routes: add profile reads and editable-name handling; decide how existing Auth users get blank profile rows and where official student details are sourced.
- Calendar entries, schoolwork, and notifications are outside this schema and remain local.

No feature should be described as database-backed until its code path is connected and tested. Supabase Auth and Gemini integrations are unchanged by this planning work.

## Migration review, rollback, and limitations

The migration is transactional, but a later rollback must be a separate, reviewed operation. In a disposable environment, rollback in dependency order: remove the `auth.users` trigger, drop its trigger function, drop RLS policies and table triggers, then drop `messages`, `conversations`, `knowledge_articles`, and `profiles`, followed by `set_updated_at()`. Do not automate this against production. Dropping these tables permanently deletes persisted app data; back up and verify recovery first. Rolling back after application data exists may be inappropriate; prefer a forward corrective migration where data must be retained.

Before any application, validate in a disposable local Supabase/Postgres environment and test grants/RLS as anonymous, two distinct authenticated users, and the trusted backend path. Then separately review the SQL and apply only with explicit approval. This proposal has not undergone database-engine validation.

Remaining decisions: confirm student-number uniqueness and official source; confirm how existing Auth users receive profiles; define who may edit/publish verified knowledge and how that authority is protected; decide whether deleting a conversation should permanently cascade-delete messages; and review the server-only service-role deployment and operational controls before implementing AI-response persistence.

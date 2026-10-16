-- Rollback for 20261010120000_knowledge_entries. Run manually, only after review. Never automatic.
--
-- Before running:
--   1. Set KNOWLEDGE_SOURCE=local on the backend (or leave it unset) and restart it, so nothing queries the table.
--   2. Export the rows you want to keep (dashboard Table Editor > Export CSV, or keep the seed file plus a record
--      of any verification changes). Dropping the table permanently deletes its rows.
--
-- Scope: removes only public.knowledge_entries. Dropping the table also removes its trigger, policy,
-- constraints, comments, and grants. The shared public.set_updated_at() function and every other table,
-- policy, and grant are left untouched.

begin;

drop table if exists public.knowledge_entries;

commit;

-- Migration history: if the migration file stays in supabase/migrations/ after this rollback, the repo and the
-- database disagree. Prefer a new forward migration that drops the table (keeps history linear) over deleting
-- the applied migration file.

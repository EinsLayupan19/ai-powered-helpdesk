-- EagleDesk: structured school knowledge for backend retrieval (keyword ranking in the backend).
--
-- SEPARATE ADDITIVE MIGRATION. It creates one new table (public.knowledge_entries) with its own trigger,
-- grants, and policy. It does not modify, drop, or re-grant any existing object: knowledge_articles,
-- profiles, conversations, messages, and the shared public.set_updated_at() function are untouched.
-- Depends on: 20261010000100_initial_core_tables (provides public.set_updated_at()).
-- Rollback: a separate, reviewed script (rollback_20261010120000_knowledge_entries.sql), never automatic.
--
-- Access: signed-in users may read only verified rows and only the answer-relevant columns. Nobody but
-- the table owner (dashboard SQL editor / reviewed migrations) can write, including service_role.

begin;

-- Fail with a clear message (and roll back) if the shared trigger function from 0100 is missing or wrong.
do $$
declare
  fn regprocedure := to_regprocedure('public.set_updated_at()');
begin
  if fn is null then
    raise exception 'knowledge_entries: public.set_updated_at() not found; apply 20261010000100_initial_core_tables first';
  end if;
  if (select prorettype from pg_catalog.pg_proc where oid = fn) <> 'pg_catalog.trigger'::pg_catalog.regtype then
    raise exception 'knowledge_entries: public.set_updated_at() is not a trigger function';
  end if;
end;
$$;

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  category text not null,
  content text not null,
  keywords text[] not null default '{}',
  applies_to text,
  source_url text,
  source_note text not null,
  verification_status text not null default 'draft',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_entries_slug_unique unique (slug),
  constraint knowledge_entries_slug_format check (char_length(slug) <= 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Text fields need at least one non-whitespace character (rejects '', '   ', tabs/newlines only).
  constraint knowledge_entries_title_text check (char_length(title) <= 240 and title ~ '[^[:space:]]'),
  constraint knowledge_entries_category_text check (char_length(category) <= 120 and category ~ '[^[:space:]]'),
  constraint knowledge_entries_content_text check (char_length(content) <= 12000 and content ~ '[^[:space:]]'),
  constraint knowledge_entries_applies_to_text check (applies_to is null or (char_length(applies_to) <= 240 and applies_to ~ '[^[:space:]]')),
  constraint knowledge_entries_source_note_text check (char_length(source_note) <= 2000 and source_note ~ '[^[:space:]]'),
  constraint knowledge_entries_source_url_https check (source_url is null or (char_length(source_url) <= 2000 and source_url ~ '^https://[^[:space:]]+$')),
  -- Keywords: a one-dimensional array of at most 40 entries; each entry is lowercase letters/digits in
  -- single-space-separated words (no blanks, nulls, or padding). CASE fixes the evaluation order so the
  -- element checks only run on a one-dimensional array; an empty array is allowed.
  constraint knowledge_entries_keywords_format check (
    case
      when array_ndims(keywords) is null then true
      when array_ndims(keywords) <> 1 then false
      else cardinality(keywords) <= 40
        and array_position(keywords, null) is null
        and char_length(array_to_string(keywords, '|')) <= 1200
        and strpos(array_to_string(keywords, ''), '|') = 0  -- a '|' inside an entry must not pass as a separator
        and array_to_string(keywords, '|') ~ '^[a-z0-9]+( [a-z0-9]+)*(\|[a-z0-9]+( [a-z0-9]+)*)*$'
    end
  ),
  constraint knowledge_entries_status_check check (verification_status in ('draft', 'verified', 'needs_review', 'retired')),
  constraint knowledge_entries_verified_requires_date check (verification_status <> 'verified' or last_verified_at is not null)
);

comment on table public.knowledge_entries is
  'Verified school knowledge for EagleDesk answers. Only verification_status = verified rows are readable by authenticated users and used as trusted AI context.';
comment on column public.knowledge_entries.source_note is
  'Provenance and any unresolved review notes. Not granted to authenticated users.';

create trigger knowledge_entries_set_updated_at
  before update on public.knowledge_entries
  for each row execute function public.set_updated_at();

-- Supabase default privileges grant ALL on new public tables to anon, authenticated, and service_role.
-- Remove them explicitly, then grant back only what is needed.
revoke all on public.knowledge_entries from public, anon, authenticated;
-- Table-specific hardening: even the server-only service-role key cannot change trusted knowledge.
-- service_role keeps SELECT only (it bypasses RLS, so it can read drafts; the backend does not use it).
revoke insert, update, delete, truncate, references, trigger on public.knowledge_entries from service_role;

alter table public.knowledge_entries enable row level security;

-- Signed-in users may read the answer-relevant columns of verified rows. source_note, created_at,
-- and updated_at are not granted. verification_status is granted so the backend can filter on it.
grant select (id, slug, title, category, content, keywords, applies_to, source_url, verification_status, last_verified_at)
  on public.knowledge_entries to authenticated;

create policy "authenticated users read verified knowledge entries"
  on public.knowledge_entries for select to authenticated
  using (verification_status = 'verified');

-- No insert/update/delete grant or policy exists for anon, authenticated, or service_role.

commit;

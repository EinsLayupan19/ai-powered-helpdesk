-- EagleDesk initial application schema proposal.
-- This file is for review only. It has not been applied to any Supabase project.

begin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  student_number text unique,
  program text,
  section text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (full_name is null or char_length(full_name) between 1 and 160),
  constraint profiles_student_number_length check (student_number is null or char_length(student_number) between 1 and 40),
  constraint profiles_program_length check (program is null or char_length(program) between 1 and 120),
  constraint profiles_section_length check (section is null or char_length(section) between 1 and 80)
);

create table public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  keywords text[] not null default '{}',
  problem_description text not null,
  troubleshooting_steps text not null,
  source text not null,
  is_published boolean not null default false,
  verified_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_articles_title_length check (char_length(title) between 1 and 240),
  constraint knowledge_articles_category_length check (char_length(category) between 1 and 120),
  constraint knowledge_articles_problem_length check (char_length(problem_description) between 1 and 12000),
  constraint knowledge_articles_steps_length check (char_length(troubleshooting_steps) between 1 and 24000),
  constraint knowledge_articles_source_length check (char_length(source) between 1 and 2000),
  constraint knowledge_articles_published_requires_verification check (not is_published or verified_at is not null)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_title_length check (char_length(title) between 1 and 240)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint messages_role_check check (role in ('user', 'ai')),
  constraint messages_content_length check (char_length(content) between 1 and 20000)
);

create index knowledge_articles_published_category_idx
  on public.knowledge_articles (category, updated_at desc)
  where is_published and verified_at is not null;
create index conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);
create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create index knowledge_articles_created_by_idx
  on public.knowledge_articles (created_by)
  where created_by is not null;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();
create trigger knowledge_articles_set_updated_at
  before update on public.knowledge_articles
  for each row execute function public.set_updated_at();

revoke all on public.profiles, public.knowledge_articles, public.conversations, public.messages
  from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.knowledge_articles to authenticated;
grant select, insert (user_id, title), update (title), delete on public.conversations to authenticated;
grant select, insert (conversation_id, role, content) on public.messages to authenticated;
-- Backend-only AI response insert; never put a service-role key in frontend code.
grant insert (conversation_id, role, content) on public.messages to service_role;

create policy "students read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "students update own display name"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create an empty profile row for new Auth identities. Trusted institutional
-- details are deliberately not copied from user-editable Auth metadata.
create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
create trigger auth_user_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

create policy "authenticated users read published verified articles"
  on public.knowledge_articles for select to authenticated
  using (is_published and verified_at is not null);
-- No authenticated write grant or write policy is created for knowledge_articles.
-- Verified content must be managed through a separately reviewed trusted workflow.

create policy "students manage own conversations"
  on public.conversations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "students read messages in own conversations"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  ));
create policy "students insert user messages in own conversations"
  on public.messages for insert to authenticated
  with check (role = 'user' and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  ));

commit;

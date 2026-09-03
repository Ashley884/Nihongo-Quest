-- NIHONGO QUEST — production Supabase schema
-- Run once in Supabase Dashboard -> SQL Editor.
-- Then create your admin account in Authentication -> Users.
-- Finally insert that user's UUID into public.admin_users using the command at the bottom.

create extension if not exists pgcrypto;

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  subtitle text default '',
  icon text default '🌸',
  sort_order integer not null default 1,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility for an existing topics table from an earlier version.
alter table public.topics add column if not exists subtitle text default '';
alter table public.topics add column if not exists icon text default '🌸';
alter table public.topics add column if not exists sort_order integer not null default 1;
alter table public.topics add column if not exists published boolean not null default true;
alter table public.topics add column if not exists created_at timestamptz not null default now();
alter table public.topics add column if not exists updated_at timestamptz not null default now();

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  question_text text not null,
  options text[] not null check (array_length(options, 1) = 4),
  correct_index integer not null check (correct_index between 0 and 3),
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility for an existing questions table from an earlier version.
alter table public.questions add column if not exists question_text text;
alter table public.questions add column if not exists options text[];
alter table public.questions add column if not exists correct_index integer not null default 0;
alter table public.questions add column if not exists sort_order integer not null default 1;
alter table public.questions add column if not exists created_at timestamptz not null default now();
alter table public.questions add column if not exists updated_at timestamptz not null default now();

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists questions_topic_order_idx on public.questions(topic_id, sort_order);
create index if not exists topics_sort_order_idx on public.topics(sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at before update on public.topics
for each row execute function public.set_updated_at();

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at before update on public.questions
for each row execute function public.set_updated_at();

-- SECURITY DEFINER avoids an RLS recursion problem when policies need to ask
-- whether the current Auth user is an administrator.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.admin_users enable row level security;

-- Remove old policies if this SQL is re-run.
drop policy if exists "Public can read published topics" on public.topics;
drop policy if exists "Admins can read all topics" on public.topics;
drop policy if exists "Admins can insert topics" on public.topics;
drop policy if exists "Admins can update topics" on public.topics;
drop policy if exists "Admins can delete topics" on public.topics;

drop policy if exists "Public can read questions from published topics" on public.questions;
drop policy if exists "Admins can read all questions" on public.questions;
drop policy if exists "Admins can insert questions" on public.questions;
drop policy if exists "Admins can update questions" on public.questions;
drop policy if exists "Admins can delete questions" on public.questions;

drop policy if exists "Admins can read admin users" on public.admin_users;

create policy "Public can read published topics"
on public.topics for select to anon, authenticated
using (published = true or public.is_admin());

create policy "Admins can insert topics"
on public.topics for insert to authenticated
with check (public.is_admin());

create policy "Admins can update topics"
on public.topics for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete topics"
on public.topics for delete to authenticated
using (public.is_admin());

create policy "Public can read questions from published topics"
on public.questions for select to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.topics t
    where t.id = topic_id and t.published = true
  )
);

create policy "Admins can insert questions"
on public.questions for insert to authenticated
with check (public.is_admin());

create policy "Admins can update questions"
on public.questions for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete questions"
on public.questions for delete to authenticated
using (public.is_admin());

-- The browser never needs direct access to admin_users; the security-definer
-- function above checks membership safely.
revoke all on public.admin_users from anon, authenticated;

grant select on public.topics to anon, authenticated;
grant insert, update, delete on public.topics to authenticated;
grant select on public.questions to anon, authenticated;
grant insert, update, delete on public.questions to authenticated;

-- ---------------------------------------------------------------------------
-- STARTER TOPICS: 40 direct quiz links.
-- Rename/edit these later from the admin panel when the final syllabus is ready.
-- ---------------------------------------------------------------------------
insert into public.topics (name, slug, subtitle, icon, sort_order, published)
values
('Greetings','greetings','Aisatsu','🌸',1,true),
('Self Introduction','self-introduction','Jikoshoukai','🎌',2,true),
('Topic 03','topic-3','Coming soon','🌸',3,true),
('Topic 04','topic-4','Coming soon','🌸',4,true),
('Topic 05','topic-5','Coming soon','🌸',5,true),
('Topic 06','topic-6','Coming soon','🌸',6,true),
('Topic 07','topic-7','Coming soon','🌸',7,true),
('Topic 08','topic-8','Coming soon','🌸',8,true),
('Topic 09','topic-9','Coming soon','🌸',9,true),
('Topic 10','topic-10','Coming soon','🌸',10,true),
('Topic 11','topic-11','Coming soon','🌸',11,true),
('Topic 12','topic-12','Coming soon','🌸',12,true),
('Topic 13','topic-13','Coming soon','🌸',13,true),
('Topic 14','topic-14','Coming soon','🌸',14,true),
('Topic 15','topic-15','Coming soon','🌸',15,true),
('Topic 16','topic-16','Coming soon','🌸',16,true),
('Topic 17','topic-17','Coming soon','🌸',17,true),
('Topic 18','topic-18','Coming soon','🌸',18,true),
('Topic 19','topic-19','Coming soon','🌸',19,true),
('Topic 20','topic-20','Coming soon','🌸',20,true),
('Topic 21','topic-21','Coming soon','🌸',21,true),
('Topic 22','topic-22','Coming soon','🌸',22,true),
('Topic 23','topic-23','Coming soon','🌸',23,true),
('Topic 24','topic-24','Coming soon','🌸',24,true),
('Topic 25','topic-25','Coming soon','🌸',25,true),
('Topic 26','topic-26','Coming soon','🌸',26,true),
('Topic 27','topic-27','Coming soon','🌸',27,true),
('Topic 28','topic-28','Coming soon','🌸',28,true),
('Topic 29','topic-29','Coming soon','🌸',29,true),
('Topic 30','topic-30','Coming soon','🌸',30,true),
('Topic 31','topic-31','Coming soon','🌸',31,true),
('Topic 32','topic-32','Coming soon','🌸',32,true),
('Topic 33','topic-33','Coming soon','🌸',33,true),
('Topic 34','topic-34','Coming soon','🌸',34,true),
('Topic 35','topic-35','Coming soon','🌸',35,true),
('Topic 36','topic-36','Coming soon','🌸',36,true),
('Topic 37','topic-37','Coming soon','🌸',37,true),
('Topic 38','topic-38','Coming soon','🌸',38,true),
('Topic 39','topic-39','Coming soon','🌸',39,true),
('Topic 40','topic-40','Coming soon','🌸',40,true)
on conflict (slug) do nothing;

-- Starter Greetings questions. All learning content is romaji-only.
insert into public.questions (topic_id, question_text, options, correct_index, sort_order)
select t.id, q.question_text, q.options, q.correct_index, q.sort_order
from public.topics t
cross join lateral (values
  ('Which romaji greeting is commonly used in the morning?', array['Ohayou gozaimasu','Konnichiwa','Konbanwa','Oyasumi nasai']::text[], 0, 1),
  ('Which greeting is commonly used during the daytime?', array['Ittekimasu','Konnichiwa','Tadaima','Oyasumi nasai']::text[], 1, 2),
  ('Which greeting is commonly used in the evening?', array['Ohayou','Konbanwa','Mata ne','Hajimemashite']::text[], 1, 3),
  ('Which phrase means Good night?', array['Konbanwa','Ogenki desu ka','Oyasumi nasai','Arigatou']::text[], 2, 4),
  ('Which phrase is appropriate when meeting someone for the first time?', array['Hajimemashite','Tadaima','Ittekimasu','Mata ashita']::text[], 0, 5),
  ('Which phrase can be used to say See you casually?', array['Mata ne','Sumimasen','Douzo','Daijoubu']::text[], 0, 6),
  ('Which phrase means Thank you very much?', array['Arigatou gozaimasu','Konnichiwa','Sayonara','Okaerinasai']::text[], 0, 7),
  ('Which phrase means How are you?', array['Ogenki desu ka','Doushite desu ka','Nani desu ka','Daijoubu deshita']::text[], 0, 8),
  ('Which greeting is polite and commonly used when starting the day?', array['Ohayou gozaimasu','Mata ne','Konbanwa','Oyasumi']::text[], 0, 9),
  ('Which phrase is commonly used when saying goodbye in a more formal situation?', array['Sayonara','Ohayou','Douzo','Itadakimasu']::text[], 0, 10)
) as q(question_text, options, correct_index, sort_order)
where t.slug = 'greetings'
and not exists (select 1 from public.questions existing where existing.topic_id=t.id);

-- ---------------------------------------------------------------------------
-- AFTER CREATING THE ADMIN AUTH USER, run this once with that user's UUID:
-- replace YOUR-AUTH-USER-UUID below, then execute it.
-- ---------------------------------------------------------------------------
-- insert into public.admin_users(user_id) values ('YOUR-AUTH-USER-UUID') on conflict do nothing;

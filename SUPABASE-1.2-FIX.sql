-- NIHONGO QUEST 1.2 - SAFE DATABASE COMPATIBILITY CHECK/FIX
-- Use this only if the website reports a database error while saving questions.
-- Your existing RLS policies can remain in place.

-- The older question columns are kept for compatibility but must not block
-- the new app from inserting questions.
alter table public.questions alter column option_a drop not null;
alter table public.questions alter column option_b drop not null;
alter table public.questions alter column option_c drop not null;
alter table public.questions alter column option_d drop not null;
alter table public.questions alter column correct_option drop not null;

-- Ensure the new fields used by Nihongo Quest exist.
alter table public.questions add column if not exists options text[];
alter table public.questions add column if not exists correct_index integer;
alter table public.questions add column if not exists sort_order integer not null default 1;

-- If an older row exists, build the new array fields from the old columns.
update public.questions
set
  options = array[option_a, option_b, option_c, option_d],
  correct_index = correct_option
where options is null
  and option_a is not null
  and option_b is not null
  and option_c is not null
  and option_d is not null;

-- New questions require four options and a valid answer index.
-- Only add these constraints if they do not already exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'questions_options_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_options_check
      check (array_length(options, 1) = 4);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'questions_correct_index_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_correct_index_check
      check (correct_index between 0 and 3);
  end if;
end $$;

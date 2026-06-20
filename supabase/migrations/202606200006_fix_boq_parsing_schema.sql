create table if not exists public.boq_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_file_id uuid references public.project_files(id) on delete set null,
  project_file_id uuid references public.project_files(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  sheet_name text not null,
  row_number integer not null check (row_number > 0),
  description text not null,
  quantity numeric,
  unit text,
  rate numeric,
  amount numeric,
  category text,
  subcategory text,
  confidence_score numeric(5, 4) check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  created_at timestamptz not null default now()
);

alter table public.boq_items
  add column if not exists source_file_id uuid references public.project_files(id) on delete set null,
  add column if not exists project_file_id uuid references public.project_files(id) on delete set null,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists sheet_name text,
  add column if not exists row_number integer,
  add column if not exists description text,
  add column if not exists quantity numeric,
  add column if not exists unit text,
  add column if not exists rate numeric,
  add column if not exists amount numeric,
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists confidence_score numeric(5, 4),
  add column if not exists created_at timestamptz default now();

update public.boq_items
set
  source_file_id = coalesce(source_file_id, project_file_id),
  category = coalesce(nullif(category, ''), 'General'),
  subcategory = coalesce(nullif(subcategory, ''), 'Unclassified'),
  confidence_score = coalesce(confidence_score, 0.35),
  created_at = coalesce(created_at, now());

alter table public.boq_items
  alter column quantity drop not null,
  alter column unit drop not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'boq_items_confidence_score_check'
      and conrelid = 'public.boq_items'::regclass
  ) then
    alter table public.boq_items
      add constraint boq_items_confidence_score_check
      check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1));
  end if;
end;
$$;

create index if not exists boq_items_source_file_id_idx
  on public.boq_items (source_file_id);

create index if not exists boq_items_category_created_at_idx
  on public.boq_items (category, created_at desc);

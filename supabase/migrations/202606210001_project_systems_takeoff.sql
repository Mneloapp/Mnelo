create table if not exists public.project_systems (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create table if not exists public.project_system_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  system_id uuid not null references public.project_systems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (system_id, name)
);

alter table public.boq_items
  add column if not exists system_id uuid references public.project_systems(id) on delete set null,
  add column if not exists system_category_id uuid references public.project_system_categories(id) on delete set null,
  add column if not exists takeoff_quantity numeric,
  add column if not exists takeoff_unit text,
  add column if not exists classification_status text not null default 'unclassified',
  add column if not exists classification_confidence numeric(5, 4);

update public.boq_items
set
  takeoff_quantity = coalesce(takeoff_quantity, quantity),
  takeoff_unit = coalesce(takeoff_unit, unit),
  classification_status = coalesce(nullif(classification_status, ''), 'unclassified'),
  classification_confidence = coalesce(classification_confidence, confidence_score)
where takeoff_quantity is null
   or takeoff_unit is null
   or classification_status is null
   or classification_confidence is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'boq_items_classification_confidence_check'
      and conrelid = 'public.boq_items'::regclass
  ) then
    alter table public.boq_items
      add constraint boq_items_classification_confidence_check
      check (classification_confidence is null or (classification_confidence >= 0 and classification_confidence <= 1));
  end if;
end;
$$;

create index if not exists project_systems_project_id_name_idx
  on public.project_systems (project_id, name);

create index if not exists project_system_categories_system_id_name_idx
  on public.project_system_categories (system_id, name);

create index if not exists boq_items_system_id_idx
  on public.boq_items (system_id);

create index if not exists boq_items_system_category_id_idx
  on public.boq_items (system_category_id);

alter table public.project_systems enable row level security;
alter table public.project_system_categories enable row level security;

drop policy if exists "Users can read their own project systems" on public.project_systems;
drop policy if exists "Users can create their own project systems" on public.project_systems;
drop policy if exists "Users can update their own project systems" on public.project_systems;
drop policy if exists "Users can delete their own project systems" on public.project_systems;

create policy "Users can read their own project systems"
on public.project_systems for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own project systems"
on public.project_systems for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where projects.id = project_systems.project_id
      and projects.user_id = auth.uid()
  )
);

create policy "Users can update their own project systems"
on public.project_systems for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own project systems"
on public.project_systems for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their own system categories" on public.project_system_categories;
drop policy if exists "Users can create their own system categories" on public.project_system_categories;
drop policy if exists "Users can update their own system categories" on public.project_system_categories;
drop policy if exists "Users can delete their own system categories" on public.project_system_categories;

create policy "Users can read their own system categories"
on public.project_system_categories for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own system categories"
on public.project_system_categories for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.project_systems
    where project_systems.id = project_system_categories.system_id
      and project_systems.user_id = auth.uid()
  )
);

create policy "Users can update their own system categories"
on public.project_system_categories for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own system categories"
on public.project_system_categories for delete to authenticated
using (auth.uid() = user_id);

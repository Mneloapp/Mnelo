create table if not exists public.project_boq_column_mappings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  description_column text not null,
  quantity_column text,
  unit_column text,
  rate_column text,
  amount_column text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists project_boq_column_mappings_user_id_idx
  on public.project_boq_column_mappings (user_id);

drop trigger if exists set_project_boq_column_mappings_updated_at on public.project_boq_column_mappings;

create trigger set_project_boq_column_mappings_updated_at
before update on public.project_boq_column_mappings
for each row
execute function public.set_updated_at();

alter table public.project_boq_column_mappings enable row level security;

drop policy if exists "Users can read their own BOQ mappings" on public.project_boq_column_mappings;
drop policy if exists "Users can create their own BOQ mappings" on public.project_boq_column_mappings;
drop policy if exists "Users can update their own BOQ mappings" on public.project_boq_column_mappings;
drop policy if exists "Users can delete their own BOQ mappings" on public.project_boq_column_mappings;

create policy "Users can read their own BOQ mappings"
on public.project_boq_column_mappings
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own BOQ mappings"
on public.project_boq_column_mappings
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where projects.id = project_boq_column_mappings.project_id
      and projects.user_id = auth.uid()
  )
);

create policy "Users can update their own BOQ mappings"
on public.project_boq_column_mappings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own BOQ mappings"
on public.project_boq_column_mappings
for delete
to authenticated
using (auth.uid() = user_id);

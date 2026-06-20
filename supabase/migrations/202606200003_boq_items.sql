create table if not exists public.boq_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_file_id uuid references public.project_files(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  quantity numeric not null,
  unit text not null,
  sheet_name text not null,
  row_number integer not null check (row_number > 0),
  created_at timestamptz not null default now()
);

create index if not exists boq_items_project_id_row_idx
  on public.boq_items (project_id, sheet_name, row_number);

create index if not exists boq_items_user_id_created_at_idx
  on public.boq_items (user_id, created_at desc);

alter table public.boq_items enable row level security;

drop policy if exists "Users can read their own BOQ items" on public.boq_items;
drop policy if exists "Users can create BOQ items for their own projects" on public.boq_items;
drop policy if exists "Users can delete their own BOQ items" on public.boq_items;

create policy "Users can read their own BOQ items"
on public.boq_items
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create BOQ items for their own projects"
on public.boq_items
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where projects.id = boq_items.project_id
      and projects.user_id = auth.uid()
  )
);

create policy "Users can delete their own BOQ items"
on public.boq_items
for delete
to authenticated
using (auth.uid() = user_id);

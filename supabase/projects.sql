create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client text,
  location text,
  status text not null default 'Estimating' check (status in ('Estimating', 'Procurement', 'Awarded')),
  contract_value numeric(14, 2) not null default 0,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  drawings integer not null default 0 check (drawings >= 0),
  trade text not null default 'MEP',
  risk text not null default 'Low' check (risk in ('Low', 'Medium', 'High')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_updated_at_idx
  on public.projects (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;

create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;

drop policy if exists "Users can read their own projects" on public.projects;
drop policy if exists "Users can create their own projects" on public.projects;
drop policy if exists "Users can update their own projects" on public.projects;
drop policy if exists "Users can delete their own projects" on public.projects;

create policy "Users can read their own projects"
on public.projects
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own projects"
on public.projects
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own projects"
on public.projects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own projects"
on public.projects
for delete
to authenticated
using (auth.uid() = user_id);

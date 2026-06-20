create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Untitled Project',
  client text,
  location text,
  status text not null default 'Draft',
  contract_value numeric(14, 2) not null default 0,
  progress integer not null default 0,
  drawings integer not null default 0,
  work_type text,
  notes text,
  trade text not null default 'MEP',
  risk text not null default 'Low',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid,
  add column if not exists name text default 'Untitled Project',
  add column if not exists client text,
  add column if not exists location text,
  add column if not exists status text default 'Draft',
  add column if not exists contract_value numeric(14, 2) default 0,
  add column if not exists progress integer default 0,
  add column if not exists drawings integer default 0,
  add column if not exists work_type text,
  add column if not exists notes text,
  add column if not exists trade text default 'MEP',
  add column if not exists risk text default 'Low',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.projects
set
  id = coalesce(id, gen_random_uuid()),
  name = coalesce(nullif(name, ''), 'Untitled Project'),
  status = coalesce(status, 'Draft'),
  contract_value = coalesce(contract_value, 0),
  progress = coalesce(progress, 0),
  drawings = coalesce(drawings, 0),
  work_type = coalesce(nullif(work_type, ''), nullif(trade, '')),
  trade = coalesce(nullif(trade, ''), 'MEP'),
  risk = coalesce(risk, 'Low'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.projects
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column name set default 'Untitled Project',
  alter column name set not null,
  alter column status set default 'Draft',
  alter column status set not null,
  alter column contract_value set default 0,
  alter column contract_value set not null,
  alter column progress set default 0,
  alter column progress set not null,
  alter column drawings set default 0,
  alter column drawings set not null,
  alter column trade set default 'MEP',
  alter column trade set not null,
  alter column risk set default 'Low',
  alter column risk set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_pkey'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_pkey primary key (id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_user_id_fkey'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade
      not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from public.projects where user_id is null) then
    alter table public.projects
      alter column user_id set not null;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_status_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_status_check
      check (status in ('Draft', 'Estimating', 'Procurement', 'Awarded'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_risk_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_risk_check
      check (risk in ('Low', 'Medium', 'High'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_progress_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_progress_check
      check (progress >= 0 and progress <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_drawings_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_drawings_check
      check (drawings >= 0);
  end if;
end;
$$;

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

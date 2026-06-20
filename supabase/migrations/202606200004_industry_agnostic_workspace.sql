alter table public.projects
  alter column trade set default 'General';

update public.projects
set
  trade = 'General',
  work_type = coalesce(nullif(work_type, ''), 'General')
where trade = 'MEP'
  and (work_type is null or work_type = '' or work_type = 'MEP');

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  category text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'Draft',
  due_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  rfq_id uuid references public.rfqs(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14, 2),
  currency text not null default 'USD',
  status text not null default 'Received',
  notes text,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_training_data (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists suppliers_user_id_created_at_idx
  on public.suppliers (user_id, created_at desc);

create index if not exists rfqs_project_id_created_at_idx
  on public.rfqs (project_id, created_at desc);

create index if not exists quotes_project_id_created_at_idx
  on public.quotes (project_id, created_at desc);

create index if not exists ai_training_data_project_id_created_at_idx
  on public.ai_training_data (project_id, created_at desc);

alter table public.suppliers enable row level security;
alter table public.rfqs enable row level security;
alter table public.quotes enable row level security;
alter table public.ai_training_data enable row level security;

drop policy if exists "Users can read their own suppliers" on public.suppliers;
drop policy if exists "Users can create their own suppliers" on public.suppliers;
drop policy if exists "Users can update their own suppliers" on public.suppliers;
drop policy if exists "Users can delete their own suppliers" on public.suppliers;

create policy "Users can read their own suppliers"
on public.suppliers for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own suppliers"
on public.suppliers for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own suppliers"
on public.suppliers for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own suppliers"
on public.suppliers for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their own rfqs" on public.rfqs;
drop policy if exists "Users can create their own rfqs" on public.rfqs;
drop policy if exists "Users can update their own rfqs" on public.rfqs;
drop policy if exists "Users can delete their own rfqs" on public.rfqs;

create policy "Users can read their own rfqs"
on public.rfqs for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own rfqs"
on public.rfqs for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own rfqs"
on public.rfqs for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own rfqs"
on public.rfqs for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their own quotes" on public.quotes;
drop policy if exists "Users can create their own quotes" on public.quotes;
drop policy if exists "Users can update their own quotes" on public.quotes;
drop policy if exists "Users can delete their own quotes" on public.quotes;

create policy "Users can read their own quotes"
on public.quotes for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own quotes"
on public.quotes for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own quotes"
on public.quotes for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own quotes"
on public.quotes for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their own training data" on public.ai_training_data;
drop policy if exists "Users can create their own training data" on public.ai_training_data;
drop policy if exists "Users can update their own training data" on public.ai_training_data;
drop policy if exists "Users can delete their own training data" on public.ai_training_data;

create policy "Users can read their own training data"
on public.ai_training_data for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own training data"
on public.ai_training_data for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own training data"
on public.ai_training_data for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own training data"
on public.ai_training_data for delete to authenticated
using (auth.uid() = user_id);

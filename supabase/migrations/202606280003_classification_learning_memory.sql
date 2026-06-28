create table if not exists public.classification_learning_memory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  normalized_description text not null,
  original_description text,
  system text not null,
  category text not null,
  subcategory text not null,
  source text not null default 'user',
  confidence text not null default 'verified',
  confidence_score numeric(5,4) not null default 1,
  created_from_project_id uuid references public.projects(id) on delete set null,
  created_from_file_id uuid references public.project_files(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.classification_learning_memory
  add column if not exists organization_id uuid,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists normalized_description text,
  add column if not exists original_description text,
  add column if not exists system text,
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists source text not null default 'user',
  add column if not exists confidence text not null default 'verified',
  add column if not exists confidence_score numeric(5,4) not null default 1,
  add column if not exists created_from_project_id uuid references public.projects(id) on delete set null,
  add column if not exists created_from_file_id uuid references public.project_files(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.classification_learning_memory
  drop constraint if exists classification_learning_memory_source_check;

alter table public.classification_learning_memory
  add constraint classification_learning_memory_source_check
  check (source in ('user', 'learned', 'imported'));

alter table public.classification_learning_memory
  drop constraint if exists classification_learning_memory_confidence_check;

alter table public.classification_learning_memory
  add constraint classification_learning_memory_confidence_check
  check (confidence in ('verified', 'high', 'medium', 'low'));

create unique index if not exists classification_learning_memory_org_description_idx
  on public.classification_learning_memory (organization_id, normalized_description, system, category, subcategory);

create index if not exists classification_learning_memory_org_lookup_idx
  on public.classification_learning_memory (organization_id, normalized_description, updated_at desc);

alter table public.classification_learning_memory enable row level security;

drop policy if exists "Users can read own classification memory" on public.classification_learning_memory;
create policy "Users can read own classification memory"
  on public.classification_learning_memory
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own classification memory" on public.classification_learning_memory;
create policy "Users can insert own classification memory"
  on public.classification_learning_memory
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own classification memory" on public.classification_learning_memory;
create policy "Users can update own classification memory"
  on public.classification_learning_memory
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own classification memory" on public.classification_learning_memory;
create policy "Users can delete own classification memory"
  on public.classification_learning_memory
  for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';

create table if not exists public.ai_training_data (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  source_file_id uuid references public.project_files(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_description text,
  predicted_category text,
  predicted_subcategory text,
  predicted_supplier_type text,
  confidence_score numeric(5, 4) check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  user_corrected_category text,
  user_corrected_subcategory text,
  final_category text,
  final_subcategory text,
  created_at timestamptz not null default now()
);

alter table public.ai_training_data
  add column if not exists source_file_id uuid references public.project_files(id) on delete set null,
  add column if not exists item_description text,
  add column if not exists predicted_category text,
  add column if not exists predicted_subcategory text,
  add column if not exists predicted_supplier_type text,
  add column if not exists confidence_score numeric(5, 4),
  add column if not exists user_corrected_category text,
  add column if not exists user_corrected_subcategory text,
  add column if not exists final_category text,
  add column if not exists final_subcategory text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_training_data'
      and column_name = 'source_type'
  ) then
    alter table public.ai_training_data
      alter column source_type set default 'boq_item';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_training_data_confidence_score_check'
      and conrelid = 'public.ai_training_data'::regclass
  ) then
    alter table public.ai_training_data
      add constraint ai_training_data_confidence_score_check
      check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1));
  end if;
end;
$$;

create index if not exists ai_training_data_source_file_id_idx
  on public.ai_training_data (source_file_id);

create index if not exists ai_training_data_category_created_at_idx
  on public.ai_training_data (final_category, created_at desc);

create index if not exists ai_training_data_corrections_idx
  on public.ai_training_data (predicted_category, user_corrected_category)
  where user_corrected_category is not null;

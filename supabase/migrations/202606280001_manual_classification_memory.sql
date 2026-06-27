alter table public.ai_training_data
  add column if not exists normalized_description text,
  add column if not exists item_fingerprint text,
  add column if not exists source_sheet_name text,
  add column if not exists source_row_number integer,
  add column if not exists quantity numeric,
  add column if not exists unit text,
  add column if not exists final_system text,
  add column if not exists final_classification_subcategory text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists ai_training_data_manual_memory_project_idx
  on public.ai_training_data (project_id, user_id, source_type, updated_at desc);

create index if not exists ai_training_data_item_fingerprint_idx
  on public.ai_training_data (project_id, user_id, item_fingerprint)
  where item_fingerprint is not null;

create index if not exists ai_training_data_normalized_description_idx
  on public.ai_training_data (project_id, user_id, normalized_description)
  where normalized_description is not null;

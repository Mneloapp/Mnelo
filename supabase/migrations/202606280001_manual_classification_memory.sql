alter table public.ai_training_data
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists source_type text default 'manual_classification_memory',
  add column if not exists source_id uuid,
  add column if not exists item_description text,
  add column if not exists user_corrected_category text,
  add column if not exists user_corrected_subcategory text,
  add column if not exists final_category text,
  add column if not exists final_subcategory text,
  add column if not exists normalized_description text,
  add column if not exists item_fingerprint text,
  add column if not exists source_sheet_name text,
  add column if not exists source_row_number integer,
  add column if not exists quantity numeric,
  add column if not exists unit text,
  add column if not exists final_system text,
  add column if not exists final_classification_subcategory text,
  add column if not exists updated_at timestamptz not null default now();

update public.ai_training_data training
set user_id = projects.user_id
from public.projects projects
where training.user_id is null
  and training.project_id = projects.id;

create index if not exists ai_training_data_manual_memory_project_idx
  on public.ai_training_data (project_id, user_id, source_type, updated_at desc);

create index if not exists ai_training_data_item_fingerprint_idx
  on public.ai_training_data (project_id, user_id, item_fingerprint)
  where item_fingerprint is not null;

create index if not exists ai_training_data_normalized_description_idx
  on public.ai_training_data (project_id, user_id, normalized_description)
  where normalized_description is not null;

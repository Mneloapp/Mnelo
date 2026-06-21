alter table public.project_files
  add column if not exists parse_status text not null default 'not_parsed',
  add column if not exists parsed_at timestamptz,
  add column if not exists parsed_rows integer not null default 0;

alter table public.boq_items
  add column if not exists source_file_id uuid references public.project_files(id) on delete set null,
  add column if not exists project_file_id uuid references public.project_files(id) on delete set null,
  add column if not exists rate numeric,
  add column if not exists amount numeric,
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists confidence_score numeric(5, 4),
  add column if not exists classification_confidence numeric(5, 4),
  add column if not exists classification_reason text,
  add column if not exists classification_source text,
  add column if not exists classification_status text not null default 'unclassified',
  add column if not exists needs_review boolean not null default false,
  add column if not exists row_type text,
  add column if not exists cleanup_reason text,
  add column if not exists source_sheet_name text,
  add column if not exists source_row_number integer,
  add column if not exists section_header text,
  add column if not exists inherited_category text,
  add column if not exists inherited_subcategory text,
  add column if not exists classification_subcategory text,
  add column if not exists updated_at timestamptz not null default now();

update public.boq_items
set
  source_file_id = coalesce(source_file_id, project_file_id),
  project_file_id = coalesce(project_file_id, source_file_id),
  row_type = coalesce(row_type, 'item'),
  source_sheet_name = coalesce(source_sheet_name, sheet_name),
  source_row_number = coalesce(source_row_number, row_number),
  classification_status = coalesce(nullif(classification_status, ''), 'unclassified'),
  classification_source = coalesce(nullif(classification_source, ''), 'needs_review'),
  needs_review = coalesce(needs_review, false),
  updated_at = coalesce(updated_at, created_at, now());

alter table public.boq_items
  drop constraint if exists boq_items_classification_source_check;

alter table public.boq_items
  add constraint boq_items_classification_source_check
  check (
    classification_source is null
    or classification_source in ('rules', 'learned', 'ai', 'inherited_header', 'needs_review')
  );

create index if not exists boq_items_source_file_id_idx
  on public.boq_items (source_file_id);

create index if not exists boq_items_project_file_id_idx
  on public.boq_items (project_file_id);

create index if not exists boq_items_project_file_row_type_idx
  on public.boq_items (project_id, user_id, project_file_id, row_type);

create index if not exists boq_items_source_file_row_type_idx
  on public.boq_items (project_id, user_id, source_file_id, row_type);

create index if not exists project_files_parse_status_idx
  on public.project_files (project_id, user_id, parse_status);

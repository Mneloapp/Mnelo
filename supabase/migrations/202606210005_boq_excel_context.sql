alter table public.boq_items
  add column if not exists source_sheet_name text,
  add column if not exists source_row_number integer,
  add column if not exists section_header text,
  add column if not exists inherited_category text,
  add column if not exists inherited_subcategory text;

update public.boq_items
set
  source_sheet_name = coalesce(source_sheet_name, sheet_name),
  source_row_number = coalesce(source_row_number, row_number)
where source_sheet_name is null
   or source_row_number is null;

alter table public.boq_items
  drop constraint if exists boq_items_classification_source_check;

alter table public.boq_items
  add constraint boq_items_classification_source_check
  check (
    classification_source is null
    or classification_source in ('rules', 'learned', 'ai', 'inherited_header', 'needs_review')
  );

create index if not exists boq_items_source_sheet_name_idx
  on public.boq_items (source_sheet_name);

create index if not exists boq_items_section_header_idx
  on public.boq_items (section_header);

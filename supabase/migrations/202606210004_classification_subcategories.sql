alter table public.boq_items
  add column if not exists subcategory text,
  add column if not exists classification_subcategory text;

create index if not exists boq_items_classification_subcategory_idx
  on public.boq_items (classification_subcategory);

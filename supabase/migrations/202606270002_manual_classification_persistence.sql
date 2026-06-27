alter table public.boq_items
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists classification_subcategory text,
  add column if not exists classification_source text,
  add column if not exists classification_reason text,
  add column if not exists needs_review boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.boq_items
  drop constraint if exists boq_items_classification_source_check;

alter table public.boq_items
  add constraint boq_items_classification_source_check
  check (
    classification_source is null
    or classification_source in ('rules', 'learned', 'ai', 'inherited_header', 'needs_review')
  );

create index if not exists boq_items_classification_subcategory_idx
  on public.boq_items (classification_subcategory);

create index if not exists boq_items_classification_source_idx
  on public.boq_items (classification_source);

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when others then
    null;
end;
$$;

alter table public.boq_items
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists confidence_score numeric(5, 4),
  add column if not exists classification_confidence numeric(5, 4),
  add column if not exists classification_subcategory text,
  add column if not exists classification_source text,
  add column if not exists classification_reason text,
  add column if not exists classification_status text not null default 'unclassified',
  add column if not exists needs_review boolean not null default false,
  add column if not exists system_id uuid references public.project_systems(id) on delete set null,
  add column if not exists system_category_id uuid references public.project_system_categories(id) on delete set null,
  add column if not exists takeoff_quantity numeric,
  add column if not exists takeoff_unit text,
  add column if not exists updated_at timestamptz not null default now();

update public.boq_items
set
  classification_confidence = coalesce(classification_confidence, confidence_score),
  classification_status = coalesce(nullif(classification_status, ''), 'unclassified'),
  needs_review = coalesce(needs_review, false),
  takeoff_quantity = coalesce(takeoff_quantity, quantity),
  takeoff_unit = coalesce(takeoff_unit, unit),
  updated_at = coalesce(updated_at, created_at, now());

update public.boq_items
set classification_confidence = null
where classification_confidence is not null
  and (classification_confidence < 0 or classification_confidence > 1);

update public.boq_items
set classification_source = null
where classification_source is not null
  and classification_source not in ('rules', 'learned', 'ai', 'inherited_header', 'needs_review');

alter table public.boq_items
  drop constraint if exists boq_items_classification_confidence_check;

alter table public.boq_items
  add constraint boq_items_classification_confidence_check
  check (classification_confidence is null or (classification_confidence >= 0 and classification_confidence <= 1));

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

create index if not exists boq_items_system_id_idx
  on public.boq_items (system_id);

create index if not exists boq_items_system_category_id_idx
  on public.boq_items (system_category_id);

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when others then
    null;
end;
$$;

alter table public.boq_items
  add column if not exists classification_system text,
  add column if not exists classification_category text,
  add column if not exists classification_subcategory text,
  add column if not exists classification_source text,
  add column if not exists user_corrected boolean not null default false,
  add column if not exists needs_review boolean not null default false;

update public.boq_items
set
  classification_system = coalesce(classification_system, nullif(category, '')),
  classification_category = coalesce(classification_category, nullif(subcategory, '')),
  user_corrected = true,
  needs_review = false
where classification_source in ('user', 'learned')
  and category is not null
  and subcategory is not null
  and classification_subcategory is not null;

update public.boq_items
set classification_source = 'user'
where user_corrected = true
  and classification_source = 'learned';

alter table public.boq_items
  drop constraint if exists boq_items_classification_source_check;

alter table public.boq_items
  add constraint boq_items_classification_source_check
  check (
    classification_source is null
    or classification_source in ('rules', 'learned', 'user', 'ai', 'inherited_header', 'needs_review')
  );

create index if not exists boq_items_classification_system_idx
  on public.boq_items (classification_system);

create index if not exists boq_items_classification_category_idx
  on public.boq_items (classification_category);

create index if not exists boq_items_user_corrected_idx
  on public.boq_items (user_corrected)
  where user_corrected = true;

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when others then
    null;
end;
$$;

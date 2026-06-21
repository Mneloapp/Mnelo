alter table public.boq_items
  add column if not exists classification_source text,
  add column if not exists needs_review boolean not null default false,
  add column if not exists classification_reason text,
  add column if not exists updated_at timestamptz not null default now();

update public.boq_items
set
  classification_source = coalesce(
    nullif(classification_source, ''),
    case
      when category = 'Needs Review' or subcategory = 'Needs review' or classification_status = 'needs_review'
        then 'needs_review'
      when classification_status = 'classified'
        then 'rules'
      else 'needs_review'
    end
  ),
  needs_review = coalesce(needs_review, false)
    or category = 'Needs Review'
    or subcategory = 'Needs review'
    or classification_status = 'needs_review',
  classification_reason = coalesce(
    nullif(classification_reason, ''),
    case
      when category = 'Needs Review' or subcategory = 'Needs review' or classification_status = 'needs_review'
        then 'Needs manual review.'
      else 'Classified before metadata tracking was added.'
    end
  ),
  updated_at = coalesce(updated_at, created_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'boq_items_classification_source_check'
      and conrelid = 'public.boq_items'::regclass
  ) then
    alter table public.boq_items
      add constraint boq_items_classification_source_check
      check (
        classification_source is null
        or classification_source in ('rules', 'learned', 'ai', 'needs_review')
      );
  end if;
end;
$$;

create index if not exists boq_items_classification_source_idx
  on public.boq_items (classification_source);

create index if not exists boq_items_needs_review_idx
  on public.boq_items (needs_review)
  where needs_review = true;

alter table public.classification_learning_memory
  add column if not exists classification_system text,
  add column if not exists classification_category text,
  add column if not exists classification_subcategory text;

update public.classification_learning_memory
set
  classification_system = coalesce(classification_system, system),
  classification_category = coalesce(classification_category, category),
  classification_subcategory = coalesce(classification_subcategory, subcategory),
  confidence_score = coalesce(confidence_score, 1),
  source = coalesce(source, 'user'),
  confidence = coalesce(confidence, 'verified'),
  updated_at = coalesce(updated_at, now())
where classification_system is null
   or classification_category is null
   or classification_subcategory is null
   or confidence_score is null
   or source is null
   or confidence is null
   or updated_at is null;

create index if not exists classification_learning_memory_canonical_lookup_idx
  on public.classification_learning_memory (organization_id, normalized_description, updated_at desc);

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when others then
    null;
end;
$$;

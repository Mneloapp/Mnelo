-- Mnelo classification memory diagnostic script
-- Safe read-only checks for Supabase SQL Editor.
--
-- This script does not insert, update, delete, or change schema.
-- Run each section as-is to inspect whether manual classification corrections
-- are saved to boq_items, persisted to classification_learning_memory,
-- and available for reparse/learned classification.

-- 1. Schema check for classification-related columns.
-- Run this first. It proves which columns exist in production before reading data.
-- The rest of this script intentionally avoids optional legacy columns that may
-- be missing in live Supabase, such as boq_items.project_file_id.
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('boq_items', 'classification_learning_memory')
  and column_name in (
    'id',
    'organization_id',
    'user_id',
    'description',
    'normalized_description',
    'original_description',
    'category',
    'subcategory',
    'system',
    'classification_system',
    'classification_category',
    'classification_subcategory',
    'classification_source',
    'classification_confidence',
    'classification_reason',
    'classification_status',
    'confidence',
    'confidence_score',
    'user_corrected',
    'needs_review',
    'created_from_project_id',
    'created_from_file_id',
    'source_file_id'
  )
order by table_name, column_name;

-- 2. Latest 50 classification learning memory rows.
-- Proves whether manual corrections are being written to durable learning memory.
select
  id,
  organization_id,
  user_id,
  normalized_description,
  original_description,
  classification_system,
  classification_category,
  classification_subcategory,
  system,
  category,
  subcategory,
  source,
  confidence,
  confidence_score,
  created_from_project_id,
  created_from_file_id,
  created_at,
  updated_at
from public.classification_learning_memory
order by updated_at desc nulls last, created_at desc
limit 50;

-- 3. Latest 50 BOQ item rows with classification fields.
-- Proves whether current parsed rows store user/manual classification values.
-- Uses source_file_id only; project_file_id is optional in older/local migrations
-- and is not present in the current live schema that raised the error.
select
  id,
  project_id,
  user_id,
  source_file_id,
  description,
  quantity,
  unit,
  category,
  subcategory,
  classification_system,
  classification_category,
  classification_subcategory,
  classification_source,
  classification_confidence,
  classification_reason,
  classification_status,
  user_corrected,
  needs_review,
  source_sheet_name,
  source_row_number,
  sheet_name,
  row_number,
  created_at,
  updated_at
from public.boq_items
order by updated_at desc nulls last, created_at desc
limit 50;

-- 4. BOQ rows containing Georgian exit-sign text.
-- Expected after manual save:
-- classification_system = Electrical
-- classification_category = Lighting
-- classification_subcategory = Exit Signs
-- classification_source in ('user', 'learned')
-- user_corrected = true
-- needs_review = false
select
  id,
  project_id,
  user_id,
  source_file_id,
  description,
  quantity,
  unit,
  classification_system,
  classification_category,
  classification_subcategory,
  classification_source,
  classification_confidence,
  classification_reason,
  user_corrected,
  needs_review,
  source_sheet_name,
  source_row_number,
  updated_at,
  created_at
from public.boq_items
where description ilike '%გასასვლელის მაჩვენებელი%'
order by updated_at desc nulls last, created_at desc;

-- 5. BOQ rows containing EXIT.
-- Proves whether the English part of the same item survives parsing/reparse.
select
  id,
  project_id,
  user_id,
  source_file_id,
  description,
  quantity,
  unit,
  classification_system,
  classification_category,
  classification_subcategory,
  classification_source,
  classification_confidence,
  classification_reason,
  user_corrected,
  needs_review,
  source_sheet_name,
  source_row_number,
  updated_at,
  created_at
from public.boq_items
where description ilike '%EXIT%'
order by updated_at desc nulls last, created_at desc;

-- 6. Memory rows containing Georgian exit-sign text.
-- Proves whether durable memory exists for the same normalized/original text.
-- If this returns no rows after a successful manual save, memory is not saving.
select
  id,
  organization_id,
  user_id,
  normalized_description,
  original_description,
  classification_system,
  classification_category,
  classification_subcategory,
  system,
  category,
  subcategory,
  source,
  confidence,
  confidence_score,
  created_from_project_id,
  created_from_file_id,
  created_at,
  updated_at
from public.classification_learning_memory
where original_description ilike '%გასასვლელის%'
   or normalized_description ilike '%გასასვლელის%'
order by updated_at desc nulls last, created_at desc;

-- 7. Duplicate memory rows by organization + normalized description.
-- Proves whether multiple conflicting learned classifications exist for
-- the same normalized item text.
select
  organization_id,
  normalized_description,
  count(*) as memory_rows,
  array_agg(distinct classification_system) as classification_systems,
  array_agg(distinct classification_category) as classification_categories,
  array_agg(distinct classification_subcategory) as classification_subcategories,
  array_agg(distinct source) as sources,
  min(created_at) as first_created_at,
  max(updated_at) as latest_updated_at
from public.classification_learning_memory
group by organization_id, normalized_description
having count(*) > 1
order by memory_rows desc, latest_updated_at desc nulls last;

-- 8. RLS status and policies for the two relevant tables.
-- Proves whether row-level security is enabled and which policies control
-- read/write visibility. If memory rows exist but the app cannot read them,
-- inspect these policies first.
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('boq_items', 'classification_learning_memory')
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('boq_items', 'classification_learning_memory')
order by tablename, policyname;

-- 9. Exact normalized-description probe for the known EXIT item.
-- Proves whether the app's normalized key has a matching memory record.
select
  id,
  organization_id,
  user_id,
  normalized_description,
  original_description,
  classification_system,
  classification_category,
  classification_subcategory,
  source,
  confidence_score,
  updated_at
from public.classification_learning_memory
where normalized_description = 'exit გასასვლელის მაჩვენებელი მიმართულება გარეთ ელემენტზე მომუშავე მინიმუმ 90 წუთი'
order by updated_at desc nulls last, created_at desc;

-- 10. Compare BOQ rows and memory rows by normalized text.
-- Proves whether a manually corrected BOQ row has a matching memory row.
-- If the BOQ row is correct but memory_id is null, memory did not save.
-- If memory_id exists but reparse output is wrong, reparse is not reading/applying memory.
with normalized_boq as (
  select
    id,
    project_id,
    user_id,
    description,
    lower(
      trim(
        regexp_replace(
          regexp_replace(description, '[^[:alnum:]ა-ჰ[:space:]]', ' ', 'g'),
          '[[:space:]]+',
          ' ',
          'g'
        )
      )
    ) as normalized_description,
    classification_system,
    classification_category,
    classification_subcategory,
    classification_source,
    user_corrected,
    needs_review,
    updated_at
  from public.boq_items
  where description ilike '%გასასვლელის მაჩვენებელი%'
     or description ilike '%EXIT%'
)
select
  b.id as boq_item_id,
  b.project_id,
  b.user_id,
  b.description,
  b.normalized_description as boq_normalized_description,
  b.classification_system as boq_system,
  b.classification_category as boq_category,
  b.classification_subcategory as boq_subcategory,
  b.classification_source as boq_source,
  b.user_corrected,
  b.needs_review,
  m.id as memory_id,
  m.normalized_description as memory_normalized_description,
  m.classification_system as memory_system,
  m.classification_category as memory_category,
  m.classification_subcategory as memory_subcategory,
  m.source as memory_source,
  m.updated_at as memory_updated_at
from normalized_boq b
left join public.classification_learning_memory m
  on m.organization_id = b.user_id
 and m.normalized_description = b.normalized_description
order by b.updated_at desc nulls last, m.updated_at desc nulls last;

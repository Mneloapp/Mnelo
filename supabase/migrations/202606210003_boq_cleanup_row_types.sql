alter table public.boq_items
  add column if not exists row_type text not null default 'item',
  add column if not exists cleanup_reason text;

update public.boq_items
set
  row_type = coalesce(nullif(row_type, ''), 'item'),
  cleanup_reason = coalesce(cleanup_reason, 'Existing row preserved as item before cleanup engine.')
where row_type is null
   or row_type = ''
   or cleanup_reason is null;

update public.boq_items
set
  row_type = case
    when description is null or btrim(description) = '' then 'ignored'
    when btrim(description) ~ '^[0-9[:space:].,/\()–—-]+$' then 'ignored'
    when btrim(description) ~* '^(page|გვერდი|страница|sayfa)[[:space:]]*[0-9]+' then 'ignored'
    when lower(btrim(description)) in ('total', 'ჯამი', 'სულ', 'итого', 'всего', 'toplam') then 'total'
    when lower(description) like '%grand total%' or lower(description) like '%overall total%' or lower(description) like '%total amount%' then 'total'
    when lower(btrim(description)) in ('subtotal', 'sub total', 'ქვეჯამი', 'промежуточный итог', 'ara toplam') then 'subtotal'
    when lower(btrim(description)) ~ '^(note|notes|შენიშვნა|примечание|not)([[:space:]]|$)' then 'note'
    when lower(btrim(description)) ~ '^(section|chapter|part|group|раздел|глава|часть|bölüm)([[:space:]]|$)' then 'header'
    when length(btrim(description)) < 3 and coalesce(quantity, 0) = 0 and coalesce(rate, 0) = 0 and coalesce(amount, 0) = 0 and coalesce(unit, '') = '' then 'ignored'
    when length(btrim(description)) <= 24 and coalesce(quantity, 0) = 0 and coalesce(rate, 0) = 0 and coalesce(amount, 0) = 0 and coalesce(unit, '') = '' then 'header'
    when length(btrim(description)) <= 40 and coalesce(quantity, 0) = 0 and coalesce(rate, 0) = 0 and coalesce(amount, 0) = 0 and coalesce(unit, '') = '' then 'header'
    else 'item'
  end,
  cleanup_reason = case
    when description is null or btrim(description) = '' then 'Empty description.'
    when btrim(description) ~ '^[0-9[:space:].,/\()–—-]+$' then 'Numbering or spreadsheet artifact.'
    when btrim(description) ~* '^(page|გვერდი|страница|sayfa)[[:space:]]*[0-9]+' then 'Page header/footer.'
    when lower(btrim(description)) in ('total', 'ჯამი', 'სულ', 'итого', 'всего', 'toplam') then 'Total row.'
    when lower(description) like '%grand total%' or lower(description) like '%overall total%' or lower(description) like '%total amount%' then 'Total row.'
    when lower(btrim(description)) in ('subtotal', 'sub total', 'ქვეჯამი', 'промежуточный итог', 'ara toplam') then 'Subtotal row.'
    when lower(btrim(description)) ~ '^(note|notes|შენიშვნა|примечание|not)([[:space:]]|$)' then 'Note row.'
    when lower(btrim(description)) ~ '^(section|chapter|part|group|раздел|глава|часть|bölüm)([[:space:]]|$)' then 'Section header.'
    when length(btrim(description)) < 3 and coalesce(quantity, 0) = 0 and coalesce(rate, 0) = 0 and coalesce(amount, 0) = 0 and coalesce(unit, '') = '' then 'Description is shorter than the cleanup threshold.'
    when length(btrim(description)) <= 24 and coalesce(quantity, 0) = 0 and coalesce(rate, 0) = 0 and coalesce(amount, 0) = 0 and coalesce(unit, '') = '' then 'Likely section/header row without quantity data.'
    when length(btrim(description)) <= 40 and coalesce(quantity, 0) = 0 and coalesce(rate, 0) = 0 and coalesce(amount, 0) = 0 and coalesce(unit, '') = '' then 'Likely section/header row with zero quantity.'
    else 'Looks like a procurement item.'
  end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'boq_items_row_type_check'
      and conrelid = 'public.boq_items'::regclass
  ) then
    alter table public.boq_items
      add constraint boq_items_row_type_check
      check (row_type in ('item', 'header', 'subtotal', 'total', 'note', 'ignored'));
  end if;
end;
$$;

create index if not exists boq_items_project_row_type_idx
  on public.boq_items (project_id, user_id, row_type);

create index if not exists boq_items_ignored_idx
  on public.boq_items (project_id, user_id)
  where row_type <> 'item';

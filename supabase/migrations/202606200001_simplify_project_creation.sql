alter table public.projects
  add column if not exists work_type text,
  add column if not exists notes text;

update public.projects
set work_type = coalesce(nullif(work_type, ''), nullif(trade, ''))
where work_type is null
  and trade is not null;

alter table public.projects
  alter column status set default 'Draft';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'projects_status_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      drop constraint projects_status_check;
  end if;
end;
$$;

alter table public.projects
  add constraint projects_status_check
  check (status in ('Draft', 'Estimating', 'Procurement', 'Awarded'));

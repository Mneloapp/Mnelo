alter table public.boq_items enable row level security;

drop policy if exists "Users can update their own BOQ items" on public.boq_items;

create policy "Users can update their own BOQ items"
on public.boq_items
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where projects.id = boq_items.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where projects.id = boq_items.project_id
      and projects.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';

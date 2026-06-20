insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null check (file_size >= 0),
  storage_path text not null unique,
  document_type text not null default 'Other' check (
    document_type in ('BOQ Excel', 'Specification PDF', 'Drawing PDF', 'Other')
  ),
  uploaded_at timestamptz not null default now()
);

create index if not exists project_files_project_id_uploaded_at_idx
  on public.project_files (project_id, uploaded_at desc);

create index if not exists project_files_user_id_uploaded_at_idx
  on public.project_files (user_id, uploaded_at desc);

alter table public.project_files enable row level security;

drop policy if exists "Users can read their own project files" on public.project_files;
drop policy if exists "Users can create files for their own projects" on public.project_files;
drop policy if exists "Users can delete their own project files" on public.project_files;

create policy "Users can read their own project files"
on public.project_files
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create files for their own projects"
on public.project_files
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
);

create policy "Users can delete their own project files"
on public.project_files
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their own project document objects" on storage.objects;
drop policy if exists "Users can upload their own project document objects" on storage.objects;
drop policy if exists "Users can delete their own project document objects" on storage.objects;

create policy "Users can read their own project document objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload their own project document objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own project document objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

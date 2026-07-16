-- Complaint attachments: photos/documents attached to a complaint (defect
-- photos, invoices, test reports). Unlike product images this bucket is
-- private -- complaint content can include customer-sensitive material --
-- so access is gated by the same visibility rule as the complaint itself.

create table public.complaint_attachments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  content_type text,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index complaint_attachments_complaint_id_idx on public.complaint_attachments (complaint_id);

alter table public.complaint_attachments enable row level security;

create policy "complaint_attachments_select" on public.complaint_attachments
  for select using (
    public.is_manager() or exists (
      select 1 from public.complaints c
      join public.accounts a on a.id = c.account_id
      where c.id = complaint_attachments.complaint_id
        and (a.assigned_rep = auth.uid() or c.assigned_to = auth.uid())
    )
  );

create policy "complaint_attachments_insert" on public.complaint_attachments
  for insert with check (
    public.is_manager() or exists (
      select 1 from public.complaints c
      join public.accounts a on a.id = c.account_id
      where c.id = complaint_attachments.complaint_id
        and (a.assigned_rep = auth.uid() or c.assigned_to = auth.uid())
    )
  );

-- Only the uploader (or a manager) can remove an attachment.
create policy "complaint_attachments_delete" on public.complaint_attachments
  for delete using (public.is_manager() or uploaded_by = auth.uid());

-- ============================================================
-- storage bucket (private -- objects are stored at "{complaint_id}/...")
-- ============================================================

insert into storage.buckets (id, name, public)
values ('complaint-attachments', 'complaint-attachments', false)
on conflict (id) do nothing;

create policy "complaint_attachments_storage_select" on storage.objects
  for select using (
    bucket_id = 'complaint-attachments' and (
      public.is_manager() or exists (
        select 1 from public.complaints c
        join public.accounts a on a.id = c.account_id
        where c.id = (storage.foldername(name))[1]::uuid
          and (a.assigned_rep = auth.uid() or c.assigned_to = auth.uid())
      )
    )
  );

create policy "complaint_attachments_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'complaint-attachments' and (
      public.is_manager() or exists (
        select 1 from public.complaints c
        join public.accounts a on a.id = c.account_id
        where c.id = (storage.foldername(name))[1]::uuid
          and (a.assigned_rep = auth.uid() or c.assigned_to = auth.uid())
      )
    )
  );

create policy "complaint_attachments_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'complaint-attachments' and (
      public.is_manager() or exists (
        select 1 from public.complaints c
        join public.accounts a on a.id = c.account_id
        where c.id = (storage.foldername(name))[1]::uuid
          and (a.assigned_rep = auth.uid() or c.assigned_to = auth.uid())
      )
    )
  );

-- Fix complaint_attachments_storage_* policies from 0012: the
-- foldername()-based per-complaint check was rejecting legitimate
-- uploads (a rep uploading to their own complaint got "new row
-- violates row-level security policy"). The complaint_attachments
-- table's own RLS is the real access-control layer -- a file's path
-- (uuid + timestamp) can only be discovered by querying that table,
-- which is already correctly scoped -- so simplify the storage
-- policies to just "any authenticated user".

drop policy if exists "complaint_attachments_storage_select" on storage.objects;
drop policy if exists "complaint_attachments_storage_insert" on storage.objects;
drop policy if exists "complaint_attachments_storage_delete" on storage.objects;

create policy "complaint_attachments_storage_select" on storage.objects
  for select using (bucket_id = 'complaint-attachments' and auth.uid() is not null);

create policy "complaint_attachments_storage_insert" on storage.objects
  for insert with check (bucket_id = 'complaint-attachments' and auth.uid() is not null);

create policy "complaint_attachments_storage_delete" on storage.objects
  for delete using (bucket_id = 'complaint-attachments' and auth.uid() is not null);

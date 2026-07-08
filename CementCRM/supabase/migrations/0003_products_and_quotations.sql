-- Adds a product catalog (with images) for lead selection, quotation pricing
-- on leads, and comments on stage-history entries. Run in the SQL Editor
-- after 0001_init.sql and 0002_lead_stage_history.sql.

-- ============================================================
-- products (catalog with image + base price, for lead selection)
-- ============================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_path text,
  price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products_select" on public.products
  for select using (true);

create policy "products_insert" on public.products
  for insert with check (public.is_manager());

create policy "products_update" on public.products
  for update using (public.is_manager())
  with check (public.is_manager());

create policy "products_delete" on public.products
  for delete using (public.is_manager());

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Storage bucket for product images. Public read (so <Image> can load them
-- directly by URL); only managers can upload/replace/delete.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_manager_write" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_manager());

create policy "product_images_manager_update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_manager());

create policy "product_images_manager_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_manager());

-- ============================================================
-- leads: link to a catalog product, and a per-lead quoted unit price
-- ============================================================

alter table public.leads
  add column product_id uuid references public.products (id),
  add column unit_price numeric;

create index leads_product_id_idx on public.leads (product_id);

-- ============================================================
-- lead_stage_history: allow a comment per stage change
-- ============================================================

alter table public.lead_stage_history
  add column comment text;

-- Stage changes are now logged by the client (so it can attach a comment),
-- not automatically on update. Creation is still auto-logged.
drop trigger if exists leads_log_stage_on_update on public.leads;

create policy "lead_stage_history_insert" on public.lead_stage_history
  for insert with check (
    public.is_manager() or exists (
      select 1 from public.leads l
      join public.accounts a on a.id = l.account_id
      where l.id = lead_stage_history.lead_id and a.assigned_rep = auth.uid()
    )
  );

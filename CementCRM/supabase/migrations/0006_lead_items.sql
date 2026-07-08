-- Replaces the single product_id/quantity/unit_price on a lead with a
-- proper multi-line list, so a lead can carry several products directly
-- (no separate re-entry step to build a quotation -- quotations are now
-- just a snapshot of a lead's current items).

create table public.lead_items (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  product_id uuid references public.products (id),
  quantity numeric not null,
  unit_price numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lead_items_lead_id_idx on public.lead_items (lead_id);

alter table public.lead_items enable row level security;

create trigger lead_items_set_updated_at
  before update on public.lead_items
  for each row execute function public.set_updated_at();

create policy "lead_items_select" on public.lead_items
  for select using (
    public.is_manager() or exists (
      select 1 from public.leads l
      join public.accounts a on a.id = l.account_id
      where l.id = lead_items.lead_id and a.assigned_rep = auth.uid()
    )
  );

create policy "lead_items_insert" on public.lead_items
  for insert with check (
    public.is_manager() or exists (
      select 1 from public.leads l
      join public.accounts a on a.id = l.account_id
      where l.id = lead_items.lead_id and a.assigned_rep = auth.uid()
    )
  );

create policy "lead_items_update" on public.lead_items
  for update using (
    public.is_manager() or exists (
      select 1 from public.leads l
      join public.accounts a on a.id = l.account_id
      where l.id = lead_items.lead_id and a.assigned_rep = auth.uid()
    )
  );

create policy "lead_items_delete" on public.lead_items
  for delete using (
    public.is_manager() or exists (
      select 1 from public.leads l
      join public.accounts a on a.id = l.account_id
      where l.id = lead_items.lead_id and a.assigned_rep = auth.uid()
    )
  );

-- Carry forward any single product already set on a lead, so existing test
-- data isn't silently dropped.
insert into public.lead_items (lead_id, product_id, quantity, unit_price)
select id, product_id, quantity, unit_price
from public.leads
where product_id is not null and quantity is not null and unit_price is not null;

alter table public.leads
  drop column if exists product_id,
  drop column if exists quantity,
  drop column if exists unit_price;

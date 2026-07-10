-- Phase 2: Sales Order, Delivery Planning, Dispatch.
-- A sales order is created from an approved/sent quotation (one per lead --
-- creating it also marks the lead "Won", which locks its product list via
-- the trigger from 0009).

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads (id) on delete cascade,
  quotation_id uuid not null references public.quotations (id),
  account_id uuid not null references public.accounts (id),
  status text not null default 'confirmed' check (
    status in ('confirmed', 'delivery_planned', 'dispatched', 'delivered')
  ),
  delivery_date date,
  delivery_address text,
  vehicle_info text,
  driver_info text,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders (id) on delete cascade,
  product_id uuid references public.products (id),
  quantity numeric not null,
  unit_price numeric not null
);

create index sales_orders_account_id_idx on public.sales_orders (account_id);
create index sales_order_items_sales_order_id_idx on public.sales_order_items (sales_order_id);

alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;

create trigger sales_orders_set_updated_at
  before update on public.sales_orders
  for each row execute function public.set_updated_at();

-- Guard: only a quotation that's actually been approved/sent can become an
-- order, and creating the order marks the lead Won (with an audit entry).
create function public.on_sales_order_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q_status text;
begin
  select status into q_status from public.quotations where id = new.quotation_id;
  if q_status is null or q_status not in ('approved', 'sent') then
    raise exception 'Sales orders can only be created from an approved or sent quotation';
  end if;

  update public.leads set stage = 'Won' where id = new.lead_id and stage <> 'Won';

  insert into public.lead_stage_history (lead_id, stage, comment, changed_by)
  values (new.lead_id, 'Won', 'Automatically marked Won when the sales order was created', auth.uid());

  return new;
end;
$$;

create trigger sales_orders_on_created
  after insert on public.sales_orders
  for each row execute function public.on_sales_order_created();

-- Once dispatched (or delivered), the order's line items are frozen.
create function public.block_sales_order_items_when_locked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_status text;
  target_order_id uuid;
begin
  target_order_id := coalesce(new.sales_order_id, old.sales_order_id);
  select status into target_status from public.sales_orders where id = target_order_id;

  if target_status in ('dispatched', 'delivered') then
    raise exception 'This order has been dispatched and its items can no longer be changed';
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger sales_order_items_block_when_locked
  before insert or update or delete on public.sales_order_items
  for each row execute function public.block_sales_order_items_when_locked();

create policy "sales_orders_select" on public.sales_orders
  for select using (
    public.is_manager() or exists (
      select 1 from public.accounts a
      where a.id = sales_orders.account_id and a.assigned_rep = auth.uid()
    )
  );

create policy "sales_orders_insert" on public.sales_orders
  for insert with check (
    public.is_manager() or exists (
      select 1 from public.accounts a
      where a.id = sales_orders.account_id and a.assigned_rep = auth.uid()
    )
  );

create policy "sales_orders_update" on public.sales_orders
  for update using (
    public.is_manager() or exists (
      select 1 from public.accounts a
      where a.id = sales_orders.account_id and a.assigned_rep = auth.uid()
    )
  );

create policy "sales_orders_delete" on public.sales_orders
  for delete using (public.is_manager());

create policy "sales_order_items_select" on public.sales_order_items
  for select using (
    public.is_manager() or exists (
      select 1 from public.sales_orders so
      join public.accounts a on a.id = so.account_id
      where so.id = sales_order_items.sales_order_id and a.assigned_rep = auth.uid()
    )
  );

create policy "sales_order_items_insert" on public.sales_order_items
  for insert with check (
    public.is_manager() or exists (
      select 1 from public.sales_orders so
      join public.accounts a on a.id = so.account_id
      where so.id = sales_order_items.sales_order_id and a.assigned_rep = auth.uid()
    )
  );

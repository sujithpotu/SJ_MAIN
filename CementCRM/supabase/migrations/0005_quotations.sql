-- Formal, multi-line-item quotations with manager price approval.
-- A quotation belongs to a lead and can have several product lines.
-- If any line's price undercuts the catalog price by more than the
-- approval threshold (see lib/pricing.ts), it needs manager sign-off
-- before it can be marked "sent".

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  status text not null default 'draft' check (
    status in ('draft', 'pending_approval', 'approved', 'rejected', 'sent')
  ),
  notes text,
  created_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  product_id uuid references public.products (id),
  quantity numeric not null,
  unit_price numeric not null,
  created_at timestamptz not null default now()
);

create index quotations_lead_id_idx on public.quotations (lead_id);
create index quotation_items_quotation_id_idx on public.quotation_items (quotation_id);

alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

create trigger quotations_set_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

-- Only a manager can move a quotation into 'approved' (or out of it into
-- 'rejected') -- a rep can create/edit their own draft but can't self-approve.
create function public.protect_quotation_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('approved', 'rejected')
     and not public.is_manager() then
    raise exception 'Only managers can approve or reject a quotation';
  end if;
  if new.status in ('approved', 'rejected') and old.status not in ('approved', 'rejected') then
    new.approved_by = auth.uid();
    new.approved_at = now();
  end if;
  return new;
end;
$$;

create trigger quotations_protect_approval
  before update on public.quotations
  for each row execute function public.protect_quotation_approval();

create policy "quotations_select" on public.quotations
  for select using (
    public.is_manager() or exists (
      select 1 from public.leads l
      join public.accounts a on a.id = l.account_id
      where l.id = quotations.lead_id and a.assigned_rep = auth.uid()
    )
  );

create policy "quotations_insert" on public.quotations
  for insert with check (
    public.is_manager() or exists (
      select 1 from public.leads l
      join public.accounts a on a.id = l.account_id
      where l.id = quotations.lead_id and a.assigned_rep = auth.uid()
    )
  );

create policy "quotations_update" on public.quotations
  for update using (
    public.is_manager() or exists (
      select 1 from public.leads l
      join public.accounts a on a.id = l.account_id
      where l.id = quotations.lead_id and a.assigned_rep = auth.uid()
    )
  )
  with check (
    public.is_manager() or exists (
      select 1 from public.leads l
      join public.accounts a on a.id = l.account_id
      where l.id = quotations.lead_id and a.assigned_rep = auth.uid()
    )
  );

create policy "quotations_delete" on public.quotations
  for delete using (public.is_manager());

-- quotation_items visibility/edit rights follow the parent quotation.
create policy "quotation_items_select" on public.quotation_items
  for select using (
    public.is_manager() or exists (
      select 1 from public.quotations q
      join public.leads l on l.id = q.lead_id
      join public.accounts a on a.id = l.account_id
      where q.id = quotation_items.quotation_id and a.assigned_rep = auth.uid()
    )
  );

create policy "quotation_items_insert" on public.quotation_items
  for insert with check (
    public.is_manager() or exists (
      select 1 from public.quotations q
      join public.leads l on l.id = q.lead_id
      join public.accounts a on a.id = l.account_id
      where q.id = quotation_items.quotation_id and a.assigned_rep = auth.uid()
    )
  );

create policy "quotation_items_update" on public.quotation_items
  for update using (
    public.is_manager() or exists (
      select 1 from public.quotations q
      join public.leads l on l.id = q.lead_id
      join public.accounts a on a.id = l.account_id
      where q.id = quotation_items.quotation_id and a.assigned_rep = auth.uid()
    )
  );

create policy "quotation_items_delete" on public.quotation_items
  for delete using (
    public.is_manager() or exists (
      select 1 from public.quotations q
      join public.leads l on l.id = q.lead_id
      join public.accounts a on a.id = l.account_id
      where q.id = quotation_items.quotation_id and a.assigned_rep = auth.uid()
    )
  );

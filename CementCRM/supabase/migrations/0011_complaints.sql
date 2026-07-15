-- Complaint Management: quality/delivery/billing/sales complaints tied to an
-- account, optionally linked to a sales order and/or product, with a status
-- timeline (mirroring lead_stage_history) and resolution tracking.
-- Web console first (per product decision); mobile screens are a fast follow.

create sequence public.complaint_number_seq;

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_number text unique,
  account_id uuid not null references public.accounts (id) on delete cascade,
  sales_order_id uuid references public.sales_orders (id),
  product_id uuid references public.products (id),
  type text not null check (type in ('quality', 'delivery', 'billing', 'sales', 'other')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  batch_or_truck_ref text,
  description text not null,
  root_cause text,
  corrective_action text,
  assigned_to uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index complaints_account_id_idx on public.complaints (account_id);
create index complaints_assigned_to_idx on public.complaints (assigned_to);
create index complaints_status_idx on public.complaints (status);

alter table public.complaints enable row level security;

create trigger complaints_set_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

-- Generates e.g. "CMP-000042". A trigger (not a column DEFAULT) so it runs
-- security definer and doesn't need the sequence granted to `authenticated`.
create function public.set_complaint_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.complaint_number is null then
    new.complaint_number := 'CMP-' || lpad(nextval('public.complaint_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger complaints_set_number
  before insert on public.complaints
  for each row execute function public.set_complaint_number();

-- Automatically stamp resolved_at / closed_at on the relevant transition.
create function public.stamp_complaint_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at = now();
  end if;
  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at = now();
  end if;
  return new;
end;
$$;

create trigger complaints_stamp_status_timestamps
  before update on public.complaints
  for each row
  when (old.status is distinct from new.status)
  execute function public.stamp_complaint_status_timestamps();

-- Visibility: manager sees all; rep sees complaints on their own accounts, or
-- ones assigned directly to them (assignment can cross accounts -- e.g. a
-- manager routing a quality complaint to whoever should investigate it).
create policy "complaints_select" on public.complaints
  for select using (
    public.is_manager()
    or assigned_to = auth.uid()
    or exists (
      select 1 from public.accounts a
      where a.id = complaints.account_id and a.assigned_rep = auth.uid()
    )
  );

create policy "complaints_insert" on public.complaints
  for insert with check (
    public.is_manager() or exists (
      select 1 from public.accounts a
      where a.id = complaints.account_id and a.assigned_rep = auth.uid()
    )
  );

create policy "complaints_update" on public.complaints
  for update using (
    public.is_manager()
    or assigned_to = auth.uid()
    or exists (
      select 1 from public.accounts a
      where a.id = complaints.account_id and a.assigned_rep = auth.uid()
    )
  );

create policy "complaints_delete" on public.complaints
  for delete using (public.is_manager());

-- ============================================================
-- complaint_status_history: audit trail of status changes with comments
-- ============================================================

create table public.complaint_status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  status text not null,
  comment text,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.profiles (id)
);

create index complaint_status_history_complaint_id_idx on public.complaint_status_history (complaint_id);

alter table public.complaint_status_history enable row level security;

create policy "complaint_status_history_select" on public.complaint_status_history
  for select using (
    public.is_manager() or exists (
      select 1 from public.complaints c
      join public.accounts a on a.id = c.account_id
      where c.id = complaint_status_history.complaint_id
        and (a.assigned_rep = auth.uid() or c.assigned_to = auth.uid())
    )
  );

-- Written directly by the client (so it can attach a comment), same pattern
-- as lead_stage_history.
create policy "complaint_status_history_insert" on public.complaint_status_history
  for insert with check (
    public.is_manager() or exists (
      select 1 from public.complaints c
      join public.accounts a on a.id = c.account_id
      where c.id = complaint_status_history.complaint_id
        and (a.assigned_rep = auth.uid() or c.assigned_to = auth.uid())
    )
  );

-- Auto-log the initial "open" status on creation.
create function public.log_complaint_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.complaint_status_history (complaint_id, status, changed_by)
  values (new.id, new.status, auth.uid());
  return new;
end;
$$;

create trigger complaints_log_status_on_insert
  after insert on public.complaints
  for each row execute function public.log_complaint_status_change();

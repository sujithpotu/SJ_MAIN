-- CementCRM initial schema: profiles (roles), accounts, leads, and RLS.
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).

-- ============================================================
-- profiles (one row per auth user, holds their CRM role)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'rep' check (role in ('rep', 'manager')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create a profile (defaulting to 'rep') whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bypasses RLS internally, so it's safe to call from within profiles/accounts/leads
-- policies without causing infinite recursion.
create function public.is_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$;

-- Prevent a rep from promoting themselves to manager via a client-side update.
create function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_manager() then
    raise exception 'Only managers can change a user''s role';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_manager());

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_manager())
  with check (auth.uid() = id or public.is_manager());

-- ============================================================
-- accounts (dealers, contractors, RMC plants, project sites)
-- ============================================================

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('dealer', 'contractor', 'rmc_plant', 'project_site')),
  location text,
  contact_person text,
  phone text,
  assigned_rep uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_assigned_rep_idx on public.accounts (assigned_rep);

alter table public.accounts enable row level security;

create policy "accounts_select" on public.accounts
  for select using (public.is_manager() or assigned_rep = auth.uid());

create policy "accounts_insert" on public.accounts
  for insert with check (public.is_manager() or assigned_rep = auth.uid());

create policy "accounts_update" on public.accounts
  for update using (public.is_manager() or assigned_rep = auth.uid())
  with check (public.is_manager() or assigned_rep = auth.uid());

-- Only managers can delete accounts, to protect the shared pipeline from accidental loss.
create policy "accounts_delete" on public.accounts
  for delete using (public.is_manager());

-- ============================================================
-- leads (linked to an account, tracks pipeline stage)
-- ============================================================

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  stage text not null default 'New Lead' check (
    stage in ('New Lead', 'Site Visit', 'Quotation Sent', 'Negotiation', 'Won', 'Lost')
  ),
  product_type text,
  quantity numeric,
  expected_order_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_account_id_idx on public.leads (account_id);

alter table public.leads enable row level security;

-- Lead visibility follows the assigned rep on the linked account (no separate
-- assignment on leads, so a lead is always visible to whoever owns its account).
create policy "leads_select" on public.leads
  for select using (
    public.is_manager() or exists (
      select 1 from public.accounts a
      where a.id = leads.account_id and a.assigned_rep = auth.uid()
    )
  );

create policy "leads_insert" on public.leads
  for insert with check (
    public.is_manager() or exists (
      select 1 from public.accounts a
      where a.id = leads.account_id and a.assigned_rep = auth.uid()
    )
  );

create policy "leads_update" on public.leads
  for update using (
    public.is_manager() or exists (
      select 1 from public.accounts a
      where a.id = leads.account_id and a.assigned_rep = auth.uid()
    )
  )
  with check (
    public.is_manager() or exists (
      select 1 from public.accounts a
      where a.id = leads.account_id and a.assigned_rep = auth.uid()
    )
  );

create policy "leads_delete" on public.leads
  for delete using (public.is_manager());

-- ============================================================
-- updated_at maintenance
-- ============================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

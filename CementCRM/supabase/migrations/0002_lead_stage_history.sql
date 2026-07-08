-- Tracks every pipeline stage a lead has passed through, with a timestamp,
-- so you can see e.g. "New Lead -> Site Visit -> Quotation Sent" with dates.
-- Run this in the Supabase SQL Editor after 0001_init.sql.

create table public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  stage text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.profiles (id)
);

create index lead_stage_history_lead_id_idx on public.lead_stage_history (lead_id);

alter table public.lead_stage_history enable row level security;

-- No insert/update/delete policies: rows are only ever written by the
-- security-definer trigger below, never directly by a client.
create policy "lead_stage_history_select" on public.lead_stage_history
  for select using (
    public.is_manager() or exists (
      select 1 from public.leads l
      join public.accounts a on a.id = l.account_id
      where l.id = lead_stage_history.lead_id and a.assigned_rep = auth.uid()
    )
  );

create function public.log_lead_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lead_stage_history (lead_id, stage, changed_by)
  values (new.id, new.stage, auth.uid());
  return new;
end;
$$;

create trigger leads_log_stage_on_insert
  after insert on public.leads
  for each row execute function public.log_lead_stage_change();

create trigger leads_log_stage_on_update
  after update of stage on public.leads
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.log_lead_stage_change();

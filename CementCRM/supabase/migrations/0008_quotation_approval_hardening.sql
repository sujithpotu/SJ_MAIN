-- Closes a gap: the previous trigger only guarded status *changes* via
-- UPDATE, so a client could insert a brand-new quotation with
-- status = 'approved' directly, skipping manager review entirely.
-- This version also covers INSERT.

drop trigger if exists quotations_protect_approval on public.quotations;

create or replace function public.protect_quotation_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status_changed boolean;
begin
  if TG_OP = 'INSERT' then
    status_changed := true;
  else
    status_changed := (new.status is distinct from old.status);
  end if;

  if new.status in ('approved', 'rejected') and status_changed and not public.is_manager() then
    raise exception 'Only managers can approve or reject a quotation';
  end if;

  if new.status in ('approved', 'rejected') and status_changed then
    new.approved_by = auth.uid();
    new.approved_at = now();
  end if;

  return new;
end;
$$;

create trigger quotations_protect_approval
  before insert or update on public.quotations
  for each row execute function public.protect_quotation_approval();

-- A lead can't get a new quotation while one is still pending manager
-- approval -- it must be approved or rejected first.

create function public.block_duplicate_pending_quotation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.quotations
    where lead_id = new.lead_id and status = 'pending_approval'
  ) then
    raise exception 'This lead already has a quotation pending approval';
  end if;
  return new;
end;
$$;

create trigger quotations_block_duplicate_pending
  before insert on public.quotations
  for each row execute function public.block_duplicate_pending_quotation();

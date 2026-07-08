-- Once a lead is Won or Lost, its product list is frozen -- no more
-- adding, editing, or removing lead_items. Enforced in the database so
-- it holds even outside the app UI.

create function public.lead_is_closed(p_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.leads where id = p_lead_id and stage in ('Won', 'Lost')
  );
$$;

create function public.block_lead_items_when_closed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_lead_id uuid;
begin
  target_lead_id := coalesce(new.lead_id, old.lead_id);
  if public.lead_is_closed(target_lead_id) then
    raise exception 'This lead is Won or Lost -- products can no longer be changed';
  end if;
  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger lead_items_block_when_closed
  before insert or update or delete on public.lead_items
  for each row execute function public.block_lead_items_when_closed();

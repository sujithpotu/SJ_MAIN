-- Adds a prospect/active lifecycle status to accounts, so a rep can jot
-- down a bare-minimum prospect in the field before it's a fully engaged
-- account. New accounts default to 'prospect'; existing accounts (already
-- in active use) are backfilled to 'active'.

alter table public.accounts
  add column status text not null default 'prospect' check (status in ('prospect', 'active'));

update public.accounts set status = 'active';

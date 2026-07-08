-- Drops everything created by 0001_init.sql, so it can be re-run cleanly.
-- Safe to use during initial setup (before you have real data you care about).

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists protect_profile_role_trigger on public.profiles;
drop trigger if exists accounts_set_updated_at on public.accounts;
drop trigger if exists leads_set_updated_at on public.leads;

drop table if exists public.leads cascade;
drop table if exists public.accounts cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user();
drop function if exists public.is_manager();
drop function if exists public.protect_profile_role();
drop function if exists public.set_updated_at();

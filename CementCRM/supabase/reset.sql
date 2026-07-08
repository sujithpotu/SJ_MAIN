-- Drops everything created by the migrations in this folder, so they can be
-- re-run cleanly. Safe during initial setup (before you have real data you
-- care about) -- do not run this against a database with real data.

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists protect_profile_role_trigger on public.profiles;
drop trigger if exists accounts_set_updated_at on public.accounts;
drop trigger if exists leads_set_updated_at on public.leads;
drop trigger if exists leads_log_stage_on_insert on public.leads;
drop trigger if exists leads_log_stage_on_update on public.leads;
drop trigger if exists products_set_updated_at on public.products;

drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_manager_write" on storage.objects;
drop policy if exists "product_images_manager_update" on storage.objects;
drop policy if exists "product_images_manager_delete" on storage.objects;
delete from storage.buckets where id = 'product-images';

drop table if exists public.lead_stage_history cascade;
drop table if exists public.leads cascade;
drop table if exists public.accounts cascade;
drop table if exists public.products cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user();
drop function if exists public.is_manager();
drop function if exists public.protect_profile_role();
drop function if exists public.set_updated_at();
drop function if exists public.log_lead_stage_change();

-- ============================================================================
--  STG Groups CRM — Auth users + profile links
--
--  Run this AFTER schema.sql to create the 4 CRM users in Supabase Auth and
--  link them to the profiles + app_users tables.
--
--  Usage:   Supabase Dashboard → SQL Editor → paste → Run
--  Safe to re-run (upserts by email).
-- ============================================================================

-- Enable pgcrypto for password hashing
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  uid       uuid;
begin

  -- ── 1. super_admin — stggroups2008smm@gmail.com / stgsmm@2026 ──────────────
  if not exists (select 1 from auth.users where email = 'stggroups2008smm@gmail.com') then
    insert into auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'stggroups2008smm@gmail.com',
      crypt('stgsmm@2026', gen_salt('bf')),
      now(), '{"provider":"email"}', '{}', now(), now(),
      '', '', '', ''
    );
  end if;

  select id into uid from auth.users where email = 'stggroups2008smm@gmail.com';

  -- Link to profiles
  insert into public.profiles (id, app_user_id, role, company_id)
  values (uid, 'u-md', 'super_admin', null)
  on conflict (id) do update set app_user_id = 'u-md', role = 'super_admin', company_id = null;

  -- Ensure app_user exists
  insert into public.app_users (id, name, email, phone, role, company_id, title)
  values ('u-md', 'Managing Director', 'stggroups2008smm@gmail.com', '9000000000', 'super_admin', null, 'Super Admin / MD')
  on conflict (id) do nothing;

  -- ── 2. exec — rentals@stggroups.co.in / StgRentals@2026 (STG Rentals) ─────
  if not exists (select 1 from auth.users where email = 'rentals@stggroups.co.in') then
    insert into auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'rentals@stggroups.co.in',
      crypt('StgRentals@2026', gen_salt('bf')),
      now(), '{"provider":"email"}', '{}', now(), now(),
      '', '', '', ''
    );
  end if;

  select id into uid from auth.users where email = 'rentals@stggroups.co.in';

  insert into public.profiles (id, app_user_id, role, company_id)
  values (uid, 'u-sanjay', 'exec', 'stg-rentals')
  on conflict (id) do update set app_user_id = 'u-sanjay', role = 'exec', company_id = 'stg-rentals';

  insert into public.app_users (id, name, email, phone, role, company_id, title)
  values ('u-sanjay', 'Sanjay', 'rentals@stggroups.co.in', '8939205909', 'exec', 'stg-rentals', 'Marketing Executive — STG Rentals')
  on conflict (id) do nothing;

  -- ── 3. exec — infra@stggroups.co.in / StgInfra@2026 (STG Infra) ───────────
  if not exists (select 1 from auth.users where email = 'infra@stggroups.co.in') then
    insert into auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'infra@stggroups.co.in',
      crypt('StgInfra@2026', gen_salt('bf')),
      now(), '{"provider":"email"}', '{}', now(), now(),
      '', '', '', ''
    );
  end if;

  select id into uid from auth.users where email = 'infra@stggroups.co.in';

  insert into public.profiles (id, app_user_id, role, company_id)
  values (uid, 'u-infra', 'exec', 'stg-infra')
  on conflict (id) do update set app_user_id = 'u-infra', role = 'exec', company_id = 'stg-infra';

  insert into public.app_users (id, name, email, phone, role, company_id, title)
  values ('u-infra', 'Infra Executive', 'infra@stggroups.co.in', '8939205900', 'exec', 'stg-infra', 'Marketing Executive — STG Infra')
  on conflict (id) do nothing;

  -- ── 4. exec — stgtradingcooperation2026@gmail.com / StgTrading@2026 ────────
  if not exists (select 1 from auth.users where email = 'stgtradingcooperation2026@gmail.com') then
    insert into auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'stgtradingcooperation2026@gmail.com',
      crypt('StgTrading@2026', gen_salt('bf')),
      now(), '{"provider":"email"}', '{}', now(), now(),
      '', '', '', ''
    );
  end if;

  select id into uid from auth.users where email = 'stgtradingcooperation2026@gmail.com';

  insert into public.profiles (id, app_user_id, role, company_id)
  values (uid, 'u-naveen', 'exec', 'stg-trading')
  on conflict (id) do update set app_user_id = 'u-naveen', role = 'exec', company_id = 'stg-trading';

  insert into public.app_users (id, name, email, phone, role, company_id, title)
  values ('u-naveen', 'Naveen', 'stgtradingcooperation2026@gmail.com', '9884115099', 'exec', 'stg-trading', 'Marketing Executive — STG Trading')
  on conflict (id) do nothing;

end $$;

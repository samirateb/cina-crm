-- The primary CINA owner is identified by this verified Auth email.
-- Other Auth users are created as agency viewers with no agency assignment;
-- a super admin assigns their agency before they can read agency records.
create or replace function public.bootstrap_cina_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_agency_id uuid;
  v_name text;
begin
  v_name := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1));

  if lower(new.email) = lower('ratebsami807@gmail.com') then
    select id into v_agency_id
    from public.sub_agencies
    where parent_agency_id is null and name = 'CINA Study in China'
    order by created_at
    limit 1;

    if v_agency_id is null then
      insert into public.sub_agencies(name, nature, level, degree_focus, is_active)
      values ('CINA Study in China', 'company', 'other', 'both', true)
      returning id into v_agency_id;
    end if;

    insert into public.profiles(id, full_name, role, agency_id)
    values (new.id, 'CINA Admin', 'super_admin', v_agency_id)
    on conflict (id) do update
    set full_name = excluded.full_name,
        role = 'super_admin',
        agency_id = excluded.agency_id;
  else
    insert into public.profiles(id, full_name, role, agency_id)
    values (new.id, v_name, 'agent', null)
    on conflict (id) do update
    set role = case when public.profiles.role = 'super_admin' then 'agent' else public.profiles.role end,
        agency_id = case when public.profiles.role = 'super_admin' then null else public.profiles.agency_id end;
  end if;

  return new;
end;
$$;

revoke all on function public.bootstrap_cina_auth_profile() from public, anon, authenticated;

drop trigger if exists cina_auth_profile_bootstrap on auth.users;
create trigger cina_auth_profile_bootstrap
after insert or update of email on auth.users
for each row execute function public.bootstrap_cina_auth_profile();

-- Provision the existing primary account immediately when this migration runs.
do $$
declare
  v_user_id uuid;
  v_agency_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower('ratebsami807@gmail.com')
  limit 1;

  if v_user_id is not null then
    select id into v_agency_id
    from public.sub_agencies
    where parent_agency_id is null and name = 'CINA Study in China'
    order by created_at
    limit 1;

    if v_agency_id is null then
      insert into public.sub_agencies(name, nature, level, degree_focus, is_active)
      values ('CINA Study in China', 'company', 'other', 'both', true)
      returning id into v_agency_id;
    end if;

    insert into public.profiles(id, full_name, role, agency_id)
    values (v_user_id, 'CINA Admin', 'super_admin', v_agency_id)
    on conflict (id) do update
    set full_name = excluded.full_name,
        role = 'super_admin',
        agency_id = excluded.agency_id;
  end if;
end;
$$;

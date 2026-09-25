-- Run once in Supabase SQL Editor after the Auth user has been created.
-- This promotes the specified CINA owner account and links it to the root agency.
do $$
declare
  v_user_id uuid;
  v_agency_id uuid;
begin
  select id into v_user_id
    from auth.users
    where lower(email)=lower('ratebsami807@gmail.com')
    limit 1;

  if v_user_id is null then
    raise exception 'Create the owner account in Supabase Auth first, then run this script again.';
  end if;

  select id into v_agency_id
    from public.sub_agencies
    where parent_agency_id is null and name='CINA Study in China'
    order by created_at
    limit 1;

  if v_agency_id is null then
    insert into public.sub_agencies(name,nature,level,degree_focus,is_active)
      values('CINA Study in China','company','other','both',true)
      returning id into v_agency_id;
  end if;

  insert into public.profiles(id,full_name,role,agency_id)
    values(v_user_id,'CINA Admin','super_admin',v_agency_id)
    on conflict(id) do update
      set full_name=excluded.full_name,
          role='super_admin',
          agency_id=excluded.agency_id;
end $$;

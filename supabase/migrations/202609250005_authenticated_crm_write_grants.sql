-- Table privileges are required before PostgreSQL evaluates row-level policies.
-- Keep direct SELECT revoked; CRM reads go through the masked *_visible views.
grant usage on schema public to authenticated;
grant insert, update, delete on public.students, public.applications to authenticated;
grant select, insert, update, delete on public.sub_agencies, public.universities, public.programs to authenticated;
grant select, update on public.notifications to authenticated;

-- Policies from 202609250002 remain the authorization boundary: only CINA
-- super admins can insert/update; deletes are similarly restricted.

-- Reconfirm the primary owner's CRM role for projects where the earlier
-- profile-bootstrap migration was not applied after the Auth user existed.
do $$
declare
  v_user_id uuid;
  v_agency_id uuid;
begin
  select id into v_user_id from auth.users
  where lower(email) = lower('ratebsami807@gmail.com')
  limit 1;

  if v_user_id is not null then
    select id into v_agency_id from public.sub_agencies
    where parent_agency_id is null and name = 'CINA Study in China'
    order by created_at limit 1;

    if v_agency_id is null then
      insert into public.sub_agencies(name, nature, level, degree_focus, is_active)
      values ('CINA Study in China', 'company', 'other', 'both', true)
      returning id into v_agency_id;
    end if;

    insert into public.profiles(id, full_name, role, agency_id)
    values (v_user_id, 'CINA Admin', 'super_admin', v_agency_id)
    on conflict (id) do update
    set full_name = excluded.full_name, role = 'super_admin', agency_id = excluded.agency_id;
  end if;
end;
$$;

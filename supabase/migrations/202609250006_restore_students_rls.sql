-- The CINA database scanner found that policies existed on public.students
-- while RLS had been disabled manually. Re-enable policy enforcement.
alter table public.students enable row level security;

-- Restore the table grants needed by the CRM. RLS still decides which rows
-- can be changed. Direct student/application reads stay revoked and flow
-- through the masked views.
grant usage on schema public to authenticated;
grant insert, update, delete on public.students, public.applications to authenticated;
grant select, insert, update, delete on public.sub_agencies, public.universities, public.programs to authenticated;
grant select, update on public.notifications to authenticated;
revoke select on public.students, public.applications from authenticated;
grant select on public.students_visible, public.applications_visible to authenticated;

-- Restore the known primary owner's profile if the bootstrap migration was
-- missed for an Auth user that already existed.
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

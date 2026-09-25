-- Agency accounts can view records in their own agency but cannot create or change them.
-- CINA super admins retain full access through the admin-only policies below.
drop policy if exists "students scoped insert" on public.students;
drop policy if exists "students scoped update" on public.students;
create policy "students admin insert" on public.students for insert to authenticated
  with check (public.current_role()='super_admin');
create policy "students admin update" on public.students for update to authenticated
  using (public.current_role()='super_admin') with check (public.current_role()='super_admin');

drop policy if exists "applications scoped insert" on public.applications;
drop policy if exists "applications scoped update" on public.applications;
create policy "applications admin insert" on public.applications for insert to authenticated
  with check (public.current_role()='super_admin');
create policy "applications admin update" on public.applications for update to authenticated
  using (public.current_role()='super_admin') with check (public.current_role()='super_admin');

create or replace function public.update_application_status(p_application_id uuid,p_new_status text)
returns public.applications language plpgsql security definer set search_path=public as $$
declare v_row public.applications;
begin
  if public.current_role() is distinct from 'super_admin' then
    raise exception 'Only a CINA super admin can update application status';
  end if;
  select * into v_row from public.applications where id=p_application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if not exists (
    select 1 from public.application_status_transitions t
    where t.from_status=v_row.application_status
      and t.to_status=p_new_status
      and 'super_admin'=any(t.allowed_roles)
  ) then raise exception 'Status transition is not allowed'; end if;
  update public.applications set application_status=p_new_status,updated_at=now()
    where id=p_application_id returning * into v_row;
  return v_row;
end $$;
grant execute on function public.update_application_status(uuid,text) to authenticated;

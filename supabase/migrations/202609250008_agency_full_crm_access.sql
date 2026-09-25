-- Agency users can work with records inside their own agency. Admin-only
-- program and sub-agency administration stays protected by existing policies.
drop policy if exists "students admin insert" on public.students;
drop policy if exists "students admin update" on public.students;
create policy "students scoped insert" on public.students for insert to authenticated
  with check (
    public.current_role() = 'super_admin'
    or (agency_id = public.current_agency_id() and assigned_agent_id = auth.uid())
  );
create policy "students scoped update" on public.students for update to authenticated
  using (
    public.current_role() = 'super_admin'
    or agency_id = public.current_agency_id()
  )
  with check (
    public.current_role() = 'super_admin'
    or agency_id = public.current_agency_id()
  );

drop policy if exists "applications admin insert" on public.applications;
drop policy if exists "applications admin update" on public.applications;
create policy "applications scoped insert" on public.applications for insert to authenticated
  with check (
    public.current_role() = 'super_admin'
    or (agency_id = public.current_agency_id() and assigned_agent_id = auth.uid())
  );
create policy "applications scoped update" on public.applications for update to authenticated
  using (
    public.current_role() = 'super_admin'
    or agency_id = public.current_agency_id()
  )
  with check (
    public.current_role() = 'super_admin'
    or agency_id = public.current_agency_id()
  );

create or replace function public.update_application_status(p_application_id uuid, p_new_status text)
returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.applications;
  v_role text;
begin
  v_role := public.current_role();
  select * into v_row
  from public.applications
  where id = p_application_id
    and (v_role = 'super_admin' or agency_id = public.current_agency_id())
  for update;

  if not found then
    raise exception 'Application not found or access denied';
  end if;

  if not exists (
    select 1 from public.application_status_transitions t
    where t.from_status = v_row.application_status
      and t.to_status = p_new_status
      and v_role = any(t.allowed_roles)
  ) then
    raise exception 'Status transition is not allowed';
  end if;

  update public.applications
  set application_status = p_new_status, updated_at = now()
  where id = p_application_id
  returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.update_application_status(uuid, text) to authenticated;

-- Remove the default PUBLIC execute grant from database helper functions.
-- Policy helper functions remain callable by signed-in CRM users; trigger
-- functions are only invoked by their table triggers.

revoke all on function public.current_role() from public, anon;
revoke all on function public.current_agency_id() from public, anon;
grant execute on function public.current_role() to authenticated;
grant execute on function public.current_agency_id() to authenticated;

revoke all on function public.update_application_status(uuid, text) from public, anon;
grant execute on function public.update_application_status(uuid, text) to authenticated;

revoke all on function public.enforce_application_transition() from public, anon, authenticated;
revoke all on function public.enforce_student_transition() from public, anon, authenticated;

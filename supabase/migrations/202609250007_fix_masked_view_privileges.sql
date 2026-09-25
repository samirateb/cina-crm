-- The CRM intentionally revokes direct SELECT from authenticated users on
-- students/applications and exposes only field-masked, agency-scoped views.
-- The views were configured as SECURITY INVOKER in the hosted database, so
-- their underlying SELECT tried to use the caller's revoked table privileges.
-- Run the existing view filters/masking as the privileged view owner instead.
alter view public.students_visible set (security_invoker = false);
alter view public.applications_visible set (security_invoker = false);

-- Keep API access limited to the two filtered views.
revoke select on public.students, public.applications from authenticated;
grant select on public.students_visible, public.applications_visible to authenticated;

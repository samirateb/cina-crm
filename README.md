# CINA Study in China CRM

Next.js App Router CRM for the CINA Study in China international student recruitment workflow. It includes a responsive light/dark workspace, student and application tables/forms, agency management, program directory/detail, deadline calendar, notifications, Supabase authentication, and a Supabase schema/RLS migration.

## Run locally

1. Install Node.js 20.9 or newer.
2. Run `npm install` and `npm run dev`.
3. Open [http://localhost:3000](http://localhost:3000). Without Supabase credentials the app displays sample CRM records for UI review.

## Connect Supabase

1. Create a Supabase project and copy `.env.example` to `.env.local` with the project URL and publishable key. The app still accepts the legacy anon-key variable as a fallback.
2. Apply every SQL file in `supabase/migrations` in filename order. The latest migration is `202609250008_agency_full_crm_access.sql`; it enables agency-scoped student and application work while keeping program and sub-agency administration restricted to the CINA admin.
3. Create the owner in Supabase Auth, then run `supabase/setup/assign_primary_admin.sql` in SQL Editor to assign the CINA owner account full admin access. Create each agency user's Auth account and `profiles` row with role `agent` and that agency's ID. Agency users can view their agency's student/application lists; admin-only data changes are enforced by RLS. Accounts are administrator-provisioned; public signup is intentionally disabled.
4. Add programs, universities, and intake data. Program and university write policies only allow super admins.
5. Configure the password reset redirect URL to include `/login` in Supabase Auth settings.

When Supabase is configured, CRM routes require a signed-in user and list views query Supabase through RLS-protected views/tables. The migrations keep student and application rows inside each agency, mask teammate student PII in `students_visible` and `applications_visible`, restrict program and sub-agency administration to super admins, and validate application status transitions in `update_application_status`.

## Deployment

Deploy this repository as a Next.js app on Vercel. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Vercel project settings for Production, Preview, and Development, then redeploy. Never add `.env.local` to Git; it is ignored. Apply all Supabase migrations before using the deployed app. In Supabase Auth, add the Vercel domain to the allowed redirect URLs and configure the password-reset redirect to `/login`.

## Product assumptions

- Agents are provisioned by an administrator; the login page does not expose self-registration.
- Workflow states currently use the values represented in the UI/migration, since the source brief did not specify a complete approved state catalog.
- Universities are managed as catalog data and are available to program/application forms; a separate universities module was omitted as requested in the brief.
- Sample records and headline counts are included for an unconfigured local preview.

-- Zhongbang Education CRM: schema, authorization, masking, and workflow functions.
create extension if not exists pgcrypto;

create table if not exists public.sub_agencies (
  id uuid primary key default gen_random_uuid(), name text not null, parent_agency_id uuid references public.sub_agencies(id) on delete set null,
  nature text check (nature in ('company','individual')), level text check (level in ('bronze','silver','gold','other')),
  nationality text, focusing_countries text[] not null default '{}', degree_focus text check (degree_focus in ('undergrad','postgrad','both')),
  is_active boolean not null default true, description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, full_name text, role text not null default 'agent' check(role in ('super_admin','agent')),
  agency_id uuid references public.sub_agencies(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(), name text not null, short_code text unique, logo_url text, city text, province text, created_at timestamptz not null default now()
);
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(), name text not null, university_id uuid not null references public.universities(id), province text, city text,
  degree text, language text, program_type text, duration text, category text, tuition_amount numeric, tuition_currency text default 'CNY',
  intake_season text, entrance_exam boolean not null default false, academic_min_requirement text, language_requirement text, csca_subjects text[] not null default '{}',
  application_fee numeric, application_fee_timing text check(application_fee_timing in ('after_admission','upfront')), application_opens_date date,
  application_deadline_date date, is_active boolean not null default true, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.required_documents (id uuid primary key default gen_random_uuid(), program_id uuid not null references public.programs(id) on delete cascade, sort_order int not null, name text not null);
create table if not exists public.scholarships (id uuid primary key default gen_random_uuid(), program_id uuid not null references public.programs(id) on delete cascade, name text not null, amount numeric, description text);

do $$ begin create type public.student_global_status as enum ('new','under_review','application_fee_paid','original_jw_sent','no_seats','rejected','cancelled','admitted'); exception when duplicate_object then null; end $$;
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(), first_name text not null, last_name text not null, gender text, nationality text, passport_number text,
  birth_date date, present_in_china boolean, cloud_file_link text, sub_agency_id uuid references public.sub_agencies(id) on delete set null,
  intake_period text, highest_degree text, highest_degree_marks text, graduation_year int, applying_degree text,
  global_status public.student_global_status not null default 'new', destination_university_id uuid references public.universities(id), scholarship text,
  jw_sent_date date, is_active boolean not null default true, agency_id uuid references public.sub_agencies(id), assigned_agent_id uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
  university_id uuid not null references public.universities(id), program_id uuid not null references public.programs(id),
  application_status text not null default 'new', application_fee_receipt_url text, screenshot_url text, remarks text,
  record_status text not null default 'active' check(record_status in ('active','archived','draft')), reference_note text,
  agency_id uuid references public.sub_agencies(id), assigned_agent_id uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.application_status_transitions (
  id uuid primary key default gen_random_uuid(), from_status text not null, to_status text not null, allowed_roles text[] not null default '{agent,super_admin}', unique(from_status,to_status)
);
alter table public.applications add constraint applications_status_valid check (application_status in ('new','under_review','application_fee_paid','admitted','original_jw_sent','no_seats','rejected','cancelled'));
insert into public.application_status_transitions(from_status,to_status,allowed_roles) values
('new','under_review','{agent,super_admin}'),('under_review','application_fee_paid','{agent,super_admin}'),
('application_fee_paid','admitted','{super_admin}'),('admitted','original_jw_sent','{super_admin}'),
('under_review','no_seats','{super_admin}'),('application_fee_paid','no_seats','{super_admin}'),
('new','cancelled','{agent,super_admin}'),('under_review','cancelled','{agent,super_admin}'),
('application_fee_paid','cancelled','{agent,super_admin}'),('under_review','rejected','{super_admin}'),
('application_fee_paid','rejected','{super_admin}') on conflict do nothing;
create table if not exists public.student_global_status_transitions (
  id uuid primary key default gen_random_uuid(), from_status public.student_global_status not null, to_status public.student_global_status not null,
  allowed_roles text[] not null default '{agent,super_admin}', unique(from_status,to_status)
);
insert into public.student_global_status_transitions(from_status,to_status,allowed_roles) values
('new','under_review','{agent,super_admin}'),('under_review','application_fee_paid','{agent,super_admin}'),
('application_fee_paid','original_jw_sent','{super_admin}'),('under_review','no_seats','{super_admin}'),
('application_fee_paid','no_seats','{super_admin}'),('under_review','rejected','{super_admin}'),
('application_fee_paid','rejected','{super_admin}'),('new','cancelled','{agent,super_admin}'),
('under_review','cancelled','{agent,super_admin}'),('application_fee_paid','cancelled','{agent,super_admin}') on conflict do nothing;
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null, actor_role text,
  type text not null, category text check(category in ('application','note','document')), message text not null,
  related_entity_type text check(related_entity_type in ('student','application')), related_entity_id uuid,
  recipient_id uuid not null references public.profiles(id) on delete cascade, read_at timestamptz, snoozed_until timestamptz, created_at timestamptz not null default now()
);
create index if not exists students_agency_assigned_idx on public.students(agency_id,assigned_agent_id);
create index if not exists applications_agency_assigned_idx on public.applications(agency_id,assigned_agent_id);
create index if not exists programs_deadline_idx on public.programs(application_deadline_date) where is_active;
create index if not exists notifications_recipient_idx on public.notifications(recipient_id,created_at desc);

create or replace function public.current_role() returns text language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.current_agency_id() returns uuid language sql stable security definer set search_path=public as $$ select agency_id from public.profiles where id=auth.uid() $$;
alter table public.profiles enable row level security;
alter table public.sub_agencies enable row level security;
alter table public.universities enable row level security;
alter table public.programs enable row level security;
alter table public.required_documents enable row level security;
alter table public.scholarships enable row level security;
alter table public.students enable row level security;
alter table public.applications enable row level security;
alter table public.application_status_transitions enable row level security;
alter table public.student_global_status_transitions enable row level security;
alter table public.notifications enable row level security;

create policy "profiles self or admin read" on public.profiles for select to authenticated using(id=auth.uid() or public.current_role()='super_admin');
create policy "admin manages profiles" on public.profiles for all to authenticated using(public.current_role()='super_admin') with check(public.current_role()='super_admin');
create policy "agencies visible in network" on public.sub_agencies for select to authenticated using(public.current_role()='super_admin' or id=public.current_agency_id() or parent_agency_id=public.current_agency_id());
create policy "admin manages agencies" on public.sub_agencies for all to authenticated using(public.current_role()='super_admin') with check(public.current_role()='super_admin');
create policy "catalog readable" on public.universities for select to authenticated using(true);
create policy "admin manages universities" on public.universities for all to authenticated using(public.current_role()='super_admin') with check(public.current_role()='super_admin');
create policy "programs readable" on public.programs for select to authenticated using(true);
create policy "admin manages programs" on public.programs for all to authenticated using(public.current_role()='super_admin') with check(public.current_role()='super_admin');
create policy "documents readable" on public.required_documents for select to authenticated using(true);
create policy "admin manages documents" on public.required_documents for all to authenticated using(public.current_role()='super_admin') with check(public.current_role()='super_admin');
create policy "scholarships readable" on public.scholarships for select to authenticated using(true);
create policy "admin manages scholarships" on public.scholarships for all to authenticated using(public.current_role()='super_admin') with check(public.current_role()='super_admin');
create policy "students scoped select" on public.students for select to authenticated using(public.current_role()='super_admin' or agency_id=public.current_agency_id());
create policy "students scoped insert" on public.students for insert to authenticated with check(public.current_role()='super_admin' or (agency_id=public.current_agency_id() and assigned_agent_id=auth.uid()));
create policy "students scoped update" on public.students for update to authenticated using(public.current_role()='super_admin' or (agency_id=public.current_agency_id() and assigned_agent_id=auth.uid())) with check(public.current_role()='super_admin' or (agency_id=public.current_agency_id() and assigned_agent_id=auth.uid()));
create policy "students admin delete" on public.students for delete to authenticated using(public.current_role()='super_admin');
create policy "applications scoped select" on public.applications for select to authenticated using(public.current_role()='super_admin' or agency_id=public.current_agency_id());
create policy "applications scoped insert" on public.applications for insert to authenticated with check(public.current_role()='super_admin' or (agency_id=public.current_agency_id() and assigned_agent_id=auth.uid()));
create policy "applications scoped update" on public.applications for update to authenticated using(public.current_role()='super_admin' or (agency_id=public.current_agency_id() and assigned_agent_id=auth.uid())) with check(public.current_role()='super_admin' or (agency_id=public.current_agency_id() and assigned_agent_id=auth.uid()));
create policy "applications admin delete" on public.applications for delete to authenticated using(public.current_role()='super_admin');
create policy "transitions readable" on public.application_status_transitions for select to authenticated using(true);
create policy "admin manages transitions" on public.application_status_transitions for all to authenticated using(public.current_role()='super_admin') with check(public.current_role()='super_admin');
create policy "student transitions readable" on public.student_global_status_transitions for select to authenticated using(true);
create policy "admin manages student transitions" on public.student_global_status_transitions for all to authenticated using(public.current_role()='super_admin') with check(public.current_role()='super_admin');
create policy "notifications recipient read" on public.notifications for select to authenticated using(recipient_id=auth.uid() or public.current_role()='super_admin');
create policy "notifications recipient update" on public.notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());

-- Views expose full details to the owner and super admins; same-agency teammates see a masked profile.
create or replace view public.students_visible as
select s.id,s.agency_id,s.sub_agency_id,s.assigned_agent_id,s.first_name,
 case when s.assigned_agent_id=auth.uid() or public.current_role()='super_admin' then s.last_name else null end as last_name,
 s.gender, case when s.assigned_agent_id=auth.uid() or public.current_role()='super_admin' then s.nationality else null end as nationality,
 case when s.assigned_agent_id=auth.uid() or public.current_role()='super_admin' then s.passport_number else null end as passport_number,
 case when s.assigned_agent_id=auth.uid() or public.current_role()='super_admin' then s.birth_date else null end as birth_date,
 s.present_in_china, case when s.assigned_agent_id=auth.uid() or public.current_role()='super_admin' then s.cloud_file_link else null end as cloud_file_link,
 s.intake_period,s.highest_degree,s.highest_degree_marks,s.graduation_year,s.applying_degree,s.global_status,s.destination_university_id,
 s.scholarship,s.jw_sent_date,s.is_active,s.created_at,s.updated_at
from public.students s where public.current_role()='super_admin' or s.agency_id=public.current_agency_id();
create or replace view public.applications_visible as
select a.id,a.student_id,a.university_id,a.program_id,a.agency_id,a.assigned_agent_id,a.application_status,
 a.application_fee_receipt_url,a.screenshot_url,a.remarks,a.record_status,a.reference_note,a.created_at,a.updated_at,
 case when a.assigned_agent_id=auth.uid() or public.current_role()='super_admin' then s.last_name else null end as student_last_name,
 s.first_name as student_first_name,
 case when a.assigned_agent_id=auth.uid() or public.current_role()='super_admin' then s.passport_number else null end as student_passport_number,
 case when a.assigned_agent_id=auth.uid() or public.current_role()='super_admin' then s.birth_date else null end as student_birth_date,
 case when a.assigned_agent_id=auth.uid() or public.current_role()='super_admin' then s.nationality else null end as student_nationality,
 case when a.assigned_agent_id=auth.uid() or public.current_role()='super_admin' then s.cloud_file_link else null end as student_cloud_file_link
from public.applications a join public.students s on s.id=a.student_id
where public.current_role()='super_admin' or a.agency_id=public.current_agency_id();
grant select on public.students_visible,public.applications_visible to authenticated;
revoke select on public.students,public.applications from authenticated;

create or replace function public.update_application_status(p_application_id uuid,p_new_status text)
returns public.applications language plpgsql security definer set search_path=public as $$
declare v_row public.applications; v_role text; begin
 v_role:=public.current_role();
 select * into v_row from public.applications where id=p_application_id and (v_role='super_admin' or (agency_id=public.current_agency_id() and assigned_agent_id=auth.uid())) for update;
 if not found then raise exception 'Application not found or access denied'; end if;
 if not exists(select 1 from public.application_status_transitions t where t.from_status=v_row.application_status and t.to_status=p_new_status and v_role=any(t.allowed_roles)) then raise exception 'Status transition is not allowed'; end if;
 update public.applications set application_status=p_new_status,updated_at=now() where id=p_application_id returning * into v_row;
 return v_row;
end $$;
grant execute on function public.update_application_status(uuid,text) to authenticated;
create or replace function public.enforce_application_transition() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  if new.application_status not in ('new','under_review','application_fee_paid','admitted','original_jw_sent','no_seats','rejected','cancelled') then raise exception 'Invalid application status'; end if;
 elsif new.application_status is distinct from old.application_status then
  if not exists(select 1 from public.application_status_transitions t where t.from_status=old.application_status and t.to_status=new.application_status and public.current_role()=any(t.allowed_roles)) then raise exception 'Status transition is not allowed'; end if;
 end if;
 return new;
end $$;
drop trigger if exists applications_status_transition_guard on public.applications;
create trigger applications_status_transition_guard before insert or update of application_status on public.applications for each row execute function public.enforce_application_transition();
create or replace function public.enforce_student_transition() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and new.global_status is distinct from old.global_status and not exists(
  select 1 from public.student_global_status_transitions t where t.from_status=old.global_status and t.to_status=new.global_status and public.current_role()=any(t.allowed_roles)
 ) then raise exception 'Student status transition is not allowed'; end if;
 return new;
end $$;
drop trigger if exists students_status_transition_guard on public.students;
create trigger students_status_transition_guard before update of global_status on public.students for each row execute function public.enforce_student_transition();

-- Private buckets; objects are scoped by agency/user-prefixed storage paths in the app.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('application-files','application-files',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy "users upload own application files" on storage.objects for insert to authenticated with check(bucket_id='application-files' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "users read own application files" on storage.objects for select to authenticated using(bucket_id='application-files' and (storage.foldername(name))[1]=auth.uid()::text);

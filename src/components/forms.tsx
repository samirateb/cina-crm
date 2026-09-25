'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, FileText, GraduationCap, UserRound } from 'lucide-react';
import { FormField, FormSection } from '@/components/ui';
import { createClient } from '@/lib/supabase';
import { countryNames } from '@/lib/countries';

type Choice = { id: string; name: string; university_id?: string; agency_id?: string; first_name?: string; last_name?: string };
const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

export function StudentForm() {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [agencyOptions, setAgencyOptions] = useState<Choice[]>([]);

  useEffect(() => {
    if (!configured) return;
    createClient().from('sub_agencies').select('id,name').order('name').then(({ data, error }) => {
      if (error) setFeedback(error.message);
      else setAgencyOptions((data || []) as Choice[]);
    });
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setFeedback('');
    try {
      if (!configured) throw new Error('Supabase is not configured. Add its URL and publishable key before creating records.');
      const f = new FormData(e.currentTarget); const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error('Your session expired. Please sign in again.');
      const { data: profile, error: profileError } = await db.from('profiles').select('agency_id,role').eq('id', user.id).single();
      if (profileError) throw profileError;
      if (!['super_admin', 'agent'].includes(profile.role) || !profile.agency_id) throw new Error('Your account must be assigned to an agency to create student records.');
      const { error } = await db.from('students').insert({
        first_name: f.get('first_name'), last_name: f.get('last_name'), gender: f.get('gender') || null,
        nationality: f.get('nationality') || null, passport_number: f.get('passport_number') || null,
        birth_date: f.get('birth_date') || null, present_in_china: f.get('present_in_china') === 'true',
        cloud_file_link: f.get('cloud_file_link') || null, sub_agency_id: f.get('sub_agency_id') || null,
        intake_period: f.get('intake_period') || null, highest_degree: f.get('highest_degree') || null,
        highest_degree_marks: f.get('highest_degree_marks') || null,
        graduation_year: f.get('graduation_year') ? Number(f.get('graduation_year')) : null,
        applying_degree: f.get('applying_degree') || null, global_status: 'new', agency_id: profile.agency_id,
        assigned_agent_id: user.id, is_active: true,
      });
      if (error) throw error;
      window.location.assign('/students');
    } catch (err: any) { setFeedback(err?.message || 'Unable to save student.'); }
    finally { setBusy(false); }
  }

  return <form onSubmit={save} className="space-y-5">
    <FormSection title="Identity Details" icon={UserRound}>
      <FormField label="First Name"><input name="first_name" className="field" required maxLength={100} placeholder="e.g. John" /></FormField>
      <FormField label="Last Name"><input name="last_name" className="field" required maxLength={100} placeholder="e.g. Doe" /></FormField>
      <FormField label="Gender"><select name="gender" className="field"><option value="">Select gender</option><option>Female</option><option>Male</option></select></FormField>
      <FormField label="Nationality"><select name="nationality" className="field"><option value="">Select country</option>{countryNames.map(n => <option key={n}>{n}</option>)}</select></FormField>
      <FormField label="Passport Number"><input name="passport_number" className="field" maxLength={40} placeholder="E12345678" /></FormField>
      <FormField label="Birthday"><input name="birth_date" type="date" className="field" max={new Date().toISOString().slice(0, 10)} /></FormField>
      <FormField label="Present in China?"><select name="present_in_china" className="field"><option value="false">No</option><option value="true">Yes</option></select></FormField>
      <FormField label="Cloud File Link" wide><input name="cloud_file_link" type="url" className="field" placeholder="https://..." /></FormField>
    </FormSection>
    <FormSection title="Academic & Pipeline" icon={GraduationCap} tone="purple">
      <FormField label="Sub Agency"><select name="sub_agency_id" className="field"><option value="">No sub agency</option>{agencyOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></FormField>
      <FormField label="Intake Period"><select name="intake_period" className="field"><option value="">Select intake</option><option>Autumn 2026</option><option>Spring 2027</option><option>Autumn 2027</option></select></FormField>
      <FormField label="Highest Degree Held"><select name="highest_degree" className="field"><option value="">Select degree</option><option>High School</option><option>Bachelor</option><option>Master</option><option>PhD</option></select></FormField>
      <FormField label="Highest Degree Marks"><input name="highest_degree_marks" className="field" maxLength={40} placeholder="e.g. 3.5/4.0 or 85%" /></FormField>
      <FormField label="Graduation Year"><input name="graduation_year" type="number" min="1950" max={new Date().getFullYear() + 2} className="field" placeholder="2024" /></FormField>
      <FormField label="Applying For"><select name="applying_degree" className="field"><option value="">Select program type</option><option>Bachelor</option><option>Master</option><option>PhD</option><option>Chinese Language Year</option></select></FormField>
      <FormField label="Global Status"><select name="global_status" className="field" disabled><option value="new">New</option></select><span className="mt-1 block text-xs text-slate-400">New students enter the pipeline at this status.</span></FormField>
    </FormSection>
    {feedback && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{feedback}</p>}
    <div className="flex justify-end gap-2"><Link href="/students" className="rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold">Cancel</Link><button disabled={busy || !configured} className="gradient-bg rounded-full px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save Student'}</button></div>
  </form>;
}

export function ApplicationForm() {
  const [busy, setBusy] = useState(false); const [feedback, setFeedback] = useState('');
  const [records, setRecords] = useState<{ students: Choice[]; programs: Choice[] }>({ students: [], programs: [] });

  useEffect(() => {
    if (!configured) return;
    const db = createClient();
    Promise.all([
      db.from('students_visible').select('id,first_name,last_name,agency_id').order('first_name'),
      db.from('programs').select('id,name,university_id').eq('is_active', true).order('name'),
    ]).then(([s, p]) => {
      if (s.error || p.error) { setFeedback(s.error?.message || p.error?.message || 'Could not load application choices.'); return; }
      setRecords({ students: (s.data || []).map((x: any) => ({ ...x, name: [x.first_name, x.last_name].filter(Boolean).join(' ') })), programs: p.data || [] });
    }).catch(() => setFeedback('Could not load application choices.'));
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setFeedback('');
    try {
      if (!configured) throw new Error('Supabase is not configured. Add its URL and publishable key before creating records.');
      const f = new FormData(e.currentTarget); const studentId = String(f.get('student_id') || ''); const programId = String(f.get('program_id') || '');
      const chosenStudent = records.students.find(s => s.id === studentId); const chosenProgram = records.programs.find(p => p.id === programId);
      if (!chosenStudent || !chosenProgram || !chosenProgram.university_id) throw new Error('Select a student and an available program.');
      const db = createClient(); const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error('Your session expired. Please sign in again.');
      const { data: profile, error: profileError } = await db.from('profiles').select('agency_id,role').eq('id', user.id).single();
      if (profileError) throw profileError;
      if (!['super_admin', 'agent'].includes(profile.role) || !profile.agency_id) throw new Error('Your account must be assigned to an agency to create application records.');
      const upload = async (file: FormDataEntryValue | null) => {
        if (!(file instanceof File) || file.size === 0) return null;
        if (file.size > 10 * 1024 * 1024) throw new Error('Each attachment must be 10 MB or smaller.');
        const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await db.storage.from('application-files').upload(path, file);
        if (error) throw error; return path;
      };
      const [receipt, screenshot] = await Promise.all([upload(f.get('receipt')), upload(f.get('screenshot'))]);
      const { error } = await db.from('applications').insert({
        student_id: studentId, university_id: chosenProgram.university_id, program_id: programId, application_status: 'new',
        application_fee_receipt_url: receipt, screenshot_url: screenshot, remarks: f.get('remarks') || null,
        reference_note: f.get('reference_note') || null, record_status: f.get('record_status') || 'active',
        agency_id: profile.agency_id || chosenStudent.agency_id, assigned_agent_id: user.id,
      });
      if (error) throw error;
      window.location.assign('/applications');
    } catch (err: any) { setFeedback(err?.message || 'Unable to create application.'); }
    finally { setBusy(false); }
  }

  return <form onSubmit={save} className="space-y-5">
    <FormSection title="Core Information" icon={FileText}>
      <FormField label="Student *"><select name="student_id" required className="field"><option value="">Select a student</option>{records.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FormField>
      <FormField label="Application Status" hint="New applications start in New. Use the status control on the list to advance the workflow."><select name="application_status" value="new" disabled className="field"><option value="new">New</option></select></FormField>
      <FormField label="Program *"><select name="program_id" required className="field" defaultValue=""><option value="">Select a program</option>{records.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><span className="mt-1 block text-xs text-slate-400">Choose from programs created by the CINA administrator.</span></FormField>
      <FormField label="Application Fee Receipt"><input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="field !py-2" /><span className="text-xs text-slate-400">Image or PDF, up to 10 MB.</span></FormField>
      <FormField label="Screenshot"><input name="screenshot" type="file" accept="image/jpeg,image/png,image/webp" className="field !py-2" /><span className="text-xs text-slate-400">JPG, PNG, or WebP, up to 10 MB.</span></FormField>
    </FormSection>
    <FormSection title="Timeline & Remarks" icon={CalendarDays} tone="amber">
      <FormField label="Reference / App ID"><input name="reference_note" className="field" maxLength={120} placeholder="Optional tracking reference" /></FormField>
      <FormField label="Record Status"><select name="record_status" className="field"><option value="active">Active</option><option value="draft">Draft</option></select></FormField>
      <FormField label="Remarks" wide><textarea name="remarks" maxLength={4000} className="field min-h-24" placeholder="Add notes about this application..." /></FormField>
    </FormSection>
    {feedback && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{feedback}</p>}
    <div className="flex justify-end gap-2"><Link href="/applications" className="rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold">Discard Changes</Link><button disabled={busy || !configured || !records.students.length || !records.programs.length} className="gradient-bg rounded-full px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Create Application'}</button></div>
  </form>;
}

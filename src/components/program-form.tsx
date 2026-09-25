'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export function ProgramForm() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const db = createClient(); const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error('Please sign in again.');
      const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', user.id).single();
      if (profileError) throw profileError;
      if (profile.role !== 'super_admin') throw new Error('Only a CINA administrator can create programs.');
      const universityName = String(form.get('university') || '').trim();
      const { data: existing, error: findError } = await db.from('universities').select('id').eq('name', universityName).maybeSingle();
      if (findError) throw findError;
      let universityId = existing?.id;
      if (!universityId) {
        const { data, error } = await db.from('universities').insert({ name: universityName, city: form.get('city') || null, province: form.get('province') || null }).select('id').single();
        if (error) throw error; universityId = data.id;
      }
      const { error } = await db.from('programs').insert({
        name: String(form.get('name')).trim(), university_id: universityId,
        city: form.get('city') || null, province: form.get('province') || null,
        degree: form.get('degree') || null, language: form.get('language') || null,
        duration: form.get('duration') || null, category: form.get('category') || null,
        application_deadline_date: form.get('deadline') || null,
        tuition_amount: form.get('tuition') ? Number(form.get('tuition')) : null,
        tuition_currency: form.get('currency') || 'CNY', is_active: true, created_by: user.id,
      });
      if (error) throw error;
      window.location.assign('/programs');
    } catch (e: any) { setError(e?.message || 'Unable to create program.'); }
    finally { setBusy(false); }
  }
  return <>
    <Link href="/programs" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15}/> Back to Programs</Link>
    <div className="mb-6 flex items-center gap-3"><span className="gradient-bg grid h-10 w-10 place-items-center rounded-[14px] text-white"><BookOpen size={18}/></span><div><h1 className="text-2xl font-extrabold">New Program</h1><p className="mt-1 text-sm text-slate-500">Add a program to the catalog so agents can choose it in applications.</p></div></div>
    <form onSubmit={save} className="surface grid gap-5 rounded-2xl p-5 sm:grid-cols-2 sm:p-7">
      <Field label="Program Name" name="name" required placeholder="e.g. Computer Science"/>
      <Field label="University" name="university" required placeholder="Existing or new university"/>
      <Field label="Province" name="province" placeholder="e.g. Zhejiang"/>
      <Field label="City" name="city" placeholder="e.g. Hangzhou"/>
      <Field label="Degree" name="degree" placeholder="Bachelor, Master, PhD"/>
      <Field label="Teaching Language" name="language" placeholder="English or Chinese"/>
      <Field label="Duration" name="duration" placeholder="e.g. 4 years"/>
      <Field label="Program Category" name="category" placeholder="e.g. Undergraduate"/>
      <Field label="Application Deadline" name="deadline" type="date"/>
      <div className="grid grid-cols-[1fr_120px] gap-3"><Field label="Tuition per year" name="tuition" type="number" min="0" step="0.01" placeholder="Optional"/><Field label="Currency" name="currency" placeholder="CNY"/></div>
      {error && <p role="alert" className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Link href="/programs" className="rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold">Cancel</Link><button disabled={busy} className="gradient-bg rounded-full px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Create Program'}</button></div>
    </form>
  </>;
}

function Field({ label, name, type = 'text', required = false, ...props }: any) { return <label className="block"><span className="label">{label}{required ? ' *' : ''}</span><input name={name} type={type} required={required} className="field" {...props}/></label>; }

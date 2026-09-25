'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, GraduationCap } from 'lucide-react';
import { Pill } from '@/components/ui';
import { createClient } from '@/lib/supabase';

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>(); const [program, setProgram] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]); const [scholarships, setScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const db = createClient(); const { data, error } = await db.from('programs').select('*,universities(name)').eq('id', id).maybeSingle();
        if (error) throw error; if (!data) throw new Error('Program not found.');
        const [docs, aid] = await Promise.all([db.from('required_documents').select('id,name,sort_order').eq('program_id', id).order('sort_order'), db.from('scholarships').select('id,name,amount,description').eq('program_id', id)]);
        if (docs.error) throw docs.error; if (aid.error) throw aid.error;
        if (live) { setProgram(data); setDocuments(docs.data || []); setScholarships(aid.data || []); }
      } catch (e: any) { if (live) setError(e?.message || 'Unable to load this program.'); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [id]);
  if (loading) return <p className="p-8 text-sm text-slate-500">Loading program…</p>;
  if (error || !program) return <div><Link href="/programs" className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft size={14}/> Programs</Link><p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error || 'Program not found.'}</p></div>;
  return <><div className="surface relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-50 to-violet-50 p-7 dark:from-indigo-950/50 dark:to-purple-950/30"><Link href="/programs" className="relative mb-7 inline-flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft size={14}/> Programs</Link><div className="relative flex items-end gap-4"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm dark:bg-slate-900"><GraduationCap size={30}/></div><div><h1 className="max-w-3xl text-2xl font-extrabold sm:text-3xl">{program.name}</h1><p className="mt-1 text-sm text-slate-500">{program.universities?.name || 'University not specified'} · {[program.city, program.province].filter(Boolean).join(', ')}</p></div></div><div className="relative mt-5 flex gap-2">{program.degree && <Pill tone="purple">{program.degree}</Pill>}{program.category && <Pill tone="blue">{program.category}</Pill>}</div></div>
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]"><div className="space-y-5"><section className="surface rounded-2xl p-5"><h2 className="mb-4 font-bold">Scholarships</h2>{scholarships.length ? scholarships.map(x => <div key={x.id} className="border-t border-[var(--line)] py-3"><p className="text-sm font-semibold">{x.name}{x.amount ? ` · ${program.tuition_currency || 'CNY'} ${x.amount}` : ''}</p>{x.description && <p className="mt-1 text-xs text-slate-500">{x.description}</p>}</div>) : <p className="text-sm text-slate-500">No scholarships listed.</p>}</section><section className="surface rounded-2xl p-5"><h2 className="mb-4 font-bold">Required Documents</h2>{documents.length ? <div className="grid gap-2 sm:grid-cols-2">{documents.map((x, i) => <div key={x.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900"><span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">{String(i + 1).padStart(2, '0')}</span>{x.name}</div>)}</div> : <p className="text-sm text-slate-500">No required documents listed.</p>}</section></div><aside className="space-y-4"><section className="surface rounded-2xl p-5"><h2 className="mb-4 font-bold">Program Overview</h2>{[['Degree', program.degree], ['Language', program.language], ['Duration', program.duration], ['Intake', program.intake_season], ['Entrance exam', program.entrance_exam ? 'Required' : null], ['Academic requirement', program.academic_min_requirement], ['Language requirement', program.language_requirement]].filter(x => x[1]).map(x => <div key={String(x[0])} className="flex justify-between border-b border-[var(--line)] py-2.5 text-xs"><span className="text-slate-500">{x[0]}</span><b>{x[1]}</b></div>)}</section>{program.tuition_amount && <section className="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-950/30"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Annual Tuition</p><div className="mt-2 text-xl font-extrabold text-emerald-800 dark:text-emerald-300">{program.tuition_currency || 'CNY'} {program.tuition_amount} <span className="text-xs font-medium">/ year</span></div></section>}<section className="surface rounded-2xl p-5"><h2 className="mb-3 font-bold">Application Dates</h2>{program.application_opens_date ? <p className="flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={14}/> Opens: {program.application_opens_date}</p> : <p className="text-xs text-slate-500">Opening date not set.</p>}{program.application_deadline_date ? <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-rose-600"><CalendarDays size={14}/> Deadline: {program.application_deadline_date}</p> : <p className="mt-2 text-xs text-slate-500">Deadline not set.</p>}</section></aside></div>
  </>;
}

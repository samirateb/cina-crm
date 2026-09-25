'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, FileText, Pin, Shield, Sparkles, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useUpcomingDeadlines } from '@/hooks/useUpcomingDeadlines';
import { Pill, statusTone } from '@/components/ui';
import { useCrmRole } from '@/components/shell';

type AppRow = { id: string; application_status: string; student_first_name: string; student_last_name: string | null; university_id: string; program_id: string; };
function describeSupabaseError(error: any) {
  if (!error) return 'No error details were returned';
  const detail = {
    name: error.name ?? null,
    message: error.message ?? null,
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    status: error.status ?? null,
    statusText: error.statusText ?? null,
    keys: Object.keys(error),
    raw: (() => { try { return JSON.stringify(error); } catch { return String(error); } })(),
  };
  return JSON.stringify(detail);
}
const modules = [
  ['My Students', 'View and manage student records.', '/students', Users, 'from-teal-500 to-cyan-500'],
  ['My Applications', 'Track applications through the admission process.', '/applications', FileText, 'from-pink-500 to-rose-500'],
  ['Programs', 'Browse available programs and application deadlines.', '/programs', BookOpen, 'from-blue-500 to-indigo-500'],
  ['Sub Agencies', 'Manage partner agencies and agent access.', '/sub-agencies', Shield, 'from-amber-500 to-orange-500'],
];

export default function Dashboard() {
  const { role } = useCrmRole(); const isAdmin = role === 'super_admin';
  const { programs: deadlinePrograms } = useUpcomingDeadlines();
  const [counts, setCounts] = useState({ students: 0, applications: 0, agencies: 0 });
  const [recent, setRecent] = useState<Array<AppRow & { university: string; program: string }>>([]);
  const [pipeline, setPipeline] = useState<Record<string, number>>({}); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const db = createClient();
        const { data: { user }, error: authError } = await db.auth.getUser();
        if (authError) throw new Error(`Supabase Auth failed: ${authError.message}`);
        if (!user) throw new Error('No authenticated Supabase user was found. Sign out and sign in again.');
        const { data: profile, error: profileError } = await db.from('profiles').select('role,agency_id').eq('id', user.id).maybeSingle();
        if (profileError) throw new Error(`CINA profile query failed: ${profileError.message} (${profileError.code || 'no code'})`);
        if (!profile) throw new Error('This Supabase user has no CINA CRM profile. Apply the profile setup migration in Supabase.');
        if (isAdmin && profile.role !== 'super_admin') throw new Error(`This login is recognized as the CINA admin, but its database profile role is “${profile.role}”. Apply the admin profile migration in Supabase.`);
        const [s, a, ag, apps] = await Promise.all([
          db.from('students_visible').select('id', { count: 'exact' }).limit(1),
          db.from('applications_visible').select('id', { count: 'exact' }).limit(1),
          isAdmin ? db.from('sub_agencies').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0, error: null }),
          db.from('applications_visible').select('id,application_status,student_first_name,student_last_name,university_id,program_id,created_at').order('created_at', { ascending: false }).limit(5),
        ]);
        if (s.error) throw new Error(`Students query failed: ${describeSupabaseError(s.error)}`);
        if (a.error) throw new Error(`Applications count query failed: ${describeSupabaseError(a.error)}`);
        if (ag.error) throw new Error(`Sub-agencies query failed: ${describeSupabaseError(ag.error)}`);
        if (apps.error) throw new Error(`Recent applications query failed: ${describeSupabaseError(apps.error)}`);
        const [universities, programs] = await Promise.all([db.from('universities').select('id,name'), db.from('programs').select('id,name')]);
        if (universities.error) throw new Error(`Universities query failed: ${describeSupabaseError(universities.error)}`);
        if (programs.error) throw new Error(`Programs query failed: ${describeSupabaseError(programs.error)}`);
        const um = Object.fromEntries((universities.data || []).map((x: any) => [x.id, x.name])); const pm = Object.fromEntries((programs.data || []).map((x: any) => [x.id, x.name]));
        const recentRows = (apps.data || []).map((x: any) => ({ ...x, university: um[x.university_id] || '—', program: pm[x.program_id] || '—' }));
        if (live) {
          setCounts({ students: s.count || 0, applications: a.count || 0, agencies: ag.count || 0 });
          setRecent(recentRows); setPipeline((apps.data || []).reduce((acc: Record<string, number>, x: any) => ({ ...acc, [x.application_status]: (acc[x.application_status] || 0) + 1 }), {}));
        }
      } catch (e: any) { if (live) setError(e?.message || `Supabase dashboard request failed: ${String(e)}`); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [isAdmin]);

  const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 60);
  const deadlines = deadlinePrograms.filter(p => { const d = new Date(`${p.deadline}T00:00:00`); return d >= now && d <= end; }).sort((a, b) => a.deadline.localeCompare(b.deadline));
  const stats = [{ label: 'STUDENTS', value: counts.students, icon: Users, tone: 'teal' }, { label: 'APPLICATIONS', value: counts.applications, icon: FileText, tone: 'pink' }, ...(isAdmin ? [{ label: 'SUB AGENCIES', value: counts.agencies, icon: Shield, tone: 'amber' }] : [])];
  const statuses = [['New', 'new', 'bg-indigo-500'], ['Under review', 'under_review', 'bg-blue-500'], ['Fee paid', 'application_fee_paid', 'bg-amber-500'], ['Admitted', 'admitted', 'bg-emerald-500'], ['Closed / rejected', 'closed', 'bg-rose-400']];
  return <>
    <section className="relative mb-8 overflow-hidden rounded-[24px] border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-6 dark:border-indigo-950 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/30 sm:p-8"><div className="absolute -right-12 -top-24 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20"/><div className="relative flex flex-wrap items-center justify-between gap-5"><div><div className="mb-4 flex items-center gap-3"><span className="gradient-bg grid h-10 w-10 place-items-center rounded-[14px] text-white"><Sparkles size={18}/></span><span className="text-xs font-bold uppercase tracking-[.15em] text-indigo-600">YOUR WORKSPACE</span></div><h1 className="text-3xl font-extrabold tracking-[-.04em] sm:text-[38px]">Dashboard</h1><p className="mt-2 text-sm text-slate-500">Welcome to your CINA Study in China workspace.</p></div><div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"><CalendarDays size={15} className="text-indigo-600"/>{now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div></section>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    <div className="mb-8 grid gap-4 sm:grid-cols-3">{stats.map(s => <Stat key={s.label} label={s.label} value={loading ? '—' : s.value} icon={s.icon} tone={s.tone}/>)}</div>
    <section className="mb-9"><div className="mb-4 flex items-end justify-between"><div><h2 className="flex items-center gap-2 text-lg font-extrabold"><span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950"><CalendarDays size={16}/></span>Upcoming Deadlines</h2><p className="mt-1 text-xs text-slate-500">Program application closing dates in the next 60 days</p></div><Link href="/programs/deadline-calendar" className="flex items-center gap-1 text-xs font-bold text-indigo-600">View Calendar <ArrowUpRight size={14}/></Link></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{deadlines.length ? deadlines.slice(0, 3).map(p => <div key={p.id || p.name} className="surface flex items-center gap-3 rounded-2xl p-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950"><CalendarDays size={18}/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{p.name}</div><div className="mt-1 text-xs text-slate-500">{p.uni} · Closes {new Date(`${p.deadline}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div></div><Pill tone="amber">{Math.ceil((new Date(`${p.deadline}T00:00:00`).getTime() - now.getTime()) / 86400000)}d</Pill></div>) : <div className="surface col-span-full rounded-2xl p-8 text-center text-sm text-slate-500">No programs closing in the next 60 days.</div>}</div></section>
    <section><div className="mb-4"><h2 className="text-lg font-extrabold">CRM Modules</h2><p className="mt-1 text-xs text-slate-500">Open a workspace area</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{modules.filter(([, , href]) => isAdmin || href === '/students' || href === '/applications').map(([title, desc, href, Icon, color]: any) => <Module key={title} title={title} desc={desc} href={href} Icon={Icon} color={color}/>)}</div></section>
    <section className="mt-9 grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><div className="surface rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Recent applications</h2><p className="mt-1 text-xs text-slate-500">Latest saved application records</p></div><Link className="text-xs font-bold text-indigo-600" href="/applications">View all</Link></div>{recent.length ? recent.map(a => <div key={a.id} className="flex items-center gap-3 border-t border-[var(--line)] py-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">{a.student_first_name?.[0]}{a.student_last_name?.[0] || ''}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{[a.student_first_name, a.student_last_name].filter(Boolean).join(' ')}</div><div className="truncate text-xs text-slate-500">{a.university} · {a.program}</div></div><Pill tone={statusTone(a.application_status)}>{a.application_status.replaceAll('_', ' ')}</Pill></div>) : <p className="border-t border-[var(--line)] py-8 text-center text-sm text-slate-500">{loading ? 'Loading…' : 'No applications yet.'}</p>}</div><div className="surface rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Application pipeline</h2><p className="mt-1 text-xs text-slate-500">Status counts in the recent applications</p></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950"><BookOpen size={17}/></div></div>{statuses.map(([label, key, color]) => { const count = key === 'closed' ? (pipeline.rejected || 0) + (pipeline.cancelled || 0) + (pipeline.no_seats || 0) : pipeline[key] || 0; const total = Object.values(pipeline).reduce((a, b) => a + b, 0); return <div key={key} className="mb-4"><div className="mb-1.5 flex justify-between text-xs"><span className="text-slate-500">{label}</span><b>{count}</b></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${color}`} style={{ width: `${total ? count / total * 100 : 0}%` }}/></div></div>; })}</div></section>
  </>;
}

function Stat({ label, value, icon: Icon, tone }: any) { const colors: any = { teal: 'bg-teal-50 text-teal-600 dark:bg-teal-950', pink: 'bg-pink-50 text-pink-600 dark:bg-pink-950', amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950' }; return <div className="surface rounded-2xl p-5"><div className="flex items-start justify-between"><span className="text-[10px] font-bold tracking-[.12em] text-slate-400">{label}</span><span className={`grid h-9 w-9 place-items-center rounded-xl ${colors[tone]}`}><Icon size={17}/></span></div><div className="mt-3 text-[30px] font-extrabold tracking-tight">{value}</div><div className="mt-1 text-xs text-slate-500">Live Supabase records</div></div>; }
function Module({ title, desc, href, Icon, color }: any) { const [pinned, setPinned] = useState(false); return <div className="surface soft-shadow group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><div className="mb-4 flex items-center justify-between"><div className={`grid h-11 w-11 place-items-center rounded-[15px] bg-gradient-to-br ${color} text-white shadow-sm`}><Icon size={19}/></div><button aria-label={pinned ? 'Unpin module' : 'Pin module'} onClick={() => setPinned(!pinned)} className={`rounded-lg p-2 transition ${pinned ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-500'}`}><Pin size={15} fill={pinned ? 'currentColor' : 'none'}/></button></div><h3 className="font-bold">{title}</h3><p className="mt-1.5 min-h-10 text-xs leading-5 text-slate-500">{desc}</p><Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600">Open module <ArrowRight size={14}/></Link></div>; }

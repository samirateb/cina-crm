'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { Heading, Pill } from '@/components/ui';
import { createClient } from '@/lib/supabase';

export default function Team() {
  const { id } = useParams<{ id: string }>(); const [agency, setAgency] = useState<any>(null); const [members, setMembers] = useState<any[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const db = createClient(); const [a, p] = await Promise.all([db.from('sub_agencies').select('id,name').eq('id', id).maybeSingle(), db.from('profiles').select('id,full_name,role').eq('agency_id', id).order('full_name')]);
        if (a.error) throw a.error; if (p.error) throw p.error; if (!a.data) throw new Error('Sub Agency not found.');
        if (live) { setAgency(a.data); setMembers(p.data || []); }
      } catch (e: any) { if (live) setError(e?.message || 'Unable to load team.'); }
      finally { if (live) setLoading(false); }
    })(); return () => { live = false; };
  }, [id]);
  return <><Link href="/sub-agencies" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><ArrowLeft size={15}/> All Sub Agencies</Link><Heading icon={Users} title={agency?.name || 'Sub Agency'} gradient="Team" subtitle="Users assigned to this partner agency."/><div className="surface overflow-hidden rounded-2xl">{loading ? <p className="p-8 text-sm text-slate-500">Loading members…</p> : error ? <p role="alert" className="p-5 text-sm text-rose-700">{error}</p> : members.length ? members.map(m => <div key={m.id} className="flex items-center gap-3 border-b border-[var(--line)] p-4"><div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950">{m.full_name?.split(/\s+/).map((x: string) => x[0]).slice(0, 2).join('') || 'U'}</div><div className="flex-1"><div className="text-sm font-semibold">{m.full_name || 'CINA user'}</div></div><Pill tone={m.role === 'super_admin' ? 'purple' : 'blue'}>{m.role === 'super_admin' ? 'Administrator' : 'Agency viewer'}</Pill></div>) : <p className="p-8 text-center text-sm text-slate-500">No users are assigned to this sub agency yet.</p>}</div></>;
}

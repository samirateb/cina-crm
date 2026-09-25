'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, Clock3, FileText, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase';

type Notice = { id: string; actor_id: string | null; actor_role: string | null; type: string; category: string | null; message: string; related_entity_type: string | null; related_entity_id: string | null; recipient_id: string; read_at: string | null; snoozed_until: string | null; created_at: string; actor_name?: string };

export default function NotificationsPage() {
  const [rows, setRows] = useState<Notice[]>([]); const [query, setQuery] = useState(''); const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const db = createClient(); const { data: { user } } = await db.auth.getUser();
        if (!user) throw new Error('Please sign in again to view notifications.');
        const { data, error } = await db.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false });
        if (error) throw error;
        const actorIds = Array.from(new Set((data || []).map((n: any) => n.actor_id).filter(Boolean)));
        const actors = actorIds.length ? await db.from('profiles').select('id,full_name').in('id', actorIds) : { data: [] };
        const names = Object.fromEntries((actors.data || []).map((p: any) => [p.id, p.full_name]));
        if (live) setRows((data || []).map((n: any) => ({ ...n, actor_name: names[n.actor_id] || n.actor_role || 'CINA team' })));
      } catch (e: any) { if (live) setError(e?.message || 'Could not load notifications.'); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, []);

  const visible = useMemo(() => rows.filter(n => {
    const matchesText = `${n.message} ${n.actor_name} ${n.category}`.toLowerCase().includes(query.toLowerCase());
    const isSnoozed = Boolean(n.snoozed_until && new Date(n.snoozed_until) > new Date());
    return matchesText && (filter === 'All' || (filter === 'Unread' && !n.read_at) || (filter === 'Snoozed' && isSnoozed) || n.category?.toLowerCase() === filter.toLowerCase());
  }), [rows, query, filter]);

  async function update(id: string, patch: Partial<Notice>) {
    setBusy(true); setError('');
    try { const { error } = await createClient().from('notifications').update(patch).eq('id', id); if (error) throw error; setRows(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n)); }
    catch (e: any) { setError(e?.message || 'Unable to update notification.'); }
    finally { setBusy(false); }
  }
  async function markAllRead() {
    const unread = rows.filter(n => !n.read_at); if (!unread.length) return;
    setBusy(true); setError(''); const now = new Date().toISOString();
    try { const db = createClient(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Please sign in again.');
      const { error } = await db.from('notifications').update({ read_at: now }).eq('recipient_id', user.id).is('read_at', null); if (error) throw error;
      setRows(prev => prev.map(n => n.read_at ? n : { ...n, read_at: now }));
    } catch (e: any) { setError(e?.message || 'Unable to mark notifications as read.'); } finally { setBusy(false); }
  }

  const filters = ['All', 'Unread', 'Snoozed', 'Application', 'Note', 'Document'];
  return <>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-3 flex items-center gap-3"><span className="gradient-bg grid h-10 w-10 place-items-center rounded-[14px] text-white"><Bell size={18}/></span><span className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">ACTIVITY CENTER</span></div><h1 className="text-[30px] font-extrabold tracking-tight">Notifications</h1><p className="mt-1 text-sm text-slate-500">Updates delivered to your CINA account.</p></div><button disabled={busy || !rows.some(n => !n.read_at)} onClick={markAllRead} className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-xs font-bold disabled:opacity-50"><CheckCheck size={15}/> Mark all as read</button></div>
    <div className="mb-4 flex flex-wrap items-center gap-2"><label className="relative min-w-[200px] flex-1 sm:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notifications..." className="field !py-2.5 !pl-9 !text-sm"/></label><div className="flex flex-wrap gap-1.5">{filters.map(x => <button onClick={() => setFilter(x)} key={x} className={`rounded-full px-3 py-2 text-[10px] font-bold ${filter === x ? 'bg-indigo-600 text-white' : 'border border-[var(--line)] text-slate-500'}`}>{x}{x === 'Unread' && <span className="ml-1 rounded-full bg-rose-100 px-1.5 text-rose-700">{rows.filter(n => !n.read_at).length}</span>}</button>)}</div></div>
    {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    <div className="surface overflow-hidden rounded-2xl">{loading ? <p className="p-10 text-center text-sm text-slate-500">Loading notifications…</p> : visible.length ? visible.map(n => <div key={n.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5"><div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">{n.actor_name?.split(/\s+/).map(x => x[0]).slice(0, 2).join('') || 'C'}{!n.read_at && <i className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-[var(--card)]"/>}</div><div className="min-w-[220px] flex-1"><p className="text-sm"><b>{n.actor_name}</b> <span className="text-slate-700 dark:text-slate-200">{n.message}</span></p><div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}<span>·</span><span className="flex items-center gap-1 rounded-full border border-[var(--line)] px-2 py-1 font-bold tracking-wide"><FileText size={11}/>{n.category || n.type}</span></div></div><div className="flex items-center gap-2"><button disabled={busy} onClick={() => update(n.id, { snoozed_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })} title="Snooze for 24 hours" aria-label="Snooze notification" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-slate-400 hover:text-indigo-600"><Clock3 size={14}/></button>{!n.read_at && <button disabled={busy} onClick={() => update(n.id, { read_at: new Date().toISOString() })} title="Mark as read" aria-label="Mark notification as read" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-slate-400 hover:text-emerald-600"><Check size={15}/></button>}{n.related_entity_type && <Link href={n.related_entity_type === 'application' ? '/applications' : '/students'} className="rounded-lg bg-indigo-600 px-3 py-2 text-[9px] font-bold tracking-wider text-white">VIEW</Link>}</div></div>) : <div className="p-10 text-center text-sm text-slate-500">{rows.length ? 'No notifications match this filter.' : 'No notifications yet.'}</div>}</div>
  </>;
}

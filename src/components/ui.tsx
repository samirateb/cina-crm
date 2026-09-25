import { ReactNode } from 'react';

export function Heading({ icon: Icon, title, gradient, subtitle, action, eyebrow }: any) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div>
    {eyebrow && <p className="mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">{eyebrow}</p>}
    <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{Icon && <span className="gradient-bg grid h-10 w-10 place-items-center rounded-[14px] text-white"><Icon size={19}/></span>}{title} {gradient && <span className="gradient-text">{gradient}</span>}</h1>
    {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
  </div>{action}</div>;
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: string }) {
  const colors: Record<string, string> = { slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300', purple: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300', green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', red: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${colors[tone] || colors.slate}`}>{children}</span>;
}

export function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s.includes('admit') || s.includes('jw sent')) return 'green';
  if (s.includes('fee') || s.includes('review')) return 'amber';
  if (s.includes('reject') || s.includes('cancel') || s.includes('seat')) return 'red';
  return 'blue';
}

export function FormField({ label, children, wide, hint }: any) {
  return <label className={`block ${wide ? 'sm:col-span-2' : ''}`}><span className="label">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}</label>;
}

export function FormSection({ title, icon: Icon, tone = 'blue', children }: any) {
  const colors: Record<string, string> = { blue: 'bg-sky-50 text-sky-600 dark:bg-sky-950', purple: 'bg-violet-50 text-violet-600 dark:bg-violet-950', amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950' };
  return <section className="surface soft-shadow overflow-hidden rounded-2xl"><div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4"><span className={`grid h-9 w-9 place-items-center rounded-xl ${colors[tone] || colors.blue}`}>{Icon && <Icon size={17}/>}</span><h2 className="text-sm font-bold">{title}</h2></div><div className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2">{children}</div></section>;
}

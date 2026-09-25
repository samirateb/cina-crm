'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';

export default function Login() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<'sign-in' | 'reset'>('sign-in');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('profile') === 'missing') {
      setMessage('You are signed in, but this account has no CINA CRM profile. Ask your CINA administrator to assign your role, then sign in again.');
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');

    try {
      if (mode === 'reset') {
        const supabase = createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/login`,
        });
        if (error) throw error;
        setSuccess(true);
        setMessage('Password reset instructions have been sent to your email.');
        return;
      }

      // Run password auth in the browser: this environment's server-side fetch
      // to Supabase can fail, while the browser client can reach the project.
      const supabase = createClient();
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!signInData.session || !signInData.user) {
        throw new Error('Supabase did not create a sign-in session. Please try again.');
      }

      // Do not wait on a separate profiles query before navigating.
      location.replace('/dashboard');
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not sign in. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(mode: 'sign-in' | 'reset') {
    setMode(mode);
    setMessage('');
    setSuccess(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 text-white">
      <div className="pointer-events-none absolute -left-24 -top-28 h-[420px] w-[420px] rounded-full bg-transparent blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-160px] right-[-80px] h-[430px] w-[430px] rounded-full bg-transparent blur-[140px]" />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-7 flex items-center justify-center gap-2">
          <img src="/cina-logo.svg" alt="CINA" className="h-9 w-9 object-contain invert" />
          <span className="text-lg font-extrabold tracking-wide">CINA <span className="text-xs font-medium text-slate-400">STUDY IN CHINA</span></span>
        </div>
        <section className="rounded-[26px] border border-[#2f3336] bg-black p-7 shadow-2xl shadow-indigo-950/30 sm:p-9">
          <div className="mb-5 flex justify-center">
            <img src="/cina-logo.svg" alt="" aria-hidden="true" className="h-12 w-12 object-contain invert" />
          </div>
          <h1 className="mx-auto flex w-full justify-center gap-2 text-center text-[30px] font-extrabold leading-tight tracking-tight">
            {mode === 'sign-in' ? <>Welcome <span className="text-sky-400">back</span></> : 'Reset password'}
          </h1>
          <p className="mx-auto mb-7 mt-2 max-w-[290px] text-center text-sm leading-6 text-slate-400">
            {mode === 'sign-in' ? 'Enter your credentials to access your dashboard.' : 'Enter your email and we’ll send you a secure reset link.'}
          </p>
          {message && <div role={success ? 'status' : 'alert'} className={`mb-4 rounded-xl border px-3 py-2.5 text-xs ${success ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>{message}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-[10px] font-bold uppercase tracking-[.13em] text-slate-400">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="email" name="email" required type="email" autoComplete="username" placeholder="you@agency.com" className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10" />
              </div>
            </div>

            {mode === 'sign-in' && <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-400">Password</label>
                <button type="button" onClick={() => switchMode('reset')} className="text-xs font-semibold text-sky-300 hover:text-sky-200">Forgot password?</button>
              </div>
              <div className="relative">
                <LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="password" name="password" required type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10" />
                <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>}

            <button disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60">
              {busy ? <LoaderCircle size={17} className="animate-spin" /> : mode === 'sign-in' ? 'Sign in' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5 text-center text-xs text-slate-500">
            {mode === 'reset' ? <button type="button" onClick={() => switchMode('sign-in')} className="inline-flex items-center gap-1 font-semibold text-sky-300"><ArrowLeft size={13} /> Back to sign in</button> : <>Access is provisioned by your CINA administrator.<br /><span className="mt-1 inline-block">New to CINA? Contact your administrator.</span></>}
          </div>
        </section>
        <p className="mt-5 text-center text-[10px] text-slate-600">SECURE ACCESS · CINA STUDY IN CHINA</p>
      </div>
    </main>
  );
}

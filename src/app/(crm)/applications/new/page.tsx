'use client';
import Link from 'next/link';
import { ArrowLeft,FilePlus2 } from 'lucide-react';
import { Heading } from '@/components/ui';
import { ApplicationForm } from '@/components/forms';
export default function NewApplication(){return <><Link href="/applications" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15}/> Back to Applications</Link><Heading eyebrow="NEW ENTRY" icon={FilePlus2} title="New" gradient="Application" subtitle="Create a new application record and select the student's program."/><ApplicationForm/></>}

'use client';
import Link from 'next/link';
import { ArrowLeft,UserPlus } from 'lucide-react';
import { Heading } from '@/components/ui';
import { StudentForm } from '@/components/forms';
export default function NewStudent(){return <><Link href="/students" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15}/> Back to Students</Link><Heading eyebrow="ONBOARDING" icon={UserPlus} title="New Student" gradient="Profile" subtitle="Capture personal and academic details to start the application journey."/><StudentForm/></>}

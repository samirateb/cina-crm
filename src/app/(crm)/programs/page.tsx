'use client';
import { BookOpen, Plus } from 'lucide-react';
import { Heading } from '@/components/ui';
import { Toolbar,DataTable } from '@/components/data-table';
import { useCrmRole } from '@/components/shell';
export default function Programs(){const {role}=useCrmRole();return <><Heading icon={BookOpen} title="Programs" gradient="Directory" subtitle="Browse study programs and application requirements." action={role==='super_admin'?<a href="/programs/new" className="gradient-bg flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white"><Plus size={15}/> New Program</a>:undefined}/><Toolbar placeholder="Search programs..."/><DataTable type="programs"/></>}

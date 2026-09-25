'use client';
import Link from 'next/link';
import { Heading } from '@/components/ui';
import { Toolbar,DataTable } from '@/components/data-table';
import { Users } from 'lucide-react';
import { useCrmRole } from '@/components/shell';
export default function StudentsPage(){const {role}=useCrmRole();return <><Heading icon={Users} title="My" gradient="Students" subtitle="Manage and track your agency’s student applications."/><Toolbar placeholder="Search students..." href={role?'/students/new':undefined} action="NEW STUDENT"/><DataTable type="students"/></>}

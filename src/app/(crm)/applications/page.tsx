'use client';
import { Heading } from '@/components/ui';
import { Toolbar,DataTable } from '@/components/data-table';
import { Files } from 'lucide-react';
import { useCrmRole } from '@/components/shell';
export default function ApplicationsPage(){const {role}=useCrmRole();return <><Heading icon={Files} title="My" gradient="Applications" subtitle="Browse and manage applications assigned to you or your agency."/><Toolbar placeholder="Search applications..." href={role?'/applications/new':undefined} action="NEW APPLICATION"/><DataTable type="applications"/></>}

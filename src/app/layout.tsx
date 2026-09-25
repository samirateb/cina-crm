import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'CINA Study in China · CRM', description:'Student recruitment and application management for CINA Study in China.', icons:'/cina-logo.svg' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><body>{children}</body></html>; }

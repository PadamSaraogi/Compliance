"use client";

import { usePathname } from 'next/navigation';

export default function Topbar({ user }: { user: any }) {
  const pathname = usePathname();
  
  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/filings')) return 'Filings';
    if (pathname.startsWith('/reports')) return 'Reports';
    if (pathname.startsWith('/admin')) return 'Admin Panel';
    return 'Compliance Tracker';
  };

  return (
    <header className="h-14 bg-white border-b border-[var(--color-border)] fixed top-0 left-[240px] right-0 flex items-center justify-between px-8 z-10 w-[calc(100%-240px)]">
      <h2 className="text-lg font-serif text-[var(--color-navy)]">{getPageTitle()}</h2>
      <div className="text-sm text-[var(--color-muted)]">
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
      </div>
    </header>
  );
}

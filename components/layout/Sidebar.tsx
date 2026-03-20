"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, BarChart2, Settings, LogOut } from 'lucide-react';

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['ceo', 'admin', 'accountant'] },
    { name: 'Filings', href: '/filings', icon: FileText, roles: ['ceo', 'admin', 'accountant'] },
    { name: 'Reports', href: '/reports', icon: BarChart2, roles: ['ceo', 'admin', 'accountant'] },
    { name: 'Admin', href: '/admin', icon: Settings, roles: ['admin'] },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside className="w-[240px] bg-[var(--color-navy)] text-white h-screen fixed top-0 left-0 flex flex-col z-20">
      <div className="h-14 flex items-center px-6 border-b border-[#1a3260]">
        <h1 className="font-serif text-xl text-white tracking-wide">COMPLIANCE</h1>
      </div>
      
      <nav className="flex-1 py-6 flex flex-col gap-1">
        {navItems.filter(item => item.roles.includes(user?.role)).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center px-6 py-3 transition-colors ${isActive ? 'bg-[var(--color-navy-light)] border-l-4 border-white text-white' : 'text-slate-300 hover:bg-[var(--color-navy-light)] hover:text-white border-l-4 border-transparent'}`}
            >
              <item.icon size={20} className="mr-3" />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-[#1a3260]">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full bg-[#1a3260] flex items-center justify-center text-sm font-bold mr-3 uppercase">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role || 'Role'}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center text-sm text-slate-400 hover:text-white transition-colors w-full"
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </button>
      </div>
    </aside>
  );
}

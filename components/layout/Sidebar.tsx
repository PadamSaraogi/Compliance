"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, FileText, BarChart2, Settings, LogOut, Building2, ChevronDown } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [activeCompany, setActiveCompany] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['ceo', 'admin', 'accountant'] },
    { name: 'Filings', href: '/filings', icon: FileText, roles: ['ceo', 'admin', 'accountant'] },
    { name: 'Companies', href: '/companies', icon: Building2, roles: ['admin'] },
    { name: 'Reports', href: '/reports', icon: BarChart2, roles: ['ceo', 'admin', 'accountant'] },
    { name: 'Admin', href: '/admin', icon: Settings, roles: ['admin'] },
  ];

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(d => {
      if (d.companies) {
        setCompanies(d.companies);
        const saved = localStorage.getItem('activeCompanyId');
        const found = d.companies.find((c: any) => c.id === saved);
        setActiveCompany(found || null);
      }
    });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectCompany = (company: any | null) => {
    setActiveCompany(company);
    setDropdownOpen(false);
    if (company) {
      localStorage.setItem('activeCompanyId', company.id);
    } else {
      localStorage.removeItem('activeCompanyId');
    }
    // Reload current page to apply new company filter
    router.refresh();
    window.dispatchEvent(new CustomEvent('companyChanged', { detail: company?.id || 'all' }));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside className="w-[240px] bg-[var(--color-navy)] text-white h-screen fixed top-0 left-0 flex flex-col z-20">
      <div className="h-14 flex items-center px-6 border-b border-[#1a3260]">
        <h1 className="font-serif text-xl text-white tracking-wide">COMPLIANCE</h1>
      </div>

      {/* Company Switcher */}
      <div className="px-3 py-3 border-b border-[#1a3260]" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#1a3260] hover:bg-[#243f7a] transition-colors text-left"
        >
          <div
            className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: activeCompany?.color || '#4b5563' }}
          >
            {activeCompany ? activeCompany.name.charAt(0) : '★'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold truncate leading-tight">
              {activeCompany ? activeCompany.name : 'All Companies'}
            </p>
            <p className="text-[10px] text-slate-400 truncate leading-tight">
              {activeCompany ? activeCompany.entity_type : `${companies.length} entities`}
            </p>
          </div>
          <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="mt-1 bg-[#111d38] rounded-lg overflow-hidden shadow-xl border border-[#243f7a] max-h-64 overflow-y-auto">
            <button
              onClick={() => selectCompany(null)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#1a3260] transition-colors text-left ${!activeCompany ? 'bg-[#1a3260]' : ''}`}
            >
              <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-[9px] font-bold">★</div>
              <div>
                <p className="text-xs font-medium">All Companies</p>
                <p className="text-[10px] text-slate-400">Aggregate view</p>
              </div>
            </button>
            {companies.map(co => (
              <button
                key={co.id}
                onClick={() => selectCompany(co)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#1a3260] transition-colors text-left ${activeCompany?.id === co.id ? 'bg-[#1a3260]' : ''}`}
              >
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                  style={{ backgroundColor: co.color }}
                >
                  {co.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium truncate">{co.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{co.entity_type}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <nav className="flex-1 py-4 flex flex-col gap-1">
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

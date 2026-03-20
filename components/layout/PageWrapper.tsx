"use client";

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useRouter, usePathname } from 'next/navigation';

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-[var(--color-text)] animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-row">
      <Sidebar user={user} />
      <div className="flex-1 ml-[240px] flex flex-col w-[calc(100%-240px)]">
        <Topbar user={user} />
        <main className="flex-1 mt-14 p-8 w-full mx-auto max-w-[1280px]">
          {children}
        </main>
      </div>
    </div>
  );
}

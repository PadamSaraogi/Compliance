"use client";

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { differenceInDays } from 'date-fns';
import { Search, Filter, MoreVertical, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function FilingsPage() {
  const [filings, setFilings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchFilings = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (statusFilter !== 'All') query.append('status', statusFilter);
      
      const res = await fetch(`/api/filings?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFilings(data.filings || []);
      }
      
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        setCurrentUser((await userRes.json()).user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilings();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilings();
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (currentUser?.role === 'ceo') return; // Read-only
    try {
      await fetch(`/api/filings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchFilings();
    } catch (err) {
      console.error(err);
    }
  };

  const getDaysLeftBadge = (deadline: string, status: string) => {
    if (status === 'Done') return <Badge variant="neutral">Done</Badge>;
    if (status === 'NA') return <Badge variant="neutral">N/A</Badge>;
    
    const days = differenceInDays(new Date(deadline), new Date());
    if (days < 0) return <Badge variant="danger">Overdue</Badge>;
    if (days <= 3) return <Badge variant="danger">{days} days</Badge>;
    if (days <= 7) return <Badge variant="warning">{days} days</Badge>;
    if (days <= 30) return <Badge variant="info">{days} days</Badge>;
    return <Badge variant="outline">{days} days</Badge>;
  };

  return (
    <PageWrapper>
      <div className="space-y-6 animate-fade-in">
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400" />
            <Input 
              placeholder="Search filings..." 
              className="pl-9 bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Button type="submit" size="sm" className="ml-2">Search</Button>
          </form>
          
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                className="h-8 md:h-9 text-sm rounded-md border border-[var(--color-border)] px-3 outline-none bg-white"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            
            <Button variant="secondary" size="sm">Export CSV</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-500">Loading filings...</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-slate-50 text-sm font-medium text-[var(--color-muted)]">
                      <th className="p-4 font-medium">Filing Name</th>
                      <th className="p-4 font-medium">Category</th>
                      <th className="p-4 font-medium">Deadline</th>
                      <th className="p-4 font-medium">Days Left</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Assigned To</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {filings.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors text-sm">
                        <td className="p-4 font-medium text-[var(--color-navy)]">
                          <Link href={`/filings/${f.id}`} className="hover:underline">
                            {f.title}
                          </Link>
                          {f.period && <div className="text-xs font-normal text-slate-500 mt-1">{f.period}</div>}
                        </td>
                        <td className="p-4">
                          <Badge 
                            style={{ backgroundColor: f.master_filings?.compliance_categories?.color || '#94a3b8' }}
                            className="text-white bg-slate-400"
                          >
                            {f.master_filings?.compliance_categories?.name || 'Other'}
                          </Badge>
                        </td>
                        <td className="p-4 whitespace-nowrap">{new Date(f.deadline).toLocaleDateString('en-IN')}</td>
                        <td className="p-4">{getDaysLeftBadge(f.deadline, f.status)}</td>
                        <td className="p-4">
                          {currentUser?.role === 'ceo' ? (
                            <span className="text-sm font-medium">{f.status}</span>
                          ) : (
                            <select 
                              className="text-xs font-medium bg-transparent border-b border-dashed border-slate-300 pb-0.5 outline-none cursor-pointer hover:border-slate-500 transition-colors"
                              value={f.status}
                              onChange={(e) => updateStatus(f.id, e.target.value)}
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Done">Done</option>
                              <option value="Overdue">Overdue</option>
                              <option value="NA">N/A</option>
                            </select>
                          )}
                        </td>
                        <td className="p-4 max-w-[150px] truncate text-slate-600">
                          {f.users?.full_name || 'Unassigned'}
                        </td>
                        <td className="p-4 text-right">
                          <Link href={`/filings/${f.id}`}>
                            <Button variant="ghost" size="sm" className="h-8">Details</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {filings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-[var(--color-muted)] bg-white">
                          No filings found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </PageWrapper>
  );
}

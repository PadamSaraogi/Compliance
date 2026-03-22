"use client";

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { CategoryChart } from '@/components/dashboard/CategoryChart';
import { HeatmapCalendar } from '@/components/dashboard/HeatmapCalendar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AddComplianceModal } from '@/components/dashboard/AddComplianceModal';
import { Plus } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeCompanyId = localStorage.getItem('activeCompanyId');
      const query = activeCompanyId ? `?company_id=${activeCompanyId}` : '';
      
      const [statsRes, heatmapRes, upcomingRes, userRes] = await Promise.all([
        fetch(`/api/dashboard/stats${query}`),
        fetch(`/api/dashboard/heatmap${query}`),
        fetch(`/api/dashboard/upcoming${query}`),
        fetch('/api/auth/me')
      ]);
      if (statsRes.status === 401 || heatmapRes.status === 401 || upcomingRes.status === 401 || userRes.status === 401) {
        window.location.href = '/login?from=/dashboard';
        return;
      }
      
      if (!statsRes.ok || !heatmapRes.ok || !upcomingRes.ok) {
        throw new Error('Failed to load dashboard data');
      }

      setStats(await statsRes.json());
      setHeatmap(await heatmapRes.json());
      setUpcoming((await upcomingRes.json()).upcoming);
      if (userRes.ok) setUser((await userRes.json()).user);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for company switching in the sidebar
    const handleCompanyChange = () => fetchData();
    window.addEventListener('companyChanged', handleCompanyChange);
    return () => window.removeEventListener('companyChanged', handleCompanyChange);
  }, []);

  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-xl" />)}
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 h-80 bg-white rounded-xl" />
            <div className="col-span-2 h-80 bg-white rounded-xl" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error || !stats || !heatmap || !upcoming) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
          <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-100 max-w-md text-center">
            <h3 className="font-bold mb-2">Notice</h3>
            <p>{error || "We couldn't load your dashboard data right now."}</p>
          </div>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6 animate-fade-in transition-all">
        
        {/* Header with Title and Add Button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-serif text-[var(--color-navy)]">Performance Overview</h1>
          {(user?.role === 'admin' || user?.role === 'accountant') && (
            <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
              <Plus size={18} />
              Add Compliance
            </Button>
          )}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Total Filings Tracked" value={stats.total} />
          <MetricCard title="Overdue" value={stats.overdue} colorClass="text-[var(--color-overdue)]" subtitle="Needs immediate attention" />
          <MetricCard title="Due Next 30 Days" value={stats.due30Days} colorClass="text-[var(--color-warning)]" />
          <MetricCard title="Completed (This FY)" value={stats.completedThisFY} colorClass="text-[var(--color-safe)]" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-1">
            <CardHeader><CardTitle>Health Score</CardTitle></CardHeader>
            <CardContent className="flex justify-center flex-col items-center h-full pb-10">
              <HealthGauge score={stats.healthScore} />
            </CardContent>
          </Card>
          
          <Card className="col-span-2 flex flex-col">
            <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
            <CardContent className="flex-1">
              <CategoryChart categories={stats.categories} />
            </CardContent>
          </Card>
        </div>

        {/* Heatmap Row */}
        <Card>
          <CardHeader><CardTitle>Deadline Map (FY)</CardTitle></CardHeader>
          <CardContent>
            <HeatmapCalendar heatmap={heatmap.heatmap} overdue={heatmap.overdue} />
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader><CardTitle>Upcoming Deadlines</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-slate-50 text-sm font-medium text-[var(--color-muted)]">
                    <th className="p-4 font-medium">Company</th>
                    <th className="p-4 font-medium">Filing</th>
                    <th className="p-4 font-medium">Category</th>
                    <th className="p-4 font-medium">Deadline</th>
                    <th className="p-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {upcoming.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 text-sm transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: item.companyColor || '#cbd5e1' }}
                          />
                          <span className="font-medium truncate max-w-[120px]">{item.companyName}</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-[var(--color-navy)]">{item.title}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.categoryColor }}></span>
                        {item.categoryName}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{new Date(item.deadline).toLocaleDateString('en-IN')}</span>
                          <span className="text-[10px] text-slate-500">
                            {item.status === 'Done' ? 'Completed' : (item.daysLeft < 0 ? 'Overdue' : `${item.daysLeft} days left`)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {item.status === 'Pending' ? <Badge variant="default">Pending</Badge> : 
                        item.status === 'In Progress' ? <Badge variant="info">In Progress</Badge> : 
                        <Badge variant="danger">Overdue</Badge>}
                      </td>
                    </tr>
                  ))}
                  {upcoming.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[var(--color-muted)]">No upcoming deadlines found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
      
      <AddComplianceModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </PageWrapper>
  );
}

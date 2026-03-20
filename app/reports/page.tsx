"use client";

import PageWrapper from '@/components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download, FileSpreadsheet, FileClock, CheckCircle, AlertOctagon } from 'lucide-react';
import { useState } from 'react';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: string) => {
    setDownloading(type);
    try {
      const res = await fetch(`/api/reports?type=${type}`);
      if (!res.ok) throw new Error('Failed to download');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_report_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to generate report');
    } finally {
      setDownloading(null);
    }
  };

  const reports = [
    { id: 'all', title: 'Full Compliance Dump', desc: 'All active and completed filings tracked in the system.', icon: FileSpreadsheet, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'upcoming', title: 'Upcoming Filings', desc: 'Pending and in-progress tasks that are due in the future.', icon: FileClock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'overdue', title: 'Overdue Filings', desc: 'Filings that have missed their deadline and need immediate attention.', icon: AlertOctagon, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'completed', title: 'Completed Log', desc: 'Historical log of all successfully completed filings.', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-serif text-[var(--color-navy)] mb-6">Data Exports & Reports</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map(report => (
            <Card key={report.id} className="hover:border-[var(--color-navy)] transition-colors group">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-xl ${report.bg} ${report.color}`}>
                    <report.icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg text-[var(--color-navy)]">{report.title}</h3>
                    <p className="text-sm text-[var(--color-muted)] mt-1">{report.desc}</p>
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
                  <Button 
                    variant="secondary" 
                    className="w-full flex items-center justify-center gap-2 group-hover:bg-[var(--color-navy)] group-hover:text-white transition-colors"
                    onClick={() => handleDownload(report.id)}
                    disabled={downloading === report.id}
                  >
                    <Download size={16} />
                    {downloading === report.id ? 'Generating...' : 'Download CSV'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

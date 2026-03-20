"use client";

import { useEffect, useState, useRef } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { differenceInDays } from 'date-fns';
import { ExternalLink, Paperclip, Clock, MessageSquare, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

export default function FilingDetailPage({ params }: { params: { id: string } }) {
  const [filing, setFiling] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [documents, setDocuments] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [newNote, setNewNote] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [uRes, fRes, dRes, tRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/filings/${params.id}`),
        fetch(`/api/filings/${params.id}/documents`),
        fetch(`/api/filings/${params.id}/timeline`)
      ]);
      
      if (uRes.ok) setUser((await uRes.json()).user);
      if (fRes.ok) setFiling((await fRes.json()).filing);
      if (dRes.ok) setDocuments((await dRes.json()).documents);
      if (tRes.ok) setTimeline((await tRes.json()).timeline);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [params.id]);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (user?.role === 'ceo') return;
    try {
      await fetch(`/api/filings/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: e.target.value })
      });
      fetchData();
    } catch (e) {}
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await fetch(`/api/filings/${params.id}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote })
      });
      setNewNote('');
      fetchData();
    } catch (e) {}
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadDesc.trim()) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('description', uploadDesc);
    try {
      await fetch(`/api/filings/${params.id}/upload`, {
        method: 'POST',
        body: formData
      });
      setUploadFile(null);
      setUploadDesc('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (e) {} finally {
      setUploading(false);
    }
  };

  if (!filing || !user) return <PageWrapper><div className="animate-pulse h-96 bg-white rounded-xl" /></PageWrapper>;

  const days = differenceInDays(new Date(filing.deadline), new Date());
  
  return (
    <PageWrapper>
      <div className="space-y-6 animate-fade-in">
        
        {/* Header Section */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-serif text-[var(--color-navy)]">{filing.title}</h1>
              <Badge style={{ backgroundColor: filing.master_filings?.compliance_categories?.color || '#94a3b8' }} className="text-white">
                {filing.master_filings?.compliance_categories?.name}
              </Badge>
            </div>
            <div className="flex gap-6 mt-4 text-sm text-[var(--color-muted)]">
              <div className="flex flex-col">
                <span className="uppercase text-xs font-bold tracking-wider mb-1">Deadline</span>
                <span className="font-medium text-[var(--color-navy)] flex items-center gap-2">
                  <Clock size={16} /> {new Date(filing.deadline).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div className="border-l border-[var(--color-border)] pl-6 flex flex-col">
                <span className="uppercase text-xs font-bold tracking-wider mb-1">Time Left</span>
                {days < 0 ? <span className="text-[var(--color-overdue)] font-medium font-mono">Overdue</span> : <span className="font-medium font-mono border border-slate-200 px-2 py-0.5 rounded-md inline-flex items-center justify-center min-w-[50px]">{days} Days</span>}
              </div>
              <div className="border-l border-[var(--color-border)] pl-6 flex flex-col">
                <span className="uppercase text-xs font-bold tracking-wider mb-1">Assigned To</span>
                <span className="font-medium">{filing.users?.full_name || 'Unassigned'}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[200px]">
            <span className="uppercase text-[10px] font-bold tracking-widest text-[var(--color-muted)] mb-2 block">Status</span>
            {user.role === 'ceo' ? (
              <Badge variant={filing.status === 'Done' ? 'success' : filing.status === 'Overdue' ? 'danger' : filing.status === 'In Progress' ? 'info' : 'default'} className="text-sm px-4 py-1.5">{filing.status}</Badge>
            ) : (
              <select 
                className="w-full h-10 px-3 bg-white border border-[var(--color-border)] rounded-md outline-none focus:ring-2 focus:ring-[var(--color-navy)] font-medium"
                value={filing.status}
                onChange={handleStatusChange}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
                <option value="Overdue">Overdue</option>
                <option value="NA">N/A</option>
              </select>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--color-border)] gap-8 overflow-x-auto">
          {['details', 'documents', 'timeline'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 text-sm font-medium capitalize whitespace-nowrap transition-colors border-b-2 ${activeTab === tab ? 'border-[var(--color-navy)] text-[var(--color-navy)]' : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <Card>
              <CardHeader><CardTitle>Filing Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><strong className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Master Filing Name</strong><p className="font-medium">{filing.master_filings?.name}</p></div>
                <div><strong className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Frequency</strong><p className="font-medium">{filing.master_filings?.frequency}</p></div>
                <div><strong className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Due Date Rule</strong><p className="font-medium">{filing.master_filings?.due_date_rule}</p></div>
                <div><strong className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Governing Law</strong><p className="font-medium">{filing.master_filings?.governing_law}</p></div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50/50 border-orange-200">
              <CardHeader className="border-orange-200 flex flex-row items-center gap-2"><AlertTriangle size={20} className="text-orange-500" /><CardTitle className="text-orange-900">Penalty Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><strong className="block text-xs uppercase tracking-wider text-orange-700/70 mb-1">Late Fee / Penalty</strong><p className="font-medium text-orange-900">{filing.master_filings?.penalty_description || 'None specified'}</p></div>
                {filing.master_filings?.penalty_formula && (
                  <div><strong className="block text-xs uppercase tracking-wider text-orange-700/70 mb-1">Calculation</strong><div className="bg-white/60 p-3 rounded border border-orange-100 font-mono text-sm text-orange-900">{filing.master_filings?.penalty_formula}</div></div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {user.role !== 'ceo' && (
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 max-w-sm">
                      <label className="block text-sm font-medium mb-1">Select File</label>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full text-sm border border-[var(--color-border)] rounded-md file:bg-slate-100 file:border-0 file:px-4 file:py-2 file:mr-4 file:h-10 hover:file:bg-slate-200 cursor-pointer focus:outline-none bg-white" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Document Description</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Acknowledgment Receipt" 
                        value={uploadDesc}
                        onChange={e => setUploadDesc(e.target.value)}
                        className="w-full h-10 px-3 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] bg-white" 
                      />
                    </div>
                    <Button type="submit" disabled={uploading || !uploadFile || !uploadDesc}>
                      {uploading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Attached Documents</CardTitle></CardHeader>
              <CardContent className="p-0">
                {documents.length === 0 ? (
                  <div className="p-12 text-center text-[var(--color-muted)] flex flex-col items-center">
                    <Paperclip size={32} className="mb-4 text-slate-300" />
                    <p>No documents uploaded yet.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-sm">
                      <tr>
                        <th className="p-4 font-medium text-slate-500">File Name</th>
                        <th className="p-4 font-medium text-slate-500">Description</th>
                        <th className="p-4 font-medium text-slate-500">Size</th>
                        <th className="p-4 font-medium text-slate-500">Uploaded By</th>
                        <th className="p-4 font-medium text-slate-500">Date</th>
                        <th className="p-4 font-medium text-right text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {documents.map((doc: any) => (
                        <tr key={doc.id} className="hover:bg-slate-50">
                          <td className="p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <FileText size={16} />
                            </div>
                            <span className="font-medium">{doc.file_name}</span>
                          </td>
                          <td className="p-4 text-slate-600">{doc.description}</td>
                          <td className="p-4 text-slate-600">{doc.file_size_kb ? `${doc.file_size_kb} KB` : '-'}</td>
                          <td className="p-4 text-slate-600">{doc.users?.full_name}</td>
                          <td className="p-4 text-slate-600 whitespace-nowrap">{new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</td>
                          <td className="p-4 text-right">
                            <a href={doc.gdrive_view_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-[var(--color-info)] hover:underline text-xs font-semibold uppercase tracking-wider">
                              View <ExternalLink size={14} className="ml-1" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2">
              <Card>
                <CardHeader><CardTitle>Activity Feed</CardTitle></CardHeader>
                <CardContent>
                  <div className="relative border-l-2 border-slate-100 ml-4 pl-8 space-y-8 py-4">
                    {timeline.map((act) => (
                      <div key={act.id} className="relative">
                        <div className="absolute -left-[41px] bg-white p-1 rounded-full border-2 border-slate-200 text-slate-400">
                          {act.action === 'status_changed' ? <CheckCircle size={16} className="text-blue-500" /> : 
                           act.action === 'file_uploaded' ? <Paperclip size={16} className="text-emerald-500" /> : 
                           <MessageSquare size={16} className="text-amber-500" />}
                        </div>
                        <div className="mb-1">
                          <span className="font-semibold">{act.users?.full_name}</span>
                          <span className="text-[var(--color-muted)] mx-2">
                            {act.action === 'status_changed' ? 'changed status to' : 
                             act.action === 'file_uploaded' ? 'uploaded document' : 'added a note'}
                          </span>
                          {act.action === 'status_changed' && <Badge>{act.new_value?.status}</Badge>}
                          {act.action === 'file_uploaded' && <span className="font-medium">"{act.new_value?.file_name}"</span>}
                        </div>
                        {act.action === 'note_added' && (
                          <div className="bg-slate-50 p-4 rounded-lg mt-2 text-sm text-[var(--color-text)] border border-[var(--color-border)] shadow-sm">
                            {act.new_value?.text}
                          </div>
                        )}
                        <div className="text-xs text-[var(--color-muted)] mt-1.5">{new Date(act.timestamp).toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                    {timeline.length === 0 && <div className="text-[var(--color-muted)]">No activity recorded yet.</div>}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {user.role !== 'ceo' && (
              <div className="col-span-1">
                <Card>
                  <CardHeader><CardTitle>Add Note</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddNote} className="space-y-4">
                      <textarea
                        className="w-full border border-[var(--color-border)] rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] min-h-[120px] bg-white"
                        placeholder="Type a note or comment here..."
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        required
                      />
                      <Button type="submit" className="w-full">Post Note</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

      </div>
    </PageWrapper>
  );
}

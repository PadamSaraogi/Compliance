"use client";

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, AlertTriangle, Users, Settings, Database, Mail } from 'lucide-react';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const fetchAdminData = async () => {
    try {
      const [uRes, sRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/settings')
      ]);
      
      if (uRes.ok) setUsers((await uRes.json()).users);
      if (sRes.ok) setSettings((await sRes.json()).settings);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAdminData(); }, []);

  const handleSyncSheet = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/admin/sync-sheet', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage({ type: 'success', text: `Sync complete! Added ${data.newCount} new, updated ${data.updatedCount} filings.` });
      } else {
        setSyncMessage({ type: 'error', text: data.error || 'Failed to sync Google Sheet' });
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleSeedDB = async () => {
    if (!confirm('Are you sure you want to seed the database? This might overwrite some master data.')) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage({ type: 'success', text: data.message });
      } else {
        setSyncMessage({ type: 'error', text: data.error || 'Failed to seed database' });
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    setEmailStatus(null);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      if (res.ok) setEmailStatus({ type: 'success', text: 'Test email sent successfully' });
      else setEmailStatus({ type: 'error', text: (await res.json()).error || 'Failed to send' });
    } catch (e: any) { setEmailStatus({ type: 'error', text: e.message }); }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      alert('Settings saved successfully');
    } catch (e) {}
  };

  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'accountant' });
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setNewUser({ full_name: '', email: '', password: '', role: 'accountant' });
        fetchAdminData();
      }
    } catch (e) {}
  };

  const toggleUserActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      fetchAdminData();
    } catch (e) {}
  };

  if (loading) return <PageWrapper><div className="animate-pulse h-96 bg-white rounded-xl" /></PageWrapper>;

  return (
    <PageWrapper>
      <div className="space-y-8 animate-fade-in">
        
        {/* User Management */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-[var(--color-navy)]" />
            <h2 className="text-xl font-serif text-[var(--color-navy)]">User Management</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-[var(--color-border)]">
                      <tr>
                        <th className="p-4 font-medium text-[var(--color-muted)]">Name</th>
                        <th className="p-4 font-medium text-[var(--color-muted)]">Email</th>
                        <th className="p-4 font-medium text-[var(--color-muted)]">Role</th>
                        <th className="p-4 font-medium text-[var(--color-muted)]">Status</th>
                        <th className="p-4 font-medium text-[var(--color-muted)] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium">{u.full_name}</td>
                          <td className="p-4 text-[var(--color-muted)]">{u.email}</td>
                          <td className="p-4 capitalize"><Badge>{u.role}</Badge></td>
                          <td className="p-4">
                            {u.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
                          </td>
                          <td className="p-4 text-right">
                            <Button 
                              variant={u.is_active ? "danger" : "secondary"} 
                              size="sm"
                              onClick={() => toggleUserActive(u.id, u.is_active)}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader><CardTitle>Add New User</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Full Name</label>
                      <Input required value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Email</label>
                      <Input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Password</label>
                      <Input type="password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Role</label>
                      <select 
                        className="w-full h-8 px-3 text-sm rounded-md border border-[var(--color-border)] bg-white outline-none focus:ring-2 focus:ring-[var(--color-navy)]"
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value})}
                      >
                        <option value="accountant">Accountant</option>
                        <option value="ceo">CEO</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <Button type="submit" className="w-full">Create User</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Global Settings & Integrations */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="text-[var(--color-navy)]" />
              <h2 className="text-xl font-serif text-[var(--color-navy)]">Data Integrations</h2>
            </div>
            <Card>
              <CardHeader><CardTitle>Google Sheets Sync</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[var(--color-muted)]">
                  Pull the latest master filings dictionary from the remote Google Sheet. 
                  This creates or updates standard rules.
                </p>
                <div className="bg-slate-50 p-4 rounded border border-[var(--color-border)] font-mono text-xs overflow-x-auto text-[var(--color-text)]">
                  SHEET ID: {process.env.GOOGLE_SHEET_ID || 'Configured via Env'}
                </div>
                {syncMessage && (
                  <div className={`p-3 text-sm rounded-md flex items-center gap-2 ${syncMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {syncMessage.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                    {syncMessage.text}
                  </div>
                )}
                <Button onClick={handleSyncSheet} disabled={syncing}>
                  {syncing ? 'Syncing...' : 'Sync Master List'}
                </Button>

                <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex flex-col items-start">
                  <p className="text-sm text-[var(--color-muted)] mb-3">
                    Initialize database with default Indian compliance rules (Income Tax, GST, MCA, etc).
                  </p>
                  <Button variant="secondary" onClick={handleSeedDB} disabled={syncing}>
                    {syncing ? 'Processing...' : 'Seed Database'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <form onSubmit={handleSaveSettings}>
              <Card>
                <CardHeader><CardTitle>App Defaults</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Company Name</label>
                    <Input value={settings.company_name || ''} onChange={e => setSettings({...settings, company_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Google Sheet ID (Mirror)</label>
                    <Input value={settings.google_sheet_id || ''} onChange={e => setSettings({...settings, google_sheet_id: e.target.value})} />
                  </div>
                  <Button type="submit">Save Settings</Button>
                </CardContent>
              </Card>
            </form>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="text-[var(--color-navy)]" />
              <h2 className="text-xl font-serif text-[var(--color-navy)]">Email Configuration</h2>
            </div>
            <form onSubmit={handleSaveSettings}>
              <Card>
                <CardHeader><CardTitle>Reminder Email Delivery</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Recipients (comma separated)</label>
                    <Input placeholder="ceo@company.com, compliance@company.com" value={settings.reminder_recipients || ''} onChange={e => setSettings({...settings, reminder_recipients: e.target.value})} />
                    <p className="text-xs text-[var(--color-muted)] mt-1">These addresses receive summary reminder emails daily.</p>
                  </div>
                  <Button type="submit">Save Recipients</Button>
                </CardContent>
              </Card>
            </form>

            <Card>
              <CardHeader><CardTitle>Test Email System</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleTestEmail} className="flex gap-2">
                  <Input placeholder="name@example.com" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} required />
                  <Button type="submit">Send Test</Button>
                </form>
                {emailStatus && (
                  <div className={`text-sm mt-3 ${emailStatus.type === 'success' ? 'text-[var(--color-safe)]' : 'text-[var(--color-overdue)]'}`}>
                    {emailStatus.text}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

      </div>
    </PageWrapper>
  );
}

"use client";

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Building2, Plus, Edit2, Check, X } from 'lucide-react';

const ENTITY_TYPES = ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'];
const COLORS = ['#1e40af', '#7c3aed', '#0f766e', '#b45309', '#be185d', '#15803d', '#c2410c', '#6d28d9', '#0891b2', '#1d4ed8'];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', entity_type: 'Private Limited', pan: '', gstin: '', cin: '', color: '#1e40af' });
  const [editForm, setEditForm] = useState<any>({});

  const fetchCompanies = async () => {
    const res = await fetch('/api/companies');
    if (res.ok) setCompanies((await res.json()).companies || []);
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setAdding(false);
      setForm({ name: '', entity_type: 'Private Limited', pan: '', gstin: '', cin: '', color: '#1e40af' });
      fetchCompanies();
    }
  };

  const handleUpdate = async (id: string) => {
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditId(null);
    fetchCompanies();
  };

  if (loading) return <PageWrapper><div className="animate-pulse h-96 bg-white rounded-xl" /></PageWrapper>;

  return (
    <PageWrapper>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-serif text-[var(--color-navy)]">Companies</h1>
          {!adding && (
            <Button onClick={() => setAdding(true)} className="flex items-center gap-2">
              <Plus size={16} /> Add Company
            </Button>
          )}
        </div>

        {adding && (
          <Card className="border-[var(--color-navy)]">
            <CardHeader><CardTitle>Add New Company</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Company Name *</label>
                  <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Saraogi Industries Pvt Ltd" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Entity Type *</label>
                  <select className="w-full h-8 px-3 text-sm rounded-md border border-[var(--color-border)] bg-white outline-none focus:ring-2 focus:ring-[var(--color-navy)]"
                    value={form.entity_type} onChange={e => setForm({...form, entity_type: e.target.value})}>
                    {ENTITY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">PAN</label>
                  <Input value={form.pan} onChange={e => setForm({...form, pan: e.target.value})} placeholder="AABCS1429B" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">GSTIN</label>
                  <Input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} placeholder="27AABCS1429B1Z5" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">CIN (Companies only)</label>
                  <Input value={form.cin} onChange={e => setForm({...form, cin: e.target.value})} placeholder="U74999MH2010PTC123456" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Color Tag</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm({...form, color: c})}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-[var(--color-navy)] scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="md:col-span-3 flex gap-3 pt-2">
                  <Button type="submit">Create Company</Button>
                  <Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map(co => (
            <Card key={co.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {editId === co.id ? (
                  <div className="space-y-3">
                    <Input value={editForm.name || co.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                    <div className="flex gap-2">
                      <Input value={editForm.pan ?? co.pan} onChange={e => setEditForm({...editForm, pan: e.target.value})} placeholder="PAN" />
                      <Input value={editForm.gstin ?? co.gstin} onChange={e => setEditForm({...editForm, gstin: e.target.value})} placeholder="GSTIN" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(co.id)} className="flex items-center gap-1"><Check size={14}/>Save</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditId(null)} className="flex items-center gap-1"><X size={14}/>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{ backgroundColor: co.color || '#0f1f3d' }}>
                        {co.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--color-navy)]">{co.name}</p>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">{co.entity_type}</p>
                        <div className="flex gap-3 mt-2 flex-wrap">
                          {co.pan && <span className="text-xs font-mono bg-slate-50 border border-[var(--color-border)] px-2 py-0.5 rounded">PAN: {co.pan}</span>}
                          {co.gstin && <span className="text-xs font-mono bg-slate-50 border border-[var(--color-border)] px-2 py-0.5 rounded">GST: {co.gstin}</span>}
                          {co.cin && <span className="text-xs font-mono bg-slate-50 border border-[var(--color-border)] px-2 py-0.5 rounded">CIN: {co.cin}</span>}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => { setEditId(co.id); setEditForm({}); }} className="flex-shrink-0">
                      <Edit2 size={14} />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

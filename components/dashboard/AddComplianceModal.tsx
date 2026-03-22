"use client";

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ENTITY_TYPE_MAP } from '@/lib/compliance-logic';

interface AddComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddComplianceModal({ isOpen, onClose, onSuccess }: AddComplianceModalProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    companyId: 'all',
    type: 'recurring', // 'one-time' or 'recurring'
    frequency: 'Monthly',
    dueDate: '',
    dueDateRule: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    setFetching(true);
    try {
      const [catRes, compRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/companies')
      ]);
      if (catRes.status === 401 || compRes.status === 401) {
        window.location.href = '/login?from=/dashboard';
        return;
      }
      
      const cats = await catRes.json();
      const comps = await compRes.json();
      const categoriesData = cats.categories || [];
      const companiesData = comps.companies || [];
      
      setCategories(categoriesData);
      setCompanies(companiesData);
      
      if (categoriesData.length > 0 && !formData.categoryId) {
        setFormData(prev => ({ 
          ...prev, 
          categoryId: categoriesData[0].id 
        }));
      } else if (categoriesData.length === 0) {
        setError('No categories found. Please sync with master sheet or add categories.');
      }
    } catch (err) {
      setError('Failed to load form data. Please check your connection.');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/filings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create compliance');

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          name: '',
          categoryId: categories[0]?.id || '',
          companyId: 'all',
          type: 'recurring',
          frequency: 'Monthly',
          dueDate: '',
          dueDateRule: '',
          notes: ''
        });
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Compliance">
      {fetching ? (
        <div className="py-20 flex justify-center flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-navy)]"></div>
          <p className="text-slate-500 font-medium">Loading details...</p>
        </div>
      ) : success ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-emerald-600 animate-fade-in">
          <CheckCircle2 size={64} />
          <h3 className="text-2xl font-bold">Compliance Created!</h3>
          <p className="text-slate-500 text-center">We've generated the filings across your selected companies.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-800 text-sm animate-shake">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Compliance Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. GST Annual Return"
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-navy)] focus:bg-white text-slate-900 outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                <select
                  required
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-navy)] focus:bg-white text-slate-900 outline-none transition-all"
                  value={formData.categoryId}
                  onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  {!categories.length && <option value="">Loading categories...</option>}
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="text-slate-900">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apply To</label>
                <select
                  required
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-navy)] focus:bg-white text-slate-900 outline-none transition-all"
                  value={formData.companyId}
                  onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                >
                  {!companies.length && <option value="all">Loading companies...</option>}
                  <optgroup label="General">
                    <option value="all">All Group Companies</option>
                  </optgroup>
                  
                  <optgroup label="By Entity Type">
                    {Object.entries(ENTITY_TYPE_MAP).map(([code, label]) => (
                      <option key={code} value={`type:${code}`}>All {label}s</option>
                    ))}
                  </optgroup>

                  <optgroup label="By Specific Company">
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Config Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Compliance Type</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'recurring' })}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.type === 'recurring' ? 'border-[var(--color-navy)] bg-slate-50 text-[var(--color-navy)]' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                  >
                    <span className="font-bold text-sm">Recurring</span>
                    <span className="text-[10px] text-center opacity-70">Periodic tasks (GST, PF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'one-time' })}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.type === 'one-time' ? 'border-[var(--color-navy)] bg-slate-50 text-[var(--color-navy)]' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                  >
                    <span className="font-bold text-sm">One-Time</span>
                    <span className="text-[10px] text-center opacity-70">Single event / project</span>
                  </button>
                </div>
              </div>

              {formData.type === 'recurring' ? (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Frequency</label>
                    <select
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-navy)] focus:bg-white text-slate-900 outline-none transition-all"
                      value={formData.frequency}
                      onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    >
                      <option value="Monthly" className="text-slate-900">Monthly</option>
                      <option value="Quarterly" className="text-slate-900">Quarterly</option>
                      <option value="Annual" className="text-slate-900">Annual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 text-xs truncate">Due Date Rule</label>
                    <input
                      type="text"
                      placeholder="e.g. 11th of month"
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-navy)] focus:bg-white text-slate-900 outline-none transition-all"
                      value={formData.dueDateRule}
                      onChange={e => setFormData({ ...formData, dueDateRule: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    required
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-navy)] focus:bg-white text-slate-900 outline-none transition-all"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Internal Notes (Optional)</label>
            <textarea
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-navy)] focus:bg-white text-slate-900 outline-none transition-all min-h-[100px]"
              placeholder="Any specific instructions for this compliance..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Compliance'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

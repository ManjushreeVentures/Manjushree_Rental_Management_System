import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
// import { agreements as fallbackAgreements } from '../data/mockData';
import { formatCurrency, formatDate } from '../utils/format';
import { createAgreementApi } from '../services/api';

const initialForm = {
  agreementCode: '',
  client: '',
  property: '',
  startDate: '',
  endDate: '',
  rent: '',
  cam: '',
  invoiceDay: 5,
  status: 'active',
};

export default function Agreements({
  agreements = fallbackAgreements,
  clients = [],
  properties = [],
  token,
  onRefresh,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submitAgreement = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createAgreementApi(token, {
        ...form,
        rent: Number(form.rent),
        cam: Number(form.cam),
        invoiceDay: Number(form.invoiceDay),
      });
      setForm(initialForm);
      setIsOpen(false);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Agreements"
        description="11-month rental cycles with auto-renewal and escalation"
        action={
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            New Agreement
          </button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Client / Property</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Period</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rent + CAM</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice Day</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agreements.map((agr) => (
              <tr key={agr.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 text-sm font-mono text-slate-600">{agr.code ?? agr.id}</td>
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-900">{agr.client}</p>
                  <p className="text-xs text-slate-500">{agr.property}</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {formatDate(agr.startDate)} – {formatDate(agr.endDate)}
                </td>
                <td className="px-5 py-4 text-sm">
                  <p className="font-medium text-slate-900">{formatCurrency(agr.rent)}</p>
                  <p className="text-slate-500">CAM: {formatCurrency(agr.cam)}</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{agr.invoiceDay}th of month</td>
                <td className="px-5 py-4">
                  <StatusBadge status={agr.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <form onSubmit={submitAgreement} className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">New Agreement</h3>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Agreement Code (e.g. AGR-101)"
                value={form.agreementCode}
                onChange={(e) => setForm((p) => ({ ...p, agreementCode: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              />
              <select
                required
                value={form.client}
                onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                required
                value={form.property}
                onChange={(e) => setForm((p) => ({ ...p, property: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input type="date" required value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input type="date" required value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input type="number" required placeholder="Rent" value={form.rent} onChange={(e) => setForm((p) => ({ ...p, rent: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input type="number" required placeholder="CAM" value={form.cam} onChange={(e) => setForm((p) => ({ ...p, cam: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input type="number" required min="1" max="28" placeholder="Invoice day" value={form.invoiceDay} onChange={(e) => setForm((p) => ({ ...p, invoiceDay: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
              <button disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

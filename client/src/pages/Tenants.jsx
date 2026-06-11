import { useState } from 'react';
import {
  Plus, Users, Pencil, PowerOff, Eye, Trash2,
  AlertTriangle, Clock, TrendingUp,
  ChevronDown, ChevronUp, CheckCircle2,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { tenantApi } from '../api/tenant.api';
import { propertyApi } from '../api/property.api';
import { formatCurrency, formatDate } from '../utils/format';
import PinModal from '../components/PinModal';

// ─── Escalation status badge ──────────────────────────────────────────────────
const escalationStyles = {
  'Overdue': 'bg-red-100    text-red-700    ring-red-200',
  'Due Soon': 'bg-orange-100 text-orange-700 ring-orange-200',
  'Upcoming': 'bg-blue-50    text-blue-600   ring-blue-200',
  'Applied': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'No Escalation': 'bg-slate-100  text-slate-500  ring-slate-200',
};

function EscalationBadge({ status, daysLeft }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5
        text-xs font-medium ring-1 ring-inset ${escalationStyles[status] ?? escalationStyles['No Escalation']}`}>
        {status === 'Overdue' && <AlertTriangle className="h-3 w-3" />}
        {status === 'Due Soon' && <Clock className="h-3 w-3" />}
        {status === 'Applied' && <CheckCircle2 className="h-3 w-3" />}
        {status}
      </span>
      {daysLeft !== null && daysLeft !== undefined && status !== 'Applied' && (
        <span className="text-xs text-slate-400">
          {daysLeft >= 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`}
        </span>
      )}
    </div>
  );
}

// ─── Escalation Tracker Panel ─────────────────────────────────────────────────
function EscalationTracker({ data, onApply, loading }) {
  const [open, setOpen] = useState(true);
  if (!data?.length) return null;

  const overdue = data.filter((r) => r.escalation_status === 'Overdue').length;
  const dueSoon = data.filter((r) => r.escalation_status === 'Due Soon').length;

  return (
    <div className="rounded-xl border border-teal-200/50 bg-white/60 backdrop-blur-md shadow-sm mb-6 overflow-hidden transition-all duration-300">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 hover:bg-teal-50/50 transition">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-teal-600" />
          <h2 className="font-semibold text-slate-900">Rent Escalation Tracker</h2>
          {overdue > 0 && (
            <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">
              {overdue} overdue
            </span>
          )}
          {dueSoon > 0 && (
            <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-semibold">
              {dueSoon} due soon
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" />
          : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="overflow-x-auto rounded-xl border border-teal-100 bg-white shadow-sm">
          <table className="w-full text-sm whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-teal-50/80 text-xs font-semibold text-teal-800 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Tenant</th>
                <th className="px-4 py-3 text-left">Property</th>
                <th className="px-4 py-3 text-right">Area (sft)</th>
                <th className="px-4 py-3 text-right">Current Rent</th>
                <th className="px-4 py-3 text-right">CAM</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Escalation %</th>
                <th className="px-4 py-3 text-center">Due Date</th>
                <th className="px-4 py-3 text-right">New Rent</th>
                <th className="px-4 py-3 text-right">Difference</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-50 bg-white/40">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-teal-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.tenant_name}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{r.property_name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {r.tenant_area ? Number(r.tenant_area).toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(r.monthly_rent)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {r.cam_amount > 0 ? formatCurrency(r.cam_amount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(r.total_rent)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-teal-100/80 text-teal-800
                      px-2.5 py-1 text-xs font-bold ring-1 ring-inset ring-teal-200/50">
                      {r.escalation_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-600">
                    {formatDate(r.escalation_due_date)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {r.escalation_new_rent ? formatCurrency(r.escalation_new_rent) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-700 font-medium text-xs">
                    {r.escalation_diff > 0 ? `+${formatCurrency(r.escalation_diff)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <EscalationBadge
                      status={r.escalation_status}
                      daysLeft={r.days_left}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.escalation_status !== 'Applied' && r.escalation_new_rent && (
                      <Button
                        variant="secondary"
                        className="text-xs px-2 py-1"
                        loading={loading === r.id}
                        onClick={() => onApply(r.id, r.tenant_name)}
                      >
                        Apply
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tenant Form ──────────────────────────────────────────────────────────────
const AVAILABLE_CATEGORIES = [
  'Rent & CAM', 'Power Charges', 'Water Charges', 'Infrastructural'
];

const empty = {
  property_id: '', name: '', email: '', phone: '', gstin: '',
  unit_no: '', lease_start: '', lease_end: '',
  monthly_rent: '', security_deposit: '',
  tenant_area: '', rate_per_sft: '', cam_amount: '',
  escalation_pct: '', escalation_due_date: '', escalation_new_rent: '',
  escalation_applied: false, is_active: true, categories: [],
  file: null, attachment_url: null,
};

function TenantForm({ initial = empty, properties = [], onSubmit, loading, onViewAttachment }) {
  const [form, setForm] = useState(() => {
    // Map categories from array of objects to array of strings for the checkboxes
    const catArray = initial.categories?.map(c => typeof c === 'string' ? c : c.category) || [];
    
    // Auto-fill monthly_rent from category amounts if it's currently 0 or missing
    let derivedRent = initial.monthly_rent;
    if (!derivedRent && initial.categories?.length > 0) {
      derivedRent = initial.categories.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    }

    return {
      ...initial,
      categories: catArray,
      monthly_rent: derivedRent || '',
    };
  });
  const [errors, setErrors] = useState({});
  const [showEsc, setShowEsc] = useState(false);

  const set = (k) => (e) => {
    const val = e.target.value;
    setForm((f) => {
      const updated = { ...f, [k]: val };
      // auto-calculate new rent when pct changes
      if ((k === 'escalation_pct' || k === 'monthly_rent') && updated.monthly_rent) {
        const base = parseFloat(updated.monthly_rent) || 0;
        const pct = parseFloat(updated.escalation_pct) || 0;
        updated.escalation_new_rent = pct > 0
          ? (base * (1 + pct / 100)).toFixed(2)
          : updated.escalation_new_rent;
      }
      return updated;
    });
  };

  const toggleCategory = (cat) => {
    setForm((f) => {
      const isSelected = f.categories?.includes(cat);
      const newCats = isSelected
        ? (f.categories || []).filter((c) => c !== cat)
        : [...(f.categories || []), cat];
      return { ...f, categories: newCats };
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.property_id) errs.property_id = 'Required';
    if (!form.name.trim()) errs.name = 'Required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
      errs.email = 'Invalid email';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      ...form,
      monthly_rent: Number(form.monthly_rent) || 0,
      security_deposit: Number(form.security_deposit) || 0,
      tenant_area: Number(form.tenant_area) || null,
      rate_per_sft: Number(form.rate_per_sft) || null,
      cam_amount: Number(form.cam_amount) || 0,
      escalation_pct: Number(form.escalation_pct) || null,
      escalation_new_rent: Number(form.escalation_new_rent) || null,
      categories: form.categories || [],
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setForm(f => ({ ...f, file }));
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
      {/* Property */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Property *</label>
        <select value={form.property_id} onChange={set('property_id')}
          className={`rounded-lg border px-3 py-2 text-sm outline-none transition-all
            focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 bg-white/80
            ${errors.property_id ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
          <option value="">Select property...</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {errors.property_id && <p className="text-xs text-red-500">{errors.property_id}</p>}
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Tenant Name *" value={form.name} onChange={set('name')}
            error={errors.name} placeholder="e.g. Britannia" />
        </div>
        <Input label="Unit No" value={form.unit_no} onChange={set('unit_no')} />
        <Input label="GSTIN" value={form.gstin} onChange={set('gstin')} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} />
        <Input label="Email" type="email" value={form.email}
          onChange={set('email')} error={errors.email} />
      </div>

      {/* Lease */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Lease Start" type="date" value={form.lease_start} onChange={set('lease_start')} />
        <Input label="Lease End" type="date" value={form.lease_end} onChange={set('lease_end')} />
        <Input label="Monthly Rent (₹)" type="number" value={form.monthly_rent} onChange={set('monthly_rent')} />
        <Input label="Security Deposit (₹)" type="number" value={form.security_deposit} onChange={set('security_deposit')} />
      </div>

      {/* Area & Rate */}
      <div className="grid grid-cols-3 gap-4">
        <Input label="Tenant Area (sft)" type="number" value={form.tenant_area} onChange={set('tenant_area')} />
        <Input label="Rate per Sft (₹)" type="number" value={form.rate_per_sft} onChange={set('rate_per_sft')} />
        <Input label="CAM Amount (₹)" type="number" value={form.cam_amount} onChange={set('cam_amount')} />
      </div>

      {/* Categories of Service */}
      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
        <label className="text-sm font-medium text-slate-700 mb-3 block">Categories of Service</label>
        <div className="flex flex-wrap gap-3">
          {AVAILABLE_CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer
              rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={form.categories?.includes(cat)}
                onChange={() => toggleCategory(cat)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-slate-700">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Escalation — collapsible */}
      <div className="rounded-xl border border-teal-200/60 overflow-hidden bg-white/50 backdrop-blur-sm">
        <button type="button"
          onClick={() => setShowEsc((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-3
            bg-teal-50/50 hover:bg-teal-100/50 transition-colors text-sm font-medium text-teal-800">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Rent Escalation
          </span>
          {showEsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showEsc && (
          <div className="grid grid-cols-3 gap-4 p-4">
            <Input label="Escalation %" type="number" value={form.escalation_pct}
              onChange={set('escalation_pct')} placeholder="5" />
            <Input label="Due Date" type="date" value={form.escalation_due_date}
              onChange={set('escalation_due_date')} />
            <Input label="New Rent (₹)" type="number" value={form.escalation_new_rent}
              onChange={set('escalation_new_rent')}
              placeholder="Auto-calculated" />
            {form.escalation_new_rent && form.monthly_rent && (
              <div className="col-span-3 rounded-lg bg-emerald-50 border
                border-emerald-200 px-4 py-3 text-sm">
                <span className="text-slate-600">
                  {formatCurrency(form.monthly_rent)} →{' '}
                </span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(form.escalation_new_rent)}
                </span>
                <span className="text-slate-400 ml-2 text-xs">
                  (+{formatCurrency(
                    parseFloat(form.escalation_new_rent) - parseFloat(form.monthly_rent)
                  )})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attachment */}
      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
        <label className="text-sm font-medium text-slate-700 mb-2 block">Lease Agreement / Document</label>
        {form.attachment_url && !form.file && (
          <div className="mb-3 text-sm text-blue-600">
            <button type="button" onClick={() => onViewAttachment(form.attachment_url)} className="underline hover:text-blue-800">
              View Existing Agreement
            </button>
          </div>
        )}
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="t_active" checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
        <label htmlFor="t_active" className="text-sm text-slate-600">Active tenant</label>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="primary" loading={loading} onClick={handleSubmit}>
          Save Tenant
        </Button>
      </div>
    </div>
  );
}

// ─── Lease Badge ──────────────────────────────────────────────────────────────
const leaseStyles = {
  'Active': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Expiring Soon': 'bg-orange-50  text-orange-700  ring-orange-200',
  'Expired': 'bg-red-50     text-red-700     ring-red-200',
  'No Lease': 'bg-slate-100  text-slate-500   ring-slate-200',
};

function LeaseBadge({ status, daysLeft }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5
        text-xs font-medium ring-1 ring-inset ${leaseStyles[status] ?? leaseStyles['No Lease']}`}>
        {status === 'Expiring Soon' && <AlertTriangle className="h-3 w-3" />}
        {status}
      </span>
      {daysLeft !== null && daysLeft !== undefined && (
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {daysLeft >= 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d ago`}
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Tenants() {
  const [search, setSearch] = useState('');
  const [propFilter, setPropFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [pinModalFile, setPinModalFile] = useState(null);

  const { data, loading, error, refetch } = useAsync(
    () => tenantApi.getAll({
      search: search || undefined,
      property_id: propFilter || undefined,
      category: catFilter || undefined
    }),
    [search, propFilter, catFilter]
  );

  const { data: escalData, refetch: refetchEscal } = useAsync(
    () => tenantApi.getEscalationTracker(), []
  );

  const { data: propData } = useAsync(
    () => propertyApi.getAll({ is_active: true }), []
  );

  const tenants = data?.data ?? [];
  const properties = propData?.data ?? [];
  const escalation = escalData?.data ?? [];

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      let attachment_url = null;
      if (form.file) {
        const uploadRes = await tenantApi.uploadFile(form.file);
        attachment_url = uploadRes.fileUrl;
      }

      const { categories, file, ...tenantData } = form;
      if (attachment_url) tenantData.attachment_url = attachment_url;

      const res = await tenantApi.create(tenantData);
      
      if (categories && categories.length > 0) {
        const catPayload = categories.map(c => ({
          category: c,
          amount: (c === 'Rent & CAM' && tenantData.monthly_rent) ? tenantData.monthly_rent : 0
        }));
        await tenantApi.upsertCategories(res.data.id, { categories: catPayload });
      }

      showToast('Tenant added');
      setModal(null);
      refetch();
      refetchEscal();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      let attachment_url = form.attachment_url;
      if (form.file) {
        const uploadRes = await tenantApi.uploadFile(form.file);
        attachment_url = uploadRes.fileUrl;
      }

      const { categories, file, ...tenantData } = form;
      tenantData.attachment_url = attachment_url;

      await tenantApi.update(selected.id, tenantData);

      if (categories) {
        const catPayload = categories.map(c => ({
          category: c,
          amount: (c === 'Rent & CAM' && tenantData.monthly_rent) ? tenantData.monthly_rent : 0
        }));
        await tenantApi.upsertCategories(selected.id, { categories: catPayload });
      }

      showToast('Tenant updated');
      setModal(null);
      refetch();
      refetchEscal();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this tenant?')) return;
    try {
      await tenantApi.remove(id);
      showToast('Tenant deactivated');
      refetch();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleApplyEscalation = async (id, name) => {
    if (!confirm(`Apply escalation for ${name}? This will update monthly rent.`)) return;
    setApplyingId(id);
    try {
      await tenantApi.applyEscalation(id);
      showToast(`Escalation applied for ${name}`);
      refetch();
      refetchEscal();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setApplyingId(null); }
  };

  const expiringSoon = tenants.filter((t) => t.lease_status === 'Expiring Soon').length;
  const expired = tenants.filter((t) => t.lease_status === 'Expired').length;

  const columns = [
    {
      key: 'name', label: 'Tenant Name',
      render: (r) => (
        <div>
          <button
            onClick={() => { setSelected(r); setModal('view'); }}
            className="font-semibold text-blue-600 hover:text-blue-800 transition-colors text-left"
          >
            {r.name}
          </button>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{r.gstin || 'No GSTIN'}</p>
        </div>
      ),
    },
    {
      key: 'property_name', label: 'Property', className: 'hidden md:table-cell',
      render: (r) => (
        <div>
          <p className="text-sm text-slate-700">{r.property_name ?? '—'}</p>
          {r.unit_no && <p className="text-xs text-slate-500">Unit {r.unit_no}</p>}
        </div>
      ),
    },
    {
      key: 'total_amount', label: 'Bill Amount', className: 'text-right',
      render: (r) => {
        const total = r.categories?.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0;
        return <span className="text-sm font-bold text-teal-700">{formatCurrency(total)}</span>;
      },
    },
    {
      key: 'categories', label: 'Services',
      render: (r) => (
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {r.categories?.length > 0 ? (
            r.categories.map((c, i) => (
              <span key={i} className="inline-flex items-center rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20" title={c.amount > 0 ? `Amount: ${formatCurrency(c.amount)}` : ''}>
                {c.category}
              </span>
            ))
          ) : <span className="text-xs text-slate-400">—</span>}
        </div>
      ),
    },
    {
      key: 'escalation_due_date', label: 'Due by', className: 'hidden lg:table-cell',
      render: (r) => r.escalation_due_date ? (
        <div>
          <p className="text-sm text-slate-700 font-medium">{formatDate(r.escalation_due_date)}</p>
          <EscalationBadge status={r.escalation_status} daysLeft={r.escalation_days_left} />
        </div>
      ) : <span className="text-sm text-slate-400">—</span>,
    },
    {
      key: 'is_active', label: 'Status', className: 'hidden sm:table-cell',
      render: (r) => <StatusBadge status={r.is_active ? 'Active' : 'Inactive'} />
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => { setSelected(r); setModal('edit'); }}
            title="Edit"
            className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400
              hover:text-teal-600 transition">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => handleDeactivate(r.id)}
            title="Delete Tenant"
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400
              hover:text-red-500 transition">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Manage tenants, lease dates, escalation, and rent details"
        actions={
          <Button onClick={() => setModal('add')}>
            <Plus className="h-4 w-4" /> Add Tenant
          </Button>
        }
      />

      {/* Escalation Tracker */}
      <EscalationTracker
        data={escalation}
        onApply={handleApplyEscalation}
        loading={applyingId}
      />

      {/* Lease alerts */}
      {(expiringSoon > 0 || expired > 0) && (
        <div className="mb-4 flex gap-3 flex-wrap">
          {expired > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200
              bg-red-50 px-4 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {expired} lease{expired > 1 ? 's' : ''} expired
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-200
              bg-orange-50 px-4 py-2 text-sm text-orange-700">
              <Clock className="h-4 w-4" />
              {expiringSoon} expiring within 30 days
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tenant, unit, GSTIN..."
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm
            outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 bg-white/80 w-full sm:w-64 transition-all" />
        <select value={propFilter} onChange={(e) => setPropFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm
            outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 bg-white/80 transition-all">
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm
            outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 bg-white/80 transition-all">
          <option value="">All Categories</option>
          {AVAILABLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200/60 px-5 py-4 bg-white/40">
          <Users className="h-5 w-5 text-teal-600" />
          <span className="font-semibold text-slate-900">
            {tenants.length} Tenant{tenants.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          {error
            ? <p className="px-5 py-10 text-center text-sm text-red-500">{error}</p>
            : <Table columns={columns} data={tenants} loading={loading} />
          }
        </div>
      </div>

      {/* Modals */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)}
        title="Add Tenant" width="max-w-2xl">
        <TenantForm properties={properties} onSubmit={handleAdd} loading={saving} onViewAttachment={setPinModalFile} />
      </Modal>

      <Modal open={modal === 'edit'} onClose={() => setModal(null)}
        title="Edit Tenant" width="max-w-2xl">
        {selected && (
          <TenantForm
            properties={properties}
            initial={{
              property_id: selected.property_id ?? '',
              name: selected.name ?? '',
              email: selected.email ?? '',
              phone: selected.phone ?? '',
              gstin: selected.gstin ?? '',
              unit_no: selected.unit_no ?? '',
              lease_start: selected.lease_start ? selected.lease_start.split('T')[0] : '',
              lease_end: selected.lease_end ? selected.lease_end.split('T')[0] : '',
              monthly_rent: selected.monthly_rent ?? '',
              security_deposit: selected.security_deposit ?? '',
              tenant_area: selected.tenant_area ?? '',
              rate_per_sft: selected.rate_per_sft ?? '',
              cam_amount: selected.cam_amount ?? '',
              escalation_pct: selected.escalation_pct ?? '',
              escalation_due_date: selected.escalation_due_date ? selected.escalation_due_date.split('T')[0] : '',
              escalation_new_rent: selected.escalation_new_rent ?? '',
              escalation_applied: selected.escalation_applied || false,
              is_active: selected.is_active ?? true,
              categories: selected.categories?.map(c => c.category) || [],
              attachment_url: selected.attachment_url || null,
            }}
            onSubmit={handleEdit}
            loading={saving}
            onViewAttachment={setPinModalFile}
          />
        )}
      </Modal>

      <Modal open={modal === 'view'} onClose={() => setModal(null)}
        title="Tenant Details" width="max-w-3xl">
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100/50">
                <p className="text-xs text-teal-600 font-medium mb-1">Tenant Name</p>
                <p className="font-semibold text-slate-900">{selected.name}</p>
                {selected.gstin && <p className="text-[10px] text-slate-500 font-mono mt-1">GST: {selected.gstin}</p>}
              </div>
              <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100/50">
                <p className="text-xs text-teal-600 font-medium mb-1">Property</p>
                <p className="font-medium text-slate-900">{selected.property_name || '—'}</p>
                {selected.unit_no && <p className="text-xs text-slate-500 mt-0.5">Unit {selected.unit_no}</p>}
              </div>
              <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100/50">
                <p className="text-xs text-teal-600 font-medium mb-1">Tenant Area</p>
                <p className="font-medium text-slate-900">
                  {selected.tenant_area ? `${Number(selected.tenant_area).toLocaleString('en-IN')} sqft` : '—'}
                </p>
              </div>
              <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100/50">
                <p className="text-xs text-teal-600 font-medium mb-1">Security Deposit</p>
                <p className="font-medium text-slate-900">
                  {selected.security_deposit ? formatCurrency(selected.security_deposit) : '—'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Financials</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white">
                <div className="p-4">
                  <p className="text-xs text-slate-500 mb-1">Rate / sft</p>
                  <p className="font-medium text-slate-900">{selected.rate_per_sft ? formatCurrency(selected.rate_per_sft) : '—'}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-slate-500 mb-1">Rent</p>
                  <p className="font-medium text-slate-900">{selected.monthly_rent ? formatCurrency(selected.monthly_rent) : '—'}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-slate-500 mb-1">CAM</p>
                  <p className="font-medium text-slate-900">{selected.cam_amount ? formatCurrency(selected.cam_amount) : '—'}</p>
                </div>
                <div className="p-4 bg-teal-50/30">
                  <p className="text-xs text-teal-700 font-medium mb-1">Total Amount</p>
                  <p className="font-bold text-teal-700 text-lg">
                    {formatCurrency((parseFloat(selected.monthly_rent) || 0) + (parseFloat(selected.cam_amount) || 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Categories of Service</h3>
              </div>
              <div className="p-4 bg-white flex flex-wrap gap-2">
                {selected.categories?.length > 0 ? (
                  selected.categories.map((c, i) => (
                    <span key={i} className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20">
                      {c.category}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">No categories assigned</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700">Lease Details</h3>
                </div>
                <div className="p-4 space-y-4 bg-white">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Lease Period</p>
                    <p className="font-medium text-slate-900">
                      {selected.lease_start ? formatDate(selected.lease_start) : '—'} <span className="text-slate-400 mx-2">to</span> {selected.lease_end ? formatDate(selected.lease_end) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">Lease Status</p>
                    <LeaseBadge status={selected.lease_status} daysLeft={selected.days_to_expiry} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700">Escalation Tracker</h3>
                </div>
                <div className="p-4 space-y-4 bg-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Increase %</p>
                      <p className="font-semibold text-slate-900">{selected.escalation_pct ? `${selected.escalation_pct}%` : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Due Date</p>
                      <p className="font-semibold text-slate-900">{selected.escalation_due_date ? formatDate(selected.escalation_due_date) : '—'}</p>
                    </div>
                  </div>
                  
                  {selected.escalation_due_date && (
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                      <div>
                         <p className="text-xs text-slate-500 mb-1.5">Status</p>
                         <EscalationBadge status={selected.escalation_status} daysLeft={selected.escalation_days_left} />
                      </div>
                      <div className="text-right">
                         <p className="text-xs text-teal-600 mb-1">New Rent</p>
                         <p className="font-bold text-teal-700">{selected.escalation_new_rent ? formatCurrency(selected.escalation_new_rent) : '—'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selected.attachment_url && (
              <div className="rounded-xl border border-slate-200 overflow-hidden mt-4">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700">Documents</h3>
                </div>
                <div className="p-4 bg-white">
                  <button type="button" onClick={() => setPinModalFile(selected.attachment_url)} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline">
                    View Lease Agreement
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3
          text-sm font-medium shadow-lg
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {pinModalFile && (
        <PinModal filename={pinModalFile} onClose={() => setPinModalFile(null)} />
      )}
    </div>
  );
}
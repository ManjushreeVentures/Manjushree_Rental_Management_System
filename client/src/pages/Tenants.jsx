import React, { useState, useEffect } from 'react';
import {
  Plus, Users, Pencil, PowerOff, Eye, Trash2,
  AlertTriangle, Clock, TrendingUp,
  ChevronDown, ChevronUp, CheckCircle2, Phone, Mail, FileText, X
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
import { unitApi } from '../api/unit.api';
import { formatCurrency, formatDate } from '../utils/format';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useToast } from '../contexts/ToastContext';
import PinModal from '../components/PinModal';

function getEscalationIcon(status) {
  if (status === 'Overdue') return AlertTriangle;
  if (status === 'Due Soon') return Clock;
  if (status === 'Applied') return CheckCircle2;
  return null;
}

function getLeaseIcon(status) {
  if (status === 'Expiring Soon') return AlertTriangle;
  return null;
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
              <tr className="bg-gradient-to-r from-teal-50 to-blue-50/50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-3 text-left">Tenant</th>
                <th className="px-4 py-3 text-left">Property</th>
                <th className="px-4 py-3 text-right">Current Rent</th>
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
                <tr key={r.id} className="hover:bg-blue-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.tenant_name}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{r.property_name}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(r.total_rent)}</p>
                    <p className="text-[10px] text-slate-500">Rent: {formatCurrency(r.monthly_rent)} · CAM: {formatCurrency(r.cam_amount)}</p>
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
                    <StatusBadge
                      status={r.escalation_status}
                      icon={getEscalationIcon(r.escalation_status)}
                      sublabel={r.days_left !== null && r.days_left !== undefined && r.escalation_status !== 'Applied' ? (r.days_left >= 0 ? `${r.days_left}d left` : `${Math.abs(r.days_left)}d overdue`) : null}
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
  unit_no: '', lease_start: '', lock_in_period: '', leased_period: '',
  monthly_rent: '', security_deposit: '',
  tenant_area: '', rate_per_sft: '', cam_amount: '',
  escalation_pct: '', escalation_due_date: '', escalation_new_rent: '',
  escalation_applied: false, is_active: true, categories: [],
  files: [], attachment_url: null, unit_ids: [],
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

    const formatDt = (d) => d ? d.split('T')[0] : '';

    return {
      ...initial,
      lease_start: formatDt(initial.lease_start),
      lock_in_period: initial.lock_in_period || '',
      leased_period: initial.leased_period || '',
      escalation_due_date: formatDt(initial.escalation_due_date),
      escalation_pct: initial.escalation_pct || '5.00',
      categories: catArray,
      monthly_rent: derivedRent || '',
      unit_ids: initial.unit_ids || [],
    };
  });
  const [errors, setErrors] = useState({});
  const [showEsc, setShowEsc] = useState(false);
  const [availableUnits, setAvailableUnits] = useState([]);

  // Fetch available units/blocks when property changes
  React.useEffect(() => {
    if (form.property_id) {
      unitApi.getAll({ property_id: form.property_id }).then(res => {
        setAvailableUnits(res.data || []);
      }).catch(err => console.error("Failed to load units", err));
    } else {
      setAvailableUnits([]);
    }
  }, [form.property_id]);

  const set = (k) => (e) => {
    const val = e.target.value;
    setForm((f) => {
      const updated = { ...f, [k]: val };
      // Bidirectional auto-calculation for rent escalation
      if (k === 'escalation_pct' || k === 'monthly_rent') {
        const base = parseFloat(updated.monthly_rent) || 0;
        const pctStr = updated.escalation_pct;

        if (pctStr === '' || pctStr === null) {
          updated.escalation_new_rent = '';
        } else if (base > 0) {
          const pct = parseFloat(pctStr) || 0;
          updated.escalation_new_rent = (base * (1 + pct / 100)).toFixed(2);
        }
      } else if (k === 'escalation_new_rent') {
        const base = parseFloat(updated.monthly_rent) || 0;
        const newRentStr = updated.escalation_new_rent;

        if (newRentStr === '' || newRentStr === null) {
          updated.escalation_pct = '';
        } else if (base > 0) {
          const newRent = parseFloat(newRentStr) || 0;
          const diff = newRent - base;
          const pct = (diff / base) * 100;
          updated.escalation_pct = pct.toFixed(2);
        }
      } else if (k === 'lease_start') {
        if (val && !updated.escalation_due_date) {
          // Auto-calculate escalation_due_date as lease_start + 12 months
          const d = new Date(val);
          d.setMonth(d.getMonth() + 12);
          updated.escalation_due_date = d.toISOString().split('T')[0];
        }
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

  const toggleUnit = (unit) => {
    setForm((f) => {
      const isSelected = f.unit_ids?.includes(unit.id);
      const newUnitIds = isSelected
        ? (f.unit_ids || []).filter((id) => id !== unit.id)
        : [...(f.unit_ids || []), unit.id];

      const newUnitNo = availableUnits
        .filter(u => newUnitIds.includes(u.id))
        .map(u => u.name)
        .join(', ');

      return { ...f, unit_ids: newUnitIds, unit_no: newUnitNo };
    });
  };

  const validate = () => {
    const errs = {};
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
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length) {
      setForm(f => ({ ...f, files: [...(f.files || []), ...selectedFiles] }));
    }
    e.target.value = null; // reset
  };

  const removeFile = (index) => {
    setForm(f => ({ ...f, files: (f.files || []).filter((_, i) => i !== index) }));
  };

  const removeExistingAttachment = (url) => {
    setForm(f => {
      if (!f.attachment_url) return f;
      const urls = f.attachment_url.split(',').filter(u => u !== url);
      return { ...f, attachment_url: urls.length > 0 ? urls.join(',') : null };
    });
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
      {/* Property */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Property</label>
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
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-2 block">Blocks / Units</label>
          {availableUnits.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableUnits.map(u => (
                <label key={u.id} className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.unit_ids?.includes(u.id)}
                    onChange={() => toggleUnit(u)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-slate-700">{u.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={form.unit_no}
              onChange={set('unit_no')}
              placeholder="e.g. A-Block, B-Block"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 bg-white/80 w-full"
            />
          )}
        </div>
        <Input label="GSTIN" value={form.gstin} onChange={set('gstin')} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} />
        <Input label="Email" type="email" value={form.email}
          onChange={set('email')} error={errors.email} />
      </div>

      {/* Lease */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Lease Start" type="date" value={form.lease_start} onChange={set('lease_start')} />
        <Input label="Leased Period (Months)" type="number" value={form.leased_period} onChange={set('leased_period')} />
        <Input label="Lock-in Period (Months)" type="number" value={form.lock_in_period} onChange={set('lock_in_period')} />
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

      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
        <label className="text-sm font-medium text-slate-700 mb-2 block">Lease Agreements / Documents</label>

        {/* Existing uploaded documents */}
        {form.attachment_url && (
          <div className="space-y-2 mb-3">
            {form.attachment_url.split(',').map((url, i) => (
              <div key={i} className="flex items-center justify-between bg-blue-50/50 border border-blue-100 p-2 rounded-lg">
                <button type="button" onClick={() => onViewAttachment(url)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline">
                  <FileText className="h-4 w-4" /> Document {i + 1}
                </button>
                <button type="button" onClick={() => removeExistingAttachment(url)} className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Newly selected files waiting to be uploaded */}
        {form.files && form.files.length > 0 && (
          <div className="space-y-2 mb-3">
            {form.files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-slate-700 truncate max-w-[80%]">
                  <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" /> <span className="truncate">{f.name}</span>
                </div>
                <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition flex-shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          multiple
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


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Tenants() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [propFilter, setPropFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [pinModalFile, setPinModalFile] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  const [applyEscalationId, setApplyEscalationId] = useState(null);
  const [applyEscalationDate, setApplyEscalationDate] = useState('');

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

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      let newUrls = [];
      if (form.files && form.files.length > 0) {
        for (const file of form.files) {
          const uploadRes = await tenantApi.uploadFile(file);
          if (uploadRes.fileUrl) newUrls.push(uploadRes.fileUrl);
        }
      }

      const { categories, files, ...tenantData } = form;

      if (newUrls.length > 0) {
        tenantData.attachment_url = tenantData.attachment_url
          ? [tenantData.attachment_url, ...newUrls].join(',')
          : newUrls.join(',');
      }

      const res = await tenantApi.create(tenantData);

      if (categories && categories.length > 0) {
        const catPayload = categories.map(c => ({
          category: c,
          amount: (c === 'Rent & CAM')
            ? (Number(tenantData.monthly_rent || 0) + Number(tenantData.cam_amount || 0))
            : 0
        }));
        await tenantApi.upsertCategories(res.data.id, { categories: catPayload });
      }

      showToast('Tenant added successfully', 'success');
      setModal(null);
      refetch();
      refetchEscal();
    } catch (e) { showToast(e.response?.data?.message || e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      let newUrls = [];
      if (form.files && form.files.length > 0) {
        for (const file of form.files) {
          const uploadRes = await tenantApi.uploadFile(file);
          if (uploadRes.fileUrl) newUrls.push(uploadRes.fileUrl);
        }
      }

      const { categories, files, ...tenantData } = form;

      if (newUrls.length > 0) {
        tenantData.attachment_url = tenantData.attachment_url
          ? [tenantData.attachment_url, ...newUrls].join(',')
          : newUrls.join(',');
      }

      await tenantApi.update(selected.id, tenantData);

      if (categories) {
        const catPayload = categories.map(c => {
          const existingCat = selected.categories?.find(sc => sc.category === c);
          return {
            category: c,
            amount: existingCat ? Number(existingCat.amount) : 0
          };
        });
        await tenantApi.upsertCategories(selected.id, { categories: catPayload });
      }

      showToast('Tenant updated successfully', 'success');
      setModal(null);
      refetch();
      refetchEscal();
    } catch (e) { showToast(e.response?.data?.message || e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = (id) => {
    setConfirmConfig({
      title: 'Deactivate Tenant',
      message: 'Are you sure you want to deactivate this tenant?',
      confirmVariant: 'danger',
      confirmText: 'Deactivate',
      onConfirm: async () => {
        try {
          await tenantApi.remove(id);
          showToast('Tenant deactivated successfully', 'success');
          refetch();
        } catch (e) { showToast(e.message, 'error'); }
      }
    });
  };

  const handleApplyEscalation = (id, name) => {
    setApplyEscalationId(id);
    setApplyEscalationDate('');
    setModal('apply_escalation');
  };

  const submitApplyEscalation = async (e) => {
    e.preventDefault();
    if (!applyEscalationDate) {
      return showToast('Please select the next due date', 'error');
    }
    setApplyingId(applyEscalationId);
    try {
      const res = await tenantApi.applyEscalation(applyEscalationId, { next_due_date: applyEscalationDate });
      showToast(res.message);
      setModal(null);
      refetchEscal();
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally { 
      setApplyingId(null); 
    }
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
          {r.unit_no && <p className="text-xs text-slate-500">Block {r.unit_no}</p>}
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
            [...new Map(r.categories.map(c => [c.category.toLowerCase(), c])).values()].map((c, i) => (
              <span key={i} className="inline-flex items-center rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20" title={c.amount > 0 ? `Amount: ${formatCurrency(c.amount)}` : ''}>
                {c.category}
              </span>
            ))
          ) : <span className="text-xs text-slate-400">—</span>}
        </div>
      ),
    },
    {
      key: 'due_by', label: 'Due by', className: 'hidden sm:table-cell text-slate-600 text-sm',
      render: (r) => r.escalation_due_date ? formatDate(r.escalation_due_date) : '—'
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
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 bg-slate-50/50">
          <Users className="h-5 w-5 text-slate-400" />
          <span className="font-semibold text-slate-900">{tenants.length} Tenant{tenants.length !== 1 ? 's' : ''}</span>
          {(search || propFilter || catFilter) && (
            <span className="ml-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
              Filtered
            </span>
          )}
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
              contact_person: selected.contact_person ?? '',
              notice_period_days: selected.notice_period_days ?? '',
              lock_in_period: selected.lock_in_period ?? '',
              leased_period: selected.leased_period ?? '',
              notes: selected.notes ?? '',
              categories: selected.categories?.map(c => c.category) || [],
              unit_ids: selected.unit_ids || [],
              attachment_url: selected.attachment_url || null,
            }}
            onSubmit={handleEdit}
            loading={saving}
            onViewAttachment={setPinModalFile}
          />
        )}
      </Modal>

      <Modal open={modal === 'apply_escalation'} onClose={() => setModal(null)} title="Apply Rent Escalation" width="max-w-md">
        <form onSubmit={submitApplyEscalation} className="space-y-4">
          <p className="text-sm text-slate-600">
            Applying this escalation will update the tenant's current monthly rent. Please provide the <strong>Next Escalation Due Date</strong> to schedule the next cycle.
          </p>
          <Input 
            label="Next Escalation Due Date *" 
            type="date" 
            value={applyEscalationDate} 
            onChange={e => setApplyEscalationDate(e.target.value)} 
            required 
          />
          <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModal(null)} type="button">Cancel</Button>
            <Button type="submit" disabled={applyingId === applyEscalationId}>
              {applyingId === applyEscalationId ? 'Applying...' : 'Apply Escalation'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'view'} onClose={() => setModal(null)}
        title="Tenant Details" width="max-w-3xl">
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                <p className="text-xs text-blue-600 font-medium mb-1">Tenant Name</p>
                <p className="font-semibold text-slate-900">{selected.name}</p>
                {selected.gstin && <p className="text-[10px] text-slate-500 font-mono mt-1 mb-1">GST: {selected.gstin}</p>}
                {(selected.phone || selected.email) && (
                  <div className="mt-2 pt-2 border-t border-blue-200/50 space-y-1">
                    {selected.phone && <p className="text-xs text-slate-700 font-medium flex items-start gap-1.5"><Phone className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" /> <span className="break-words">{selected.phone}</span></p>}
                    {selected.email && <p className="text-xs text-slate-600 flex items-start gap-1.5"><Mail className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" /> <span className="break-all">{selected.email}</span></p>}
                  </div>
                )}
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-600 font-medium mb-1">Property</p>
                <p className="font-medium text-slate-900">{selected.property_name || '—'}</p>
                {selected.unit_no && <p className="text-xs text-slate-500 mt-0.5">Block {selected.unit_no}</p>}
              </div>
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50">
                <p className="text-xs text-orange-600 font-medium mb-1">Tenant Area</p>
                <p className="font-medium text-slate-900">
                  {selected.tenant_area ? `${Number(selected.tenant_area).toLocaleString('en-IN')} sqft` : '—'}
                </p>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                <p className="text-xs text-emerald-600 font-medium mb-1">Security Deposit</p>
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
                  <p className="text-xs text-teal-700 font-medium mb-1">Total Amount (incl. GST)</p>
                  <p className="font-bold text-teal-700 text-lg">
                    {formatCurrency(selected.categories?.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0)}
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
                  [...new Map(selected.categories.map(c => [c.category.toLowerCase(), c])).values()].map((c, i) => (
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
                    <p className="text-xs text-slate-500 mb-1">Date Of Agreement</p>
                    <p className="font-medium text-slate-900">
                      {selected.lease_start ? formatDate(selected.lease_start) : '—'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Leased Period</p>
                      <p className="font-medium text-slate-900">{selected.leased_period ? `${selected.leased_period} Months` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Lock-in Period</p>
                      <p className="font-medium text-slate-900">{selected.lock_in_period ? `${selected.lock_in_period} Months` : '—'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">Lease Status</p>
                    <StatusBadge
                      status={selected.lease_status}
                      icon={getLeaseIcon(selected.lease_status)}
                      sublabel={selected.days_to_expiry !== null && selected.days_to_expiry !== undefined ? (selected.days_to_expiry >= 0 ? `${selected.days_to_expiry}d left` : `${Math.abs(selected.days_to_expiry)}d ago`) : null}
                    />
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
                        <StatusBadge
                          status={selected.escalation_status}
                          icon={getEscalationIcon(selected.escalation_status)}
                          sublabel={selected.escalation_days_left !== null && selected.escalation_days_left !== undefined && selected.escalation_status !== 'Applied' ? (selected.escalation_days_left >= 0 ? `${selected.escalation_days_left}d left` : `${Math.abs(selected.escalation_days_left)}d overdue`) : null}
                        />
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
                <div className="p-4 bg-white space-y-2">
                  {selected.attachment_url.split(',').map((url, i) => (
                    <div key={i}>
                      <button type="button" onClick={() => setPinModalFile(url)} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline">
                        <FileText className="h-4 w-4" /> View Document {i + 1}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {pinModalFile && (
        <PinModal filename={pinModalFile} onClose={() => setPinModalFile(null)} />
      )}

      {confirmConfig && (
        <ConfirmModal
          open={!!confirmConfig}
          onClose={() => setConfirmConfig(null)}
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          confirmText={confirmConfig.confirmText}
          confirmVariant={confirmConfig.confirmVariant}
        />
      )}
    </div>
  );
}
import { useState, useRef } from 'react';
import {
  Receipt as ReceiptIcon, Plus, Trash2,
  Banknote, CreditCard, Landmark,
  Smartphone, Wallet, MoreHorizontal,
  Paperclip, X, CheckCircle2
} from 'lucide-react';
import PageHeader   from '../components/ui/PageHeader';
import { Table }    from '../components/ui/Table';
import Modal        from '../components/ui/Modal';
import Input        from '../components/ui/Input';
import Button       from '../components/ui/Button';
import StatusBadge  from '../components/ui/StatusBadge';
import Pagination   from '../components/ui/Pagination';
import FilterBar    from '../components/ui/FilterBar';
import { useAsync } from '../hooks/useAsync';
import { receiptApi }  from '../api/receipt.api';
import { invoiceApi }  from '../api/invoice.api';
import { formatCurrency, formatDate, formatBillingMonth, getCurrentBillingMonth } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import KPICard from '../components/ui/KPICard';
import { useTenantSearch } from '../hooks/useTenantSearch';
import { receivableApi } from '../api/receivable.api';
import PinModal from '../components/PinModal';
import ConfirmModal from '../components/ui/ConfirmModal';

const PAYMENT_MODES = ['NEFT', 'RTGS', 'Cheque', 'UPI', 'Cash', 'Other'];

const modeIcons = {
  NEFT:   Landmark,
  RTGS:   Landmark,
  Cheque: CreditCard,
  UPI:    Smartphone,
  Cash:   Banknote,
  Other:  MoreHorizontal,
};

const modeColors = {
  NEFT:   'bg-blue-50   text-blue-700',
  RTGS:   'bg-indigo-50 text-indigo-700',
  Cheque: 'bg-purple-50 text-purple-700',
  UPI:    'bg-green-50  text-green-700',
  Cash:   'bg-yellow-50 text-yellow-700',
  Other:  'bg-slate-100 text-slate-600',
};

function ReceiptKPIs({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      <KPICard 
        label="Total Collected" 
        value={formatCurrency(stats.total_collected)} 
        icon={<Banknote className="h-5 w-5 text-emerald-600" />} 
        iconBgClass="bg-emerald-50" 
      />
      <KPICard 
        label="Receipt Count" 
        value={stats.total_receipts} 
        icon={<ReceiptIcon className="h-5 w-5 text-blue-600" />} 
        iconBgClass="bg-blue-50" 
      />
    </div>
  );
}

// ─── Record Payment Form ──────────────────────────────────────────────────────
const emptyForm = {
  payment_date:   new Date().toISOString().split('T')[0],
  payment_mode:   'NEFT',
  reference_no:   '',
  remarks:        '',
  attachment_url: '',
};

function RecordPaymentForm({ onSubmit, loading, showToast }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [invoices, setInvoices] = useState([]);
  const [allocations, setAllocations] = useState({}); // { invoice_id: { checked, amount, outstanding } }
  const [totalPayment, setTotalPayment] = useState('');

  const { search: tenantSearch, options: tenantOptions, searching, searchTenants, clearSearch } = useTenantSearch();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await receiptApi.uploadFile(file);
      setForm((f) => ({ ...f, attachment_url: res.url }));
    } catch (err) {
      showToast(err.message || 'Failed to upload file', 'error');
    } finally {
      setUploading(false);
    }
  };

  const selectTenant = async (tenant) => {
    setSelectedTenant(tenant);
    searchTenants(tenant.name);
    try {
      const res = await receivableApi.getTenantOutstanding(tenant.id);
      const outInvs = (res.data?.invoices || []).filter(i => i.outstanding_balance > 0);
      setInvoices(outInvs);
      const allocMap = {};
      outInvs.forEach(i => {
        allocMap[i.id] = { checked: true, amount: '', outstanding: parseFloat(i.outstanding_balance) };
      });
      setAllocations(allocMap);
    } catch (err) {
      showToast('Failed to load outstanding invoices', 'error');
    }
  };

  const clearTenantSelection = () => {
    setSelectedTenant(null);
    setInvoices([]);
    setAllocations({});
    setTotalPayment('');
    clearSearch();
  };

  const handleAutoAllocate = () => {
    const total = parseFloat(totalPayment);
    if (!total || total <= 0) return;
    let remaining = total;
    
    const newAlloc = { ...allocations };
    const checkedInvs = invoices.filter(i => newAlloc[i.id].checked).sort((a,b) => new Date(a.due_date) - new Date(b.due_date));
    
    Object.keys(newAlloc).forEach(k => { newAlloc[k].amount = ''; });

    for (const inv of checkedInvs) {
      if (remaining <= 0) break;
      const outst = newAlloc[inv.id].outstanding;
      const allocAmount = Math.min(remaining, outst);
      newAlloc[inv.id].amount = allocAmount.toFixed(2);
      remaining -= allocAmount;
    }
    
    if (remaining > 0) {
      showToast(`₹${formatCurrency(remaining)} remaining unallocated.`, 'warning');
    }
    setAllocations(newAlloc);
  };

  const toggleInvoice = (id) => {
    setAllocations(prev => ({
      ...prev,
      [id]: { ...prev[id], checked: !prev[id].checked, amount: prev[id].checked ? '' : prev[id].amount }
    }));
  };

  const setAllocAmount = (id, val) => {
    setAllocations(prev => ({
      ...prev,
      [id]: { ...prev[id], amount: val, checked: true }
    }));
  };

  const validate = () => {
    const errs = {};
    if (!selectedTenant) errs.tenant_id = 'Select a tenant';
    
    const validAllocs = Object.entries(allocations).filter(([_, v]) => v.checked && parseFloat(v.amount) > 0);
    if (validAllocs.length === 0 && selectedTenant) {
      errs.allocations = 'Allocate amount to at least one invoice';
    } else {
      for (const [id, v] of validAllocs) {
        if (parseFloat(v.amount) > v.outstanding) {
          errs.allocations = 'Allocation exceeds outstanding balance on one or more invoices';
          break;
        }
      }
    }
    
    if (!form.payment_date) errs.payment_date = 'Required';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const finalAllocations = Object.entries(allocations)
      .filter(([_, v]) => v.checked && parseFloat(v.amount) > 0)
      .map(([id, v]) => ({ invoice_id: id, amount: parseFloat(v.amount) }));
      
    onSubmit({ ...form, allocations: finalAllocations });
  };

  const totalAllocated = Object.values(allocations)
    .filter(v => v.checked && parseFloat(v.amount) > 0)
    .reduce((sum, v) => sum + parseFloat(v.amount), 0);

  return (
    <div className="space-y-4">
      {/* tenant search */}
      <div className="flex flex-col gap-1 relative">
        <label className="text-xs font-medium text-slate-600">Tenant *</label>
        <input
          value={tenantSearch}
          onChange={(e) => searchTenants(e.target.value)}
          placeholder="Type tenant name…"
          className={`rounded-lg border px-3 py-2 text-sm outline-none
            focus:ring-2 focus:ring-blue-500
            ${errors.tenant_id ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
        />
        {errors.tenant_id && <p className="text-xs text-red-500">{errors.tenant_id}</p>}

        {/* dropdown */}
        {!selectedTenant && tenantSearch.length >= 2 && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl
            border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto">
            {searching && (
              <p className="px-4 py-3 text-xs text-slate-400 animate-pulse">Searching…</p>
            )}
            {!searching && tenantOptions.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-500">No matching tenants found</p>
            )}
            {tenantOptions.map((t) => (
              <button key={t.id} type="button"
                onClick={() => selectTenant(t)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50
                  border-b border-slate-100 last:border-0 transition">
                <p className="text-sm font-medium text-slate-800">
                  {t.name}
                  {t.property_name && <span className="ml-2 text-xs text-slate-400">{t.property_name}</span>}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* selected tenant summary */}
      {selectedTenant && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm relative mb-4">
          <button type="button" onClick={clearTenantSelection} className="absolute top-2 right-2 p-1 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-blue-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
          <p className="font-semibold text-blue-900">{selectedTenant.name}</p>
        </div>
      )}

      {selectedTenant && (
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 bg-white shadow-sm">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex flex-col w-full sm:w-2/3">
              <label className="text-xs font-medium text-slate-600 mb-1">Total Payment Received</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={totalPayment} 
                  onChange={(e) => setTotalPayment(e.target.value)} 
                  placeholder="e.g. 300000"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                />
                <Button variant="secondary" size="sm" onClick={handleAutoAllocate}>
                  Auto Allocate
                </Button>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-500">Allocated</p>
              <p className={`font-bold ${totalAllocated > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                {formatCurrency(totalAllocated)}
              </p>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-1">
            {invoices.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No outstanding invoices found for this tenant.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-100">
                    <th className="px-3 py-2 font-medium"></th>
                    <th className="px-3 py-2 font-medium">Month / Category</th>
                    <th className="px-3 py-2 font-medium text-right">Outstanding</th>
                    <th className="px-3 py-2 font-medium text-right w-32">Allocate (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const alloc = allocations[inv.id] || { checked: false, amount: '', outstanding: 0 };
                    const isExceeded = parseFloat(alloc.amount) > alloc.outstanding;
                    return (
                      <tr key={inv.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 transition ${alloc.checked ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-3 py-3 w-8">
                          <input 
                            type="checkbox" 
                            checked={alloc.checked} 
                            onChange={() => toggleInvoice(inv.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-800">{formatBillingMonth(inv.billing_month)}</p>
                          <p className="text-xs text-slate-500">{inv.category}</p>
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-red-600">
                          {formatCurrency(alloc.outstanding)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input 
                            type="number"
                            value={alloc.amount}
                            onChange={(e) => setAllocAmount(inv.id, e.target.value)}
                            className={`w-full text-right rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${isExceeded ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200'}`}
                            placeholder="0"
                            disabled={!alloc.checked}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {errors.allocations && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-100">
              <p className="text-xs text-red-600 font-medium">{errors.allocations}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Payment Date *"
          type="date"
          value={form.payment_date}
          onChange={set('payment_date')}
          error={errors.payment_date}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Payment Mode *</label>
          <select
            value={form.payment_mode}
            onChange={set('payment_mode')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm
              outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <Input
          label="Reference / UTR No"
          value={form.reference_no}
          onChange={set('reference_no')}
          placeholder="UTR / Cheque no."
        />

        <div className="col-span-1 sm:col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Receipt Attachment (PDF, Image)</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {uploading && (
              <span className="text-xs text-blue-600 animate-pulse font-medium">Uploading…</span>
            )}
            {!uploading && form.attachment_url && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Ready
              </span>
            )}
          </div>
        </div>

        <div className="col-span-1 sm:col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Remarks</label>
          <textarea
            value={form.remarks}
            onChange={set('remarks')}
            rows={2}
            placeholder="Optional notes…"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm
              outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="primary" loading={loading} onClick={handleSubmit}>
          Record Payment
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const defaultFilters = {
  search: '', payment_mode: '', billing_month: '', category: '',
  date_from: '', date_to: '',
};

export default function Receipts() {
  const { showToast } = useToast();
  const [filters,   setFilters]   = useState(defaultFilters);
  const [page,      setPage]      = useState(1);
  const [modal,     setModal]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [pinAction, setPinAction] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  const { data, loading, error, refetch } = useAsync(
    () => receiptApi.getAll({ ...filters, page, limit: 50 }),
    [filters, page]
  );

  const { data: statsData, refetch: refetchStats } = useAsync(
    () => receiptApi.getStats({
      date_from:     filters.date_from     || undefined,
      date_to:       filters.date_to       || undefined,
      billing_month: filters.billing_month || undefined,
    }),
    [filters.date_from, filters.date_to, filters.billing_month]
  );

  const { data: monthsData } = useAsync(
    () => invoiceApi.getBillingMonths(), []
  );

  const receipts = data?.data  ?? [];
  const meta     = data?.meta  ?? {};
  const stats    = statsData?.data;
  const months   = monthsData?.data ?? [];

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await receiptApi.create(form);
      showToast('Receipt recorded successfully', 'success');
      setModal(false);
      refetch();
      refetchStats();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    setConfirmConfig({
      title: 'Delete Receipt',
      message: 'Delete this receipt? The invoice balance will be restored.',
      confirmVariant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await receiptApi.remove(id);
          showToast('Receipt deleted successfully');
          refetch();
          refetchStats();
        } catch (err) {
          showToast(err.response?.data?.message || err.message, 'error');
        }
      }
    });
  };

  const filterConfig = [
    { key: 'search',        type: 'text',   value: filters.search,
      placeholder: 'Search tenant, property, ref…' },
    { key: 'billing_month', type: 'select', value: filters.billing_month,
      placeholder: 'All Months',
      options: months.map((m) => ({ value: m, label: formatBillingMonth(m) })) },
    { key: 'payment_mode',  type: 'select', value: filters.payment_mode,
      placeholder: 'All Modes', options: PAYMENT_MODES },
    { key: 'category',      type: 'select', value: filters.category,
      placeholder: 'All Categories', options: ['Rent & CAM', 'Water Charges', 'Power Charges', 'Infrastructural'] },
    { key: 'date_from',     type: 'text',   value: filters.date_from,
      placeholder: 'Date from (YYYY-MM-DD)' },
    { key: 'date_to',       type: 'text',   value: filters.date_to,
      placeholder: 'Date to (YYYY-MM-DD)'   },
  ];

  const columns = [
    {
      key: 'tenant_name', label: 'Tenant',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.tenant_name}</p>
          <p className="text-xs text-slate-400">{r.property_name}</p>
        </div>
      ),
    },
    {
      key: 'billing_month', label: 'Invoice Month',
      render: (r) => (
        <span className="text-sm text-slate-700">{formatBillingMonth(r.billing_month)}</span>
      ),
    },
    {
      key: 'category', label: 'Category',
      render: (r) => (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {r.category}
        </span>
      ),
    },
    {
      key: 'amount', label: 'Amount', className: 'text-right',
      render: (r) => (
        <span className="text-base font-bold text-emerald-700">
          {formatCurrency(r.amount)}
        </span>
      ),
    },
    {
      key: 'payment_date', label: 'Date',
      render: (r) => (
        <span className="text-sm text-slate-600">{formatDate(r.payment_date)}</span>
      ),
    },
    {
      key: 'payment_mode', label: 'Mode', className: 'hidden md:table-cell',
      render: (r) => {
        const Icon = modeIcons[r.payment_mode] ?? Wallet;
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full
            px-2.5 py-0.5 text-xs font-medium ${modeColors[r.payment_mode] ?? modeColors.Other}`}>
            <Icon className="h-3 w-3" />
            {r.payment_mode}
          </span>
        );
      },
    },
    {
      key: 'reference_no', label: 'Ref / Remarks', className: 'hidden lg:table-cell',
      render: (r) => (
        <div>
          <span className="font-mono text-xs text-slate-600 block">{r.reference_no || '—'}</span>
          {r.remarks && (
            <span className="text-[10px] text-slate-400 mt-0.5 block truncate max-w-[150px]" title={r.remarks}>
              {r.remarks}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'attachment_url', label: 'Attachment',
      render: (r) => {
        if (!r.attachment_url) return <span className="text-slate-400">—</span>;
        return (
          <button
            onClick={() => setPinAction({ type: 'view', url: r.attachment_url })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="View Document"
          >
            <Paperclip className="h-4 w-4 shrink-0" />
          </button>
        );
      },
    },
    {
      key: 'invoice_status', label: 'Invoice Status', className: 'hidden md:table-cell',
      render: (r) => <StatusBadge status={r.invoice_status} />,
    },
    {
      key: 'invoice_outstanding', label: 'Remaining', className: 'text-right',
      render: (r) => (
        <span className={`text-sm font-semibold ${
          r.invoice_outstanding > 0 ? 'text-red-500' : 'text-emerald-600'
        }`}>
          {r.invoice_outstanding > 0
            ? formatCurrency(r.invoice_outstanding)
            : <span className="flex items-center justify-end gap-1"><CheckCircle2 className="h-3 w-3" /> Cleared</span>}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <button
          onClick={() => handleDelete(r.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300
            hover:text-red-500 transition"
          title="Delete receipt & restore balance"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Receipts"
        description="Record and track all payments received against invoices"
        actions={
          <Button onClick={() => setModal(true)}>
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KPICard 
          label="Total Collected" 
          value={formatCurrency(stats?.total_collected)} 
          icon={<Banknote className="h-5 w-5 text-emerald-600" />} 
          iconBgClass="bg-emerald-50" 
        />
        <KPICard 
          label="Receipt Count" 
          value={stats?.total_receipts} 
          icon={<ReceiptIcon className="h-5 w-5 text-blue-600" />} 
          iconBgClass="bg-blue-50" 
        />
      </div>

      <FilterBar
        filters={filterConfig}
        onChange={updateFilter}
        onReset={() => { setFilters(defaultFilters); setPage(1); }}
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <ReceiptIcon className="h-5 w-5 text-slate-400" />
          <span className="font-semibold text-slate-900">
            {meta.total ?? 0} Receipt{meta.total !== 1 ? 's' : ''}
          </span>
          {Object.values(filters).some(Boolean) && (
            <span className="ml-1 text-xs text-blue-600 bg-blue-50
              px-2 py-0.5 rounded-full font-medium">
              Filtered
            </span>
          )}
        </div>

        {error
          ? <p className="px-5 py-10 text-center text-sm text-red-500">{error}</p>
          : <Table columns={columns} data={receipts} loading={loading} />
        }

        <Pagination
          page={meta.page   ?? 1}
          pages={meta.pages ?? 1}
          total={meta.total ?? 0}
          limit={50}
          onChange={setPage}
        />
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Record Payment"
        width="max-w-xl"
      >
        <RecordPaymentForm onSubmit={handleCreate} loading={saving} />
      </Modal>

      {pinAction?.type === 'view' && (
        <PinModal filename={pinAction.url} onClose={() => setPinAction(null)} />
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
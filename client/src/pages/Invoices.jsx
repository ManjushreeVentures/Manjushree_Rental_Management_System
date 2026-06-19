import { useState, useEffect } from 'react';
import {
  FileText, Eye, TrendingDown,
  TrendingUp, Clock, CheckCircle2,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import FilterBar from '../components/ui/FilterBar';
import { useAsync } from '../hooks/useAsync';
import { invoiceApi } from '../api/invoice.api';
import { formatCurrency, formatDate, formatBillingMonth, getCurrentBillingMonth } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import KPICard from '../components/ui/KPICard';
import { Plus, X, Trash2, AlertTriangle } from 'lucide-react';
import { tenantApi } from '../api/tenant.api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { agingConfig } from '../utils/constants';

const getAgingColor = (bucket) => {
  if (!bucket) return 'bg-slate-100 text-slate-600';
  const normalized = bucket.replace('-', '–');
  const conf = agingConfig.find(c => c.label === normalized);
  return conf ? `${conf.bg} ${conf.text}` : 'bg-slate-100 text-slate-600';
};

const AGING_BUCKETS = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'];
const STATUSES = ['Pending', 'Paid', 'Partial'];





function InvoiceKPIs({ stats }) {
  if (!stats) return null;
  const cards = [
    {
      label: 'Total Billed', value: formatCurrency(stats.total_billed),
      icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />, iconBgClass: 'bg-blue-50'
    },
    {
      label: 'Collected', value: formatCurrency(stats.total_collected),
      icon: <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />, iconBgClass: 'bg-emerald-50'
    },
    {
      label: 'Outstanding', value: formatCurrency(stats.total_outstanding),
      icon: <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />, iconBgClass: 'bg-red-50'
    },
    {
      label: 'Invoices',
      value: `${stats.paid_count} / ${stats.total_invoices}`,
      icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />, iconBgClass: 'bg-slate-100'
    },
  ];
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <KPICard key={c.label} label={c.label} value={c.value} icon={c.icon} iconBgClass={c.iconBgClass} />
      ))}
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────
function InvoiceDetail({ invoice }) {
  if (!invoice) return null;
  return (
    <div className="space-y-5 text-sm">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-slate-900">{invoice.tenant_name}</p>
          <p className="text-slate-500">{invoice.property_name}
            {invoice.tenant_unit ? ` · Unit ${invoice.tenant_unit}` : ''}
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      {/* amounts */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Bill Amount', value: formatCurrency(invoice.bill_amount), cls: 'text-slate-900' },
          { label: 'Collected', value: formatCurrency(invoice.amount_collected), cls: 'text-emerald-700' },
          { label: 'Outstanding', value: formatCurrency(invoice.outstanding_balance), cls: 'text-red-600' },
        ].map((i) => (
          <div key={i.label} className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <p className="text-xs text-slate-500">{i.label}</p>
            <p className={`text-base font-bold mt-1 ${i.cls}`}>{i.value}</p>
          </div>
        ))}
      </div>

      {/* details grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border
        border-slate-200 bg-slate-50 p-4">
        {[
          ['Category', invoice.category],
          ['Billing Month', formatBillingMonth(invoice.billing_month)],
          ['Bill Date', formatDate(invoice.bill_date)],
          ['Due Date', formatDate(invoice.due_date)],
          ['Credit Terms', invoice.credit_terms_days ? `${invoice.credit_terms_days} days` : '—'],
          ['Overdue By', invoice.overdue_by_days > 0 ? `${invoice.overdue_by_days} days` : '—'],
          ['Aging Bucket', invoice.aging_bucket],
          ['Tenant GSTIN', invoice.tenant_gstin || '—'],
          ['Tenant Phone', invoice.tenant_phone || '—'],
          ['Tenant Email', invoice.tenant_email || '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-slate-400">{k}</p>
            <p className="text-sm font-medium text-slate-700">{v || '—'}</p>
          </div>
        ))}
      </div>

      {/* receipts */}
      {invoice.receipts?.length > 0 && (
        <div>
          <p className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Payment History
          </p>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {invoice.receipts.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-slate-800">{formatCurrency(r.amount)}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(r.payment_date)} · {r.payment_mode || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{r.reference_no || '—'}</p>
                  {r.remarks && <p className="text-xs text-slate-400 italic">{r.remarks}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const defaultFilters = {
  search: '', status: '', aging_bucket: '',
  billing_month: '', category: '',
};

export default function Invoices() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [singleGenOpen, setSingleGenOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data, loading, error, refetch } = useAsync(
    () => invoiceApi.getAll({ ...filters, page, limit: 50 }),
    [filters, page]
  );

  const { data: statsData, refetch: refetchStats } = useAsync(
    () => invoiceApi.getStats(
      filters.billing_month ? { billing_month: filters.billing_month } : {}
    ),
    [filters.billing_month]
  );

  const { data: monthsData } = useAsync(
    () => invoiceApi.getBillingMonths(), []
  );

  const invoices = data?.data ?? [];
  const meta = data?.meta ?? {};
  const stats = statsData?.data;
  const months = monthsData?.data ?? [];

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const openDetail = async (inv) => {
    setSelected(inv);
    setDetailOpen(true);
    setLoadingDetail(true);
    try {
      const res = await invoiceApi.getById(inv.id);
      setDetailData(res.data);
    } catch { setDetailData(inv); }
    finally { setLoadingDetail(false); }
  };

  const handleDeleteInvoice = (id, e) => {
    e.stopPropagation();
    setConfirmConfig({
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this invoice? This will also remove any receipts associated with it. This action cannot be undone.',
      confirmVariant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setDeletingId(id);
        try {
          await invoiceApi.delete(id);
          showToast('Invoice deleted successfully');
          refetch();
          refetchStats();
        } catch (err) {
          showToast(err.response?.data?.message || err.message, 'error');
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const filterConfig = [
    {
      key: 'search', type: 'text', value: filters.search,
      placeholder: 'Search tenant, property…'
    },
    {
      key: 'billing_month', type: 'select', value: filters.billing_month,
      placeholder: 'All Months',
      options: months.map((m) => ({ value: m, label: formatBillingMonth(m) }))
    },
    {
      key: 'status', type: 'select', value: filters.status,
      placeholder: 'All Statuses', options: STATUSES
    },
    {
      key: 'aging_bucket', type: 'select', value: filters.aging_bucket,
      placeholder: 'All Aging', options: AGING_BUCKETS
    },
    {
      key: 'category', type: 'select', value: filters.category,
      placeholder: 'All Categories', options: ['Rent & CAM', 'Water Charges', 'Power Charges', 'Infrastructural']
    },
  ];


  const columns = [
    {
      key: 'tenant_name', label: 'Tenant',
      render: (r) => {
        const isExpired = r.tenant_lease_end && new Date(r.tenant_lease_end) < new Date();
        return (
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openDetail(r)}
                className="font-semibold text-blue-600 hover:text-blue-800 transition-colors text-left"
              >
                {r.tenant_name}
              </button>
              {isExpired && (
                <span title="Lease Expired" className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Expired</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{r.property_name}</p>
          </div>
        );
      },
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
      key: 'billing_month', label: 'Month',
      render: (r) => <span className="text-xs text-slate-600">{formatBillingMonth(r.billing_month)}</span>
    },
    {
      key: 'bill_date', label: 'Bill Date', className: 'hidden lg:table-cell',
      render: (r) => <span className="text-xs text-slate-500">{formatDate(r.bill_date)}</span>,
    },
    {
      key: 'due_date', label: 'Due Date', className: 'hidden md:table-cell',
      render: (r) => (
        <span className={`text-xs ${r.overdue_by_days > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
          {formatDate(r.due_date)}
          {r.overdue_by_days > 0 && ` (+${r.overdue_by_days}d)`}
        </span>
      ),
    },
    {
      key: 'bill_amount', label: 'Billed', className: 'text-right',
      render: (r) => (
        <span className="font-semibold text-slate-900">{formatCurrency(r.bill_amount)}</span>
      ),
    },

    {
      key: 'outstanding_balance', label: 'Outstanding', className: 'text-right',
      render: (r) => (
        <span className={`font-semibold ${r.outstanding_balance > 0 ? 'text-red-600' : 'text-slate-400'}`}>
          {r.outstanding_balance > 0 ? formatCurrency(r.outstanding_balance) : '—'}
        </span>
      ),
    },
    {
      key: 'aging_bucket', label: 'Aging', className: 'hidden md:table-cell',
      render: (r) => {
        if (r.status === 'Paid' || r.outstanding_balance <= 0) {
          return <span className="text-slate-400">—</span>;
        }
        return (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getAgingColor(r.aging_bucket)}`}>
            {r.aging_bucket}
          </span>
        );
      },
    },
    {
      key: 'status', label: 'Status',
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center justify-end w-4 gap-1">
          <button
            onClick={(e) => handleDeleteInvoice(r.id, e)}
            disabled={deletingId === r.id}
            className={`p-1.5 rounded-lg transition-colors ${deletingId === r.id ? 'text-red-400' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'}`}
            title="Delete Invoice"
          >
            {deletingId === r.id ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="All billed invoices imported from Excel"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSingleGenOpen(true)}>
              <FileText className="h-4 w-4" /> Single Invoice
            </Button>
            <Button onClick={() => setGenOpen(true)}>
              <Plus className="h-4 w-4" /> Bulk Generate Invoices
            </Button>
          </div>
        }
      />
      {stats && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <KPICard label="Total Billed" value={formatCurrency(stats.total_billed)} icon={<FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />} iconBgClass="bg-blue-50" />
          <KPICard label="Collected" value={formatCurrency(stats.total_collected)} icon={<CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />} iconBgClass="bg-emerald-50" />
          <KPICard label="Outstanding" value={formatCurrency(stats.total_outstanding)} icon={<TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />} iconBgClass="bg-red-50" />
          <KPICard label="Invoices" value={`${stats.paid_count} / ${stats.total_invoices}`} icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />} iconBgClass="bg-slate-100" />
        </div>
      )}

      <FilterBar
        filters={filterConfig}
        onChange={updateFilter}
        onReset={() => { setFilters(defaultFilters); setPage(1); }}
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* header */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <FileText className="h-5 w-5 text-slate-400" />
          <span className="font-semibold text-slate-900">
            {meta.total ?? 0} Invoice{meta.total !== 1 ? 's' : ''}
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
          : <Table columns={columns} data={invoices} loading={loading} />
        }

        <Pagination
          page={meta.page ?? 1}
          pages={meta.pages ?? 1}
          total={meta.total ?? 0}
          limit={50}
          onChange={setPage}
        />
      </div>

      {/* Detail modal */}
      <Modal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailData(null); }}
        title="Invoice Detail"
        width="max-w-2xl"
      >
        {loadingDetail
          ? <p className="py-10 text-center text-sm text-slate-400 animate-pulse">Loading…</p>
          : <InvoiceDetail invoice={detailData} />
        }
      </Modal>
      <BulkGenerateInvoices
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onSuccess={(msg, month) => { 
          showToast(msg); 
          if (month && filters.billing_month !== month) {
            updateFilter('billing_month', month);
          } else {
            refetch();
            refetchStats();
          }
        }}
      />
      <GenerateInvoiceModal
        open={singleGenOpen}
        onClose={() => setSingleGenOpen(false)}
        onSuccess={(msg, month) => { 
          showToast(msg); 
          if (month && filters.billing_month !== month) {
            updateFilter('billing_month', month);
          } else {
            refetch();
            refetchStats();
          }
        }}
      />

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

// ─── Bulk Generate Invoices Modal ──────────────────────────────────────────────
function BulkGenerateInvoices({ open, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [billingMonth, setBillingMonth] = useState('');
  const [billDate, setBillDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [category, setCategory] = useState('Rent & CAM');
  const [saving, setSaving] = useState(false);

  const { data: tenantsData } = useAsync(() => tenantApi.getAll({ is_active: true }), []);
  const tenants = tenantsData?.data ?? [];

  const [excludedTenantIds, setExcludedTenantIds] = useState(new Set());

  useEffect(() => {
    if (open) {
      setBillingMonth('');
      setBillDate(new Date().toISOString().split('T')[0]);
      setCategory('Rent & CAM');
      setExcludedTenantIds(new Set());
    }
  }, [open, tenantsData]);

  const toggleExclude = (id) => {
    setExcludedTenantIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!billingMonth) {
      showToast('Please select a billing month', 'error');
      return;
    }
    if (!category) {
      showToast('Please select a category', 'error');
      return;
    }
    setSaving(true);
    try {
      const [y, m] = billingMonth.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedMonth = `${months[parseInt(m) - 1]}-${y}`;

      const res = await invoiceApi.bulkGenerate({
        billing_month: formattedMonth,
        bill_date: billDate,
        category: category,
        exclude_tenant_ids: Array.from(excludedTenantIds)
      });
      
      showToast(res.message, 'success');
      onSuccess(res.message, formattedMonth);
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Bulk Generate Invoices" width="max-w-md">
      <div className="space-y-4">
        <p className="mb-6 text-sm text-slate-500">
        Generate invoices for all active tenants. You can filter by category or property.
      </p>

        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
          <p>This will automatically generate invoices for <strong>all active tenants</strong> for the selected month using their saved amounts for the selected category.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Category *</label>
          <select value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm
              outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {['Rent & CAM', 'Water Charges', 'Power Charges', 'Infrastructural'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Billing Month *</label>
          <input type="month" value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm
              outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        
        <Input label="Bill Date" type="date" value={billDate}
          onChange={(e) => setBillDate(e.target.value)} />

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">Select Tenants to Include</label>
            <span className="text-xs text-blue-600 font-medium">{tenants.length - excludedTenantIds.size} selected</span>
          </div>
          <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white p-2 space-y-1">
            {tenants.map(t => (
              <label key={t.id} className="flex items-center gap-3 text-sm hover:bg-slate-50 p-2 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5 shrink-0"
                  checked={!excludedTenantIds.has(t.id)} 
                  onChange={() => toggleExclude(t.id)}
                />
                <div className="min-w-0">
                  <p className={`font-medium ${excludedTenantIds.has(t.id) ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{t.name}</p>
                  <p className="text-xs text-slate-400 truncate">{t.property_name}</p>
                </div>
              </label>
            ))}
            {tenants.length === 0 && (
              <p className="text-xs text-slate-400 p-2 text-center">No active tenants found.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleGenerate}>
            Generate Invoices
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Generate Single Invoice Modal ─────────────────────────────────────────────
function GenerateInvoiceModal({ open, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [tenantId, setTenantId] = useState('');
  const [billingMonth, setBillingMonth] = useState('');
  const [billDate, setBillDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [categories, setCategories] = useState([
    { category: 'Rent & CAM', amount: '' },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTenantId('');
      setBillingMonth('');
      setBillDate(new Date().toISOString().split('T')[0]);
      setCategories([{ category: 'Rent & CAM', amount: '' }]);
      setBaseRent(null);
    }
  }, [open]);

  const { data: tenantsData } = useAsync(() => tenantApi.getAll({}), []);
  const tenants = tenantsData?.data ?? [];

  const [escalationWarning, setEscalationWarning] = useState(false);
  const [baseRent, setBaseRent] = useState(null);

  // Auto-calculate rent based on billing month and tenant
  useEffect(() => {
    if (!tenantId || !billingMonth || baseRent === null) {
      setEscalationWarning(false);
      return;
    }
    const t = tenants.find((x) => String(x.id) === String(tenantId));
    if (!t) return;

    let appliedEscalation = false;

    setCategories((prev) => {
      return prev.map((c) => {
        if (c.category === 'Rent & CAM' || c.category === 'Rent') {
          let expectedRent = baseRent;

          if (t.escalation_due_date && t.escalation_new_rent) {
            const [y, m] = billingMonth.split('-');
            const bYear = parseInt(y);
            const bMonth = parseInt(m) - 1;

            const dueDate = new Date(t.escalation_due_date);
            const dYear = dueDate.getFullYear();
            const dMonth = dueDate.getMonth();

            if (bYear > dYear || (bYear === dYear && bMonth > dMonth)) {
              expectedRent = Number(t.escalation_new_rent);
              appliedEscalation = true;
            } else if (bYear === dYear && bMonth === dMonth) {
              const escalationDay = dueDate.getDate();
              const daysInMonth = new Date(bYear, bMonth + 1, 0).getDate();
              const oldRentDays = escalationDay - 1;
              const newRentDays = daysInMonth - oldRentDays;
              const proRata = ((baseRent * oldRentDays) / daysInMonth) + ((Number(t.escalation_new_rent) * newRentDays) / daysInMonth);
              expectedRent = Math.round(proRata * 100) / 100;
              appliedEscalation = true;
            }
          }
          return { ...c, amount: expectedRent };
        }
        return c;
      });
    });

    setEscalationWarning(appliedEscalation);
  }, [tenantId, billingMonth, baseRent, tenants]);

  // when tenant selected, pre-fill categories from their master
  const handleTenantSelect = async (id) => {
    setTenantId(id);
    if (!id) return;
    try {
      const res = await tenantApi.getById(id);
      const t = res.data;
      if (t.categories && t.categories.length > 0) {
        const cats = t.categories.map((c) => ({ category: c.category, amount: c.amount }));
        setCategories(cats);
        const rentCat = cats.find(c => c.category === 'Rent & CAM' || c.category === 'Rent');
        if (rentCat) setBaseRent(Number(rentCat.amount));
      } else {
        const amt = Number(t.monthly_rent || 0) + Number(t.cam_amount || 0);
        setCategories([{ category: 'Rent & CAM', amount: amt }]);
        setBaseRent(amt);
      }
    } catch { /* keep default */ }
  };

  const addCategory = () => setCategories((c) => [...c, { category: '', amount: '' }]);
  const removeCategory = (i) => setCategories((c) => c.filter((_, idx) => idx !== i));
  const updateCategory = (i, field, val) => {
    setCategories((c) => c.map((cat, idx) => idx === i ? { ...cat, [field]: val } : cat));
    if (field === 'amount') setEscalationWarning(false);
  };

  const handleGenerate = async () => {
    if (!tenantId || !billingMonth || !categories.every((c) => c.category && c.amount)) {
      showToast('Please fill all fields', 'error');
      return;
    }
    setSaving(true);
    try {
      const [y, m] = billingMonth.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedMonth = `${months[parseInt(m) - 1]}-${y}`;

      const res = await invoiceApi.generate({
        tenant_id: tenantId,
        billing_month: formattedMonth,
        bill_date: billDate,
        categories: categories.map((c) => ({
          category: c.category,
          amount: parseFloat(c.amount),
        })),
      });
      
      showToast(res.message, 'success');
      onSuccess(res.message, formattedMonth);
      onClose();
    } catch (e) {
      showToast(e.response?.data?.message || e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Generate Single Invoice" width="max-w-xl">
      <div className="space-y-4">
        {/* Tenant */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Tenant *</label>
          <select value={tenantId} onChange={(e) => handleTenantSelect(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm
              outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Select tenant...</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.property_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Billing Month *</label>
            <input type="month" value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm
                outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <Input label="Bill Date" type="date" value={billDate}
            onChange={(e) => setBillDate(e.target.value)} />
        </div>

        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-600">
              Invoice Lines *
            </label>
            <button onClick={addCategory}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              + Add line
            </button>
          </div>
          <div className="space-y-2">
            {categories.map((cat, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select value={cat.category}
                  onChange={(e) => updateCategory(i, 'category', e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2
                    text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Category...</option>
                  {['Rent & CAM', 'Water Charges', 'Power Charges', 'Infrastructural'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <input
                  type="number"
                  value={cat.amount}
                  onChange={(e) => updateCategory(i, 'amount', e.target.value)}
                  placeholder="Amount"
                  className="w-36 rounded-lg border border-slate-200 px-3 py-2
                    text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                {categories.length > 1 && (
                  <button onClick={() => removeCategory(i)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400
                      hover:text-red-500 transition">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* total preview */}
          <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2
            flex justify-between items-center">
            <span className="text-xs text-slate-500">Total Invoice Amount</span>
            <span className="font-bold text-slate-900">
              {formatCurrency(
                categories.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
              )}
            </span>
          </div>

          {escalationWarning && (
            <div className="mt-2 flex items-start gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100">
              <TrendingUp className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Rent Escalation Applied:</strong> The selected billing month is on or after this tenant's escalation due date. The rent has been automatically updated to their escalated value.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleGenerate}>
            Generate Invoice{categories.length > 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
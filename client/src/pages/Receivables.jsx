import { useState, useEffect } from 'react';
import {
  TrendingDown, AlertTriangle, AlertCircle,
  Clock, ChevronDown, ChevronUp,
  Users, Building2, Eye, Mail
} from 'lucide-react';
import Button       from '../components/ui/Button';
import { invoiceApi } from '../api/invoice.api';
import PageHeader   from '../components/ui/PageHeader';
import { Table }    from '../components/ui/Table';
import Modal        from '../components/ui/Modal';
import StatusBadge  from '../components/ui/StatusBadge';
import Pagination   from '../components/ui/Pagination';
import FilterBar    from '../components/ui/FilterBar';
import { useAsync } from '../hooks/useAsync';
import { receivableApi } from '../api/receivable.api';
import { formatCurrency, formatDate, formatBillingMonth } from '../utils/format';

const AGING_BUCKETS = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'];

const agingConfig = [
  { key: 'current_amt',  label: 'Current',    count: 'current_count',
    color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',
    border: 'border-emerald-200' },
  { key: 'days_1_30',   label: '1–30 Days',  count: 'days_1_30_count',
    color: 'bg-yellow-400',  text: 'text-yellow-700',  bg: 'bg-yellow-50',
    border: 'border-yellow-200' },
  { key: 'days_31_60',  label: '31–60 Days', count: 'days_31_60_count',
    color: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50',
    border: 'border-orange-200' },
  { key: 'days_61_90',  label: '61–90 Days', count: 'days_61_90_count',
    color: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',
    border: 'border-red-200' },
  { key: 'days_90_plus',label: '90+ Days',   count: 'days_90_plus_count',
    color: 'bg-red-800',     text: 'text-red-900',     bg: 'bg-red-100',
    border: 'border-red-300' },
];

// ─── Aging Visual Strip ───────────────────────────────────────────────────────
function AgingStrip({ data }) {
  if (!data) return null;
  const total = parseFloat(data.total_outstanding) || 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/60 backdrop-blur-md shadow-sm mb-6 p-1">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 bg-white/80 rounded-t-xl">
        <div>
          <h2 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            Aging Analysis
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Total Outstanding: <span className="font-bold text-slate-800">{formatCurrency(data.total_outstanding)}</span>
            <span className="mx-2 text-slate-300">|</span>
            {data.total_invoices} invoices · {data.total_tenants} tenants
          </p>
        </div>
      </div>

      <div className="p-5 bg-white/40 rounded-b-xl">
        {/* Modern Segmented Progress Bar */}
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100/50 shadow-inner gap-1 p-0.5">
          {agingConfig.map((a) => {
            const pct = (parseFloat(data[a.key]) / total) * 100;
            if (pct < 0.5) return null;
            return (
              <div
                key={a.key}
                className={`${a.color} h-full rounded-full transition-all shadow-sm`}
                style={{ width: `${pct}%` }}
                title={`${a.label}: ${formatCurrency(data[a.key])}`}
              />
            );
          })}
        </div>

        {/* Premium Bucket Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          {agingConfig.map((a) => {
            const pct = (parseFloat(data[a.key]) / total) * 100;
            return (
              <div key={a.key} className={`relative overflow-hidden rounded-xl border border-slate-100 ${a.bg} p-4 hover:shadow-md transition-shadow group bg-opacity-40 backdrop-blur-sm`}>
                <div className={`absolute top-0 left-0 w-full h-1 ${a.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                <p className="text-sm font-medium text-slate-600 mb-1">{a.label}</p>
                <p className={`text-xl font-extrabold ${a.text}`}>
                  {formatCurrency(data[a.key])}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full shadow-sm">
                    {data[a.count]} inv
                  </p>
                  <p className="text-xs font-bold text-slate-400">
                    {pct.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Collection Trend Table ───────────────────────────────────────────────────
function CollectionTrend({ data }) {
  const [open, setOpen] = useState(false);
  if (!data?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4
          hover:bg-slate-50 transition rounded-xl"
      >
        <h2 className="font-semibold text-slate-900">Collection Trend (Last 12 Months)</h2>
        {open
          ? <ChevronUp   className="h-4 w-4 text-slate-400" />
          : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <th className="px-5 py-3 text-left">Month</th>
                <th className="px-4 py-3 text-right">Billed</th>
                <th className="px-4 py-3 text-right">Collected</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Collection %</th>
                <th className="px-4 py-3 text-right">Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row) => (
                <tr key={row.billing_month}
                  className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {formatBillingMonth(row.billing_month)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatCurrency(row.billed)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                    {formatCurrency(row.collected)}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold
                    ${row.outstanding > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {row.outstanding > 0 ? formatCurrency(row.outstanding) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all
                            ${parseFloat(row.collection_pct) >= 90
                              ? 'bg-emerald-500'
                              : parseFloat(row.collection_pct) >= 60
                              ? 'bg-yellow-400'
                              : 'bg-red-500'}`}
                          style={{ width: `${Math.min(row.collection_pct, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold
                        ${parseFloat(row.collection_pct) >= 90
                          ? 'text-emerald-700'
                          : parseFloat(row.collection_pct) >= 60
                          ? 'text-yellow-700'
                          : 'text-red-600'}`}>
                        {row.collection_pct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">
                    {row.invoice_count}
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

// ─── Alerts Panel ─────────────────────────────────────────────────────────────
function AlertsPanel({ data }) {
  const [tab, setTab] = useState('overdue');
  if (!data) return null;

  const tabs = [
    { id: 'overdue',  label: 'Overdue',          count: data.overdueByTenant?.length  },
    { id: 'expiry',   label: 'Lease Expiry',      count: data.leasesExpiring?.length   },
    { id: 'nopay',    label: 'No Payment 30d+',   count: data.noPayment30Plus?.length  },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-6">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Alerts & Action Items
        </h2>
      </div>

      {/* tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium
              border-b-2 transition
              ${tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold
                ${tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
        {/* overdue */}
        {tab === 'overdue' && (
          data.overdueByTenant?.length === 0
            ? <p className="py-8 text-center text-sm text-slate-400">No overdue invoices</p>
            : data.overdueByTenant?.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center
                    ${r.max_overdue_days > 60 ? 'bg-red-100' : 'bg-orange-100'}`}>
                    <AlertTriangle className={`h-4 w-4
                      ${r.max_overdue_days > 60 ? 'text-red-600' : 'text-orange-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{r.tenant_name}</p>
                    <p className="text-xs text-slate-500">{r.property_name}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-red-600">{formatCurrency(r.total_overdue)}</p>
                  <p className="text-xs text-slate-500">
                    {r.invoice_count} inv · {r.max_overdue_days}d overdue
                  </p>
                </div>
              </div>
            ))
        )}

        {/* lease expiry */}
        {tab === 'expiry' && (
          data.leasesExpiring?.length === 0
            ? <p className="py-8 text-center text-sm text-slate-400">No leases expiring soon</p>
            : data.leasesExpiring?.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center
                    ${r.days_to_expiry <= 15 ? 'bg-red-100' : 'bg-orange-100'}`}>
                    <Clock className={`h-4 w-4
                      ${r.days_to_expiry <= 15 ? 'text-red-600' : 'text-orange-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{r.tenant_name}</p>
                    <p className="text-xs text-slate-500">{r.property_name}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm
                    ${r.days_to_expiry <= 15 ? 'text-red-600' : 'text-orange-600'}`}>
                    {r.days_to_expiry} days left
                  </p>
                  <p className="text-xs text-slate-500">
                    Ends {formatDate(r.lease_end)} · {formatCurrency(r.monthly_rent)}/mo
                  </p>
                </div>
              </div>
            ))
        )}

        {/* no payment 30+ */}
        {tab === 'nopay' && (
          data.noPayment30Plus?.length === 0
            ? <p className="py-8 text-center text-sm text-slate-400">No critical cases</p>
            : data.noPayment30Plus?.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{r.tenant_name}</p>
                    <p className="text-xs text-slate-500">{r.property_name}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-red-700">{formatCurrency(r.total_amount)}</p>
                  <p className="text-xs text-slate-500">
                    {r.invoice_count} inv · {r.overdue_days}d · zero collected
                  </p>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ─── Tenant Drill-down Modal ──────────────────────────────────────────────────
function TenantDrilldown({ data, loading, tenantName }) {
  const [sending, setSending] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [localEmail, setLocalEmail] = useState('');

  // Update localEmail when data loads
  useEffect(() => {
    if (data?.invoices?.[0]?.tenant_email) {
      setLocalEmail(data.invoices[0].tenant_email);
    } else {
      setLocalEmail('');
    }
  }, [data]);

  if (loading) return (
    <p className="py-10 text-center text-sm text-slate-400 animate-pulse">Loading…</p>
  );
  if (!data) return null;
  const { summary, invoices } = data;

  const handleSendReminder = async (emailToUse) => {
    if (!emailToUse) return;
    setSending(true);
    try {
      const res = await invoiceApi.sendReminders({ 
        tenant_name: tenantName,
        override_email: emailToUse
      });
      setToastMsg(res.data?.message || 'Reminder sent successfully');
      setLocalEmail(emailToUse); // Update local state so the input goes away
      setTimeout(() => setToastMsg(null), 4000);
    } catch (e) {
      setToastMsg('Error sending reminder');
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex-1">
          {toastMsg && <span className="text-sm text-emerald-600 font-medium">{toastMsg}</span>}
          {!toastMsg && !localEmail && (
            <span className="text-sm text-orange-600 font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> No email saved for this tenant.
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!localEmail ? (
            <div className="flex items-center gap-2">
              <input 
                type="email" 
                id="missing-email-input"
                placeholder="Enter email address..." 
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) handleSendReminder(e.target.value);
                }}
              />
              <Button 
                variant="danger" 
                loading={sending} 
                onClick={() => {
                  const input = document.getElementById('missing-email-input');
                  if (input && input.value) handleSendReminder(input.value);
                }}
              >
                <Mail className="h-4 w-4" /> Save & Send
              </Button>
            </div>
          ) : (
            <Button 
              variant="danger" 
              loading={sending} 
              onClick={() => {
                if (window.confirm(`Send an email reminder to ${tenantName} (${localEmail})?`)) {
                  handleSendReminder(localEmail);
                }
              }}
            >
              <Mail className="h-4 w-4" /> Send Reminder Email
            </Button>
          )}
        </div>
      </div>

      {/* summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Billed',      value: formatCurrency(summary.total_billed),       cls: 'text-slate-900' },
            { label: 'Total Collected',   value: formatCurrency(summary.total_collected),    cls: 'text-emerald-700' },
            { label: 'Total Outstanding', value: formatCurrency(summary.total_outstanding),  cls: 'text-red-600' },
            { label: 'Max Overdue',       value: `${summary.max_overdue_days ?? 0} days`,    cls: 'text-orange-700' },
          ].map((c) => (
            <div key={c.label}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className={`text-lg font-bold mt-1 ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* invoice list */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-2.5 text-xs font-semibold
          text-slate-500 uppercase border-b border-slate-200">
          All Invoices
        </div>
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {invoices.map((inv) => (
            <div key={inv.id}
              className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {formatBillingMonth(inv.billing_month)} · {inv.category}
                </p>
                <p className="text-xs text-slate-500">
                  Due {formatDate(inv.due_date)}
                  {inv.overdue_by_days > 0
                    ? ` · ${inv.overdue_by_days}d overdue`
                    : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-900">
                  {formatCurrency(inv.bill_amount)}
                </p>
                {inv.outstanding_balance > 0 && (
                  <p className="text-xs text-red-600 font-medium">
                    ₹{Number(inv.outstanding_balance).toLocaleString('en-IN')} due
                  </p>
                )}
                <StatusBadge status={inv.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const defaultFilters = {
  search: '', aging_bucket: '', property_name: '', category: '',
};

export default function Receivables() {
  const [filters,       setFilters]       = useState(defaultFilters);
  const [page,          setPage]          = useState(1);
  const [drillTenant,   setDrillTenant]   = useState(null);
  const [drillData,     setDrillData]     = useState(null);
  const [drillLoading,  setDrillLoading]  = useState(false);
  const [drillOpen,     setDrillOpen]     = useState(false);

  const { data: agingData } = useAsync(
    () => receivableApi.getAgingSummary(), []
  );
  const { data: alertsData } = useAsync(
    () => receivableApi.getOverdueAlerts(), []
  );
  const { data: trendData } = useAsync(
    () => receivableApi.getCollectionTrend(), []
  );
  const { data: registerData, loading: registerLoading, error: registerError } = useAsync(
    () => receivableApi.getOutstandingRegister({ ...filters, page, limit: 50 }),
    [filters, page]
  );

  const register = registerData?.data ?? [];
  const meta     = registerData?.meta ?? {};

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const openDrilldown = async (tenantName) => {
    setDrillTenant(tenantName);
    setDrillOpen(true);
    setDrillLoading(true);
    setDrillData(null);
    try {
      const res = await receivableApi.getTenantOutstanding(tenantName);
      setDrillData(res.data);
    } catch { setDrillData(null); }
    finally { setDrillLoading(false); }
  };

  const filterConfig = [
    { key: 'search',        type: 'text',   value: filters.search,
      placeholder: 'Search tenant or property…' },
    { key: 'aging_bucket',  type: 'select', value: filters.aging_bucket,
      placeholder: 'All Aging', options: AGING_BUCKETS },
    { key: 'category',      type: 'select',   value: filters.category,
      placeholder: 'All Categories', options: ['Rent & CAM', 'Water Charges', 'Power Charges', 'Infrastructural'] },
  ];

  const columns = [
    {
      key: 'tenant_name', label: 'Tenant',
      render: (r) => (
        <div>
          <button
            onClick={() => openDrilldown(r.tenant_name)}
            className="font-semibold text-blue-600 hover:text-blue-800 transition-colors text-left"
          >
            {r.tenant_name}
          </button>
          <p className="text-xs text-slate-400 mt-0.5">
            {r.tenant_unit ? `Unit ${r.tenant_unit} · ` : ''}{r.property_name}
          </p>
        </div>
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
    { key: 'billing_month', label: 'Month', className: 'hidden lg:table-cell',
      render: (r) => <span className="text-xs text-slate-600">{formatBillingMonth(r.billing_month)}</span> },
    {
      key: 'due_date', label: 'Due Date',
      render: (r) => (
        <div>
          <p className={`text-xs font-medium
            ${r.overdue_by_days > 0 ? 'text-red-600' : 'text-slate-600'}`}>
            {formatDate(r.due_date)}
          </p>
          {r.overdue_by_days > 0 && (
            <p className="text-xs text-red-500">{r.overdue_by_days}d overdue</p>
          )}
        </div>
      ),
    },
    {
      key: 'bill_amount', label: 'Billed', className: 'hidden md:table-cell text-right',
      render: (r) => (
        <span className="text-slate-700">{formatCurrency(r.bill_amount)}</span>
      ),
    },
    {
      key: 'amount_collected', label: 'Collected', className: 'hidden md:table-cell text-right',
      render: (r) => (
        <span className="text-emerald-700 font-medium">
          {formatCurrency(r.amount_collected)}
        </span>
      ),
    },
    {
      key: 'outstanding_balance', label: 'Outstanding', className: 'text-right',
      render: (r) => (
        <span className="font-bold text-red-600">
          {formatCurrency(r.outstanding_balance)}
        </span>
      ),
    },
    {
      key: 'aging_bucket', label: 'Aging', className: 'hidden sm:table-cell',
      render: (r) => {
        const cfg = agingConfig.find((a) => a.label === r.aging_bucket);
        return (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium
            ${cfg ? `${cfg.bg} ${cfg.text} border ${cfg.border}` : 'bg-slate-100 text-slate-600'}`}>
            {r.aging_bucket}
          </span>
        );
      },
    },
    { key: 'status', label: 'Status', className: 'hidden sm:table-cell',
      render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center justify-end w-4">
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Receivables"
        description="Outstanding register, aging analysis, overdue alerts"
      />

      {/* Aging strip */}
      <AgingStrip data={agingData?.data} />

      {/* Collection trend */}
      <CollectionTrend data={trendData?.data} />

      {/* Alerts */}
      <AlertsPanel data={alertsData?.data} />

      {/* Outstanding Register */}
      <FilterBar
        filters={filterConfig}
        onChange={updateFilter}
        onReset={() => { setFilters(defaultFilters); setPage(1); }}
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <TrendingDown className="h-5 w-5 text-red-400" />
          <span className="font-semibold text-slate-900">
            Outstanding Register — {meta.total ?? 0} rows
          </span>
          {Object.values(filters).some(Boolean) && (
            <span className="ml-1 text-xs text-blue-600 bg-blue-50
              px-2 py-0.5 rounded-full font-medium">
              Filtered
            </span>
          )}
        </div>
        {registerError
          ? <p className="px-5 py-10 text-center text-sm text-red-500">{registerError}</p>
          : <Table columns={columns} data={register} loading={registerLoading} />
        }
        <Pagination
          page={meta.page   ?? 1}
          pages={meta.pages ?? 1}
          total={meta.total ?? 0}
          limit={50}
          onChange={setPage}
        />
      </div>

      {/* Tenant drilldown modal */}
      <Modal
        open={drillOpen}
        onClose={() => { setDrillOpen(false); setDrillData(null); }}
        title={`Tenant: ${drillTenant ?? ''}`}
        width="max-w-2xl"
      >
        <TenantDrilldown data={drillData} loading={drillLoading} tenantName={drillTenant} />
      </Modal>
    </div>
  );
}
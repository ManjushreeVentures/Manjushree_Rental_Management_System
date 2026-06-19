import { useState }  from 'react';
import {
  BarChart3, Download, FileSpreadsheet,
  TrendingDown, Users, Building2,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import PageHeader   from '../components/ui/PageHeader';
import Button       from '../components/ui/Button';
import { Table }    from '../components/ui/Table';
import FilterBar    from '../components/ui/FilterBar';
import { useAsync } from '../hooks/useAsync';
import { reportApi }   from '../api/report.api';
import { invoiceApi }  from '../api/invoice.api';
import { tenantApi }   from '../api/tenant.api';
import { useToast } from '../contexts/ToastContext';
import { agingConfig } from '../utils/constants';
import StatusBadge  from '../components/ui/StatusBadge';
import { formatCurrency, formatDate, formatBillingMonth } from '../utils/format';

const AGING_BUCKETS = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'];

const getAgingColor = (bucket) => {
  if (!bucket) return '';
  const normalized = bucket.replace('-', '–');
  const conf = agingConfig.find(c => c.label === normalized);
  return conf ? conf.text : '';
};

// ─── Report card nav ──────────────────────────────────────────────────────────
const REPORTS = [
  {
    id:    'outstanding',
    label: 'Outstanding Report',
    desc:  'All pending invoices with aging detail',
    icon:  TrendingDown,
    color: 'text-red-600',
    bg:    'bg-red-50',
  },
  {
    id:    'collection',
    label: 'Collection Summary',
    desc:  'Month-wise, property-wise, mode-wise',
    icon:  BarChart3,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
  },
  {
    id:    'aging',
    label: 'Aging Detail',
    desc:  'Property-wise aging analysis',
    icon:  FileSpreadsheet,
    color: 'text-orange-600',
    bg:    'bg-orange-50',
  },
  {
    id:    'ledger',
    label: 'Tenant Ledger',
    desc:  'Invoice + receipt history per tenant',
    icon:  Users,
    color: 'text-purple-600',
    bg:    'bg-purple-50',
  },
  {
    id:    'rentroll',
    label: 'Rent Roll',
    desc:  'All active tenants with lease & rent info',
    icon:  Building2,
    color: 'text-emerald-600',
    bg:    'bg-emerald-50',
  },
];

// ─── Outstanding Report ───────────────────────────────────────────────────────
function OutstandingReport() {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState({ property_name: '', aging_bucket: '' });
  const { data, loading, error } = useAsync(
    () => reportApi.getOutstanding(filters), [filters]
  );
  const rows = data?.data ?? [];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await reportApi.downloadOutstanding(filters);
      showToast('Report exported successfully', 'success');
    } catch (err) {
      showToast('Failed to export report', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    { key: 'Tenant Name',   label: 'Tenant',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r['Tenant Name']}</p>
          <p className="text-xs text-slate-400">{r['Unit No'] || '—'}</p>
        </div>
      )},
    { key: 'Location',      label: 'Property',
      render: (r) => <span className="text-sm text-slate-600">{r['Location']}</span> },
    { key: 'Category',      label: 'Category',
      render: (r) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {r['Category']}
        </span>
      )},
    { key: 'Billing Month', label: 'Month',
      render: (r) => <span className="text-xs">{formatBillingMonth(r['Billing Month'])}</span> },
    { key: 'Bill Amount',   label: 'Billed', className: 'text-right',
      render: (r) => <span>{formatCurrency(r['Bill Amount'])}</span> },
    { key: 'Amount Collected', label: 'Collected', className: 'text-right',
      render: (r) => (
        <span className="text-emerald-700">{formatCurrency(r['Amount Collected'])}</span>
      )},
    { key: 'Outstanding Balance', label: 'Outstanding', className: 'text-right',
      render: (r) => (
        <span className="font-bold text-red-600">
          {formatCurrency(r['Outstanding Balance'])}
        </span>
      )},
    { key: 'Overdue By Days', label: 'Overdue',
      render: (r) => (
        <span className={r['Overdue By Days'] > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
          {r['Overdue By Days'] > 0 ? `${r['Overdue By Days']}d` : '—'}
        </span>
      )},
    { key: 'Aging Bucket',  label: 'Aging',
      render: (r) => (
        <span className={`text-xs font-medium ${getAgingColor(r['Aging Bucket'])}`}>
          {r['Aging Bucket']}
        </span>
      )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FilterBar
          filters={[
            { key: 'aging_bucket', type: 'select', value: filters.aging_bucket,
              placeholder: 'All Aging', options: AGING_BUCKETS },
          ]}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters({ property_name: '', aging_bucket: '' })}
        />
        <Button variant="secondary" onClick={handleExport} loading={isExporting}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <p className="text-sm font-semibold text-slate-700">
            {rows.length} records · Total Outstanding:{' '}
            <span className="text-red-600">
              {formatCurrency(rows.reduce((s, r) => s + (parseFloat(r['Outstanding Balance']) || 0), 0))}
            </span>
          </p>
        </div>
        {error
          ? <p className="px-5 py-10 text-center text-sm text-red-500">{error}</p>
          : <Table columns={columns} data={rows} loading={loading} />
        }
      </div>
    </div>
  );
}

// ─── Collection Summary ───────────────────────────────────────────────────────
function CollectionSummaryReport() {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [tab, setTab] = useState('month');
  const { data, loading } = useAsync(() => reportApi.getCollectionSummary(), []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await reportApi.downloadCollectionSummary({});
      showToast('Report exported successfully', 'success');
    } catch (err) {
      showToast('Failed to export report', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const byMonth    = data?.data?.byMonth    ?? [];
  const byProperty = data?.data?.byProperty ?? [];
  const byMode     = data?.data?.byMode     ?? [];

  const monthCols = [
    { key: 'Billing Month', label: 'Month',
      render: (r) => <span>{formatBillingMonth(r['Billing Month'])}</span> },
    { key: 'Invoices',      label: 'Invoices', className: 'text-right' },
    { key: 'Total Billed',  label: 'Billed',   className: 'text-right',
      render: (r) => formatCurrency(r['Total Billed']) },
    { key: 'Total Collected', label: 'Collected', className: 'text-right',
      render: (r) => (
        <span className="text-emerald-700 font-medium">
          {formatCurrency(r['Total Collected'])}
        </span>
      )},
    { key: 'Outstanding', label: 'Outstanding', className: 'text-right',
      render: (r) => (
        <span className={parseFloat(r['Outstanding']) > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}>
          {parseFloat(r['Outstanding']) > 0 ? formatCurrency(r['Outstanding']) : '—'}
        </span>
      )},
    { key: 'Collection %', label: 'Collection %', className: 'text-right',
      render: (r) => {
        const pct = parseFloat(r['Collection %']);
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="w-14 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className={`h-full rounded-full
                ${pct >= 90 ? 'bg-emerald-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-500'}`}
                style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className={`text-xs font-semibold
              ${pct >= 90 ? 'text-emerald-700' : pct >= 60 ? 'text-yellow-700' : 'text-red-600'}`}>
              {pct}%
            </span>
          </div>
        );
      }},
  ];

  const propCols = [
    { key: 'Property',  label: 'Property' },
    { key: 'Tenants',   label: 'Tenants',  className: 'text-right' },
    { key: 'Invoices',  label: 'Invoices', className: 'text-right' },
    { key: 'Total Billed', label: 'Billed', className: 'text-right',
      render: (r) => formatCurrency(r['Total Billed']) },
    { key: 'Collected', label: 'Collected', className: 'text-right',
      render: (r) => (
        <span className="text-emerald-700 font-medium">{formatCurrency(r['Collected'])}</span>
      )},
    { key: 'Outstanding', label: 'Outstanding', className: 'text-right',
      render: (r) => (
        <span className={parseFloat(r['Outstanding']) > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}>
          {parseFloat(r['Outstanding']) > 0 ? formatCurrency(r['Outstanding']) : '—'}
        </span>
      )},
    { key: 'Collection %', label: 'Collection %', className: 'text-right',
      render: (r) => `${r['Collection %']}%` },
  ];

  const modeCols = [
    { key: 'Payment Mode', label: 'Mode' },
    { key: 'Receipts',     label: 'Receipts', className: 'text-right' },
    { key: 'Total Amount', label: 'Amount',   className: 'text-right',
      render: (r) => (
        <span className="font-semibold text-emerald-700">
          {formatCurrency(r['Total Amount'])}
        </span>
      )},
  ];

  const tabs = [
    { id: 'month',    label: 'By Month',    cols: monthCols, data: byMonth    },
    { id: 'property', label: 'By Property', cols: propCols,  data: byProperty },
    { id: 'mode',     label: 'By Mode',     cols: modeCols,  data: byMode     },
  ];

  const active = tabs.find((t) => t.id === tab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition
                ${tab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={handleExport} loading={isExporting}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table columns={active.cols} data={active.data} loading={loading} />
      </div>
    </div>
  );
}

// ─── Aging Detail Report ──────────────────────────────────────────────────────
function AgingDetailReport() {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [tab, setTab] = useState('summary');
  const { data, loading } = useAsync(() => reportApi.getAgingDetail(), []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await reportApi.downloadAgingDetail({});
      showToast('Report exported successfully', 'success');
    } catch (err) {
      showToast('Failed to export report', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const summary = data?.data?.summary ?? [];
  const detail  = data?.data?.detail  ?? [];

  const summaryCols = [
    { key: 'Property',     label: 'Property' },
    { key: 'Tenants',      label: 'Tenants', className: 'text-right' },
    { key: 'Current',      label: 'Current', className: 'text-right',
      render: (r) => <span className="text-emerald-700">{formatCurrency(r['Current'])}</span> },
    { key: '1-30 Days',    label: '1-30d',   className: 'text-right',
      render: (r) => <span className="text-yellow-700">{formatCurrency(r['1-30 Days'])}</span> },
    { key: '31-60 Days',   label: '31-60d',  className: 'text-right',
      render: (r) => <span className="text-orange-700">{formatCurrency(r['31-60 Days'])}</span> },
    { key: '61-90 Days',   label: '61-90d',  className: 'text-right',
      render: (r) => <span className="text-red-700">{formatCurrency(r['61-90 Days'])}</span> },
    { key: '90+ Days',     label: '90d+',    className: 'text-right',
      render: (r) => <span className="text-red-900 font-bold">{formatCurrency(r['90+ Days'])}</span> },
    { key: 'Total Outstanding', label: 'Total', className: 'text-right',
      render: (r) => (
        <span className="font-bold text-slate-900">
          {formatCurrency(r['Total Outstanding'])}
        </span>
      )},
  ];

  const detailCols = [
    { key: 'Tenant',    label: 'Tenant',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r['Tenant']}</p>
          <p className="text-xs text-slate-400">{r['Unit'] || '—'}</p>
        </div>
      )},
    { key: 'Property',  label: 'Property',
      render: (r) => <span className="text-sm text-slate-600">{r['Property']}</span> },
    { key: 'Category',  label: 'Category',
      render: (r) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r['Category']}</span>
      )},
    { key: 'Billing Month', label: 'Month',
      render: (r) => <span className="text-xs">{formatBillingMonth(r['Billing Month'])}</span> },
    { key: 'Outstanding',   label: 'Outstanding', className: 'text-right',
      render: (r) => (
        <span className="font-bold text-red-600">{formatCurrency(r['Outstanding'])}</span>
      )},
    { key: 'Overdue Days',  label: 'Overdue', className: 'text-right',
      render: (r) => (
        <span className={r['Overdue Days'] > 0 ? 'text-red-600 font-medium text-sm' : 'text-slate-400'}>
          {r['Overdue Days'] > 0 ? `${r['Overdue Days']}d` : '—'}
        </span>
      )},
    { key: 'Aging Bucket',  label: 'Bucket',
      render: (r) => (
        <span className={`text-xs font-medium ${getAgingColor(r['Aging Bucket'])}`}>
          {r['Aging Bucket']}
        </span>
      )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {[{ id: 'summary', label: 'By Property' }, { id: 'detail', label: 'Full Detail' }]
            .map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition
                  ${tab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {t.label}
              </button>
            ))}
        </div>
        <Button variant="secondary" onClick={handleExport} loading={isExporting}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table
          columns={tab === 'summary' ? summaryCols : detailCols}
          data={tab === 'summary' ? summary : detail}
          loading={loading}
        />
      </div>
    </div>
  );
}

// ─── Tenant Ledger ────────────────────────────────────────────────────────────
function TenantLedgerReport() {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [submitted,  setSubmitted]  = useState('');

  const { data: tenantsData } = useAsync(() => tenantApi.getAll({ is_active: true }), []);
  const tenants = tenantsData?.data ?? [];

  const { data, loading, error } = useAsync(
    () => submitted ? reportApi.getTenantLedger({ tenant_id: submitted }) : Promise.resolve(null),
    [submitted]
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await reportApi.downloadTenantLedger({ tenant_id: submitted });
      showToast('Report exported successfully', 'success');
    } catch (err) {
      showToast('Failed to export report', 'error');
    } finally {
      setIsExporting(false);
    }
  };
  const rows = data?.data ?? [];

  const columns = [
    { key: 'Date',          label: 'Date',
      render: (r) => <span className="text-xs">{formatDate(r['Date'])}</span> },
    { key: 'Type',          label: 'Type',
      render: (r) => (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium
          ${r['Type'] === 'Invoice'
            ? 'bg-blue-50 text-blue-700'
            : 'bg-emerald-50 text-emerald-700'}`}>
          {r['Type']}
        </span>
      )},
    { key: 'Category',      label: 'Category / Mode',
      render: (r) => <span className="text-xs text-slate-600">{r['Category']}</span> },
    { key: 'Billing Month', label: 'Month',
      render: (r) => <span className="text-xs">{formatBillingMonth(r['Billing Month'])}</span> },
    { key: 'Debit',         label: 'Debit (Invoice)', className: 'text-right',
      render: (r) => r['Debit'] > 0
        ? <span className="text-red-600 font-medium">{formatCurrency(r['Debit'])}</span>
        : <span className="text-slate-300">—</span> },
    { key: 'Credit',        label: 'Credit (Receipt)', className: 'text-right',
      render: (r) => r['Credit'] > 0
        ? <span className="text-emerald-700 font-medium">{formatCurrency(r['Credit'])}</span>
        : <span className="text-slate-300">—</span> },
    { key: 'Status',        label: 'Ref / Status',
      render: (r) => <span className="text-xs text-slate-500">{r['Status'] || '—'}</span> },
  ];

  const totalDebit  = rows.reduce((s, r) => s + (parseFloat(r['Debit'])  || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (parseFloat(r['Credit']) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Select Tenant</label>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm
              outline-none focus:ring-2 focus:ring-blue-500 bg-white w-72"
          >
            <option value="">Choose a tenant…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.property_name}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => setSubmitted(tenantId)}
          disabled={!tenantId || loading}
        >
          Load Ledger
        </Button>
        {submitted && (
          <Button variant="secondary" onClick={handleExport} loading={isExporting}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        )}
      </div>

      {submitted && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {rows.length > 0 && (
            <div className="flex gap-8 border-b border-slate-200 px-5 py-3">
              <div>
                <p className="text-xs text-slate-500">Total Billed</p>
                <p className="font-bold text-red-600">{formatCurrency(totalDebit)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Collected</p>
                <p className="font-bold text-emerald-700">{formatCurrency(totalCredit)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Net Outstanding</p>
                <p className={`font-bold ${totalDebit - totalCredit > 0
                  ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(totalDebit - totalCredit)}
                </p>
              </div>
            </div>
          )}
          {error
            ? <p className="px-5 py-10 text-center text-sm text-red-500">{error}</p>
            : <Table columns={columns} data={rows} loading={loading}
                emptyMsg="No records for this tenant" />
          }
        </div>
      )}
    </div>
  );
}

// ─── Rent Roll ────────────────────────────────────────────────────────────────
function RentRollReport() {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const { data, loading, error } = useAsync(() => reportApi.getRentRoll(), []);
  const rows = data?.data ?? [];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await reportApi.downloadRentRoll({});
      showToast('Report exported successfully', 'success');
    } catch (err) {
      showToast('Failed to export report', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const totalMonthly = rows.reduce((s, r) => s + (parseFloat(r['Monthly Rent']) || 0), 0);
  const totalAnnual  = rows.reduce((s, r) => s + (parseFloat(r['Annual Rent'])  || 0), 0);

  const columns = [
    { key: 'Tenant',   label: 'Tenant',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r['Tenant']}</p>
          <p className="text-xs text-slate-400">{r['GSTIN'] || '—'}</p>
        </div>
      )},
    { key: 'Property', label: 'Property',
      render: (r) => (
        <div>
          <p className="text-slate-700">{r['Property']}</p>
          <p className="text-xs text-slate-400">Unit: {r['Unit'] || '—'}</p>
        </div>
      )},
    { key: 'Monthly Rent', label: 'Monthly Rent', className: 'text-right',
      render: (r) => (
        <span className="font-semibold text-slate-900">
          {formatCurrency(r['Monthly Rent'])}
        </span>
      )},
    { key: 'Annual Rent', label: 'Annual Rent', className: 'text-right',
      render: (r) => (
        <span className="text-blue-700 font-medium">
          {formatCurrency(r['Annual Rent'])}
        </span>
      )},
    { key: 'Lease Start', label: 'Start',
      render: (r) => <span className="text-xs">{formatDate(r['Lease Start'])}</span> },
    { key: 'Lease End',   label: 'End',
      render: (r) => <span className="text-xs">{formatDate(r['Lease End'])}</span> },
    { key: 'Days to Expiry', label: 'Days Left',
      render: (r) => {
        const d = parseInt(r['Days to Expiry']);
        return (
          <span className={`text-sm font-medium
            ${d < 0 ? 'text-red-600' : d <= 30 ? 'text-orange-600' : 'text-slate-600'}`}>
            {isNaN(d) ? '—' : d < 0 ? `${Math.abs(d)}d ago` : `${d}d`}
          </span>
        );
      }},
    { key: 'Lease Status', label: 'Status',
      render: (r) => <StatusBadge status={r['Lease Status']} />
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {rows.length > 0 && (
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-slate-500">Total Monthly Rent Roll</p>
              <p className="font-bold text-blue-700 text-lg">{formatCurrency(totalMonthly)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Annual Rent Roll</p>
              <p className="font-bold text-slate-900 text-lg">{formatCurrency(totalAnnual)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Active Tenants</p>
              <p className="font-bold text-slate-900 text-lg">{rows.length}</p>
            </div>
          </div>
        )}
        <Button variant="secondary" onClick={handleExport} loading={isExporting}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {error
          ? <p className="px-5 py-10 text-center text-sm text-red-500">{error}</p>
          : <Table columns={columns} data={rows} loading={loading} />
        }
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [active, setActive] = useState('outstanding');

  const activeReport = REPORTS.find((r) => r.id === active);

  return (
    <div>
      <PageHeader
        title="Reports & Exports"
        description="Generate, filter and download reports as Excel"
      />

      {/* report selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const isActive = active === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setActive(r.id)}
              className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all active:scale-95
                ${isActive
                  ? 'border-teal-300 bg-gradient-to-br from-teal-50/80 to-white shadow-md ring-1 ring-teal-200'
                  : 'border-slate-200 bg-white hover:border-teal-200 hover:shadow-md hover:bg-slate-50'}`}
            >
              {isActive && <div className="absolute top-0 right-0 w-20 h-20 bg-teal-400/10 rounded-full blur-xl -mr-10 -mt-10" />}
              <div className="flex items-start gap-2.5 relative z-10">
                <div className={`shrink-0 h-8 w-8 rounded-lg ${r.bg} flex items-center justify-center shadow-sm border border-white/60 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-4 w-4 ${r.color}`} />
                </div>
                <div>
                  <p className={`text-[13px] font-bold leading-tight ${isActive ? 'text-teal-900' : 'text-slate-800 group-hover:text-teal-800'}`}>
                    {r.label}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{r.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* active report header */}
      <div className="flex items-center gap-3 mb-4">
        {(() => {
          const Icon = activeReport.icon;
          return (
            <div className={`h-8 w-8 rounded-lg ${activeReport.bg}
              flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${activeReport.color}`} />
            </div>
          );
        })()}
        <h2 className="font-semibold text-slate-900">{activeReport.label}</h2>
      </div>

      {/* report content */}
      {active === 'outstanding' && <OutstandingReport />}
      {active === 'collection'  && <CollectionSummaryReport />}
      {active === 'aging'       && <AgingDetailReport />}
      {active === 'ledger'      && <TenantLedgerReport />}
      {active === 'rentroll'    && <RentRollReport />}
    </div>
  );
}
import { useState } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle,
  AlertCircle, Clock, CheckCircle2,
  Building2, Users, FileText, Receipt,
  RefreshCw, ArrowUpRight,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { dashboardApi } from '../api/dashboard.api';
import { formatCurrency, formatDate, formatBillingMonth } from '../utils/format';

// ─── aging config (shared) ────────────────────────────────────────────────────
const agingConfig = [
  {
    key: 'current_amt', label: 'Current',
    countKey: 'current_count',
    bar: 'bg-emerald-500', text: 'text-emerald-700',
    bg: 'bg-emerald-50', border: 'border-emerald-200'
  },
  {
    key: 'days_1_30', label: '1–30 Days',
    countKey: 'days_1_30_count',
    bar: 'bg-yellow-400', text: 'text-yellow-700',
    bg: 'bg-yellow-50', border: 'border-yellow-200'
  },
  {
    key: 'days_31_60', label: '31–60 Days',
    countKey: 'days_31_60_count',
    bar: 'bg-orange-500', text: 'text-orange-700',
    bg: 'bg-orange-50', border: 'border-orange-200'
  },
  {
    key: 'days_61_90', label: '61–90 Days',
    countKey: 'days_61_90_count',
    bar: 'bg-red-500', text: 'text-red-700',
    bg: 'bg-red-50', border: 'border-red-200'
  },
  {
    key: 'days_90_plus', label: '90+ Days',
    countKey: 'days_90_plus_count',
    bar: 'bg-red-800', text: 'text-red-900',
    bg: 'bg-red-100', border: 'border-red-300'
  },
];

// ─── KPI Cards ────────────────────────────────────────────────────────────────
function KPICards({ kpis, onNavigate }) {
  if (!kpis) return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm
          animate-pulse h-28" />
      ))}
    </div>
  );

  const collectionPct = kpis.monthly_billed > 0
    ? ((kpis.monthly_collected / kpis.monthly_billed) * 100).toFixed(1)
    : 0;

  const cards = [
    {
      label: 'Monthly Rent Billed',
      value: formatCurrency(kpis.monthly_billed),
      sub: kpis.billing_month ? `Month: ${formatBillingMonth(kpis.billing_month)}` : 'Current month',
      icon: FileText,
      iconBg: 'bg-teal-50',
      iconCls: 'text-teal-600',
      trend: null,
      nav: 'invoices',
      tooltip: (
        <div className="text-xs space-y-1.5 w-full">
          <p className="font-semibold text-slate-800 mb-2 border-b border-slate-100 pb-1">Billing Breakdown</p>
          <div className="flex justify-between"><span className="text-slate-500">Rent & CAM:</span> <span className="font-medium text-slate-700">{formatCurrency(kpis.rent_billed || 0)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Power:</span> <span className="font-medium text-slate-700">{formatCurrency(kpis.power_billed || 0)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Water:</span> <span className="font-medium text-slate-700">{formatCurrency(kpis.water_billed || 0)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Infra:</span> <span className="font-medium text-slate-700">{formatCurrency(kpis.infra_billed || 0)}</span></div>
        </div>
      ),
    },
    {
      label: 'Collected (This Month)',
      value: formatCurrency(kpis.monthly_collected),
      sub: `${collectionPct}% collection rate` + (kpis.billing_month ? ` (${formatBillingMonth(kpis.billing_month)})` : ''),
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconCls: 'text-emerald-600',
      trend: parseFloat(collectionPct) >= 80 ? 'up' : 'down',
      nav: 'receipts',
      tooltip: (
        <div className="text-xs space-y-1.5 w-full">
          <p className="font-semibold text-slate-800 mb-2 border-b border-slate-100 pb-1">Collection Breakdown</p>
          <div className="flex justify-between"><span className="text-slate-500">Rent & CAM:</span> <span className="font-medium text-emerald-700">{formatCurrency(kpis.rent_collected || 0)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Power:</span> <span className="font-medium text-emerald-700">{formatCurrency(kpis.power_collected || 0)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Water:</span> <span className="font-medium text-emerald-700">{formatCurrency(kpis.water_collected || 0)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Infra:</span> <span className="font-medium text-emerald-700">{formatCurrency(kpis.infra_collected || 0)}</span></div>
        </div>
      ),
    },
    {
      label: 'Total Outstanding',
      value: formatCurrency(kpis.total_outstanding),
      sub: 'All pending invoices',
      icon: TrendingDown,
      iconBg: 'bg-red-50',
      iconCls: 'text-red-600',
      trend: 'down',
      nav: 'receivables',
    },
    {
      label: 'Overdue > 30 Days',
      value: formatCurrency(kpis.overdue_30_plus),
      sub: 'Needs immediate action',
      icon: AlertTriangle,
      iconBg: 'bg-orange-50',
      iconCls: 'text-orange-600',
      trend: 'down',
      nav: 'receivables',
    },
    // {
    //   label:   'Occupancy Rate',
    //   value:   `${kpis.occupancy_rate}%`,
    //   sub:     `${kpis.active_tenants} of ${kpis.total_units} units occupied`,
    //   icon:    Building2,
    //   iconBg:  'bg-purple-50',
    //   iconCls: 'text-purple-600',
    //   trend:   parseFloat(kpis.occupancy_rate) >= 80 ? 'up' : 'neutral',
    //   nav:     'tenants',
    // },
    {
      label: 'Annual Rent Roll',
      value: formatCurrency(kpis.annual_rent_roll),
      sub: 'Rent & CAM — current FY',
      icon: TrendingUp,
      iconBg: 'bg-slate-100',
      iconCls: 'text-slate-600',
      trend: 'up',
      nav: 'reports',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.label}
            onClick={() => c.nav && onNavigate(c.nav)}
            className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm
              text-left md:hover:shadow-md md:hover:border-teal-200 transition group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className={`h-8 w-8 rounded-lg ${c.iconBg}
                flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${c.iconCls}`} />
              </div>
              <ArrowUpRight className="h-3 w-3 text-slate-300
                md:group-hover:text-teal-400 transition mt-0.5" />
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900 leading-tight truncate" title={c.value}>
              {c.value}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 truncate" title={c.label}>{c.label}</p>
            <div className="mt-2 flex items-center gap-1">
              {c.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
              {c.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
              <p className="text-xs text-slate-400">{c.sub}</p>
            </div>

            {/* Hover Tooltip */}
            {c.tooltip && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[90%] z-50 
                opacity-0 invisible md:group-hover:opacity-100 md:group-hover:visible 
                transition-all duration-200 scale-95 md:group-hover:scale-100 origin-top pointer-events-none">
                <div className="bg-white border border-slate-200 shadow-xl rounded-lg p-3 relative">
                  {c.tooltip}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"></div>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}


// ─── Aging Strip ──────────────────────────────────────────────────────────────
function AgingStrip({ aging }) {
  if (!aging) return null;
  const total = parseFloat(aging.total) || 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/60 backdrop-blur-md shadow-sm mb-6 p-1 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 bg-white/80 rounded-t-xl">
        <div>
          <h2 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            Outstanding Aging
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Total Outstanding: <span className="font-bold text-slate-800">{formatCurrency(aging.total)}</span>
          </p>
        </div>
      </div>

      <div className="p-5 bg-white/40 rounded-b-xl">
        {/* Modern Segmented Progress Bar */}
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100/50 shadow-inner gap-1 p-0.5">
          {agingConfig.map((a) => {
            const pct = (parseFloat(aging[a.key]) / total) * 100;
            if (pct < 0.5) return null;
            return (
              <div key={a.key} className={`${a.bar} h-full rounded-full transition-all shadow-sm`}
                style={{ width: `${pct}%` }}
                title={`${a.label}: ${formatCurrency(aging[a.key])}`}
              />
            );
          })}
        </div>

        {/* Premium Bucket Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          {agingConfig.map((a) => {
            const pct = (parseFloat(aging[a.key]) / total) * 100;
            return (
              <div key={a.key} className={`relative overflow-hidden rounded-xl border border-slate-100 ${a.bg} p-4 md:hover:shadow-md transition-shadow group bg-opacity-40 backdrop-blur-sm`}>
                <div className={`absolute top-0 left-0 w-full h-1 ${a.bar} opacity-70 md:group-hover:opacity-100 transition-opacity`} />
                <p className="text-sm font-medium text-slate-600 mb-1">{a.label}</p>
                <p className={`text-xl font-extrabold ${a.text}`}>
                  {formatCurrency(aging[a.key])}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full shadow-sm">
                    {aging[a.countKey]} inv
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

// ─── Tenant Summary Table ─────────────────────────────────────────────────────
const worstAgingColors = {
  'Current': 'bg-emerald-100 text-emerald-700',
  '1-30 Days': 'bg-yellow-100  text-yellow-800',
  '31-60 Days': 'bg-orange-100  text-orange-800',
  '61-90 Days': 'bg-red-100     text-red-700',
  '90+ Days': 'bg-red-200     text-red-900 font-semibold',
};

function TenantSummaryTable({ tenants, onNavigate }) {
  if (!tenants) return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-6
      animate-pulse h-48" />
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-6 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-400" />
          <h2 className="font-semibold text-slate-900">Tenant-wise Summary</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Top 20 by outstanding
          </span>
        </div>
        <button
          onClick={() => onNavigate('receivables')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          View All <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-5 py-3 text-left">Tenant</th>
              <th className="px-4 py-3 text-left">Property</th>
              <th className="px-4 py-3 text-right">Billed</th>
              <th className="px-4 py-3 text-right">Collected</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
              <th className="px-4 py-3 text-center">Collection %</th>
              <th className="px-4 py-3 text-center">Aging</th>
              <th className="px-4 py-3 text-right">Overdue Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.length === 0 && (
              <tr>
                <td colSpan={8}
                  className="px-5 py-10 text-center text-sm text-slate-400">
                  No data yet — upload an Excel file to get started
                </td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={`${t.tenant_name}-${t.property_name}-${t.category}`}
                className="md:hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-900">{t.tenant_name}</p>
                  <p className="text-xs font-semibold text-teal-700 mt-0.5">{t.category}</p>
                  {t.unit_no && (
                    <p className="text-[11px] text-slate-400 mt-0.5">Unit {t.unit_no}</p>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-slate-600 text-sm">{t.property_name}</p>
                  {t.tenant_phone && (
                    <p className="text-xs text-slate-400">{t.tenant_phone}</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right text-slate-700">
                  {formatCurrency(t.total_billed)}
                </td>
                <td className="px-4 py-3.5 text-right text-emerald-700 font-medium">
                  {formatCurrency(t.total_collected)}
                </td>
                <td className={`px-4 py-3.5 text-right font-bold
                  ${parseFloat(t.total_outstanding) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {parseFloat(t.total_outstanding) > 0
                    ? formatCurrency(t.total_outstanding) : '—'}
                </td>
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full
                          ${parseFloat(t.collection_pct) >= 90 ? 'bg-emerald-500'
                            : parseFloat(t.collection_pct) >= 60 ? 'bg-yellow-400'
                              : 'bg-red-500'}`}
                        style={{ width: `${Math.min(t.collection_pct, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold
                      ${parseFloat(t.collection_pct) >= 90 ? 'text-emerald-700'
                        : parseFloat(t.collection_pct) >= 60 ? 'text-yellow-700'
                          : 'text-red-600'}`}>
                      {t.collection_pct}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium
                    ${worstAgingColors[t.worst_aging] ?? 'bg-slate-100 text-slate-600'}`}>
                    {t.worst_aging}
                  </span>
                </td>
                <td className={`px-4 py-3.5 text-right text-sm font-semibold
                  ${parseInt(t.max_overdue_days) > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  {parseInt(t.max_overdue_days) > 0 ? `${t.max_overdue_days}d` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────────
function AlertsPanel({ alerts, onNavigate }) {
  const [tab, setTab] = useState('overdue');
  if (!alerts) return null;

  const tabs = [
    { id: 'overdue', label: 'Overdue', data: alerts.overdue, icon: AlertCircle },
    { id: 'leaseExpiry', label: 'Lease Expiry', data: alerts.leaseExpiry, icon: Clock },
    { id: 'critical', label: 'Critical 60d+', data: alerts.critical, icon: AlertTriangle },
    { id: 'noCollection', label: 'Zero Payment', data: alerts.noCollection, icon: TrendingDown },
  ];

  const alertColors = {
    overdue: { icon: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    leaseExpiry: { icon: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    critical: { icon: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300' },
    noCollection: { icon: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  };

  const activeData = tabs.find((t) => t.id === tab)?.data ?? [];
  const cfg = alertColors[tab];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-6 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Alerts & Reminders
        </h2>
        <button
          onClick={() => onNavigate('receivables')}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium
            flex items-center gap-1">
          View All <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm
                font-medium border-b-2 whitespace-nowrap transition
                ${tab === t.id
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon className={`h-4 w-4 ${tab === t.id ? 'text-teal-600' : 'text-slate-400'}`} />
              {t.label}
              {t.data?.length > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold
                  ${tab === t.id
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-slate-100 text-slate-500'}`}>
                  {t.data.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
        {activeData.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No items in this category
          </p>
        ) : activeData.map((item, i) => (
          <div key={i} className={`flex items-center justify-between
            gap-4 px-5 py-4 ${cfg.bg}`}>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 truncate">{item.tenant_name}</p>
              <p className="text-xs text-slate-500 truncate">{item.property_name}</p>
              {item.billing_month && (
                <p className="text-xs text-slate-400 mt-0.5">{formatBillingMonth(item.billing_month)}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              {(item.amount || item.total_overdue || item.outstanding_balance) && (
                <p className={`font-bold text-sm ${cfg.icon}`}>
                  {formatCurrency(
                    item.amount ?? item.total_overdue ?? item.outstanding_balance ?? 0
                  )}
                </p>
              )}
              {item.overdue_days && (
                <p className="text-xs text-slate-500">{item.overdue_days}d overdue</p>
              )}
              {item.days_left !== undefined && (
                <p className={`text-xs font-medium
                  ${item.days_left <= 15 ? 'text-red-600' : 'text-orange-600'}`}>
                  {item.days_left}d to expiry
                </p>
              )}
              {item.lease_end && (
                <p className="text-xs text-slate-400">{formatDate(item.lease_end)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recent Activity ──────────────────────────────────────────────────────────
function RecentActivity({ activity }) {
  const [tab, setTab] = useState('invoices');
  if (!activity) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm min-w-0 overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">Recent Activity</h2>
      </div>
      <div className="flex overflow-x-auto border-b border-slate-200">
        {[
          { id: 'invoices', label: 'Invoices', icon: FileText },
          { id: 'receipts', label: 'Receipts', icon: Receipt },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium
                border-b-2 transition
                ${tab === t.id
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="divide-y divide-slate-100">
        {tab === 'invoices' && (
          activity.recentInvoices?.length === 0
            ? <p className="py-8 text-center text-sm text-slate-400">No invoices yet</p>
            : activity.recentInvoices?.map((inv) => (
              <div key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 truncate">{inv.tenant_name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {inv.property_name} · {formatBillingMonth(inv.billing_month)}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-start gap-2 shrink-0">
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(inv.bill_amount)}
                  </p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))
        )}
        {tab === 'receipts' && (
          activity.recentReceipts?.length === 0
            ? <p className="py-8 text-center text-sm text-slate-400">No receipts yet</p>
            : activity.recentReceipts?.map((r) => (
              <div key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 truncate">{r.tenant_name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {r.property_name} · {formatBillingMonth(r.billing_month)}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-start gap-2 shrink-0">
                  <p className="font-bold text-emerald-700">
                    {formatCurrency(r.amount)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.payment_mode} · {formatDate(r.payment_date)}
                  </p>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const { data, loading, error, refetch } = useAsync(
    () => dashboardApi.getFull(), []
  );

  // API returns { success: true, data: { kpis, aging, tenants, alerts, activity } }
  const d = data?.data;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live overview — rent, collections, outstanding, alerts"
        actions={
          <Button variant="secondary" onClick={refetch} loading={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error loading dashboard data: {error}
        </div>
      )}

      <KPICards kpis={d?.kpis} onNavigate={onNavigate} />

      <AgingStrip aging={d?.aging} />

      <TenantSummaryTable tenants={d?.tenants} onNavigate={onNavigate} />

      <div className="grid gap-6 lg:grid-cols-2">
        <AlertsPanel alerts={d?.alerts} onNavigate={onNavigate} />
        <RecentActivity activity={d?.activity} />
      </div>
    </div>
  );
}
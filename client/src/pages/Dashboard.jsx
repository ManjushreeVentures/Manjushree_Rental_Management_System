import { useState, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle,
  AlertCircle, Clock, CheckCircle2,
  Building2, Users, FileText, Receipt,
  RefreshCw, ArrowUpRight,
} from 'lucide-react';
import FilterBar from '../components/ui/FilterBar';
import InlineAlert from '../components/ui/InlineAlert';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { dashboardApi } from '../api/dashboard.api';
import { formatCurrency, formatDate, formatBillingMonth } from '../utils/format';

import AgingStrip from '../components/ui/AgingStrip';
import { EST_VACANT_RATE_PER_SQFT, agingConfig } from '../utils/constants';

const getAgingColor = (bucket) => {
  if (!bucket) return 'bg-slate-100 text-slate-600';
  const normalized = bucket.replace(/-/g, '–');
  const conf = agingConfig.find(c => c.label === normalized);
  return conf ? `${conf.bg} ${conf.text}` : 'bg-slate-100 text-slate-600';
};

// ─── KPI Cards ────────────────────────────────────────────────────────────────
function KPICards({ kpis, onNavigate }) {
  const [expanded, setExpanded] = useState(null);

  if (!kpis) return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-[104px]">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
          </div>
          <div className="space-y-2 mt-2">
            <div className="w-1/2 h-5 bg-slate-100 rounded animate-pulse" />
            <div className="w-3/4 h-3 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  const collectionPct = kpis.monthly_billed > 0
    ? (kpis.monthly_collected / kpis.monthly_billed) * 100
    : 0;

  const cards = [
    {
      id: 'billed',
      label: 'Monthly Rent Billed',
      value: formatCurrency(kpis.monthly_billed),
      sub: kpis.billing_month ? `Month: ${formatBillingMonth(kpis.billing_month)}` : 'Current month',
      icon: FileText,
      iconBg: 'bg-teal-50',
      iconCls: 'text-teal-600',
      trend: null,
      nav: 'invoices',
      breakdown: [
        { label: 'Rent & CAM', value: formatCurrency(kpis.rent_billed || 0) },
        { label: 'Power', value: formatCurrency(kpis.power_billed || 0) },
        { label: 'Water', value: formatCurrency(kpis.water_billed || 0) },
        { label: 'Infra', value: formatCurrency(kpis.infra_billed || 0) }
      ]
    },
    {
      id: 'collected',
      label: 'Collected (This Month)',
      value: formatCurrency(kpis.monthly_collected),
      sub: `${collectionPct.toFixed(1)}% collection rate` + (kpis.billing_month ? ` (${formatBillingMonth(kpis.billing_month)})` : ''),
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconCls: 'text-emerald-600',
      trend: collectionPct >= 80 ? 'up' : 'down',
      nav: 'receipts',
      breakdown: [
        { label: 'Rent & CAM', value: formatCurrency(kpis.rent_collected || 0), color: 'text-emerald-700' },
        { label: 'Power', value: formatCurrency(kpis.power_collected || 0), color: 'text-emerald-700' },
        { label: 'Water', value: formatCurrency(kpis.water_collected || 0), color: 'text-emerald-700' },
        { label: 'Infra', value: formatCurrency(kpis.infra_collected || 0), color: 'text-emerald-700' }
      ]
    },
    {
      id: 'outstanding',
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
      id: 'overdue',
      label: 'Overdue > 30 Days',
      value: formatCurrency(kpis.overdue_30_plus),
      sub: 'Needs immediate action',
      icon: AlertTriangle,
      iconBg: 'bg-orange-50',
      iconCls: 'text-orange-600',
      trend: 'down',
      nav: 'receivables',
    },
    {
      id: 'annual',
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
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6 relative z-20">
      {/* Decorative gradient behind KPI strip for visual weight */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-50 via-teal-50 to-emerald-50 rounded-2xl opacity-50 blur-sm -z-10 pointer-events-none" />

      {cards.map((c) => {
        const Icon = c.icon;
        const isExpanded = expanded === c.id;

        return (
          <div
            key={c.id}
            className={`relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm
              text-left md:hover:shadow-lg md:hover:border-teal-200 transition-all duration-300 ease-out group flex flex-col 
              ${isExpanded ? 'ring-2 ring-teal-100' : ''}`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className={`h-7 w-7 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-3.5 w-3.5 ${c.iconCls}`} />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); c.nav && onNavigate(c.nav); }}
                className="p-1 rounded-md hover:bg-slate-50 transition-colors"
                title={`Go to ${c.label}`}
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 md:group-hover:text-teal-500 transition-colors" />
              </button>
            </div>

            <button
              className="text-left flex-1 outline-none"
              onClick={() => c.breakdown ? setExpanded(isExpanded ? null : c.id) : (c.nav && onNavigate(c.nav))}
            >
              <p className="text-lg font-extrabold text-slate-900 leading-tight truncate" title={c.value}>
                {c.value}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 truncate" title={c.label}>
                {c.label} {c.breakdown && <span className="lg:hidden text-teal-600 ml-1 text-[10px] bg-teal-50 px-1 rounded">tap</span>}
              </p>

              <div className="mt-1.5 flex items-center gap-1.5">
                {c.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                {c.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                <p className="text-[11px] text-slate-400 font-medium truncate">{c.sub}</p>
              </div>
            </button>

            {/* Desktop Hover Tooltip (if breakdown exists) */}
            {c.breakdown && (
              <div className="hidden lg:block absolute top-[105%] left-1/2 -translate-x-1/2 mt-2 w-[90%] z-50 
                opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                transition-all duration-300 ease-out scale-95 group-hover:scale-100 origin-top pointer-events-none">
                <div className="bg-slate-900 text-white shadow-xl rounded-xl p-3.5 relative">
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45"></div>
                  <p className="font-semibold text-slate-100 mb-2 border-b border-slate-700 pb-1 text-xs uppercase tracking-wider">Breakdown</p>
                  <div className="space-y-1.5 text-sm">
                    {c.breakdown.map((b, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-slate-400">{b.label}:</span>
                        <span className="font-semibold text-white">{b.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Inline Expansion (if breakdown exists) */}
            {c.breakdown && isExpanded && (
              <div className="lg:hidden mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                {c.breakdown.map((b, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-slate-500 text-xs">{b.label}:</span>
                    <span className={`font-semibold text-xs ${b.color || 'text-slate-900'}`}>{b.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Property Overview Strip ───────────────────────────────────────────────
function PropertyOverviewStrip({ kpis, onNavigate }) {
  if (!kpis) return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-6 flex flex-col h-32 p-4 justify-between">
      <div className="w-1/4 h-5 bg-slate-100 rounded animate-pulse" />
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 h-12 bg-slate-50 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );

  const metrics = [
    {
      label: 'Total Properties',
      value: kpis.total_properties || 0,
      sub: 'Active',
      bg: 'bg-indigo-50/70', bar: 'bg-indigo-500', text: 'text-indigo-700'
    },
    {
      label: 'Total Area',
      value: `${Number(kpis.total_area || 0).toLocaleString()} sft`,
      sub: 'Combined Area',
      bg: 'bg-slate-50/70', bar: 'bg-slate-500', text: 'text-slate-700'
    },
    {
      label: 'Leased Area',
      value: `${Number(kpis.leased_area || 0).toLocaleString()} sft`,
      sub: 'Occupied',
      bg: 'bg-emerald-50/70', bar: 'bg-emerald-500', text: 'text-emerald-700'
    },
    {
      label: 'Vacant Area',
      value: `${Number(kpis.vacant_area || 0).toLocaleString()} sft`,
      sub: 'Available',
      bg: 'bg-amber-50/70', bar: 'bg-amber-500', text: 'text-amber-700'
    },
    {
      label: 'Occupancy Rate',
      value: `${kpis.occupancy_rate || 0}%`,
      sub: 'Current',
      bg: 'bg-teal-50/70', bar: 'bg-teal-500', text: 'text-teal-700'
    },
    {
      label: 'Total Rental Income',
      value: formatCurrency(kpis.total_property_rent || 0),
      sub: 'Rent + CAM (excl. GST)',
      bg: 'bg-rose-50/70', bar: 'bg-rose-500', text: 'text-rose-700'
    },
    {
      label: 'Est. Vacant Rent',
      value: formatCurrency((kpis.vacant_area || 0) * EST_VACANT_RATE_PER_SQFT),
      sub: `Potential @ ₹${EST_VACANT_RATE_PER_SQFT}/sft (excl. GST)`,
      bg: 'bg-violet-50/70', bar: 'bg-violet-500', text: 'text-violet-700'
    }
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm h-full flex flex-col p-1 min-w-0 overflow-hidden transition-all duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-white rounded-t-xl">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold text-slate-900 text-base">
            Property Overview
          </h2>
        </div>
        <button
          onClick={() => onNavigate('properties')}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 transition-colors">
          View All <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 bg-white rounded-b-xl flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {metrics.map((m, i) => (
            <div key={i} className={`relative overflow-hidden rounded-xl border border-slate-100/60 ${m.bg} p-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out group`}>
              <div className={`absolute top-0 left-0 w-full h-1 ${m.bar} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />
              <p className="text-xs font-medium text-slate-600 mb-1">{m.label}</p>
              <p className={`text-lg font-extrabold ${m.text}`}>
                {m.value}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                  {m.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── Tenant Summary Table ─────────────────────────────────────────────────────
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
            <tr className="bg-gradient-to-r from-teal-50 to-blue-50/50 text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">
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
            {tenants.slice(0, 20).map((t) => (
              <tr key={t.id ?? `${t.tenant_name}-${t.property_name}-${t.category}`}
                className="md:hover:bg-blue-50/60 transition-colors">
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
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getAgingColor(t.worst_aging)}`}>
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

      <div className="divide-y divide-slate-100">
        {activeData.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No items in this category
          </p>
        ) : activeData.map((item, i) => (
          <div key={item.invoice_id ?? item.id ?? `${item.tenant_name}-${i}`} className={`flex items-center justify-between
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
                    item.amount || item.total_overdue || item.outstanding_balance || 0
                  )}
                </p>
              )}
              {(item.overdue_days || item.overdue_by_days) && (
                <p className="text-xs text-slate-500">{item.overdue_days || item.overdue_by_days}d overdue</p>
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
          !activity.recentInvoices?.length
            ? <p className="py-8 text-center text-sm text-slate-400">No invoices yet</p>
            : activity.recentInvoices.map((inv) => (
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
          !activity.recentReceipts?.length
            ? <p className="py-8 text-center text-sm text-slate-400">No receipts yet</p>
            : activity.recentReceipts.map((r) => (
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
  const fetchDashboard = useCallback(() => dashboardApi.getFull(), []);
  const { data, loading, error, refetch } = useAsync(fetchDashboard, []);

  // API returns { success: true, data: { kpis, aging, tenants, alerts, activity } }
  const d = data?.data;
  const aging = d?.aging;

  const mappedAgingData = aging ? {
    ...aging,
    total_outstanding: aging.total,
    total_invoices: (Number(aging.current_count) || 0) + (Number(aging.days_1_30_count) || 0) + (Number(aging.days_31_60_count) || 0) + (Number(aging.days_61_90_count) || 0) + (Number(aging.days_90_plus_count) || 0)
  } : null;

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
        <div className="mb-6">
          <InlineAlert variant="error">{error}</InlineAlert>
        </div>
      )}

      <KPICards kpis={d?.kpis} onNavigate={onNavigate} />

      <div className="mb-6">
        <PropertyOverviewStrip kpis={d?.kpis} onNavigate={onNavigate} />
      </div>

      <div className="mb-6">
        <AgingStrip data={mappedAgingData} />
      </div>

      <TenantSummaryTable tenants={d?.tenants} onNavigate={onNavigate} />

      <div className="grid gap-6 lg:grid-cols-2">
        <AlertsPanel alerts={d?.alerts} onNavigate={onNavigate} />
        <RecentActivity activity={d?.activity} />
      </div>
    </div>
  );
}
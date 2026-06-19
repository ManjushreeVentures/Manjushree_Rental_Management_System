import { Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { agingConfig } from '../../utils/constants';

export default function AgingStrip({ data }) {
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
            {data.total_invoices} invoices {data.total_tenants !== undefined && `· ${data.total_tenants} tenants`}
          </p>
        </div>
      </div>

      <div className="p-4 bg-white/40 rounded-b-xl">
        {/* Modern Segmented Progress Bar */}
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100/50 shadow-inner gap-0.5 p-0.5">
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
          {agingConfig.map((a) => {
            const pct = (parseFloat(data[a.key]) / total) * 100;
            return (
              <div key={a.key} className={`relative overflow-hidden rounded-xl border border-slate-100 ${a.bg} p-3 hover:shadow-md transition-all group bg-opacity-40 backdrop-blur-sm active:scale-95`}>
                <div className={`absolute top-0 left-0 w-full h-1 ${a.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                <p className="text-[13px] font-semibold text-slate-600 mb-0.5">{a.label}</p>
                <p className={`text-lg font-extrabold ${a.text} leading-tight`}>
                  {formatCurrency(data[a.key])}
                </p>
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-500 bg-white/70 px-1.5 py-0.5 rounded-full shadow-sm">
                    {data[a.count]} inv
                  </p>
                  <p className="text-[11px] font-bold text-slate-400">
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

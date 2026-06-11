import { Loader2, Inbox } from 'lucide-react';

export function Table({ columns, data, loading, emptyMsg = 'No records found', footer }) {
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-teal-500/70" />
      <p className="text-sm font-medium animate-pulse">Loading data...</p>
    </div>
  );
  if (!data?.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
      <div className="p-4 bg-slate-50 rounded-full">
        <Inbox className="h-8 w-8 text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">{emptyMsg}</p>
    </div>
  );
  return (
    <div className="overflow-x-auto custom-scrollbar table-scroll-container rounded-lg border border-slate-200/60 bg-white/50 backdrop-blur-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50/80 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/60">
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/80 bg-white/40">
          {data.map((row, i) => (
            <tr key={row.id ?? i} className="hover:bg-slate-50/80 transition-colors duration-200">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot className="bg-slate-50/90 border-t border-slate-200/80 font-bold text-slate-900">
            {footer}
          </tfoot>
        )}
      </table>
    </div>
  );
}
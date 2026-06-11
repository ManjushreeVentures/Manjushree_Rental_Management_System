import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, limit, onChange }) {
  if (pages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
      <p className="text-xs text-slate-500">
        Showing {from}–{to} of {total} records
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100
            disabled:opacity-40 disabled:cursor-not-allowed transition">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = pages <= 7 ? i + 1
            : page <= 4        ? i + 1
            : page >= pages - 3? pages - 6 + i
            :                    page - 3 + i;
          return (
            <button key={p} onClick={() => onChange(p)}
              className={`min-w-[32px] rounded-lg px-2 py-1 text-xs font-medium transition
                ${p === page
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'}`}>
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onChange(page + 1)} disabled={page === pages}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100
            disabled:opacity-40 disabled:cursor-not-allowed transition">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
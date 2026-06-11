export default function FilterBar({ filters, onChange, onReset }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-3 mb-4">
      {filters.map((f) => {
        if (f.type === 'text') return (
          <input key={f.key} value={f.value}
            onChange={(e) => onChange(f.key, e.target.value)}
            placeholder={f.placeholder}
            className="rounded-xl border border-slate-200/80 px-4 py-2 text-sm
              outline-none focus:ring-2 focus:ring-teal-500/50 w-full md:w-56 bg-white/80 backdrop-blur-sm transition-all shadow-sm" />
        );
        if (f.type === 'select') return (
          <select key={f.key} value={f.value}
            onChange={(e) => onChange(f.key, e.target.value)}
            className="rounded-xl border border-slate-200/80 px-4 py-2 text-sm
              outline-none focus:ring-2 focus:ring-teal-500/50 bg-white/80 backdrop-blur-sm w-full md:w-auto min-w-[150px] transition-all shadow-sm">
            <option value="">{f.placeholder}</option>
            {f.options.map((o) => (
              <option key={o.value ?? o} value={o.value ?? o}>
                {o.label ?? o}
              </option>
            ))}
          </select>
        );
        return null;
      })}
      <button onClick={onReset}
        className="text-xs text-slate-400 hover:text-teal-600 underline underline-offset-2 transition-colors md:ml-auto">
        Reset filters
      </button>
    </div>
  );
}
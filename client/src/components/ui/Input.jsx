export default function Input({ label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-600">{label}</label>}
      <input
        {...props}
        className={`rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}
          disabled:bg-slate-50 disabled:text-slate-400`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
export default function KPICard({ label, value, subtext, icon, iconColorClass, iconBgClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3 min-w-0">
      <div className={`h-10 w-10 rounded-lg ${iconBgClass} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-slate-900 truncate" title={value}>
          {value}
        </p>
        {subtext && <p className="text-xs text-slate-400 truncate mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

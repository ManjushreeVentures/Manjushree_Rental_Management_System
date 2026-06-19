export default function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 bg-gradient-to-r from-teal-50/50 via-blue-50/30 to-transparent px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-teal-400/10 blur-3xl" />
      <div className="relative z-10">
        <h1 className="text-xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-slate-500 font-medium">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 relative z-10">{actions}</div>}
    </div>
  );
}
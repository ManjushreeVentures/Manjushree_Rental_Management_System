const variants = {
  primary:   'bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-600/20 hover:shadow-md active:scale-95 transition-all disabled:bg-teal-300 disabled:shadow-none disabled:active:scale-100',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100',
  danger:    'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 active:scale-95 transition-all',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 active:scale-95 transition-all',
};

export default function Button({ variant = 'primary', loading, children, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
        disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
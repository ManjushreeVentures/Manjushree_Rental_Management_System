export default function InlineAlert({ variant = 'error', children }) {
  if (!children) return null;
  
  if (variant === 'success') {
    return (
      <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600 border border-emerald-100">
        {children}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
      {children}
    </div>
  );
}

import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      {/* panel */}
      <div className={`relative w-full ${width} max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl transition-all`}>
        {/* Mobile handle indicator */}
        <div className="absolute left-1/2 -top-3 w-12 h-1.5 -translate-x-1/2 rounded-full bg-white/40 sm:hidden"></div>
        
        <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}
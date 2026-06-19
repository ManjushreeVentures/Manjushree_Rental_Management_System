import { useState, useCallback } from 'react';
import { ToastContext } from '../../contexts/ToastContext';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success', duration = 4000) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 transition-all animate-in slide-in-from-bottom-5 fade-in duration-300
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          <span className="text-sm font-medium">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80 transition-opacity">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

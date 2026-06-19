import { useState } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import { uploadApi } from '../api/upload.api';
import InlineAlert from './ui/InlineAlert';

export default function PinModal({ filename, onClose }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract the actual filename from paths like "/uploads/receipt-123.pdf"
  const cleanFilename = filename.replace('/uploads/', '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use the clean filename without the /uploads/ prefix
      const response = await uploadApi.verifyPin(pin, cleanFilename);
      
      if (response.data?.success || response.success) {
        // Construct full backend URL
        const serverBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
        const secureUrl = response.data?.url || response.url;
        
        // Open secure URL in new tab
        const finalUrl = secureUrl.startsWith('http') ? secureUrl : `${serverBase}${secureUrl}`;
        window.open(finalUrl, '_blank');
        onClose(); // Close modal on success
      } else {
        setError(response.data?.message || response.message || 'Invalid PIN');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-full bg-rose-100 p-3 text-rose-600">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Secure Attachment</h2>
          <p className="text-sm text-slate-500 mt-1">Enter Master PIN to view document</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-10 text-center text-lg tracking-widest focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                maxLength={10}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition"
              >
                {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
          <InlineAlert variant="error">{error}</InlineAlert>
          )}

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Unlock Document'}
          </button>
        </form>
      </div>
    </div>
  );
}

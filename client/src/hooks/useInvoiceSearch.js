import { useState, useRef, useCallback } from 'react';
import { invoiceApi } from '../api/invoice.api';

export function useInvoiceSearch(status = 'Pending,Partial', delay = 300) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const timeoutRef = useRef(null);

  const searchInvoices = useCallback((q) => {
    setSearch(q);
    if (q.length < 2) { setOptions([]); return; }
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await invoiceApi.getAll({ search: q, status, limit: 15 });
        setOptions(res.data ?? []);
      } catch { setOptions([]); }
      finally { setSearching(false); }
    }, delay);
  }, [status, delay]);

  const clearSearch = useCallback(() => {
    setSearch('');
    setOptions([]);
  }, []);

  return { search, options, searching, searchInvoices, clearSearch };
}

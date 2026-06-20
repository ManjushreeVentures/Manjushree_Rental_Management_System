import { useState, useRef, useCallback } from 'react';
import { tenantApi } from '../api/tenant.api';

export function useTenantSearch(delay = 300) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const timeoutRef = useRef(null);

  const searchTenants = useCallback((q) => {
    setSearch(q);
    if (q.length < 2) { setOptions([]); return; }
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await tenantApi.getAll({ search: q, limit: 15, is_active: true });
        setOptions(res.data ?? []);
      } catch { setOptions([]); }
      finally { setSearching(false); }
    }, delay);
  }, [delay]);

  const clearSearch = useCallback(() => {
    setSearch('');
    setOptions([]);
  }, []);

  return { search, options, searching, searchTenants, clearSearch };
}

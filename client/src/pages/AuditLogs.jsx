import { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth.api';
import InlineAlert from '../components/ui/InlineAlert';
import PageHeader from '../components/ui/PageHeader';
import Pagination from '../components/ui/Pagination';

export default function AuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/audit-logs?page=${page}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        setMeta(json.meta);
      } else {
        setError(json.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
        <p className="mt-2 text-slate-500">Only System Administrators can view Audit Logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="System-wide activity tracking"
      />

      {error && (
        <InlineAlert variant="error">{error}</InlineAlert>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-gradient-to-r from-teal-50 to-blue-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Entity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{log.user_email || 'System'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${log.action === 'CREATE' ? 'bg-green-100 text-green-800' : 
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                      {log.entity}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={meta.page ?? 1}
          pages={meta.pages ?? 1}
          total={meta.total ?? 0}
          limit={meta.limit ?? 50}
          onChange={setPage}
        />
      </div>
    </div>
  );
}

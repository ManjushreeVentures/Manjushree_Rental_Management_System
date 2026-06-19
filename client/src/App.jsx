import { useState } from 'react';
import {
  LayoutDashboard, Building2, Users, FileText,
  Receipt, TrendingUp, UploadCloud, BarChart3,
  Menu, X, ChevronRight, LogOut, ShieldAlert, KeyRound, Eye, EyeOff,
} from 'lucide-react';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import ToastProvider from './components/ui/ToastProvider';
import { authApi } from './api/auth.api';
import InlineAlert from './components/ui/InlineAlert';
import Login from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Properties   from './pages/Properties';
import Tenants      from './pages/Tenants';
import Upload       from './pages/Upload';
import AuditLogs    from './pages/AuditLogs';
// remaining pages — stub until built
import Invoices     from './pages/Invoices';
import Receipts     from './pages/Receipts';
import Receivables  from './pages/Receivables';
import Reports      from './pages/Reports';

// ─── Nav config ──────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'properties',   label: 'Properties',     icon: Building2       },
  { id: 'tenants',      label: 'Tenants',         icon: Users           },
  { id: 'invoices',     label: 'Invoices',        icon: FileText        },
  { id: 'receipts',     label: 'Receipts',        icon: Receipt         },
  { id: 'receivables',  label: 'Receivables',     icon: TrendingUp      },
  { id: 'upload',       label: 'Excel Upload',    icon: UploadCloud     },
  { id: 'reports',      label: 'Reports',         icon: BarChart3       },
  { id: 'audit-logs',   label: 'Audit Logs',      icon: ShieldAlert,    adminOnly: true },
];

// ─── Stub page ────────────────────────────────────────────────────────────────
function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm max-w-md w-full mx-auto">
        <p className="text-xl font-bold text-slate-800">{title}</p>
        <p className="mt-2 text-sm text-slate-500">This module is currently under development.</p>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, onChange, open, onClose }) {
  const { user } = useAuth();
  
  return (
    <>
      {/* mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col
        bg-slate-900 lg:shadow-none transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>

        {/* logo */}
        <div className="flex h-16 items-center gap-3 border-b border-teal-900/60 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 shadow-md shadow-teal-900/50">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight uppercase tracking-wide">Manjushree</p>
            <p className="text-[10px] text-teal-300 uppercase tracking-widest mt-0.5">Ventures</p>
          </div>
          <button onClick={onClose} className="ml-auto lg:hidden text-teal-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon, adminOnly }) => {
            // Hide admin-only items if user is not an admin
            if (adminOnly && user?.role !== 'admin') return null;
            
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => { onChange(id); onClose(); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5
                  text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-900/20'
                    : 'text-teal-400 hover:bg-teal-900 hover:text-white'}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-70" />}
              </button>
            );
          })}
        </nav>

        {/* footer */}
        <div className="border-t border-teal-900/60 px-5 py-4">
          <p className="text-xs text-teal-500/80">v1.0.0 · Manjushree Ventures</p>
        </div>
      </aside>
    </>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function Topbar({ page, onMenuClick }) {
  const { user, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const label = NAV.find((n) => n.id === page)?.label ?? '';
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/60
        bg-white/80 backdrop-blur-md px-4 sm:px-6 shadow-sm z-10 sticky top-0">
        <button onClick={onMenuClick}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-500 truncate min-w-0">
          <span className="font-medium text-slate-700 hidden lg:inline shrink-0">Manjushree Ventures</span>
          <ChevronRight className="h-3.5 w-3.5 hidden lg:inline shrink-0" />
          <span className="font-semibold text-teal-700 truncate">{label}</span>
        </div>
        
        {/* User info and actions */}
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition"
            title="Change Password"
          >
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Change Password</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 transition"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.changePassword(currentPassword, newPassword);
      if (response.success) {
        setSuccess('Password changed successfully!');
        setTimeout(() => onClose(), 2500);
      } else {
        setError(response.message || 'Failed to change password');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-full bg-teal-100 p-3 text-teal-600">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Change Password</h2>
          <p className="text-sm text-slate-500">Update your account password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 pr-10 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 pr-10 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <InlineAlert variant="error">{error}</InlineAlert>
          <InlineAlert variant="success">{success}</InlineAlert>

          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword}
            className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page router ──────────────────────────────────────────────────────────────
function PageRouter({ page, setPage }) {
  switch (page) {
    case 'dashboard':   return <Dashboard    onNavigate={setPage} />;
    case 'properties':  return <Properties   />;
    case 'tenants':     return <Tenants      />;
    case 'invoices':    return <Invoices     />;
    case 'receipts':    return <Receipts     />;
    case 'receivables': return <Receivables  />;
    case 'upload':      return <Upload       />;
    case 'reports':     return <Reports      />;
    case 'audit-logs':  return <AuditLogs    />;
    default:
      console.warn(`Unknown page: "${page}" — falling back to dashboard`);
      return <Dashboard onNavigate={setPage} />;
  }
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, loading, login } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100/80">
      <Sidebar
        active={page}
        onChange={setPage}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar page={page} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6 md:px-8 md:pt-5 md:pb-8 custom-scrollbar">
          <PageRouter page={page} setPage={setPage} />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
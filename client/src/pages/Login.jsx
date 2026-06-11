import { useState } from 'react';
import { Building2, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/auth.api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@rentflow.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authApi.login(email, password);

      if (response.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin(response.data);
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden">
      {/* Background Image with Blur */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop")' }}
      >
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[6px]"></div>
      </div>

      {/* Main Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-5xl rounded-3xl bg-white/70 backdrop-blur-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/40">

        {/* Left Branding Section */}
        <div className="flex-none md:flex-1 p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-between bg-teal-950/80 text-white relative backdrop-blur-md">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-emerald-800/20 mix-blend-overlay"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-center md:justify-start gap-3 md:mb-12">
              <div className="p-2 md:p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 shadow-lg">
                <Building2 className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <span className="text-lg md:text-xl font-bold tracking-wider uppercase text-white/90">
                Manjushree Ventures
              </span>
            </div>

            <div className="hidden md:block">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6 text-white drop-shadow-sm">
                Rental<br />Management<br />System
              </h1>
              <p className="text-teal-100/90 text-base lg:text-lg max-w-sm font-light leading-relaxed">
                Automate invoicing, track payments, and manage your properties with simplicity and precision.
              </p>
            </div>
          </div>

          <div className="hidden md:block relative z-10 mt-12 pt-8 border-t border-white/20">
            <p className="text-xs text-teal-200/80 uppercase tracking-widest">
              © {new Date().getFullYear()} Manjushree Ventures
            </p>
          </div>
        </div>

        {/* Right Form Section */}
        <div className="flex-1 p-6 sm:p-8 md:p-12 lg:p-16 flex items-center justify-center bg-white/60">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h2>
              <p className="text-sm text-slate-600">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@manjushree.com"
                    className="w-full rounded-xl border border-white/50 bg-white/50 py-3 pl-11 pr-4 text-sm text-slate-800 shadow-sm backdrop-blur-md transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/50 bg-white/50 py-3 pl-11 pr-11 text-sm text-slate-800 shadow-sm backdrop-blur-md transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-red-50/80 p-3.5 text-sm text-red-700 border border-red-200/50 backdrop-blur-sm shadow-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
                    {error}
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/30 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 transition-all"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

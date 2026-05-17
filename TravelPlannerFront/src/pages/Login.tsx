import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Globe, Mail, Lock, AlertCircle, Leaf } from 'lucide-react';

const Login = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackPath = (location.state as any)?.from?.pathname || '/dashboard';

  const processLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!loginEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (loginPass.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsAuthenticating(true);
      await login({ email: loginEmail, password: loginPass });
      navigate(fallbackPath, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 401) {
        setAuthError('Incorrect email or password. Please try again.');
      } else {
        setAuthError(err.response?.data?.message || 'Unable to connect. Check that the service is running.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #dff6ff 0%, #e0fdf4 50%, #eff6ff 100%)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-60px] left-[-60px] w-80 h-80 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, #bbf7d0 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-40px] right-[-40px] w-72 h-72 rounded-full opacity-35" style={{ background: 'radial-gradient(circle, #bae6fd 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] right-[10%] w-48 h-48 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #a5f3fc 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="glass-card p-8" style={{ boxShadow: '0 8px 40px rgba(56,189,248,0.15), 0 2px 12px rgba(0,0,0,0.06), inset 0 1.5px 3px rgba(255,255,255,0.8)' }}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 animate-float" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #22c55e 100%)', boxShadow: '0 4px 20px rgba(56,189,248,0.4), inset 0 1.5px 3px rgba(255,255,255,0.6)' }}>
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-2xl font-black text-sky-deep">VoyageFlow</h1>
            <p className="font-body text-xs text-chrome-dark mt-1 tracking-wider uppercase">Sign in to your account</p>
          </div>

          {authError && (
            <div className="mb-5 p-3 rounded-xl flex items-start gap-2.5 text-sm font-body" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={processLogin} className="space-y-4">
            <div>
              <label className="font-display text-xs font-bold text-sky-deep uppercase tracking-widest block mb-1.5">Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-chrome-dark/60"><Mail className="w-4 h-4" /></span>
                <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-2.5 text-ink text-sm font-body input-aero placeholder:text-chrome-dark/50" />
              </div>
            </div>

            <div>
              <label className="font-display text-xs font-bold text-sky-deep uppercase tracking-widest block mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-chrome-dark/60"><Lock className="w-4 h-4" /></span>
                <input type="password" required value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-4 py-2.5 text-ink text-sm font-body input-aero placeholder:text-chrome-dark/50" />
              </div>
            </div>

            <button type="submit" disabled={isAuthenticating} className="w-full py-3 mt-2 btn-aero text-white font-display font-bold text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed">
              {isAuthenticating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-sky-aero/20 text-center text-sm font-body text-chrome-dark">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-sky-deep hover:text-sky-aero transition-colors">Create one</Link>
          </div>
        </div>

        <div className="flex justify-center mt-4 gap-1.5 opacity-50">
          <Leaf className="w-3 h-3 text-grass" />
          <Leaf className="w-3 h-3 text-sky-aero" />
          <Leaf className="w-3 h-3 text-grass" />
        </div>
      </div>
    </div>
  );
};

export default Login;
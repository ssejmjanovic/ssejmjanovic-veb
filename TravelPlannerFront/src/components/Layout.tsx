import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Globe, LogOut, ShieldCheck, LayoutDashboard, Plane, Wind } from 'lucide-react';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLink = (to: string, active: boolean, icon: React.ReactNode, label: string) => (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-display font-bold text-xs transition-all ${
        active
          ? 'btn-aero text-white shadow-glow'
          : 'bg-white/50 text-ink border border-sky-aero/30 hover:bg-white/70 hover:border-sky-aero'
      }`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #dff6ff 0%, #e0fdf4 50%, #eff6ff 100%)' }}>
      {/* Decorative nature orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #bbf7d0 0%, transparent 70%)' }} />
        <div className="absolute top-[20%] left-[-60px] w-72 h-72 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #bae6fd 0%, transparent 70%)' }} />
        <div className="absolute bottom-[10%] right-[25%] w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #a5f3fc 0%, transparent 70%)' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.55) 100%)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(56,189,248,0.25)', boxShadow: '0 2px 20px rgba(56,189,248,0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-3 items-center">

          {/* Left — nav links */}
          <nav className="flex items-center gap-2">
            {isAdmin() && navLink('/admin', location.pathname.startsWith('/admin'), <ShieldCheck className="w-3.5 h-3.5" />, 'Admin')}
            {navLink('/dashboard', location.pathname === '/dashboard', <LayoutDashboard className="w-3.5 h-3.5" />, 'My Trips')}
          </nav>

          {/* Center — logo */}
          <Link to="/dashboard" className="flex items-center justify-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center animate-float" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #22c55e 100%)', boxShadow: '0 2px 12px rgba(56,189,248,0.4), inset 0 1px 2px rgba(255,255,255,0.6)' }}>
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display text-lg font-black text-sky-deep leading-none block" style={{ textShadow: '0 1px 3px rgba(56,189,248,0.2)' }}>VoyageFlow</span>
              <span className="font-body text-[9px] font-semibold text-sky-aero/80 tracking-widest uppercase block">Travel Planner</span>
            </div>
          </Link>

          {/* Right — user info + logout */}
          <div className="flex items-center justify-end gap-3">
            {user && (
              <div className="hidden md:flex flex-col text-right">
                <span className="font-display font-bold text-sm text-sky-deep">{user.firstName} {user.lastName}</span>
                <span className="font-body text-[10px] text-chrome-dark uppercase tracking-wider">{user.role}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-white/50 border border-sky-aero/30 text-ink-light hover:text-red-500 hover:border-red-300 hover:bg-red-50/50 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      <main className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="relative z-10 border-t border-sky-aero/15" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-body text-xs text-chrome-dark/70">
            <Wind className="w-3 h-3 text-sky-aero" />
            © {new Date().getFullYear()} VoyageFlow
          </span>
          <span className="font-body text-xs text-chrome-dark/50">Travel Planning System</span>
          <span className="flex items-center gap-1.5 font-body text-xs text-chrome-dark/70">
            <Plane className="w-3 h-3 text-grass" />
            Bon voyage
          </span>
        </div>
      </footer>
    </div>
  );
};
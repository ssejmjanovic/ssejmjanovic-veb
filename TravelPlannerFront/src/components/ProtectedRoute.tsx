import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Globe } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #dff6ff 0%, #e0fdf4 50%, #eff6ff 100%)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse_glow mb-4" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #22c55e 100%)' }}>
          <Globe className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '2s' }} />
        </div>
        <p className="font-display font-bold text-sky-deep text-sm tracking-wide">Loading VoyageFlow...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
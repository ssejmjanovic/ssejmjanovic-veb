import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';
import { travelPlanService } from '../services/travelPlanService';
import type { TravelPlan } from '../models/types';
import { format } from 'date-fns';
import { CalendarDays, Wallet, ArrowRight, Plus, ShieldCheck, Globe, AlertCircle, Plane, MapPin } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Dashboard = () => {
  const [userPlans, setUserPlans] = useState<TravelPlan[]>([]);
  const [dashboardErr, setDashboardErr] = useState<string | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const retrieveUserTrips = async () => {
      try {
        setIsDashboardLoading(true);
        const data = await travelPlanService.getAll();
        setUserPlans(data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setDashboardErr('Your session has expired. Please sign in again.');
        } else {
          setDashboardErr('Could not load your trips. Check that the backend service is running.');
        }
      } finally {
        setIsDashboardLoading(false);
      }
    };
    retrieveUserTrips();
  }, []);

  if (isDashboardLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse_glow" style={{ background: 'linear-gradient(135deg, #38bdf8, #22c55e)' }}>
          <Globe className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '2s' }} />
        </div>
        <p className="font-display font-bold text-sky-deep text-sm">Loading your trips...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <RouterLink to="/travel-plans/create" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 btn-aero text-white font-display font-bold text-sm self-start">
          <Plus className="w-4 h-4" /> New Trip
        </RouterLink>
        <div className="text-right">
          <h1 className="font-display text-3xl font-black text-sky-deep">
            {user ? `Hello, ${user.firstName}! 👋` : 'My Trips'}
          </h1>
          <p className="font-body text-sm text-chrome-dark mt-0.5">Your travel plans, all in one place.</p>
        </div>
      </div>

      {isAdmin() && (
        <RouterLink to="/admin" className="flex items-center justify-between gap-3 px-5 py-3 rounded-2xl transition-all group"
          style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(34,197,94,0.10) 100%)', border: '1px solid rgba(56,189,248,0.3)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38bdf8, #22c55e)' }}>
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-sm text-sky-deep">Administrator Access</p>
              <p className="font-body text-xs text-chrome-dark">Open Admin Dashboard</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-sky-aero transition-transform group-hover:translate-x-1" />
        </RouterLink>
      )}

      {dashboardErr && (
        <div className="p-4 rounded-2xl flex items-center gap-3 font-body text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{dashboardErr}</span>
        </div>
      )}

      {userPlans.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(34,197,94,0.15))', border: '1px solid rgba(56,189,248,0.2)' }}>
            <Plane className="w-8 h-8 text-sky-aero" />
          </div>
          <h3 className="font-display font-black text-xl text-sky-deep mb-2">No trips yet</h3>
          <p className="font-body text-sm text-chrome-dark max-w-xs mx-auto mb-6">
            Start planning your first adventure! Create a trip to get going.
          </p>
          <RouterLink to="/travel-plans/create" className="inline-flex items-center gap-2 px-5 py-2.5 btn-grass text-white font-display font-bold text-sm">
            <Plus className="w-4 h-4" /> Create First Trip
          </RouterLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userPlans.map((plan, idx) => {
            const hasOverrunBudget = plan.remainingBudget < 0;
            const accentSide = idx % 2 === 0 ? 'left' : 'right';
            return (
              <div key={plan.id} className="glass-card p-0 flex overflow-hidden group transition-all hover:shadow-glow">
                {accentSide === 'left' && <div className="w-1.5 flex-shrink-0 rounded-l-[1.25rem]" style={{ background: 'linear-gradient(180deg, #38bdf8, #22c55e)' }} />}

                <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="font-display font-black text-lg text-sky-deep leading-tight group-hover:text-sky-aero transition-colors truncate">
                        {plan.name}
                      </h2>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(34,197,94,0.1))', border: '1px solid rgba(56,189,248,0.2)' }}>
                        <Globe className="w-4 h-4 text-sky-aero" />
                      </div>
                    </div>

                    {plan.description && <p className="font-body text-sm text-chrome-dark line-clamp-1 italic mb-3">{plan.description}</p>}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3 border-t border-sky-aero/15">
                      <div className="flex items-center gap-1.5 text-xs font-body text-chrome-dark">
                        <CalendarDays className="w-3.5 h-3.5 text-sky-aero" />
                        <span>{format(new Date(plan.startDate), 'MMM d')} → {format(new Date(plan.endDate), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-body text-chrome-dark">
                        <Wallet className="w-3.5 h-3.5 text-grass" />
                        <span>${plan.budget.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-sky-aero/15">
                    <span className={`font-bold text-xs px-2.5 py-1 rounded-full ${
                      hasOverrunBudget ? 'text-red-600 bg-red-50 border border-red-200' : 'text-grass-deep bg-grass-light/50 border border-grass-light'
                    }`}>
                      {hasOverrunBudget ? `-$${Math.abs(plan.remainingBudget).toFixed(0)} over` : `$${plan.remainingBudget.toFixed(0)} left`}
                    </span>

                    <RouterLink to={`/travel-plans/${plan.id}`} className="inline-flex items-center gap-1 py-1.5 px-3.5 rounded-full font-display font-bold text-xs transition-all"
                      style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#0369a1' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(56,189,248,0.2)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(56,189,248,0.1)'; }}>
                      View Details
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </RouterLink>
                  </div>
                </div>

                {accentSide === 'right' && <div className="w-1.5 flex-shrink-0 rounded-r-[1.25rem]" style={{ background: 'linear-gradient(180deg, #22c55e, #38bdf8)' }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
import { useEffect, useState } from 'react';
import { ShieldCheck, Users, Briefcase, Trash2, UserX, AlertCircle } from 'lucide-react';
import { adminService } from '../services/adminService';
import type { User, TravelPlan } from '../models/types';

export const AdminDashboard = () => {
  const [memberList, setMemberList] = useState<User[]>([]);
  const [allTrips, setAllTrips] = useState<TravelPlan[]>([]);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

  const fetchAdminResources = async () => {
    try {
      setIsPageLoading(true);
      setAdminError(null);
      const [fetchedUsers, fetchedPlans] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllPlans()
      ]);
      setMemberList(fetchedUsers);
      setAllTrips(fetchedPlans);
    } catch (err: any) {
      setAdminError('Failed to load admin data. Verify that you have admin privileges.');
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => { fetchAdminResources(); }, []);

  const disableUserAccount = async (userId: number) => {
    if (!window.confirm('Deactivate this user account?')) return;
    try {
      await adminService.deactivateUser(userId);
      fetchAdminResources();
    } catch {
      alert('Failed to deactivate user.');
    }
  };

  const removeTrip = async (planId: number) => {
    if (!window.confirm('Delete this travel plan?')) return;
    try {
      await adminService.deletePlan(planId);
      fetchAdminResources();
    } catch {
      alert('Failed to delete plan.');
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-light/10 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* DATA PANELS FIRST (With All Trips swapped ahead of Members) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* All Trips Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-sky-aero/10">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-sky-deep" />
              <h2 className="font-display font-black text-sm text-sky-deep uppercase tracking-wide">All Trips ({allTrips.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-display font-bold text-chrome-dark uppercase tracking-widest border-b border-sky-aero/15">
                    <th className="pb-2">Trip Name</th>
                    <th className="pb-2">Budget</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-aero/10">
                  {allTrips.map(p => (
                    <tr key={p.id} className="hover:bg-sky-light/20 transition-colors">
                      <td className="py-2.5 font-display font-bold text-sm text-sky-deep truncate max-w-[160px]">{p.name}</td>
                      <td className="py-2.5 font-mono text-xs text-chrome-dark">${p.budget}</td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => removeTrip(p.id)} className="p-1.5 rounded-lg text-chrome-dark hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Member List Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-sky-aero/10">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-sky-deep" />
              <h2 className="font-display font-black text-sm text-sky-deep uppercase tracking-wide">Registered Members ({memberList.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-display font-bold text-chrome-dark uppercase tracking-widest border-b border-sky-aero/15">
                    <th className="pb-2">User</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-aero/10">
                  {memberList.map(u => (
                    <tr key={u.id} className="hover:bg-sky-light/20 transition-colors">
                      <td className="py-2.5 font-display font-bold text-sm text-sky-deep truncate max-w-[160px]">{u.firstName} {u.lastName}</td>
                      <td className="py-2.5 font-mono text-xs text-chrome-dark">{u.email}</td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => disableUserAccount(u.id)} className="p-1.5 rounded-lg text-chrome-dark hover:text-red-500 hover:bg-red-50 transition-all">
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ERROR ALERTS PLACED TOWARDS THE BASE */}
        {adminError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-body">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{adminError}</span>
          </div>
        )}

        {/* MAIN CONTROLLER TITLE HEADER AT THE BOTTOM */}
        <div className="flex items-center gap-3 border-t border-sky-aero/15 pt-4">
          <div className="p-2.5 bg-sky-light rounded-2xl text-sky-deep">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-sky-deep uppercase tracking-wider">Admin Control Center</h1>
            <p className="text-xs font-body text-chrome-dark">Manage registered users and system wide travel itineraries</p>
          </div>
        </div>

      </div>
    </div>
  );
};
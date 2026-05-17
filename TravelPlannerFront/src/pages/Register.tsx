import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { Globe, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

const Register = () => {
  const [givenName, setGivenName] = useState('');
  const [surname, setSurname] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [verifyPass, setVerifyPass] = useState('');
  const [adminToken, setAdminToken] = useState('');
  
  const [regError, setRegError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const navigate = useNavigate();

  const processRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!givenName.trim() || !surname.trim()) {
      setRegError('Please enter your first and last name.');
      return;
    }
    if (!signupEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (signupPass.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    if (signupPass !== verifyPass) {
      setRegError('Passwords do not match.');
      return;
    }

    try {
      setIsProcessing(true);
      const payload: any = { firstName: givenName, lastName: surname, email: signupEmail, password: signupPass };
      if (adminToken.trim()) payload.adminKey = adminToken.trim();
      await authService.register(payload);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #dff6ff 0%, #e0fdf4 50%, #eff6ff 100%)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-60px] right-[-60px] w-80 h-80 rounded-full opacity-35" style={{ background: 'radial-gradient(circle, #bae6fd 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-40px] left-[-40px] w-72 h-72 rounded-full opacity-35" style={{ background: 'radial-gradient(circle, #bbf7d0 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="glass-card p-8">
          <div className="flex flex-col items-center mb-7">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 animate-float" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #22c55e 100%)', boxShadow: '0 4px 20px rgba(56,189,248,0.4), inset 0 1.5px 3px rgba(255,255,255,0.6)' }}>
              <Globe className="w-7 h-7 text-white" />
            </div>
            <h2 className="font-display text-2xl font-black text-sky-deep">Create Account</h2>
            <p className="font-body text-xs text-chrome-dark mt-1">Join VoyageFlow and start planning</p>
          </div>

          {regError && (
            <div className="mb-4 p-3 rounded-xl flex items-start gap-2 text-sm font-body" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{regError}</span>
            </div>
          )}

          {isSuccess && (
            <div className="mb-4 p-3 rounded-xl flex items-start gap-2 text-sm font-body" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.35)', color: '#15803d' }}>
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Account created! Redirecting to login...</span>
            </div>
          )}

          <form onSubmit={processRegistration} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-display text-xs font-bold text-sky-deep uppercase tracking-widest block mb-1.5">First Name</label>
                <input type="text" required value={givenName} onChange={e => setGivenName(e.target.value)} className="w-full px-3 py-2.5 text-sm font-body input-aero" />
              </div>
              <div>
                <label className="font-display text-xs font-bold text-sky-deep uppercase tracking-widest block mb-1.5">Last Name</label>
                <input type="text" required value={surname} onChange={e => setSurname(e.target.value)} className="w-full px-3 py-2.5 text-sm font-body input-aero" />
              </div>
            </div>

            <div>
              <label className="font-display text-xs font-bold text-sky-deep uppercase tracking-widest block mb-1.5">Email</label>
              <input type="email" required value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className="w-full px-3 py-2.5 text-sm font-body input-aero" />
            </div>

            <div>
              <label className="font-display text-xs font-bold text-sky-deep uppercase tracking-widest block mb-1.5">Password</label>
              <input type="password" required value={signupPass} onChange={e => setSignupPass(e.target.value)} className="w-full px-3 py-2.5 text-sm font-body input-aero" />
            </div>

            <div>
              <label className="font-display text-xs font-bold text-sky-deep uppercase tracking-widest block mb-1.5">Confirm Password</label>
              <input type="password" required value={verifyPass} onChange={e => setVerifyPass(e.target.value)} className="w-full px-3 py-2.5 text-sm font-body input-aero" />
            </div>

            <div className="p-3 rounded-xl" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <label className="font-display text-xs font-bold text-sky-deep uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Admin Key <span className="font-body text-chrome-dark normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <input type="password" value={adminToken} onChange={e => setAdminToken(e.target.value)} placeholder="Leave blank for standard account" className="w-full px-3 py-2 text-sm font-body input-aero placeholder:text-chrome-dark/50" />
              <p className="text-[10px] font-body text-chrome-dark mt-1.5">Enter the administrator key to receive admin privileges.</p>
            </div>

            <button type="submit" disabled={isProcessing || isSuccess} className="w-full py-3 btn-aero text-white font-display font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {isProcessing ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-sky-aero/20 text-center text-sm font-body text-chrome-dark">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-sky-deep hover:text-sky-aero transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
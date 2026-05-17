import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar, ShieldCheck, ShieldAlert, Compass,
  CheckSquare, Square, MapPin, ClipboardList, Plus,
  Pencil, Trash2, X, Check, FileDown, Bell, Save,
  Wallet, CalendarDays, Globe, Map as MapIcon, Plane
} from 'lucide-react';
import { sharingService } from '../services/sharingService';
import { checklistService } from '../services/checklistService';
import { destinationService } from '../services/destinationService';
import { activityService } from '../services/activityService';
import { expenseService } from '../services/expenseService';
import { travelPlanService } from '../services/travelPlanService';
import type { TravelPlan, ActivityStatus, ExpenseCategory, Destination, Activity, Expense } from '../models/types';
import { Button } from '../components/ui/Button';
import { TravelMap } from '../components/TravelMap';

const ACTIVITY_STATUSES: ActivityStatus[] = ['Planned', 'Reserved', 'Completed', 'Cancelled'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Transport', 'Accommodation', 'Food', 'Tickets', 'Shopping', 'Other'];

const STATUS_LABELS = ['Planned', 'Reserved', 'Completed', 'Cancelled'];
const CATEGORY_LABELS = ['Transport', 'Accommodation', 'Food', 'Tickets', 'Shopping', 'Other'];

type ViewTab = 'overview' | 'destinations' | 'activities' | 'expenses' | 'checklist' | 'reminders' | 'map';

interface Reminder { id: string; text: string; datetime: string; fired: boolean; }

const inputCls = 'w-full px-3 py-2 text-sm font-body text-ink input-aero';
const labelCls = 'block font-display text-[10px] font-bold text-sky-deep uppercase tracking-widest mb-1';

const statusColors: Record<string, string> = {
  Planned:   'bg-sky-light   text-sky-deep   border-sky-aero/40',
  Reserved:  'bg-grass-light text-grass-deep  border-grass/40',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-red-50      text-red-600     border-red-200',
};

const TAB_META: { key: ViewTab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',     label: 'Overview',     icon: <Globe className="w-3.5 h-3.5" /> },
  { key: 'destinations', label: 'Destinations', icon: <MapPin className="w-3.5 h-3.5" /> },
  { key: 'activities',   label: 'Activities',   icon: <CalendarDays className="w-3.5 h-3.5" /> },
  { key: 'expenses',     label: 'Expenses',     icon: <Wallet className="w-3.5 h-3.5" /> },
  { key: 'checklist',    label: 'Checklist',    icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { key: 'reminders',    label: 'Reminders',    icon: <Bell className="w-3.5 h-3.5" /> },
  { key: 'map',          label: 'Map',          icon: <MapIcon className="w-3.5 h-3.5" /> },
];

export const SharedPlanView = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [linkedTrip, setLinkedTrip] = useState<TravelPlan | null>(null);
  const [isLoadingShared, setIsLoadingShared] = useState(true);
  const [sharedErr, setSharedErr] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewTab>('overview');
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);

  const isEditMode = searchParams.get('perm') === '1';

  const [destInput, setDestInput] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });
  const [actInput, setActInput] = useState({ name: '', description: '', dateTime: '', location: '', status: 'Planned' as ActivityStatus });
  const [expInput, setExpInput] = useState({ name: '', amount: '', category: 'Transport' as ExpenseCategory });
  const [checkInput, setCheckInput] = useState({ title: '' });

  const [editingPlan, setEditingPlan] = useState(false);
  const [planEditForm, setPlanEditForm] = useState({ name: '', description: '', startDate: '', endDate: '', budget: 0, notes: '' });

  const [editingDestId, setEditingDestId] = useState<number | null>(null);
  const [destEditForm, setDestEditForm] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });

  const [editingActId, setEditingActId] = useState<number | null>(null);
  const [actEditForm, setActEditForm] = useState({ name: '', dateTime: '', location: '', status: 'Planned' as ActivityStatus });

  const [editingExpId, setEditingExpId] = useState<number | null>(null);
  const [expEditForm, setExpEditForm] = useState({ name: '', amount: '', category: 'Transport' as ExpenseCategory });

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderForm, setReminderForm] = useState({ text: '', datetime: '' });
  const reminderTimers = useRef<globalThis.Map<string, ReturnType<typeof setTimeout>>>(new globalThis.Map());

  const loadSharedTrip = async () => {
    if (!token) return;
    try {
      setIsLoadingShared(true);
      setSharedErr(null);
      const authValidation = await sharingService.validateToken(token);
      if (!authValidation.isValid) throw new Error(authValidation.reason || 'This share link is invalid.');
      const planData = await sharingService.getSharedPlan(authValidation.travelPlanId, token);
      setLinkedTrip(planData);
    } catch (err: any) {
      setSharedErr(err.message || 'This share link has expired or is invalid.');
    } finally {
      setIsLoadingShared(false);
    }
  };

  useEffect(() => { loadSharedTrip(); }, [token]);

  useEffect(() => {
    if (linkedTrip) {
      try {
        const stored = JSON.parse(localStorage.getItem(`reminders_${linkedTrip.id}`) || '[]');
        setReminders(stored);
        stored.forEach((r: Reminder) => { if (!r.fired) scheduleNotification(r, linkedTrip.id); });
      } catch {}
    }
    return () => { reminderTimers.current.forEach(t => clearTimeout(t)); };
  }, [linkedTrip?.id]);

  const refreshSharedData = async () => {
    if (!linkedTrip || !token) return;
    const planData = await sharingService.getSharedPlan(linkedTrip.id, token);
    setLinkedTrip(planData);
  };

  const saveReminders = (updated: Reminder[], planId: number) => {
    setReminders(updated);
    localStorage.setItem(`reminders_${planId}`, JSON.stringify(updated));
  };

  const scheduleNotification = (r: Reminder, planId: number) => {
    const ms = new Date(r.datetime).getTime() - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => {
      if (Notification.permission === 'granted') new Notification('VoyageFlow Reminder', { body: r.text });
      else alert(`Reminder: ${r.text}`);
      setReminders(prev => {
        const updated = prev.map(x => x.id === r.id ? { ...x, fired: true } : x);
        localStorage.setItem(`reminders_${planId}`, JSON.stringify(updated));
        return updated;
      });
    }, ms);
    reminderTimers.current.set(r.id, t);
  };

  const addReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedTrip || !reminderForm.text.trim() || !reminderForm.datetime) return;
    const r: Reminder = { id: Date.now().toString(), text: reminderForm.text.trim(), datetime: reminderForm.datetime, fired: false };
    const updated = [...reminders, r];
    saveReminders(updated, linkedTrip.id);
    scheduleNotification(r, linkedTrip.id);
    if (Notification.permission === 'default') Notification.requestPermission();
    setReminderForm({ text: '', datetime: '' });
  };

  const deleteReminder = (rid: string) => {
    if (!linkedTrip) return;
    const t = reminderTimers.current.get(rid);
    if (t) clearTimeout(t);
    reminderTimers.current.delete(rid);
    saveReminders(reminders.filter(r => r.id !== rid), linkedTrip.id);
  };

  const handleExportPdf = () => {
    if (!linkedTrip) return;
    const lines: string[] = [];
    lines.push(`SHARED TRIP: ${linkedTrip.name}`);
    lines.push(`Period: ${linkedTrip.startDate?.substring(0, 10)} — ${linkedTrip.endDate?.substring(0, 10)}`);
    lines.push(`Budget: $${linkedTrip.budget} | Spent: $${linkedTrip.totalExpenses} | Remaining: $${linkedTrip.remainingBudget}`);
    if (linkedTrip.description) lines.push(`\nDescription: ${linkedTrip.description}`);
    if (linkedTrip.notes) lines.push(`Notes: ${linkedTrip.notes}`);
    if (linkedTrip.destinations?.length) { lines.push('\n--- DESTINATIONS ---'); linkedTrip.destinations.forEach((d: any) => lines.push(`• ${d.name}: ${d.arrivalDate?.substring(0, 10)} → ${d.departureDate?.substring(0, 10)}`)); }
    if (linkedTrip.activities?.length) { lines.push('\n--- ACTIVITIES ---'); linkedTrip.activities.forEach((a: any) => lines.push(`• ${a.name} | ${a.date?.substring(0, 10)} @ ${a.date?.substring(11, 16)} | ${a.location || 'TBD'} | ${typeof a.status === 'number' ? STATUS_LABELS[a.status] : a.status}`)); }
    if (linkedTrip.expenses?.length) { lines.push('\n--- EXPENSES ---'); linkedTrip.expenses.forEach((e: any) => lines.push(`• ${e.name} (${typeof e.category === 'number' ? CATEGORY_LABELS[e.category] : e.category}): $${e.amount}`)); }
    if (linkedTrip.checklistItems?.length) { lines.push('\n--- CHECKLIST ---'); linkedTrip.checklistItems.forEach((c: any) => lines.push(`[${c.isCompleted ? 'x' : ' '}] ${c.name}`)); }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${linkedTrip.name.replace(/\s+/g, '_')}_shared_trip.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const startEditPlan = () => {
    if (!linkedTrip || !isEditMode) return;
    setPlanEditForm({ name: linkedTrip.name, description: linkedTrip.description || '', startDate: linkedTrip.startDate?.substring(0, 10), endDate: linkedTrip.endDate?.substring(0, 10), budget: linkedTrip.budget, notes: linkedTrip.notes || '' });
    setEditingPlan(true);
  };

  const savePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedTrip || !isEditMode) return;
    if (new Date(planEditForm.endDate) < new Date(planEditForm.startDate)) { alert('End date must be after start date.'); return; }
    if (planEditForm.budget < 0) { alert('Budget cannot be negative.'); return; }
    try { await travelPlanService.update(linkedTrip.id, planEditForm); setEditingPlan(false); await refreshSharedData(); }
    catch { alert('Failed to update trip.'); }
  };

  const addDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedTrip || !isEditMode || !destInput.name || !destInput.arrivalDate || !destInput.departureDate) return;
    if (new Date(destInput.departureDate) < new Date(destInput.arrivalDate)) { alert('Departure must be after arrival.'); return; }
    try {
      await destinationService.create(linkedTrip.id, { name: destInput.name, location: destInput.name, arrivalDate: destInput.arrivalDate, departureDate: destInput.departureDate, description: destInput.description || '', notes: '' });
      setDestInput({ name: '', arrivalDate: '', departureDate: '', description: '' });
      await refreshSharedData();
    } catch { alert('Failed to add destination.'); }
  };

  const startEditDest = (d: Destination) => {
    if (!isEditMode) return;
    setEditingDestId(d.id);
    setDestEditForm({ name: d.name, arrivalDate: d.arrivalDate?.substring(0, 10), departureDate: d.departureDate?.substring(0, 10), description: d.description || '' });
  };

  const saveDestEdit = async (e: React.FormEvent, destId: number) => {
    e.preventDefault();
    if (!linkedTrip || !isEditMode) return;
    if (new Date(destEditForm.departureDate) < new Date(destEditForm.arrivalDate)) { alert('Departure must be after arrival.'); return; }
    try {
      await destinationService.update(linkedTrip.id, destId, { name: destEditForm.name, location: destEditForm.name, arrivalDate: destEditForm.arrivalDate, departureDate: destEditForm.departureDate, description: destEditForm.description, notes: '' });
      setEditingDestId(null); await refreshSharedData();
    } catch { alert('Failed to update destination.'); }
  };

  const deleteDest = async (destId: number) => {
    if (!linkedTrip || !isEditMode || !window.confirm('Remove this destination?')) return;
    try { await destinationService.delete(linkedTrip.id, destId); await refreshSharedData(); }
    catch { alert('Failed to remove destination.'); }
  };

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedTrip || !isEditMode || !actInput.name || !actInput.dateTime) return;
    try {
      await activityService.create(linkedTrip.id, { name: actInput.name, date: actInput.dateTime + ':00', time: null, location: actInput.location || 'TBD', description: actInput.description || '', estimatedCost: 0, status: actInput.status });
      setActInput({ name: '', description: '', dateTime: '', location: '', status: 'Planned' });
      await refreshSharedData();
    } catch { alert('Failed to add activity.'); }
  };

  const startEditAct = (a: Activity) => {
    if (!isEditMode) return;
    setEditingActId(a.id);
    setActEditForm({ name: a.name, dateTime: a.date?.substring(0, 16), location: a.location || '', status: typeof a.status === 'number' ? STATUS_LABELS[a.status] as ActivityStatus : a.status });
  };

  const saveActEdit = async (e: React.FormEvent, actId: number) => {
    e.preventDefault();
    if (!linkedTrip || !isEditMode) return;
    try {
      await activityService.update(linkedTrip.id, actId, { name: actEditForm.name, date: actEditForm.dateTime + ':00', time: null, location: actEditForm.location || 'TBD', status: actEditForm.status });
      setEditingActId(null); await refreshSharedData();
    } catch { alert('Failed to update activity.'); }
  };

  const deleteAct = async (actId: number) => {
    if (!linkedTrip || !isEditMode || !window.confirm('Remove this activity?')) return;
    try { await activityService.delete(linkedTrip.id, actId); await refreshSharedData(); }
    catch { alert('Failed to remove activity.'); }
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expInput.amount);
    if (!linkedTrip || !isEditMode || !expInput.name || amountNum <= 0) { alert('Amount must be greater than zero.'); return; }
    try {
      await expenseService.create(linkedTrip.id, { name: expInput.name, amount: amountNum, category: expInput.category, date: new Date().toISOString(), description: '' });
      setExpInput({ name: '', amount: '', category: 'Transport' });
      await refreshSharedData();
    } catch { alert('Failed to add expense.'); }
  };

  const startEditExp = (e: Expense) => {
    if (!isEditMode) return;
    setEditingExpId(e.id);
    setExpEditForm({ name: e.name, amount: String(e.amount), category: typeof e.category === 'number' ? CATEGORY_LABELS[e.category] as ExpenseCategory : e.category });
  };

  const saveExpEdit = async (ev: React.FormEvent, expId: number) => {
    ev.preventDefault();
    if (!linkedTrip || !isEditMode) return;
    const amountNum = Number(expEditForm.amount);
    if (amountNum <= 0) { alert('Amount must be greater than zero.'); return; }
    try {
      await expenseService.update(linkedTrip.id, expId, { name: expEditForm.name, amount: amountNum, category: expEditForm.category });
      setEditingExpId(null); await refreshSharedData();
    } catch { alert('Failed to update expense.'); }
  };

  const deleteExp = async (expId: number) => {
    if (!linkedTrip || !isEditMode || !window.confirm('Remove this expense?')) return;
    try { await expenseService.delete(linkedTrip.id, expId); await refreshSharedData(); }
    catch { alert('Failed to remove expense.'); }
  };

  const addChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedTrip || !isEditMode || !checkInput.title.trim()) return;
    try { await checklistService.create(linkedTrip.id, checkInput.title.trim()); setCheckInput({ title: '' }); await refreshSharedData(); }
    catch { alert('Failed to add checklist item.'); }
  };

  const handleToggleChecklist = async (itemId: number, currentStatus: boolean) => {
    if (!linkedTrip || !isEditMode) return;
    try { setToggleLoadingId(itemId); await checklistService.toggle(linkedTrip.id, itemId, !currentStatus); await refreshSharedData(); }
    catch { alert('Failed to update item.'); } finally { setToggleLoadingId(null); }
  };

  const deleteCheckItem = async (itemId: number) => {
    if (!linkedTrip || !isEditMode || !window.confirm('Remove this item?')) return;
    try { await checklistService.delete(linkedTrip.id, itemId); await refreshSharedData(); }
    catch { alert('Failed to remove item.'); }
  };

  if (isLoadingShared) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse_glow"
          style={{ background: 'linear-gradient(135deg, #38bdf8, #22c55e)' }}>
          <Plane className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '2s' }} />
        </div>
        <p className="font-display font-bold text-sky-deep text-sm">Loading shared trip...</p>
      </div>
    );
  }

  if (sharedErr || !linkedTrip) {
    return (
      <div className="max-w-sm mx-auto mt-16 glass-card p-8 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <p className="font-display font-bold text-sky-deep">{sharedErr || 'Share link not found.'}</p>
        <Button onClick={() => navigate('/login')} variant="secondary">Back to Login</Button>
      </div>
    );
  }

  const isOverBudget = linkedTrip.remainingBudget < 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #22c55e 100%)', boxShadow: '0 4px 16px rgba(56,189,248,0.35)' }}>
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-sky-deep">{linkedTrip.name}</h1>
            <p className="font-body text-sm text-ink-light italic">{linkedTrip.description || 'No description.'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-bold border ${
            isEditMode
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-grass-light border-grass/40 text-grass-deep'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            {isEditMode ? 'Edit Access' : 'View Only'}
          </div>
          <Button variant="secondary" onClick={handleExportPdf} className="text-xs">
            <FileDown className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TAB_META.map(tab => (
          <button
            key={tab.key}
            onClick={() => setCurrentView(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-display font-bold text-xs transition-all ${
              currentView === tab.key
                ? 'btn-aero text-white shadow-glow'
                : 'bg-white/60 text-ink-light border border-sky-aero/25 hover:bg-white/80 hover:text-sky-deep backdrop-blur'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card p-6 min-h-[320px]">
        {currentView === 'overview' && (
          <div className="space-y-6">
            {isEditMode && editingPlan ? (
              <form onSubmit={savePlanEdit} className="space-y-4">
                <h3 className="font-display font-black text-base text-sky-deep">Edit Trip Details</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><label className={labelCls}>Name *</label><input required value={planEditForm.name} onChange={e => setPlanEditForm({...planEditForm, name: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Budget ($)</label><input type="number" min="0" value={planEditForm.budget} onChange={e => setPlanEditForm({...planEditForm, budget: Number(e.target.value)})} className={inputCls} /></div>
                  <div><label className={labelCls}>Start Date *</label><input type="date" required value={planEditForm.startDate} onChange={e => setPlanEditForm({...planEditForm, startDate: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>End Date *</label><input type="date" required value={planEditForm.endDate} onChange={e => setPlanEditForm({...planEditForm, endDate: e.target.value})} className={inputCls} /></div>
                  <div className="sm:col-span-2"><label className={labelCls}>Description</label><textarea value={planEditForm.description} onChange={e => setPlanEditForm({...planEditForm, description: e.target.value})} rows={2} className={`${inputCls} resize-none`} /></div>
                  <div className="sm:col-span-2"><label className={labelCls}>Notes</label><textarea value={planEditForm.notes} onChange={e => setPlanEditForm({...planEditForm, notes: e.target.value})} rows={3} className={`${inputCls} resize-none`} /></div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditingPlan(false)}><X className="w-3 h-3" /> Cancel</Button>
                  <Button type="submit" className="text-xs"><Save className="w-3 h-3" /> Save</Button>
                </div>
              </form>
            ) : (
              <div className="grid md:grid-cols-3 gap-5">
                <div className="md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display font-black text-base text-sky-deep">Trip Notes</h3>
                    {isEditMode && <Button variant="secondary" className="text-xs" onClick={startEditPlan}><Pencil className="w-3 h-3" /> Edit</Button>}
                  </div>
                  <div className="p-4 rounded-xl font-body text-sm text-ink whitespace-pre-wrap min-h-[80px]"
                    style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.2)' }}>
                    {linkedTrip.notes || <span className="text-chrome-dark italic">No notes yet.</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-body text-ink-light">
                    <CalendarDays className="w-3.5 h-3.5 text-sky-aero" />
                    <span>{linkedTrip.startDate?.substring(0, 10)} → {linkedTrip.endDate?.substring(0, 10)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl space-y-3 h-fit"
                  style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <h4 className="font-display font-black text-sm text-sky-deep">Budget</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-body">
                      <span className="text-ink-light">Total Budget</span>
                      <span className="font-mono font-bold text-ink">${linkedTrip.budget}</span>
                    </div>
                    <div className="flex justify-between text-xs font-body">
                      <span className="text-ink-light">Spent</span>
                      <span className="font-mono font-bold text-red-500">-${linkedTrip.totalExpenses}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(56,189,248,0.15)' }}>
                      <div className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-400' : 'bg-gradient-to-r from-sky-aero to-grass'}`}
                        style={{ width: `${Math.min(100, linkedTrip.budget > 0 ? (linkedTrip.totalExpenses / linkedTrip.budget) * 100 : 0)}%` }} />
                    </div>
                    <div className={`flex justify-between text-xs font-body pt-1 border-t border-sky-aero/15 font-bold ${isOverBudget ? 'text-red-500' : 'text-grass-deep'}`}>
                      <span>{isOverBudget ? 'Over budget' : 'Remaining'}</span>
                      <span className="font-mono">${Math.abs(linkedTrip.remainingBudget)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'destinations' && (
          <div className="space-y-5">
            {isEditMode && (
              <form onSubmit={addDestination} className="p-4 rounded-xl space-y-3"
                style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <h4 className="font-display font-black text-sm text-sky-deep">Add Destination</h4>
                <div className="grid sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Destination Name *</label>
                    <input placeholder="e.g. Florence" required value={destInput.name} onChange={e => setDestInput({...destInput, name: e.target.value})} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Arrival *</label>
                    <input type="date" required value={destInput.arrivalDate} onChange={e => setDestInput({...destInput, arrivalDate: e.target.value})} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Departure *</label>
                    <input type="date" required value={destInput.departureDate} onChange={e => setDestInput({...destInput, departureDate: e.target.value})} className={inputCls} />
                  </div>
                  <div className="sm:col-span-4 flex justify-end">
                    <Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Add</Button>
                  </div>
                </div>
              </form>
            )}
            <div className="space-y-3">
              {linkedTrip.destinations?.map((d: any) => (
                <div key={d.id} className="p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.18)' }}>
                  {editingDestId === d.id ? (
                    <form onSubmit={e => saveDestEdit(e, d.id)} className="grid sm:grid-cols-4 gap-3 items-end">
                      <div className="sm:col-span-2"><input required value={destEditForm.name} onChange={e => setDestEditForm({...destEditForm, name: e.target.value})} className={inputCls} /></div>
                      <input type="date" required value={destEditForm.arrivalDate} onChange={e => setDestEditForm({...destEditForm, arrivalDate: e.target.value})} className={inputCls} />
                      <input type="date" required value={destEditForm.departureDate} onChange={e => setDestEditForm({...destEditForm, departureDate: e.target.value})} className={inputCls} />
                      <div className="sm:col-span-4 flex gap-2 justify-end">
                        <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditingDestId(null)}><X className="w-3 h-3" /> Cancel</Button>
                        <Button type="submit" className="text-xs"><Check className="w-3 h-3" /> Save</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #38bdf8, #22c55e)' }}>
                          <MapPin className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-display font-black text-sm text-sky-deep">{d.name}</h4>
                          <p className="font-mono text-xs text-chrome-dark">{d.arrivalDate?.substring(0, 10)} — {d.departureDate?.substring(0, 10)}</p>
                        </div>
                      </div>
                      {isEditMode && (
                        <div className="flex gap-1">
                          <button onClick={() => startEditDest(d)} className="p-1.5 rounded-lg text-chrome-dark hover:text-sky-deep hover:bg-sky-light/50 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteDest(d.id)} className="p-1.5 rounded-lg text-chrome-dark hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {!linkedTrip.destinations?.length && <p className="text-sm font-body text-chrome-dark text-center py-6">No destinations added yet.</p>}
            </div>
          </div>
        )}

        {currentView === 'activities' && (
          <div className="space-y-5">
            {isEditMode && (
              <form onSubmit={addActivity} className="p-4 rounded-xl space-y-3"
                style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <h4 className="font-display font-black text-sm text-sky-deep">Add Activity</h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div><label className={labelCls}>Name *</label><input placeholder="e.g. Colosseum Tour" required value={actInput.name} onChange={e => setActInput({...actInput, name: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Date & Time *</label><input type="datetime-local" required value={actInput.dateTime} onChange={e => setActInput({...actInput, dateTime: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Location</label><input placeholder="e.g. Rome, Italy" value={actInput.location} onChange={e => setActInput({...actInput, location: e.target.value})} className={inputCls} /></div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <label className={labelCls}>Status</label>
                    <select value={actInput.status} onChange={e => setActInput({...actInput, status: e.target.value as ActivityStatus})} className={`${inputCls} w-auto`}>
                      {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Add</Button>
                </div>
              </form>
            )}
            <div className="space-y-3">
              {linkedTrip.activities?.map((a: any) => {
                const statusLabel = typeof a.status === 'number' ? STATUS_LABELS[a.status] : a.status;
                return (
                  <div key={a.id} className="p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.18)' }}>
                    {editingActId === a.id ? (
                      <form onSubmit={e => saveActEdit(e, a.id)} className="grid sm:grid-cols-3 gap-3 items-end">
                        <input required value={actEditForm.name} onChange={e => setActEditForm({...actEditForm, name: e.target.value})} className={inputCls} />
                        <input type="datetime-local" required value={actEditForm.dateTime} onChange={e => setActEditForm({...actEditForm, dateTime: e.target.value})} className={inputCls} />
                        <input value={actEditForm.location} onChange={e => setActEditForm({...actEditForm, location: e.target.value})} placeholder="Location" className={inputCls} />
                        <select value={actEditForm.status} onChange={e => setActEditForm({...actEditForm, status: e.target.value as ActivityStatus})} className={`${inputCls} w-full`}>
                          {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="sm:col-span-2 flex gap-2 justify-end">
                          <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditingActId(null)}><X className="w-3 h-3" /> Cancel</Button>
                          <Button type="submit" className="text-xs"><Check className="w-3 h-3" /> Save</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-display font-black text-sm text-sky-deep block">{a.name}</span>
                          <span className="font-mono text-xs text-chrome-dark">
                            {a.date?.substring(0, 10)} @ {a.date?.substring(11, 16)}{a.location && a.location !== 'TBD' ? ` · ${a.location}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-display font-bold ${statusColors[statusLabel] ?? 'bg-sky-light text-sky-deep border-sky-aero/40'}`}>
                            {statusLabel}
                          </span>
                          {isEditMode && (
                            <>
                              <button onClick={() => startEditAct(a)} className="p-1.5 rounded-lg text-chrome-dark hover:text-sky-deep hover:bg-sky-light/50 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteAct(a.id)} className="p-1.5 rounded-lg text-chrome-dark hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!linkedTrip.activities?.length && <p className="text-sm font-body text-chrome-dark text-center py-6">No activities planned yet.</p>}
            </div>
          </div>
        )}

        {currentView === 'expenses' && (
          <div className="space-y-5">
            {isEditMode && (
              <form onSubmit={addExpense} className="p-4 rounded-xl grid sm:grid-cols-3 gap-3"
                style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <div><label className={labelCls}>Name *</label><input placeholder="e.g. Train tickets" required value={expInput.name} onChange={e => setExpInput({...expInput, name: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Amount ($) *</label><input type="number" placeholder="0.00" required min="0.01" step="0.01" value={expInput.amount} onChange={e => setExpInput({...expInput, amount: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Category</label>
                  <select value={expInput.category} onChange={e => setExpInput({...expInput, category: e.target.value as ExpenseCategory})} className={`${inputCls} w-full`}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Add</Button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {linkedTrip.expenses?.map((e: any) => (
                <div key={e.id} className="p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.15)' }}>
                  {editingExpId === e.id ? (
                    <form onSubmit={ev => saveExpEdit(ev, e.id)} className="grid sm:grid-cols-3 gap-3 items-end">
                      <input required value={expEditForm.name} onChange={ev => setExpEditForm({...expEditForm, name: ev.target.value})} className={inputCls} />
                      <input type="number" min="0.01" step="0.01" required value={expEditForm.amount} onChange={ev => setExpEditForm({...expEditForm, amount: ev.target.value})} className={inputCls} />
                      <select value={expEditForm.category} onChange={ev => setExpEditForm({...expEditForm, category: ev.target.value as ExpenseCategory})} className={`${inputCls} w-full`}>
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="sm:col-span-3 flex gap-2 justify-end">
                        <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditingExpId(null)}><X className="w-3 h-3" /> Cancel</Button>
                        <Button type="submit" className="text-xs"><Check className="w-3 h-3" /> Save</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center font-body text-sm">
                      <div>
                        <span className="font-bold text-sky-deep">{e.name}</span>
                        <span className="text-xs text-chrome-dark ml-2">({typeof e.category === 'number' ? CATEGORY_LABELS[e.category] : e.category})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-500">-${e.amount}</span>
                        {isEditMode && (
                          <>
                            <button onClick={() => startEditExp(e)} className="p-1.5 rounded-lg text-chrome-dark hover:text-sky-deep hover:bg-sky-light/50 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteExp(e.id)} className="p-1.5 rounded-lg text-chrome-dark hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!linkedTrip.expenses?.length && <p className="text-sm font-body text-chrome-dark text-center py-6">No expenses logged yet.</p>}
            </div>
          </div>
        )}

        {currentView === 'checklist' && (
          <div className="space-y-4">
            {isEditMode && (
              <form onSubmit={addChecklistItem} className="flex gap-2">
                <input type="text" required placeholder="Add item to pack or do..." value={checkInput.title} onChange={e => setCheckInput({ title: e.target.value })} className={`${inputCls} flex-1`} />
                <Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Add</Button>
              </form>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {linkedTrip.checklistItems?.map((item: any) => {
                const isItemCompleting = toggleLoadingId === item.id;
                return (
                  <div key={item.id} className="p-3 rounded-xl flex items-center gap-3 group transition-all"
                    style={{ background: item.isCompleted ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.5)', border: `1px solid ${item.isCompleted ? 'rgba(34,197,94,0.3)' : 'rgba(56,189,248,0.18)'}` }}>
                    <div onClick={() => handleToggleChecklist(item.id, item.isCompleted)}
                      className={`flex items-center gap-2.5 flex-1 select-none ${isEditMode ? 'cursor-pointer' : ''}`}>
                      {item.isCompleted
                        ? <CheckSquare className={`w-4 h-4 text-grass flex-shrink-0 ${isItemCompleting ? 'animate-pulse' : ''}`} />
                        : <Square className={`w-4 h-4 text-chrome-dark flex-shrink-0 ${isItemCompleting ? 'animate-pulse' : ''}`} />}
                      <span className={`text-sm font-body ${item.isCompleted ? 'line-through text-chrome-dark' : 'text-ink'}`}>{item.name}</span>
                    </div>
                    {isEditMode && (
                      <button onClick={() => deleteCheckItem(item.id)} className="p-1 rounded-lg text-chrome-dark/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              {!linkedTrip.checklistItems?.length && <p className="text-sm font-body text-chrome-dark text-center py-6 col-span-2">Nothing on your checklist yet.</p>}
            </div>
          </div>
        )}

        {currentView === 'reminders' && (
          <div className="space-y-5 max-w-lg">
            <form onSubmit={addReminder} className="p-4 rounded-xl space-y-3"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <h4 className="font-display font-black text-sm text-sky-deep">Set a Reminder</h4>
              <div><label className={labelCls}>Message</label><input required value={reminderForm.text} onChange={e => setReminderForm({...reminderForm, text: e.target.value})} placeholder="e.g. Book hotel in Florence" className={inputCls} /></div>
              <div><label className={labelCls}>Date & Time</label><input type="datetime-local" required value={reminderForm.datetime} onChange={e => setReminderForm({...reminderForm, datetime: e.target.value})} className={inputCls} /></div>
              <div className="flex justify-end"><Button type="submit" className="text-xs"><Bell className="w-3 h-3" /> Set Reminder</Button></div>
            </form>
            <div className="space-y-2">
              {reminders.length === 0 && <p className="text-xs font-body text-chrome-dark text-center py-4">No reminders set for this trip.</p>}
              {reminders.map(r => (
                <div key={r.id} className={`flex justify-between items-center p-3.5 rounded-xl text-sm ${r.fired ? 'opacity-50' : ''}`}
                  style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <div>
                    <p className="font-display font-bold text-sky-deep">{r.text}</p>
                    <p className="font-mono text-xs text-chrome-dark">{r.datetime?.replace('T', ' ')}</p>
                    {r.fired && <span className="text-[10px] font-display font-bold text-grass">✓ Sent</span>}
                  </div>
                  <button onClick={() => deleteReminder(r.id)} className="p-1.5 rounded-lg text-chrome-dark hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'map' && <TravelMap activities={linkedTrip.activities ?? []} />}

      </div>
    </div>
  );
};
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
  MapPin, CalendarDays, Wallet, CheckSquare, Square,
  AlertCircle, Trash2, ArrowLeft, Plus, Pencil, X, Check,
  Bell, FileDown, Save, Share2, Map as MapIcon, Globe, Plane
} from 'lucide-react';

import { travelPlanService } from '../services/travelPlanService';
import { destinationService } from '../services/destinationService';
import { activityService } from '../services/activityService';
import { expenseService } from '../services/expenseService';
import { checklistService } from '../services/checklistService';
import { sharingService } from '../services/sharingService';
import type { TravelPlan, ActivityStatus, ExpenseCategory, Destination, Activity, Expense } from '../models/types';
import { Button } from '../components/ui/Button';
import { TravelMap } from '../components/TravelMap';

const SafeQRCode = (props: any) => {
  const QRCodeComponent: any = (QRCode as any).default || QRCode;
  try { return <QRCodeComponent {...props} />; }
  catch { return <div className="p-4 border border-dashed border-sky-aero/30 text-xs text-center text-chrome-dark rounded-xl">QR Code unavailable</div>; }
};

const ACTIVITY_STATUSES: ActivityStatus[] = ['Planned', 'Reserved', 'Completed', 'Cancelled'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Transport', 'Accommodation', 'Food', 'Tickets', 'Shopping', 'Other'];

type ActiveTab = 'overview' | 'destinations' | 'activities' | 'expenses' | 'checklist' | 'share' | 'map' | 'reminders';

const TAB_META: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',     label: 'Overview',     icon: <Globe className="w-4 h-4" /> },
  { key: 'destinations', label: 'Destinations', icon: <MapPin className="w-4 h-4" /> },
  { key: 'activities',   label: 'Activities',   icon: <CalendarDays className="w-4 h-4" /> },
  { key: 'expenses',     label: 'Expenses',     icon: <Wallet className="w-4 h-4" /> },
  { key: 'checklist',    label: 'Checklist',    icon: <CheckSquare className="w-4 h-4" /> },
  { key: 'reminders',    label: 'Reminders',    icon: <Bell className="w-4 h-4" /> },
  { key: 'share',        label: 'Share',        icon: <Share2 className="w-4 h-4" /> },
  { key: 'map',          label: 'Map',          icon: <MapIcon className="w-4 h-4" /> },
];

interface Reminder { id: string; text: string; datetime: string; fired: boolean; }

const inputCls = 'w-full px-3 py-2 text-sm font-body text-ink input-aero';
const labelCls = 'block font-display text-[10px] font-bold text-sky-deep uppercase tracking-widest mb-1';

const statusColors: Record<ActivityStatus, string> = {
  Planned:   'bg-sky-light   text-sky-deep   border-sky-aero/40',
  Reserved:  'bg-grass-light text-grass-deep  border-grass/40',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-red-50      text-red-600     border-red-200',
};

export const PlanDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentTrip, setCurrentTrip] = useState<TravelPlan | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<ActiveTab>('overview');

  const [sharePermission, setSharePermission] = useState<number>(0);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const [newDestForm, setNewDestForm] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });
  const [newActForm, setNewActForm] = useState({ name: '', description: '', dateTime: '', location: '', status: 'Planned' as ActivityStatus });
  const [newExpForm, setNewExpForm] = useState({ name: '', amount: '', category: 'Transport' as ExpenseCategory });
  const [newCheckForm, setNewCheckForm] = useState({ title: '' });

  const [editingPlan, setEditingPlan] = useState(false);
  const [planEditForm, setPlanEditForm] = useState({ name: '', description: '', startDate: '', endDate: '', budget: 0, notes: '' });

  const [editingDestId, setEditingDestId] = useState<number | null>(null);
  const [destEditForm, setDestEditForm] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });

  const [editingActId, setEditingActId] = useState<number | null>(null);
  const [actEditForm, setActEditForm] = useState({ name: '', dateTime: '', location: '', status: 'Planned' as ActivityStatus });

  const [editingExpId, setEditingExpId] = useState<number | null>(null);
  const [expEditForm, setExpEditForm] = useState({ name: '', amount: '', category: 'Transport' as ExpenseCategory });

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try { return JSON.parse(localStorage.getItem(`reminders_${id}`) || '[]'); } catch { return []; }
  });
  const [reminderForm, setReminderForm] = useState({ text: '', datetime: '' });
  const reminderTimers = useRef<globalThis.Map<string, ReturnType<typeof setTimeout>>>(new globalThis.Map());

  const loadTripData = async () => {
    if (!id) return;
    try {
      setIsLoadingDetails(true); setFetchErr(null);
      const data = await travelPlanService.getById(Number(id));
      setCurrentTrip(data);
    } catch {
      setFetchErr('Could not load trip details. Please try again.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => { loadTripData(); }, [id]);

  useEffect(() => {
    reminders.forEach(r => { if (!r.fired) scheduleNotification(r); });
    return () => { reminderTimers.current.forEach(t => clearTimeout(t)); };
  }, []);

  const saveReminders = (updated: Reminder[]) => {
    setReminders(updated);
    localStorage.setItem(`reminders_${id}`, JSON.stringify(updated));
  };

  const scheduleNotification = (r: Reminder) => {
    const ms = new Date(r.datetime).getTime() - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => {
      if (Notification.permission === 'granted') new Notification('VoyageFlow Reminder', { body: r.text });
      else alert(`Reminder: ${r.text}`);
      saveReminders(reminders.map(x => x.id === r.id ? { ...x, fired: true } : x));
    }, ms);
    reminderTimers.current.set(r.id, t);
  };

  const addReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderForm.text.trim() || !reminderForm.datetime) return;
    const r: Reminder = { id: Date.now().toString(), text: reminderForm.text.trim(), datetime: reminderForm.datetime, fired: false };
    const updated = [...reminders, r];
    saveReminders(updated);
    scheduleNotification(r);
    if (Notification.permission === 'default') Notification.requestPermission();
    setReminderForm({ text: '', datetime: '' });
  };

  const deleteReminder = (rid: string) => {
    const t = reminderTimers.current.get(rid);
    if (t) clearTimeout(t);
    reminderTimers.current.delete(rid);
    saveReminders(reminders.filter(r => r.id !== rid));
  };

  const handleExportPdf = () => {
    if (!currentTrip) return;
    const lines: string[] = [];
    lines.push(`TRIP: ${currentTrip.name}`);
    lines.push(`Period: ${currentTrip.startDate?.substring(0, 10)} — ${currentTrip.endDate?.substring(0, 10)}`);
    lines.push(`Budget: $${currentTrip.budget} | Spent: $${currentTrip.totalExpenses} | Remaining: $${currentTrip.remainingBudget}`);
    if (currentTrip.description) lines.push(`\nDescription: ${currentTrip.description}`);
    if (currentTrip.notes) lines.push(`Notes: ${currentTrip.notes}`);
    if (currentTrip.destinations?.length) { lines.push('\n--- DESTINATIONS ---'); currentTrip.destinations.forEach(d => lines.push(`• ${d.name}: ${d.arrivalDate?.substring(0, 10)} → ${d.departureDate?.substring(0, 10)}`)); }
    if (currentTrip.activities?.length) { lines.push('\n--- ACTIVITIES ---'); currentTrip.activities.forEach(a => lines.push(`• ${a.name} | ${a.date?.substring(0, 10)} ${a.date?.substring(11, 16)} | ${a.location || 'TBD'} | ${a.status}`)); }
    if (currentTrip.expenses?.length) { lines.push('\n--- EXPENSES ---'); currentTrip.expenses.forEach(e => lines.push(`• ${e.name} (${e.category}): $${e.amount}`)); }
    if (currentTrip.checklistItems?.length) { lines.push('\n--- CHECKLIST ---'); currentTrip.checklistItems.forEach(c => lines.push(`[${c.isCompleted ? 'x' : ' '}] ${c.name}`)); }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${currentTrip.name.replace(/\s+/g, '_')}_trip.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeletePlan = async () => {
    if (!currentTrip || !window.confirm('Permanently delete this trip?')) return;
    try { await travelPlanService.delete(currentTrip.id); navigate('/dashboard'); }
    catch { alert('Failed to delete trip.'); }
  };

  const startEditPlan = () => {
    if (!currentTrip) return;
    setPlanEditForm({ name: currentTrip.name, description: currentTrip.description || '', startDate: currentTrip.startDate?.substring(0, 10), endDate: currentTrip.endDate?.substring(0, 10), budget: currentTrip.budget, notes: currentTrip.notes || '' });
    setEditingPlan(true);
  };

  const savePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(planEditForm.endDate) < new Date(planEditForm.startDate)) { alert('End date must be after start date.'); return; }
    if (planEditForm.budget < 0) { alert('Budget cannot be negative.'); return; }
    try { await travelPlanService.update(Number(id), planEditForm); setEditingPlan(false); loadTripData(); }
    catch { alert('Failed to update trip.'); }
  };

  const generateShareToken = async () => {
    if (!id) return;
    try {
      setShareLoading(true); setShareError(null);
      const response = await sharingService.createToken(Number(id), sharePermission);
      setGeneratedLink(`${window.location.origin}/shared-plans/${response.token}?perm=${sharePermission}`);
    } catch { setShareError('Failed to generate share link.'); }
    finally { setShareLoading(false); }
  };

  const addDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(newDestForm.departureDate) < new Date(newDestForm.arrivalDate)) { alert('Departure must be after arrival.'); return; }
    try {
      await destinationService.create(Number(id), { name: newDestForm.name, location: newDestForm.name, arrivalDate: newDestForm.arrivalDate, departureDate: newDestForm.departureDate, description: newDestForm.description || '', notes: '' });
      setNewDestForm({ name: '', arrivalDate: '', departureDate: '', description: '' });
      loadTripData();
    } catch { alert('Failed to add destination.'); }
  };

  const startEditDest = (d: Destination) => {
    setEditingDestId(d.id);
    setDestEditForm({ name: d.name, arrivalDate: d.arrivalDate?.substring(0, 10), departureDate: d.departureDate?.substring(0, 10), description: d.description || '' });
  };

  const saveDestEdit = async (e: React.FormEvent, destId: number) => {
    e.preventDefault();
    if (new Date(destEditForm.departureDate) < new Date(destEditForm.arrivalDate)) { alert('Departure must be after arrival.'); return; }
    try {
      await destinationService.update(Number(id), destId, { name: destEditForm.name, location: destEditForm.name, arrivalDate: destEditForm.arrivalDate, departureDate: destEditForm.departureDate, description: destEditForm.description, notes: '' });
      setEditingDestId(null); loadTripData();
    } catch { alert('Failed to update destination.'); }
  };

  const deleteDest = async (destId: number) => {
    if (!window.confirm('Remove this destination?')) return;
    try { await destinationService.delete(Number(id), destId); loadTripData(); }
    catch { alert('Failed to remove destination.'); }
  };

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActForm.name || !newActForm.dateTime) return;
    try {
      await activityService.create(Number(id), { name: newActForm.name, date: newActForm.dateTime + ':00', time: null, location: newActForm.location || 'TBD', description: '', estimatedCost: 0, status: newActForm.status });
      setNewActForm({ name: '', description: '', dateTime: '', location: '', status: 'Planned' });
      loadTripData();
    } catch { alert('Failed to add activity.'); }
  };

  const startEditAct = (a: Activity) => {
    setEditingActId(a.id);
    setActEditForm({ name: a.name, dateTime: a.date?.substring(0, 16), location: a.location || '', status: a.status });
  };

  const saveActEdit = async (e: React.FormEvent, actId: number) => {
    e.preventDefault();
    try {
      await activityService.update(Number(id), actId, { name: actEditForm.name, date: actEditForm.dateTime + ':00', time: null, location: actEditForm.location || 'TBD', status: actEditForm.status });
      setEditingActId(null); loadTripData();
    } catch { alert('Failed to update activity.'); }
  };

  const deleteAct = async (actId: number) => {
    if (!window.confirm('Remove this activity?')) return;
    try { await activityService.delete(Number(id), actId); loadTripData(); }
    catch { alert('Failed to remove activity.'); }
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(newExpForm.amount);
    if (!newExpForm.name || amountNum <= 0) { alert('Amount must be greater than zero.'); return; }
    try {
      await expenseService.create(Number(id), { name: newExpForm.name, amount: amountNum, category: newExpForm.category, date: new Date().toISOString(), description: '' });
      setNewExpForm({ name: '', amount: '', category: 'Transport' });
      loadTripData();
    } catch { alert('Failed to add expense.'); }
  };

  const startEditExp = (e: Expense) => {
    setEditingExpId(e.id);
    setExpEditForm({ name: e.name, amount: String(e.amount), category: e.category });
  };

  const saveExpEdit = async (ev: React.FormEvent, expId: number) => {
    ev.preventDefault();
    const amountNum = Number(expEditForm.amount);
    if (amountNum <= 0) { alert('Amount must be greater than zero.'); return; }
    try {
      await expenseService.update(Number(id), expId, { name: expEditForm.name, amount: amountNum, category: expEditForm.category });
      setEditingExpId(null); loadTripData();
    } catch { alert('Failed to update expense.'); }
  };

  const deleteExp = async (expId: number) => {
    if (!window.confirm('Remove this expense?')) return;
    try { await expenseService.delete(Number(id), expId); loadTripData(); }
    catch { alert('Failed to remove expense.'); }
  };

  const addChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckForm.title.trim()) return;
    try { await checklistService.create(Number(id), newCheckForm.title.trim()); setNewCheckForm({ title: '' }); loadTripData(); }
    catch { alert('Failed to add checklist item.'); }
  };

  const toggleCheckItem = async (itemId: number, currentStatus: boolean) => {
    try { await checklistService.toggle(Number(id), itemId, !currentStatus); loadTripData(); }
    catch { alert('Failed to update item.'); }
  };

  const deleteCheckItem = async (itemId: number) => {
    if (!window.confirm('Remove this item?')) return;
    try { await checklistService.delete(Number(id), itemId); loadTripData(); }
    catch { alert('Failed to remove item.'); }
  };

  if (isLoadingDetails) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse_glow" style={{ background: 'linear-gradient(135deg, #38bdf8, #22c55e)' }}>
          <Plane className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '2s' }} />
        </div>
        <p className="font-display font-bold text-sky-deep text-sm">Loading trip...</p>
      </div>
    );
  }

  if (fetchErr || !currentTrip) {
    return (
      <div className="max-w-sm mx-auto mt-16 glass-card p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="font-display font-bold text-sky-deep">{fetchErr || 'Trip not found.'}</p>
        <Button onClick={() => navigate('/dashboard')} variant="secondary">
          <ArrowLeft className="w-4 h-4" /> Back to Trips
        </Button>
      </div>
    );
  }

  const isOverBudget = currentTrip.remainingBudget < 0;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="glass-card overflow-hidden">
        <div className="h-2" style={{ background: 'linear-gradient(90deg, #38bdf8 0%, #22c55e 50%, #38bdf8 100%)' }} />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl text-chrome-dark hover:text-sky-deep hover:bg-sky-light/50 transition-all flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-black text-sky-deep truncate">{currentTrip.name}</h1>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="font-body text-xs text-ink-light italic">{currentTrip.description || 'No description.'}</span>
                <span className="flex items-center gap-1 font-mono text-xs text-chrome-dark">
                  <CalendarDays className="w-3 h-3 text-sky-aero" />
                  {currentTrip.startDate?.substring(0, 10)} → {currentTrip.endDate?.substring(0, 10)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-body"
              style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <Wallet className="w-3.5 h-3.5 text-grass" />
              <span className="text-chrome-dark">Budget</span>
              <span className="font-mono font-bold text-ink">${currentTrip.budget}</span>
              <span className="text-chrome-dark/50">·</span>
              <span className={`font-mono font-bold ${isOverBudget ? 'text-red-500' : 'text-grass-deep'}`}>
                {isOverBudget ? `-$${Math.abs(currentTrip.remainingBudget)} over` : `$${currentTrip.remainingBudget} left`}
              </span>
            </div>
            <Button variant="secondary" onClick={handleExportPdf} className="text-xs">
              <FileDown className="w-3.5 h-3.5" /> Export
            </Button>
            <Button variant="danger" onClick={handleDeletePlan} className="text-xs">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        <nav className="w-full md:w-44 flex-shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {TAB_META.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-display font-bold text-xs transition-all whitespace-nowrap w-auto md:w-full text-left ${
                selectedTab === tab.key
                  ? 'btn-aero text-white shadow-glow'
                  : 'bg-white/60 text-ink-light border border-sky-aero/20 hover:bg-white/80 hover:text-sky-deep backdrop-blur'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="glass-card p-6 flex-1 min-w-0 min-h-[320px]">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {editingPlan ? (
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
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display font-black text-base text-sky-deep">Trip Notes</h3>
                    <Button variant="secondary" className="text-xs" onClick={startEditPlan}><Pencil className="w-3 h-3" /> Edit</Button>
                  </div>
                  <div className="p-4 rounded-xl font-body text-sm text-ink whitespace-pre-wrap min-h-[80px]"
                    style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.2)' }}>
                    {currentTrip.notes || <span className="text-chrome-dark italic">No notes yet.</span>}
                  </div>
                  <div className="p-4 rounded-xl space-y-3"
                    style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(34,197,94,0.06))', border: '1px solid rgba(56,189,248,0.2)' }}>
                    <h4 className="font-display font-black text-xs text-sky-deep uppercase tracking-widest">Spending Progress</h4>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.6)' }}>
                      <div
                        className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-400' : 'bg-gradient-to-r from-sky-aero to-grass'}`}
                        style={{ width: `${Math.min(100, currentTrip.budget > 0 ? (currentTrip.totalExpenses / currentTrip.budget) * 100 : 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-body text-chrome-dark">
                      <span>$0</span>
                      <span className="font-bold text-ink">${currentTrip.totalExpenses} spent</span>
                      <span>${currentTrip.budget}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'destinations' && (
            <div className="space-y-5">
              <form onSubmit={addDestination} className="p-4 rounded-xl space-y-3"
                style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <h4 className="font-display font-black text-sm text-sky-deep">Add Destination</h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1"><label className={labelCls}>Name</label><input type="text" required value={newDestForm.name} onChange={e => setNewDestForm({...newDestForm, name: e.target.value})} className={inputCls} placeholder="e.g. Paris" /></div>
                  <div><label className={labelCls}>Arrival</label><input type="date" required value={newDestForm.arrivalDate} onChange={e => setNewDestForm({...newDestForm, arrivalDate: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Departure</label><input type="date" required value={newDestForm.departureDate} onChange={e => setNewDestForm({...newDestForm, departureDate: e.target.value})} className={inputCls} /></div>
                </div>
                <div className="flex justify-end"><Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Add</Button></div>
              </form>

              <div className="space-y-3">
                {currentTrip.destinations?.map(d => (
                  <div key={d.id} className="p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.18)' }}>
                    {editingDestId === d.id ? (
                      <form onSubmit={e => saveDestEdit(e, d.id)} className="grid sm:grid-cols-3 gap-3 items-end">
                        <div className="sm:col-span-1"><input required value={destEditForm.name} onChange={e => setDestEditForm({...destEditForm, name: e.target.value})} className={inputCls} /></div>
                        <input type="date" required value={destEditForm.arrivalDate} onChange={e => setDestEditForm({...destEditForm, arrivalDate: e.target.value})} className={inputCls} />
                        <input type="date" required value={destEditForm.departureDate} onChange={e => setDestEditForm({...destEditForm, departureDate: e.target.value})} className={inputCls} />
                        <div className="sm:col-span-3 flex gap-2 justify-end">
                          <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditingDestId(null)}><X className="w-3 h-3" /> Cancel</Button>
                          <Button type="submit" className="text-xs"><Check className="w-3 h-3" /> Save</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-display font-black text-sm text-sky-deep flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-sky-aero" />{d.name}
                          </h4>
                          <p className="font-mono text-xs text-chrome-dark mt-0.5">
                            {d.arrivalDate?.substring(0, 10)} → {d.departureDate?.substring(0, 10)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => startEditDest(d)} className="p-1.5 rounded-lg text-chrome-dark hover:text-sky-deep hover:bg-sky-light/50 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteDest(d.id)} className="p-1.5 rounded-lg text-chrome-dark hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!currentTrip.destinations?.length && <p className="text-sm font-body text-chrome-dark text-center py-6">No destinations yet. Add your first stop!</p>}
              </div>
            </div>
          )}

          {selectedTab === 'activities' && (
            <div className="space-y-5">
              <form onSubmit={addActivity} className="p-4 rounded-xl space-y-3"
                style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <h4 className="font-display font-black text-sm text-sky-deep">Add Activity</h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  <input type="text" placeholder="Activity name" required value={newActForm.name} onChange={e => setNewActForm({...newActForm, name: e.target.value})} className={inputCls} />
                  <input type="datetime-local" required value={newActForm.dateTime} onChange={e => setNewActForm({...newActForm, dateTime: e.target.value})} className={inputCls} />
                  <input type="text" placeholder="Location" value={newActForm.location} onChange={e => setNewActForm({...newActForm, location: e.target.value})} className={inputCls} />
                </div>
                <div className="flex justify-between items-center">
                  <select value={newActForm.status} onChange={e => setNewActForm({...newActForm, status: e.target.value as ActivityStatus})} className={`${inputCls} w-auto`}>
                    {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Add Activity</Button>
                </div>
              </form>

              <div className="space-y-2">
                {currentTrip.activities?.map(a => (
                  <div key={a.id} className="p-3.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.15)' }}>
                    {editingActId === a.id ? (
                      <form onSubmit={e => saveActEdit(e, a.id)} className="grid sm:grid-cols-3 gap-3 items-end">
                        <input required value={actEditForm.name} onChange={e => setActEditForm({...actEditForm, name: e.target.value})} className={inputCls} />
                        <input type="datetime-local" required value={actEditForm.dateTime} onChange={e => setActEditForm({...actEditForm, dateTime: e.target.value})} className={inputCls} />
                        <input value={actEditForm.location} onChange={e => setActEditForm({...actEditForm, location: e.target.value})} placeholder="Location" className={inputCls} />
                        <select value={actEditForm.status} onChange={e => setActEditForm({...actEditForm, status: e.target.value as ActivityStatus})} className={`${inputCls} w-auto`}>
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
                          <h5 className="font-display font-bold text-sm text-sky-deep">{a.name}</h5>
                          <p className="font-mono text-xs text-chrome-dark">{a.date?.substring(0, 10)} @ {a.date?.substring(11, 16)} · {a.location || 'TBD'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 font-display font-bold text-[10px] rounded-full border ${statusColors[a.status]}`}>{a.status}</span>
                          <button onClick={() => startEditAct(a)} className="p-1.5 rounded-lg text-chrome-dark hover:text-sky-deep hover:bg-sky-light/50 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteAct(a.id)} className="p-1.5 rounded-lg text-chrome-dark hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!currentTrip.activities?.length && <p className="text-sm font-body text-chrome-dark text-center py-6">No activities yet. Plan your first one!</p>}
              </div>
            </div>
          )}

          {selectedTab === 'expenses' && (
            <div className="space-y-5">
              <form onSubmit={addExpense} className="p-4 rounded-xl space-y-3"
                style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <h4 className="font-display font-black text-sm text-sky-deep">Log Expense</h4>
                <div className="grid sm:grid-cols-3 gap-3 items-end">
                  <input type="text" placeholder="Expense name" required value={newExpForm.name} onChange={e => setNewExpForm({...newExpForm, name: e.target.value})} className={inputCls} />
                  <input type="number" placeholder="Amount" required min="1" value={newExpForm.amount} onChange={e => setNewExpForm({...newExpForm, amount: e.target.value})} className={inputCls} />
                  <select value={newExpForm.category} onChange={e => setNewExpForm({...newExpForm, category: e.target.value as ExpenseCategory})} className={`${inputCls} w-full`}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex justify-end"><Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Add Expense</Button></div>
              </form>

              <div className="space-y-2">
                {currentTrip.expenses?.map(e => (
                  <div key={e.id} className="p-3.5 rounded-xl"
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
                          <span className="text-xs text-chrome-dark ml-2">({e.category})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-red-500">-${e.amount}</span>
                          <button onClick={() => startEditExp(e)} className="p-1.5 rounded-lg text-chrome-dark hover:text-sky-deep hover:bg-sky-light/50 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteExp(e.id)} className="p-1.5 rounded-lg text-chrome-dark hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!currentTrip.expenses?.length && <p className="text-sm font-body text-chrome-dark text-center py-6">No expenses logged yet.</p>}
              </div>
            </div>
          )}

          {selectedTab === 'checklist' && (
            <div className="space-y-4">
              <form onSubmit={addChecklistItem} className="flex gap-2">
                <input type="text" required placeholder="Add item to pack or do..." value={newCheckForm.title} onChange={e => setNewCheckForm({ title: e.target.value })} className={`${inputCls} flex-1`} />
                <Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Add</Button>
              </form>
              <div className="grid sm:grid-cols-2 gap-2">
                {currentTrip.checklistItems?.map(item => (
                  <div key={item.id} className="p-3 rounded-xl flex items-center gap-3 group transition-all"
                    style={{ background: item.isCompleted ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.5)', border: `1px solid ${item.isCompleted ? 'rgba(34,197,94,0.3)' : 'rgba(56,189,248,0.18)'}` }}>
                    <div onClick={() => toggleCheckItem(item.id, item.isCompleted)} className="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
                      {item.isCompleted
                        ? <CheckSquare className="w-4 h-4 text-grass flex-shrink-0" />
                        : <Square className="w-4 h-4 text-chrome-dark flex-shrink-0" />}
                      <span className={`text-sm font-body ${item.isCompleted ? 'line-through text-chrome-dark' : 'text-ink'}`}>{item.name}</span>
                    </div>
                    <button onClick={() => deleteCheckItem(item.id)} className="p-1 rounded-lg text-chrome-dark/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {!currentTrip.checklistItems?.length && <p className="text-sm font-body text-chrome-dark text-center py-6 col-span-2">Nothing on your checklist yet.</p>}
              </div>
            </div>
          )}

          {selectedTab === 'reminders' && (
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

          {selectedTab === 'share' && (
            <div className="max-w-md mx-auto text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38bdf8, #22c55e)' }}>
                  <Share2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <h4 className="font-display font-black text-base text-sky-deep">Share this Trip</h4>
              <div className="flex justify-center gap-6 py-2">
                <label className="flex items-center gap-2 font-body text-sm cursor-pointer text-ink">
                  <input type="radio" checked={sharePermission === 0} onChange={() => setSharePermission(0)} className="accent-sky-500 w-4 h-4" /> View only
                </label>
                <label className="flex items-center gap-2 font-body text-sm cursor-pointer text-ink">
                  <input type="radio" checked={sharePermission === 1} onChange={() => setSharePermission(1)} className="accent-sky-500 w-4 h-4" /> Allow editing
                </label>
              </div>
              <Button onClick={generateShareToken} isLoading={shareLoading} className="w-full">Generate Share Link</Button>
              {shareError && <p className="text-xs font-body text-red-500">{shareError}</p>}
              {generatedLink && (
                <div className="p-5 rounded-2xl space-y-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(56,189,248,0.25)' }}>
                  <div className="text-[11px] font-mono select-all p-2.5 rounded-xl break-all text-ink"
                    style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(56,189,248,0.15)' }}>
                    {generatedLink}
                  </div>
                  <div className="flex justify-center">
                    <div className="p-3 rounded-xl inline-block" style={{ background: 'white', border: '1px solid rgba(56,189,248,0.2)' }}>
                      <SafeQRCode value={generatedLink} size={130} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'map' && <TravelMap activities={currentTrip.activities ?? []} />}

        </div>
      </div>
    </div>
  );
};
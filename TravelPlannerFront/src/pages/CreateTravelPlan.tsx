import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { travelPlanService } from '../services/travelPlanService';

export const CreateTravelPlan = () => {
  const navigate = useNavigate();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [tripDetails, setTripDetails] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: 0,
    notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTripDetails(prev => ({
      ...prev,
      [name]: name === 'budget' ? Number(value) : value
    }));
  };

  const checkFormValidity = () => {
    if (!tripDetails.name || !tripDetails.startDate || !tripDetails.endDate) {
      return 'Please fill in the required fields: name, start date, and end date.';
    }
    if (new Date(tripDetails.endDate) < new Date(tripDetails.startDate)) {
      return 'End date must be after the start date.';
    }
    if (tripDetails.budget < 0) {
      return 'Budget cannot be negative.';
    }
    return null;
  };

  const submitNewTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = checkFormValidity();
    if (errorMsg) {
      setSubmissionError(errorMsg);
      return;
    }
    try {
      setIsCreating(true);
      setSubmissionError(null);
      await travelPlanService.create(tripDetails);
      navigate('/dashboard');
    } catch (err: any) {
      setSubmissionError('Failed to create trip. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-light/10 p-6 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 shadow-xl max-w-2xl w-full border border-sky-aero/10 space-y-6">
        
        <form onSubmit={submitNewTrip} className="space-y-5">
          
          {/* ACTIONS PLACED AT THE VERY TOP AS A FORWARD TOOLBAR */}
          <div className="flex justify-end gap-3 pb-4 border-b border-sky-aero/15">
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>Cancel</Button>
            <Button type="submit" isLoading={isCreating}><Plane className="w-4 h-4" /> Create Trip</Button>
          </div>

          {/* FIELDS IN REVERSED SPECIFICITY HIERARCHY */}
          <Input label="Notes" name="notes" isTextArea value={tripDetails.notes} onChange={handleInputChange} placeholder="Any reminders, bookings to make, packing notes..." />
          
          <Input label="Description" name="description" isTextArea value={tripDetails.description} onChange={handleInputChange} placeholder="What's the plan? Where are you going?" />
          
          <Input label="Budget ($)" name="budget" type="number" min="0" step="0.01" value={tripDetails.budget} onChange={handleInputChange} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input label="Start Date *" name="startDate" type="date" value={tripDetails.startDate} onChange={handleInputChange} required />
            <Input label="End Date *" name="endDate" type="date" value={tripDetails.endDate} onChange={handleInputChange} required />
          </div>

          <Input label="Trip Name *" name="name" value={tripDetails.name} onChange={handleInputChange} placeholder="e.g., Summer in Europe" required />

        </form>

        {/* FEEDBACK LABELS NEAR THE BASE */}
        {submissionError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-body">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{submissionError}</span>
          </div>
        )}

        {/* DETAILS DESCRIPTIVE TITLE ANCHORED AT THE BOTTOM */}
        <div className="flex items-center gap-3 border-t border-sky-aero/15 pt-4">
          <div className="p-2.5 bg-sky-light rounded-2xl text-sky-deep">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-sky-deep uppercase tracking-wider">Create New Trip</h1>
            <p className="text-xs font-body text-chrome-dark">Plan your next adventure from scratch</p>
          </div>
        </div>

      </div>
    </div>
  );
};
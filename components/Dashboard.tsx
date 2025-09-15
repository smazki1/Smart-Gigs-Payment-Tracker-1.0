import React from 'react';
import type { Gig, ParsedGig } from '../types';
import SummarySection from './SummarySection';
import GigManagement from './GigManagement';

interface DashboardProps {
    gigs: Gig[];
    onAdd: (date?: string) => void;
    onEdit: (gig: Gig) => void;
    onSave: (gig: Partial<Gig> & { id: string }) => void;
    onDelete: (gig: Gig) => void;
    onMarkAsPaid: (gig: Gig) => void;
    onAIReminder: (gig: Gig) => void;
    onSmartAdd: (parsedGig: ParsedGig) => void;
    onReschedule: (gigId: string, newDate: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ gigs, ...props }) => {
  return (
    <>
      <div className="bg-slate-100 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-800">
        <SummarySection gigs={gigs} />
      </div>
      <GigManagement gigs={gigs} {...props} />
    </>
  );
};

export default Dashboard;

import React, { useState } from 'react';
import type { Gig, ParsedGig, RecurringExpense, MonthlyExpenseInstance, Package } from '../types';
import SummarySection from './SummarySection';
import GigManagement from './GigManagement';
import PackagesManager from './PackagesManager';
import { ChevronDownIcon, ChevronUpIcon } from './icons';

interface DashboardProps {
  gigs: Gig[];
  expenses?: RecurringExpense[];
  monthlyInstances?: MonthlyExpenseInstance[];
  packages?: Package[];
  onAdd: (date?: string) => void;
  onEdit: (gig: Gig) => void;
  onSave: (gig: Partial<Gig> & { id: string }) => void;
  onDelete: (gig: Gig) => void;
  onMarkAsPaid: (gig: Gig) => void;
  onAIReminder: (gig: Gig) => void;
  onSmartAdd: (parsedGig: ParsedGig) => void;
  onReschedule: (gigId: string, newDate: string) => void;
  onBulkMarkAsPaid: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;

  // Package Handlers
  onAddPackage?: () => void;
  onEditPackage?: (pkg: Package) => void;
  onDeletePackage?: (pkg: Package) => void;
  onDuplicate: (gig: Gig) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  gigs, expenses = [], monthlyInstances = [], packages = [],
  onAddPackage, onEditPackage, onDeletePackage,
  ...props
}) => {
  const [showPackages, setShowPackages] = useState(true);

  return (
    <>
      <div className="bg-slate-100 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-800">
        <SummarySection gigs={gigs} expenses={expenses} monthlyInstances={monthlyInstances} packages={packages} />

        {/* Packages Section */}
        {packages.length > 0 || onAddPackage ? (
          <div className="px-4 md:px-6 pb-4">
            <button
              onClick={() => setShowPackages(!showPackages)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors mb-2"
            >
              {showPackages ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
              ניהול חבילות וריטיינרים
            </button>

            {showPackages && onAddPackage && onEditPackage && onDeletePackage && (
              <div className="animate-fade-in">
                <PackagesManager
                  packages={packages}
                  gigs={gigs}
                  onAddPackage={onAddPackage}
                  onEditPackage={onEditPackage}
                  onDeletePackage={onDeletePackage}
                />
              </div>
            )}
          </div>
        ) : null}
      </div>
      <GigManagement gigs={gigs} onDuplicate={props.onDuplicate} {...props} />
    </>
  );
};

export default Dashboard;

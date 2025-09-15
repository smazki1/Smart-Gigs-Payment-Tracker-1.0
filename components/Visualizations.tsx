import React from 'react';
import type { Gig } from '../types';
import ChartsSection from './ChartsSection';
import { ChartBarIcon, CurrencyDollarIcon, InformationCircleIcon, CheckCircleIcon, CalendarDaysIcon, PaperAirplaneIcon } from './icons';
import { formatCurrency, isOverdue } from '../utils/helpers';
import { GigStatus } from '../types';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 flex items-center gap-4">
    <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-lg text-primary-600 dark:text-primary-300">
        {icon}
    </div>
    <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);


interface VisualizationsProps {
  gigs: Gig[];
}

const Visualizations: React.FC<VisualizationsProps> = ({ gigs }) => {
    const paidGigs = gigs.filter(g => g.status === GigStatus.Paid);
    const pendingGigs = gigs.filter(g => g.status === GigStatus.Pending);
    
    const totalRevenue = paidGigs.reduce((sum, g) => sum + g.paymentAmount, 0);
    const outstandingRevenue = pendingGigs.reduce((sum, g) => sum + g.paymentAmount, 0);
    const totalGigs = gigs.length;

    const overdueAmount = gigs
        .filter(g => isOverdue(g))
        .reduce((sum, g) => sum + g.paymentAmount, 0);

    const averageGigValue = paidGigs.length > 0 ? totalRevenue / paidGigs.length : 0;
    
    const paidRate = totalGigs > 0 ? (paidGigs.length / totalGigs) * 100 : 0;


    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="max-w-screen-xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">ניתוחים ותובנות</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">תובנות על הפעילות העסקית שלך במבט חטוף.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <StatCard title="סה״כ הכנסות (שולם)" value={formatCurrency(totalRevenue)} icon={<CurrencyDollarIcon className="w-6 h-6"/>} />
                    <StatCard title="תשלומים ממתינים" value={formatCurrency(outstandingRevenue)} icon={<PaperAirplaneIcon className="w-6 h-6"/>} />
                    <StatCard title="סכום באיחור" value={formatCurrency(overdueAmount)} icon={<InformationCircleIcon className="w-6 h-6"/>} />
                    <StatCard title="שווי עסקה ממוצע" value={formatCurrency(averageGigValue)} icon={<CurrencyDollarIcon className="w-6 h-6"/>} />
                    <StatCard title="שיעור תשלום" value={`${paidRate.toFixed(0)}%`} icon={<CheckCircleIcon className="w-6 h-6"/>} />
                    <StatCard title="סה״כ אירועים" value={totalGigs.toString()} icon={<CalendarDaysIcon className="w-6 h-6"/>} />
                </div>

                <ChartsSection gigs={gigs} />
            </div>
        </div>
    );
};

export default Visualizations;
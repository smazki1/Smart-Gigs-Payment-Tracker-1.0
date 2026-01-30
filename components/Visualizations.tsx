import React from 'react';
import type { Gig, Package } from '../types';
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
    packages?: Package[];
}

const Visualizations: React.FC<VisualizationsProps> = ({ gigs, packages = [] }) => {
    // 1. Gigs Calculations
    const paidGigs = gigs.filter(g => g.status === GigStatus.Paid && !g.packageId); // Only independent gigs
    const pendingGigs = gigs.filter(g => g.status === GigStatus.Pending && !g.packageId);

    // 2. Packages Calculations
    const paidPackages = packages.filter(p => p.status === GigStatus.Paid);
    const pendingPackages = packages.filter(p => p.status === GigStatus.Pending);

    // 3. Totals
    const revenueFromGigs = paidGigs.reduce((sum, g) => sum + g.paymentAmount, 0);
    const revenueFromPackages = paidPackages.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const totalRevenue = revenueFromGigs + revenueFromPackages;

    const outstandingFromGigs = pendingGigs.reduce((sum, g) => sum + g.paymentAmount, 0);
    const outstandingFromPackages = pendingPackages.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const outstandingRevenue = outstandingFromGigs + outstandingFromPackages;

    const totalGigs = gigs.length; // Keeping this as "Events" count (packages aren't "events" exactly)

    // 4. Overdue (Global)
    const overdueGigsAmount = gigs
        .filter(g => isOverdue(g) && !g.packageId)
        .reduce((sum, g) => sum + g.paymentAmount, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const overduePackagesAmount = packages
        .filter(p => p.status === GigStatus.Pending && p.billingDate && p.billingDate < todayStr)
        .reduce((sum, p) => sum + p.totalPrice, 0);

    const overdueAmount = overdueGigsAmount + overduePackagesAmount;

    // Metrics
    const totalTransactions = paidGigs.length + paidPackages.length;
    const averageGigValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const paidTransactions = paidGigs.length + paidPackages.length;
    const allTransactions = gigs.length + packages.length; // Roughly
    const paidRate = allTransactions > 0 ? (paidTransactions / allTransactions) * 100 : 0;


    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="max-w-screen-xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">ניתוחים ותובנות</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">תובנות על הפעילות העסקית שלך במבט חטוף (כולל חבילות).</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <StatCard title="סה״כ הכנסות (שולם)" value={formatCurrency(totalRevenue)} icon={<CurrencyDollarIcon className="w-6 h-6" />} />
                    <StatCard title="תשלומים ממתינים" value={formatCurrency(outstandingRevenue)} icon={<PaperAirplaneIcon className="w-6 h-6" />} />
                    <StatCard title="סכום באיחור" value={formatCurrency(overdueAmount)} icon={<InformationCircleIcon className="w-6 h-6" />} />
                    <StatCard title="שווי עסקה ממוצע" value={formatCurrency(averageGigValue)} icon={<CurrencyDollarIcon className="w-6 h-6" />} />
                    <StatCard title="שיעור תשלום" value={`${paidRate.toFixed(0)}%`} icon={<CheckCircleIcon className="w-6 h-6" />} />
                    <StatCard title="סה״כ אירועים" value={totalGigs.toString()} icon={<CalendarDaysIcon className="w-6 h-6" />} />
                </div>

                <ChartsSection gigs={gigs} packages={packages} />
            </div>
        </div>
    );
};

export default Visualizations;
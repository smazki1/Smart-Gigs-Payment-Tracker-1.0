import React, { useState, useMemo } from 'react';
import type { Gig } from '../types';
import { GigStatus } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, ChartBarIcon, CurrencyDollarIcon, InformationCircleIcon } from './icons';
import { formatCurrency, getMonthHebrew } from '../utils/helpers';

interface SummarySectionProps {
  gigs: Gig[];
}

const SummaryCard: React.FC<{ title: string; value: string; description?: string, icon: React.ReactNode }> = ({ title, value, description, icon }) => (
  <div className="bg-white dark:bg-gray-800/50 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-lg text-primary-600 dark:text-primary-300">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
    {description && 
      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-slate-100 dark:border-gray-700/50">
          <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0"/>
          <p>{description}</p>
      </div>
    }
  </div>
);

const SummaryView: React.FC<{gigs: Gig[]}> = ({gigs}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const changeMonth = (amount: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const summaryData = useMemo(() => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

    const incomeThisMonth = gigs
      .filter(g => {
        const dueDate = new Date(g.paymentDueDate);
        return g.status === GigStatus.Paid && dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
      })
      .reduce((sum, g) => sum + g.paymentAmount, 0);
      
    const expectedThisMonth = gigs
      .filter(g => {
        const dueDate = new Date(g.paymentDueDate);
        return g.status === GigStatus.Pending && dueDate >= today && dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
      })
      .reduce((sum, g) => sum + g.paymentAmount, 0);

    const overdueTotal = gigs
      .filter(g => g.status === GigStatus.Pending && new Date(g.paymentDueDate) < today)
      .reduce((sum, g) => sum + g.paymentAmount, 0);

    return { incomeThisMonth, expectedThisMonth, overdueTotal };
  }, [gigs, currentDate]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center p-2">
        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{getMonthHebrew(currentDate)}</h2>
            <button onClick={goToToday} className="text-xs font-medium text-primary-600 hover:underline">חזור להיום</button>
        </div>
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard 
          title="הכנסות החודש (שולם)" 
          value={formatCurrency(summaryData.incomeThisMonth)} 
          description="כמה כסף נכנס לחשבון בחודש זה."
          icon={<CurrencyDollarIcon className="w-6 h-6"/>}
        />
        <SummaryCard 
          title="צפוי להיכנס החודש" 
          value={formatCurrency(summaryData.expectedThisMonth)} 
          description="כמה כסף אמור להתקבל עד סוף חודש זה."
          icon={<ChartBarIcon className="w-6 h-6"/>}
        />
        <SummaryCard 
          title="באיחור (סה״כ)" 
          value={formatCurrency(summaryData.overdueTotal)} 
          description="סך כל התשלומים מכל הזמנים שמועדם עבר."
          icon={<InformationCircleIcon className="w-6 h-6"/>}
        />
      </div>
    </div>
  );
};

const SummarySection: React.FC<SummarySectionProps> = ({ gigs }) => {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <SummaryView gigs={gigs} />
    </div>
  );
};

export default SummarySection;


import React, { useState, useMemo } from 'react';
import type { Gig, RecurringExpense, MonthlyExpenseInstance, Package } from '../types';
import { GigStatus } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, ChartBarIcon, CurrencyDollarIcon, InformationCircleIcon, ArrowUpTrayIcon, ArrowDownTrayIcon } from './icons';
import { formatCurrency, getMonthHebrew, isOverdue } from '../utils/helpers';
import { getMonthSummary } from '../services/expenseService';

interface SummarySectionProps {
  gigs: Gig[];
  expenses: RecurringExpense[];
  monthlyInstances: MonthlyExpenseInstance[];
  packages?: Package[];
}

const SummaryCard: React.FC<{ title: string; value: React.ReactNode; description?: string, icon: React.ReactNode, accentColor?: string }> = ({ title, value, description, icon, accentColor = "bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-300" }) => (
  <div className="bg-white dark:bg-gray-800/50 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 h-full flex flex-col justify-between">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${accentColor}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
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

const SummaryView: React.FC<SummarySectionProps> = ({gigs, expenses, monthlyInstances, packages = []}) => {
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
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // Helper to check if a date string is in current month
    const isInMonth = (dateStr: string) => dateStr.startsWith(monthStr);

    // --- 1. CALCULATE GIGS REVENUE (Independent events only) ---
    // We strictly filter out gigs that are linked to a package (packageId is defined)
    // to avoid double counting, as the revenue comes from the Package entity.
    const independentGigs = gigs.filter(g => !g.packageId);

    // Paid Gigs (Cash flow: Based on paymentDueDate occurring in this month)
    const incomeThisMonthGigs = independentGigs
      .filter(g => g.status === GigStatus.Paid && isInMonth(g.paymentDueDate))
      .reduce((sum, g) => sum + g.paymentAmount, 0);
      
    // Projected Gigs (Pending, Due this month, Not Overdue relative to today)
    const expectedThisMonthGigs = independentGigs
      .filter(g => g.status === GigStatus.Pending && isInMonth(g.paymentDueDate) && g.paymentDueDate >= todayStr)
      .reduce((sum, g) => sum + g.paymentAmount, 0);

    // Overdue Gigs (Global backlog: Pending and Due Date < Today)
    const overdueTotalGigs = independentGigs
      .filter(g => isOverdue(g))
      .reduce((sum, g) => sum + g.paymentAmount, 0);


    // --- 2. CALCULATE PACKAGES REVENUE ---
    // Packages are filtered by their billingDate.
    // Only packages with a billingDate are considered for revenue (Unbilled are ignored).
    
    // Paid Packages (Billing Date in this month)
    const packageRevenuePaid = packages
        .filter(p => p.billingDate && isInMonth(p.billingDate) && p.status === GigStatus.Paid)
        .reduce((sum, p) => sum + p.totalPrice, 0);

    // Projected Packages (Billing Date in this month, Pending, Not Overdue)
    const packageRevenueProjected = packages
        .filter(p => p.billingDate && isInMonth(p.billingDate) && p.status === GigStatus.Pending && p.billingDate >= todayStr)
        .reduce((sum, p) => sum + p.totalPrice, 0);

    // Overdue Packages (Global backlog: Pending and Billing Date < Today)
    const packageRevenueOverdue = packages
        .filter(p => p.billingDate && p.status === GigStatus.Pending && p.billingDate < todayStr)
        .reduce((sum, p) => sum + p.totalPrice, 0);


    // --- 3. TOTALS ---
    const incomeThisMonth = incomeThisMonthGigs + packageRevenuePaid;
    const expectedThisMonth = expectedThisMonthGigs + packageRevenueProjected;
    const overdueTotal = overdueTotalGigs + packageRevenueOverdue;

    // --- 4. EXPENSES & BALANCE ---
    // New Expense & Balance Logic
    const { totalExpenses } = getMonthSummary(monthStr, gigs, expenses, monthlyInstances);
    
    // Total Expected Income for Balance calculation = Paid + Projected (All revenue sources for the month)
    // Note: We don't include global overdue here, usually balance forecasts look at the specific month's expected flow.
    const totalExpectedIncome = incomeThisMonth + expectedThisMonth;
    const balance = totalExpectedIncome - totalExpenses;

    return { 
        incomeThisMonth, 
        expectedThisMonth, 
        overdueTotal,
        totalExpenses,
        totalExpectedIncome, 
        balance
    };
  }, [gigs, expenses, monthlyInstances, packages, currentDate]);

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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card - The Highlights */}
        <SummaryCard 
          title="מאזן חודשי" 
          value={
            <span className={summaryData.balance < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                {formatCurrency(summaryData.balance)}
            </span>
          }
          description={`הכנסות: ${formatCurrency(summaryData.totalExpectedIncome)} | הוצאות: ${formatCurrency(summaryData.totalExpenses)}`}
          icon={summaryData.balance >= 0 ? <ArrowUpTrayIcon className="w-6 h-6"/> : <ArrowDownTrayIcon className="w-6 h-6"/>}
          accentColor={summaryData.balance >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}
        />

        <SummaryCard 
          title="הכנסות (שולם)" 
          value={formatCurrency(summaryData.incomeThisMonth)} 
          description="מזומן שנכנס בפועל בחודש זה (כולל חבילות)."
          icon={<CurrencyDollarIcon className="w-6 h-6"/>}
        />
        
        <SummaryCard 
          title="צפוי להיכנס" 
          value={formatCurrency(summaryData.expectedThisMonth)} 
          description="תשלומים עתידיים וחבילות שמועד פירעונם החודש."
          icon={<ChartBarIcon className="w-6 h-6"/>}
        />
        
        <SummaryCard 
          title="באיחור (סה״כ)" 
          value={formatCurrency(summaryData.overdueTotal)} 
          description="כל התשלומים שטרם התקבלו ומועדם עבר."
          icon={<InformationCircleIcon className="w-6 h-6"/>}
          accentColor="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
        />
      </div>
    </div>
  );
};

const SummarySection: React.FC<SummarySectionProps> = (props) => {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <SummaryView {...props} />
    </div>
  );
};

export default SummarySection;

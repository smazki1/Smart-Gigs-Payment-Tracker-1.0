
import { RecurringExpense, MonthlyExpenseInstance, Gig, GigStatus, Package } from '../types';

/**
 * Shared helper to determine the effective amount for a specific expense in a specific month.
 * Returns null if the expense is not relevant for this month (inactive or out of date range).
 */
export const getExpenseAmountForMonth = (
  expense: RecurringExpense,
  monthKey: string,
  monthInstance?: MonthlyExpenseInstance
): number | null => {
  // 1. Specific Override takes precedence
  if (monthInstance) {
    return monthInstance.amount;
  }

  // 2. Base Rules
  if (!expense.isActive) return null;

  // Normalize dates to YYYY-MM for comparison
  const expenseStartMonth = expense.startDate.substring(0, 7); // "YYYY-MM"
  const expenseEndMonth = expense.endDate ? expense.endDate.substring(0, 7) : null;

  // Starts after this month?
  if (expenseStartMonth > monthKey) return null;

  // Ended before this month?
  if (expenseEndMonth && expenseEndMonth < monthKey) return null;

  return expense.monthlyAmount;
};

/**
 * Generates a map of expenses for a given range of months.
 * returns: { "YYYY-MM": { expenseId: amount, ... }, ... }
 */
export const getMonthlyExpensesGrid = (
  expenses: RecurringExpense[],
  monthlyInstances: MonthlyExpenseInstance[],
  startMonth: Date, // Date object representing the first month to show
  monthsCount: number = 12
): Map<string, { [expenseId: string]: number }> => {
  const grid = new Map<string, { [expenseId: string]: number }>();

  // Index instances for faster lookup: "expenseId-YYYY-MM" -> instance
  const instanceMap = new Map<string, MonthlyExpenseInstance>();
  monthlyInstances.forEach(inst => {
    if (inst.sourceRecurringExpenseId) {
      instanceMap.set(`${inst.sourceRecurringExpenseId}-${inst.monthKey}`, inst);
    }
  });

  for (let i = 0; i < monthsCount; i++) {
    const current = new Date(startMonth);
    current.setMonth(current.getMonth() + i);

    // Format YYYY-MM
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;

    const monthExpenses: { [expenseId: string]: number } = {};

    expenses.forEach(expense => {
      const instance = instanceMap.get(`${expense.id}-${monthKey}`);
      const amount = getExpenseAmountForMonth(expense, monthKey, instance);

      if (amount !== null) {
        monthExpenses[expense.id] = amount;
      }
    });

    grid.set(monthKey, monthExpenses);
  }

  return grid;
};

export const getTotalExpensesForMonth = (
  expenses: RecurringExpense[],
  monthlyInstances: MonthlyExpenseInstance[],
  monthKey: string // YYYY-MM
): number => {
  // Index instances for this month
  const instanceMap = new Map<string, MonthlyExpenseInstance>();
  monthlyInstances.filter(i => i.monthKey === monthKey).forEach(inst => {
    if (inst.sourceRecurringExpenseId) {
      instanceMap.set(inst.sourceRecurringExpenseId, inst);
    }
  });

  const total = expenses.reduce((sum, expense) => {
    const instance = instanceMap.get(expense.id);
    const amount = getExpenseAmountForMonth(expense, monthKey, instance);
    return sum + (amount || 0);
  }, 0);

  console.log(`[ExpensesDebug] Month: ${monthKey}, Total: ${total}, Count: ${expenses.length}`);
  return total;
};

export const getMonthIncome = (gigs: Gig[], packages: Package[], monthKey: string): number => {
  // 1. Independent Gigs (Not linked to a package)
  const gigIncome = gigs.reduce((acc, gig) => {
    if (!gig.packageId && gig.paymentDueDate.startsWith(monthKey)) {
      return acc + gig.paymentAmount;
    }
    return acc;
  }, 0);

  // 2. Packages (Based on Billing Date)
  const packageIncome = packages.reduce((acc, pkg) => {
    if (pkg.billingDate && pkg.billingDate.startsWith(monthKey)) {
      return acc + pkg.totalPrice;
    }
    return acc;
  }, 0);

  const totalIncome = gigIncome + packageIncome;
  console.log(`[IncomeDebug] Month: ${monthKey}, GigIncome: ${gigIncome}, PackageIncome: ${packageIncome}, Total: ${totalIncome}`);
  return totalIncome;
};

export const getMonthSummary = (
  monthKey: string, // YYYY-MM
  gigs: Gig[],
  packages: Package[],
  expenses: RecurringExpense[],
  monthlyInstances: MonthlyExpenseInstance[]
) => {
  // 1. Calculate Expenses
  const totalExpenses = getTotalExpensesForMonth(expenses, monthlyInstances, monthKey);

  // 2. Calculate Income (Based on paymentDueDate in this month + Package Billing)
  const income = getMonthIncome(gigs, packages, monthKey);

  return {
    totalExpenses,
    totalIncome: income,
    balance: income - totalExpenses
  };
};

export interface CategoryAnalytics {
  total: number;
  count: number;
  monthlyAverage: number;
  expenses: RecurringExpense[];
}

export interface ExpenseAnalyticsData {
  totalExpenses: number;
  categoryBreakdown: Record<string, CategoryAnalytics>;
  monthlyBreakdown: Record<string, number>;
}

export const calculateExpenseAnalytics = (
  expenses: RecurringExpense[],
  monthlyInstances: MonthlyExpenseInstance[],
  startMonth: Date,
  monthsCount: number,
  filterCategory: string | 'all' = 'all',
  filterEssential: 'all' | 'essential' | 'non-essential' = 'all'
): ExpenseAnalyticsData => {

  // 1. Get the raw grid
  const grid = getMonthlyExpensesGrid(expenses, monthlyInstances, startMonth, monthsCount);

  let totalExpenses = 0;
  const categoryBreakdown: Record<string, CategoryAnalytics> = {};
  const monthlyBreakdown: Record<string, number> = {};

  // 2. Iterate through grid to aggregate data
  grid.forEach((monthData, monthKey) => {
    let monthlyTotal = 0;

    expenses.forEach(expense => {
      const amount = monthData[expense.id];

      // Apply Filters
      if (amount === undefined || amount === null) return;
      if (filterCategory !== 'all' && expense.category !== filterCategory) return;
      if (filterEssential === 'essential' && !expense.isEssential) return;
      if (filterEssential === 'non-essential' && expense.isEssential) return;

      // Aggregations
      monthlyTotal += amount;
      totalExpenses += amount;

      const catName = expense.category || 'ללא קטגוריה';
      if (!categoryBreakdown[catName]) {
        categoryBreakdown[catName] = { total: 0, count: 0, monthlyAverage: 0, expenses: [] };
      }

      categoryBreakdown[catName].total += amount;
      categoryBreakdown[catName].count += 1; // Count instances of charge

      // Only add unique expense reference once
      if (!categoryBreakdown[catName].expenses.find(e => e.id === expense.id)) {
        categoryBreakdown[catName].expenses.push(expense);
      }
    });

    monthlyBreakdown[monthKey] = monthlyTotal;
  });

  // 3. Finalize Category Averages
  Object.keys(categoryBreakdown).forEach(cat => {
    categoryBreakdown[cat].monthlyAverage = categoryBreakdown[cat].total / monthsCount;
  });

  return {
    totalExpenses,
    categoryBreakdown,
    monthlyBreakdown
  };
};

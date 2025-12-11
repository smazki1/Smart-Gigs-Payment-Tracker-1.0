
import React, { useState, useMemo } from 'react';
import { RecurringExpense, MonthlyExpenseInstance } from '../types';
import { calculateExpenseAnalytics, CategoryAnalytics } from '../services/expenseService';
import { formatCurrency, getMonthHebrew } from '../utils/helpers';
import { ChartPieIcon, CurrencyDollarIcon, ListBulletIcon, SparklesIcon } from './icons';

interface ExpenseAnalyticsProps {
    expenses: RecurringExpense[];
    monthlyInstances: MonthlyExpenseInstance[];
}

const AnalyticsCard: React.FC<{ title: string; value: string; subValue?: string; icon: React.ReactNode; color?: string }> = ({ title, value, subValue, icon, color = "bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-300" }) => (
    <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
            {icon}
        </div>
        <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {subValue && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subValue}</p>}
        </div>
    </div>
);

// Reuse simple bar chart logic
const SimpleBarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const chartHeight = 200;

    return (
        <div className="w-full h-[250px] flex items-end justify-between gap-2 pt-6">
            {data.map((item, index) => {
                const height = (item.value / maxValue) * chartHeight;
                return (
                    <div key={index} className="flex-1 flex flex-col items-center group relative">
                        <div className="absolute -top-8 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                            {formatCurrency(item.value)}
                        </div>
                        <div 
                            className="w-full bg-primary-400 dark:bg-primary-600 rounded-t-sm hover:bg-primary-500 dark:hover:bg-primary-500 transition-colors"
                            style={{ height: `${height}px` }}
                        ></div>
                        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2 rotate-45 sm:rotate-0 truncate w-full text-center origin-left sm:origin-center">{item.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

// Reuse Donut Chart Logic (Internal version to keep file self-contained)
const AnalyticsDonutChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    let accumulatedAngle = -90;

    if (total === 0) return <div className="h-48 flex items-center justify-center text-gray-500">אין נתונים להצגה</div>;

    const paths = data.map(item => {
        const angle = (item.value / total) * 360;
        const startAngle = accumulatedAngle;
        accumulatedAngle += angle;
        const endAngle = accumulatedAngle;

        const start = {
            x: 50 + 40 * Math.cos(startAngle * Math.PI / 180),
            y: 50 + 40 * Math.sin(startAngle * Math.PI / 180)
        };
        const end = {
            x: 50 + 40 * Math.cos(endAngle * Math.PI / 180),
            y: 50 + 40 * Math.sin(endAngle * Math.PI / 180)
        };
        
        // Handle full circle case
        if (item.value === total) {
             return { d: `M 50, 10 A 40, 40 0 1, 1 49.99, 10`, ...item };
        }

        const largeArcFlag = angle > 180 ? 1 : 0;
        const d = `M ${start.x},${start.y} A 40,40 0 ${largeArcFlag},1 ${end.x},${end.y}`;
        return { d, ...item };
    });

    return (
        <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-40 h-40 flex-shrink-0">
                <svg viewBox="0 0 100 100">
                    {paths.map((path, index) => (
                        <path 
                            key={index} 
                            d={path.d} 
                            stroke={path.color} 
                            strokeWidth="12" 
                            fill="none" 
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                        >
                            <title>{`${path.label}: ${formatCurrency(path.value)}`}</title>
                        </path>
                    ))}
                </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-gray-500 dark:text-gray-400">סה"כ</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatCurrency(total)}</span>
                </div>
            </div>
            <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-2">
                {data.map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                            <span className="text-gray-700 dark:text-gray-300 truncate">{item.label}</span>
                        </div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{((item.value/total)*100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const ExpenseAnalytics: React.FC<ExpenseAnalyticsProps> = ({ expenses, monthlyInstances }) => {
    // State for filters
    const [startMonthStr, setStartMonthStr] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [monthsCount, setMonthsCount] = useState(12);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [filterEssential, setFilterEssential] = useState<'all' | 'essential' | 'non-essential'>('all');

    // Extract unique categories
    const categories = useMemo(() => {
        const cats = new Set(expenses.map(e => e.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [expenses]);

    // Calculate Data
    const analyticsData = useMemo(() => {
        const [year, month] = startMonthStr.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        return calculateExpenseAnalytics(expenses, monthlyInstances, startDate, monthsCount, selectedCategory, filterEssential);
    }, [expenses, monthlyInstances, startMonthStr, monthsCount, selectedCategory, filterEssential]);

    // Prepare Chart Data
    const pieChartData = useMemo(() => {
        const colors = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#8b5cf6', '#ec4899', '#64748b', '#0ea5e9', '#84cc16'];
        const entries = Object.entries(analyticsData.categoryBreakdown) as [string, CategoryAnalytics][];
        return entries
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([label, data], index) => ({
                label,
                value: data.total,
                color: colors[index % colors.length]
            }));
    }, [analyticsData.categoryBreakdown]);

    const barChartData = useMemo(() => {
        return Object.entries(analyticsData.monthlyBreakdown).map(([monthKey, value]) => {
            const [y, m] = monthKey.split('-');
            const date = new Date(parseInt(y), parseInt(m) - 1);
            return {
                label: date.toLocaleString('he-IL', { month: 'short', year: '2-digit' }),
                value
            };
        });
    }, [analyticsData.monthlyBreakdown]);

    // KPIs
    const topCategory = pieChartData[0] || { label: 'אין נתונים', value: 0 };
    const totalCategories = Object.keys(analyticsData.categoryBreakdown).length;
    
    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">ניתוח הוצאות</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">ניתוח מעמיק של ההוצאות הקבועות לפי קטגוריות וזמן.</p>
                </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">חודש התחלה</label>
                    <input 
                        type="month" 
                        value={startMonthStr} 
                        onChange={(e) => setStartMonthStr(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">טווח (חודשים)</label>
                    <select 
                        value={monthsCount} 
                        onChange={(e) => setMonthsCount(Number(e.target.value))} 
                        className="w-full bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                    >
                        <option value={3}>3 חודשים</option>
                        <option value={6}>6 חודשים</option>
                        <option value={12}>12 חודשים</option>
                        <option value={24}>24 חודשים</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">קטגוריה</label>
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                    >
                        <option value="all">כל הקטגוריות</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">סוג הוצאה</label>
                    <select 
                        value={filterEssential} 
                        onChange={(e) => setFilterEssential(e.target.value as any)} 
                        className="w-full bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                    >
                        <option value="all">הכל</option>
                        <option value="essential">הוצאות חיוניות בלבד</option>
                        <option value="non-essential">הוצאות רשות בלבד</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnalyticsCard 
                    title="סה״כ הוצאות בטווח" 
                    value={formatCurrency(analyticsData.totalExpenses)} 
                    subValue={`ממוצע חודשי: ${formatCurrency(analyticsData.totalExpenses / monthsCount)}`}
                    icon={<CurrencyDollarIcon className="w-6 h-6"/>}
                />
                <AnalyticsCard 
                    title="מספר קטגוריות פעילות" 
                    value={totalCategories.toString()} 
                    icon={<ListBulletIcon className="w-6 h-6"/>}
                    color="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300"
                />
                 <AnalyticsCard 
                    title="הקטגוריה הגדולה ביותר" 
                    value={topCategory.label} 
                    subValue={`${formatCurrency(topCategory.value)} (${analyticsData.totalExpenses > 0 ? ((topCategory.value / analyticsData.totalExpenses) * 100).toFixed(1) : 0}%)`}
                    icon={<SparklesIcon className="w-6 h-6"/>}
                    color="bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">התפלגות לפי קטגוריות</h3>
                    <AnalyticsDonutChart data={pieChartData} />
                </div>
                <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">הוצאות לאורך זמן</h3>
                    <SimpleBarChart data={barChartData} />
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">פירוט לפי קטגוריות</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-slate-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">קטגוריה</th>
                                <th className="px-6 py-3">סה״כ הוצאה</th>
                                <th className="px-6 py-3">ממוצע חודשי</th>
                                <th className="px-6 py-3">מספר חיובים</th>
                                <th className="px-6 py-3">% מסך הכל</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pieChartData.map((item, index) => {
                                const details = analyticsData.categoryBreakdown[item.label];
                                return (
                                    <tr key={index} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                            {item.label}
                                        </td>
                                        <td className="px-6 py-4">{formatCurrency(details.total)}</td>
                                        <td className="px-6 py-4">{formatCurrency(details.monthlyAverage)}</td>
                                        <td className="px-6 py-4">{details.count}</td>
                                        <td className="px-6 py-4">
                                            {analyticsData.totalExpenses > 0 ? ((details.total / analyticsData.totalExpenses) * 100).toFixed(1) : 0}%
                                        </td>
                                    </tr>
                                );
                            })}
                             {pieChartData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">אין נתונים להצגה בטווח הנבחר.</td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExpenseAnalytics;

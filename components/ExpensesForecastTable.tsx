
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { RecurringExpense, MonthlyExpenseInstance, Gig, Package } from '../types';
import { getMonthlyExpensesGrid, getTotalExpensesForMonth, getMonthIncome } from '../services/expenseService';
import { formatCurrency, getMonthHebrew } from '../utils/helpers';
import { PencilIcon, TrashIcon, PlusIcon, CheckCircleIcon, XMarkIcon, InformationCircleIcon, ArrowDownTrayIcon } from './icons';
import { MonthlyExpenseOverrideModal } from './Modals';

interface ExpensesForecastTableProps {
    expenses: RecurringExpense[];
    monthlyInstances: MonthlyExpenseInstance[];
    gigs: Gig[];
    packages: Package[];
    onAddExpense: (expense: RecurringExpense) => void;
    onUpdateExpense: (expense: RecurringExpense) => void;
    onDeleteExpense: (expense: RecurringExpense) => void;
    onSaveMonthlyInstance: (instance: MonthlyExpenseInstance) => void;
    onDeleteMonthlyInstance: (recurringId: string, monthKey: string) => void;
    onAddClick: () => void;
    onEditClick: (expense: RecurringExpense) => void;
}

// Helper component for editable cells
interface EditableCellProps {
    value: string | number;
    type: 'text' | 'number';
    onSave: (newValue: string | number) => void;
    className?: string;
}

const EditableCell: React.FC<EditableCellProps> = ({ value, type, onSave, className }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (tempValue !== value) {
            onSave(tempValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setTempValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type={type}
                value={tempValue}
                onChange={(e) => setTempValue(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`w-full bg-white dark:bg-gray-700 border border-primary-500 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${className}`}
            />
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer hover:bg-slate-100 dark:hover:bg-gray-700/50 rounded px-1 py-0.5 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-gray-600 ${className}`}
            title="לחץ לעריכה"
        >
            {type === 'number' && typeof value === 'number' ? formatCurrency(value) : value}
        </div>
    );
};


const ExpensesForecastTable: React.FC<ExpensesForecastTableProps> = ({
    expenses,
    monthlyInstances,
    gigs,
    packages,
    onAddExpense,
    onUpdateExpense,
    onDeleteExpense,
    onSaveMonthlyInstance,
    onDeleteMonthlyInstance,
    onAddClick,
    onEditClick
}) => {
    const startMonth = new Date();
    startMonth.setDate(1); // Start from 1st of current month
    const monthsCount = 12;

    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        expenseId: string | null;
        monthKey: string | null;
        currentAmount: number;
        expenseName: string;
        monthLabel: string;
    }>({ isOpen: false, expenseId: null, monthKey: null, currentAmount: 0, expenseName: '', monthLabel: '' });

    // Generate Month Headers
    const monthHeaders = useMemo(() => {
        return Array.from({ length: monthsCount }, (_, i) => {
            const d = new Date(startMonth);
            d.setMonth(d.getMonth() + i);
            return {
                date: d,
                label: getMonthHebrew(d),
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            };
        });
    }, [startMonth]);

    // Calculate Data Grid
    const expensesGrid = useMemo(() => {
        return getMonthlyExpensesGrid(expenses, monthlyInstances, startMonth, monthsCount);
    }, [expenses, monthlyInstances, startMonth]);

    // Calculate Expense Totals
    const expenseTotals = useMemo(() => {
        return monthHeaders.map(m => getTotalExpensesForMonth(expenses, monthlyInstances, m.key));
    }, [expenses, monthlyInstances, monthHeaders]);

    // Calculate Income Totals
    const incomeTotals = useMemo(() => {
        return monthHeaders.map(m => getMonthIncome(gigs, packages, m.key));
    }, [gigs, packages, monthHeaders]);

    // Calculate Balance Totals
    const balanceTotals = useMemo(() => {
        return expenseTotals.map((exp, idx) => incomeTotals[idx] - exp);
    }, [expenseTotals, incomeTotals]);


    const handleCellClick = (expense: RecurringExpense, monthKey: string, monthLabel: string) => {
        const currentAmount = expensesGrid.get(monthKey)?.[expense.id] || 0;
        setModalState({
            isOpen: true,
            expenseId: expense.id,
            monthKey,
            currentAmount,
            expenseName: expense.name,
            monthLabel
        });
    };

    const handleSaveOverride = (amount: number, notes: string) => {
        if (modalState.expenseId && modalState.monthKey) {
            const expense = expenses.find(e => e.id === modalState.expenseId);

            // Logic: If the amount matches the recurring base amount (within floating point margin),
            // we treat it as "resetting" the override, so we remove the instance to keep data clean.
            // Otherwise, we save the instance as an override.
            if (expense && Math.abs(expense.monthlyAmount - amount) < 0.01) {
                onDeleteMonthlyInstance(modalState.expenseId, modalState.monthKey);
            } else {
                onSaveMonthlyInstance({
                    amount,
                    notes,
                    isOneTime: true,
                    monthKey: modalState.monthKey,
                    sourceRecurringExpenseId: modalState.expenseId
                });
            }
        }
    };

    const handleDownloadCSV = () => {
        const escapeCsv = (val: string | number) => {
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Headers
        const headers = ['שם ההוצאה', 'קטגוריה', 'יום חיוב', ...monthHeaders.map(m => m.label)].map(escapeCsv);

        // Rows
        const rows = expenses.map(expense => {
            return [
                expense.name,
                expense.category,
                expense.chargeDayRule || '',
                ...monthHeaders.map(header => {
                    const amount = expensesGrid.get(header.key)?.[expense.id];
                    return amount !== undefined ? amount : '';
                })
            ].map(escapeCsv);
        });

        // Totals
        const totalExpensesRow = ['סה״כ הוצאות', '', '', ...expenseTotals].map(escapeCsv);
        const totalIncomeRow = ['סה״כ הכנסות', '', '', ...incomeTotals].map(escapeCsv);
        const balanceRow = ['יתרה', '', '', ...balanceTotals].map(escapeCsv);

        // Combine all data
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(',')),
            '', // Empty row
            totalExpensesRow.join(','),
            totalIncomeRow.join(','),
            balanceRow.join(',')
        ].join('\n');

        // Add BOM for Hebrew support in Excel
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `tahzit_hotzaot_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">תחזית הוצאות</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">ניהול ותחזית הוצאות קבועות לשנה הקרובה.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadCSV}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                        title="הורד לקובץ CSV"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        <span>ייצא ל-CSV</span>
                    </button>
                    <button
                        onClick={onAddClick}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                        הוסף הוצאה קבועה
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 overflow-hidden flex flex-col">
                <div className="overflow-x-auto pb-24 md:pb-0"> {/* Padding bottom for mobile scrolling */}
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400 border-collapse">
                        <thead className="text-xs text-gray-700 uppercase bg-slate-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                {/* Sticky Expense Column */}
                                <th scope="col" className="sticky right-0 z-20 px-4 py-3 bg-slate-50 dark:bg-gray-700 border-b border-l border-slate-200 dark:border-gray-600 min-w-[200px] shadow-sm text-right">
                                    שם ההוצאה
                                </th>
                                {monthHeaders.map(header => (
                                    <th key={header.key} scope="col" className="px-4 py-3 min-w-[120px] text-center border-b border-slate-200 dark:border-gray-600">
                                        <div className="font-semibold">{header.label.split(' ')[0]}</div>
                                        <div className="text-xs font-normal text-gray-500 dark:text-gray-400">{header.label.split(' ').slice(1).join(' ')}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map((expense) => (
                                <tr key={expense.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors group">
                                    {/* Sticky Expense Row Header */}
                                    <td className="sticky right-0 z-10 px-4 py-3 bg-white dark:bg-gray-800 group-hover:bg-slate-50 dark:group-hover:bg-gray-700/50 border-l border-slate-200 dark:border-gray-700 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                        <div className="flex justify-between items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <EditableCell
                                                    value={expense.name}
                                                    type="text"
                                                    onSave={(val) => onUpdateExpense({ ...expense, name: String(val) })}
                                                    className="font-semibold text-gray-900 dark:text-white truncate block mb-1 text-right"
                                                />
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="truncate">{expense.category}</span>
                                                    <span>•</span>
                                                    <div className="flex items-center gap-1" title={`יום חיוב: ${expense.chargeDayRule || 'לא צוין'}`}>
                                                        <InformationCircleIcon className="w-3 h-3" />
                                                        <span className="truncate max-w-[60px]">{expense.chargeDayRule || '?'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onEditClick(expense)} className="p-1 text-gray-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-gray-600 rounded" title="ערוך">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onDeleteExpense(expense)} className="p-1 text-gray-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-gray-600 rounded" title="מחק">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Monthly Cells */}
                                    {monthHeaders.map(header => {
                                        const amount = expensesGrid.get(header.key)?.[expense.id];
                                        // Check if this specific cell has an override
                                        const isOverride = monthlyInstances.some(inst => inst.sourceRecurringExpenseId === expense.id && inst.monthKey === header.key);

                                        return (
                                            <td
                                                key={`${expense.id}-${header.key}`}
                                                className={`px-4 py-3 text-center border-l border-slate-100 dark:border-gray-700/50 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 relative ${isOverride ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}
                                                onClick={() => handleCellClick(expense, header.key, header.label)}
                                                title="לחץ לעריכה"
                                            >
                                                {amount !== undefined ? (
                                                    <div className="relative group/cell">
                                                        <span className={`font-medium ${isOverride ? 'text-yellow-700 dark:text-yellow-400 font-bold' : 'text-gray-900 dark:text-gray-200'}`}>
                                                            {formatCurrency(amount)}
                                                        </span>
                                                        {isOverride && <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-yellow-400"></span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-600">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                            }

                            {/* Inline Add New Expense Row */}
                            <tr
                                onClick={onAddClick}
                                className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group border-t-2 border-dashed border-slate-200 dark:border-gray-700"
                            >
                                <td className="sticky right-0 z-10 px-4 py-3 bg-white dark:bg-gray-800 group-hover:bg-slate-50 dark:group-hover:bg-gray-700/50 border-l border-slate-200 dark:border-gray-700 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                    <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium">
                                        <PlusIcon className="w-5 h-5" />
                                        <span>הוסף הוצאה חדשה</span>
                                    </div>
                                </td>
                                {monthHeaders.map(header => (
                                    <td key={`add-cell-${header.key}`} className="px-4 py-3 border-l border-slate-100 dark:border-gray-700/50"></td>
                                ))}
                            </tr>

                        </tbody>
                        {/* Totals Footer */}
                        <tfoot className="bg-slate-100 dark:bg-gray-700/80 font-bold text-gray-900 dark:text-white sticky bottom-0 z-20 shadow-inner text-sm">
                            {/* Total Expenses Row */}
                            <tr>
                                <td className="sticky right-0 z-30 px-4 py-3 bg-slate-100 dark:bg-gray-700/80 border-t border-slate-300 dark:border-gray-600 border-l shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] text-right">
                                    סה״כ הוצאות
                                </td>
                                {expenseTotals.map((total, idx) => (
                                    <td key={`exp-${idx}`} className="px-4 py-3 text-center border-t border-slate-300 dark:border-gray-600 border-l border-slate-200 dark:border-gray-600">
                                        {formatCurrency(total)}
                                    </td>
                                ))}
                            </tr>
                            {/* Total Income Row */}
                            <tr className="bg-slate-50 dark:bg-gray-800/80">
                                <td className="sticky right-0 z-30 px-4 py-3 bg-slate-50 dark:bg-gray-800/80 border-t border-slate-200 dark:border-gray-600 border-l shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] text-right text-gray-700 dark:text-gray-300">
                                    סה״כ הכנסות
                                </td>
                                {incomeTotals.map((total, idx) => (
                                    <td key={`inc-${idx}`} className="px-4 py-3 text-center border-t border-slate-200 dark:border-gray-600 border-l border-slate-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                                        {formatCurrency(total)}
                                    </td>
                                ))}
                            </tr>
                            {/* Net Balance Row */}
                            <tr>
                                <td className="sticky right-0 z-30 px-4 py-3 bg-slate-100 dark:bg-gray-700/80 border-t border-slate-300 dark:border-gray-600 border-l shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] text-right">
                                    יתרה (הכנסות - הוצאות)
                                </td>
                                {balanceTotals.map((balance, idx) => (
                                    <td key={`bal-${idx}`} className={`px-4 py-3 text-center border-t border-slate-300 dark:border-gray-600 border-l border-slate-200 dark:border-gray-600 ${balance < 0 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10' : 'text-green-600 dark:text-green-400'}`}>
                                        {formatCurrency(balance)}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {
                modalState.isOpen && modalState.expenseId && modalState.monthKey && (
                    <MonthlyExpenseOverrideModal
                        expenseName={modalState.expenseName}
                        monthLabel={modalState.monthLabel}
                        currentAmount={modalState.currentAmount}
                        existingInstance={monthlyInstances.find(i => i.sourceRecurringExpenseId === modalState.expenseId && i.monthKey === modalState.monthKey)}
                        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                        onSave={handleSaveOverride}
                    />
                )
            }
        </div >
    );
};

export default ExpensesForecastTable;

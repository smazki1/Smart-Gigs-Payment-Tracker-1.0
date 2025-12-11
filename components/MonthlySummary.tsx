
import React, { useState, useMemo, useEffect } from 'react';
import type { Gig, Package } from '../types';
import { formatDate, getMonthHebrew, formatCurrency } from '../utils/helpers';
import { ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from './icons';

interface MonthlySummaryProps {
    gigs: Gig[];
    packages?: Package[];
    onSave: (gig: Partial<Gig> & { id: string }) => void;
}

const MonthlySummary: React.FC<MonthlySummaryProps> = ({ gigs, packages = [], onSave }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };
    
    const goToToday = () => setCurrentDate(new Date());
    
    const monthStr = useMemo(() => {
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        return `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    }, [currentDate]);

    const monthlyGigs = useMemo(() => {
        return gigs
            .filter(g => g.eventDate.startsWith(monthStr))
            .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    }, [gigs, monthStr]);

    // Calculate Package Revenue for this month (only packages with a date in this month)
    const monthlyPackageRevenue = useMemo(() => {
        return packages
            .filter(p => p.billingDate && p.billingDate.startsWith(monthStr))
            .reduce((sum, p) => sum + p.totalPrice, 0);
    }, [packages, monthStr]);

    const [editedGigs, setEditedGigs] = useState(monthlyGigs);

    useEffect(() => {
        setEditedGigs(monthlyGigs);
    }, [monthlyGigs]);
    
    // Total Amount Calculation
    // Sums: 
    // 1. Payment Amount of all gigs displayed in the table (Package linked gigs have amount 0)
    // 2. Revenue from Packages billed this month
    const totalAmount = useMemo(() => {
        const gigTotal = editedGigs.reduce((sum, gig) => sum + gig.paymentAmount, 0);
        return gigTotal + monthlyPackageRevenue;
    }, [editedGigs, monthlyPackageRevenue]);

    const handleCellChange = (id: string, field: keyof Gig, value: string | number) => {
        setEditedGigs(current =>
            current.map(g => (g.id === id ? { ...g, [field]: value } : g))
        );
    };

    const handleCellBlur = (id: string, field: keyof Gig) => {
        const originalGig = monthlyGigs.find(g => g.id === id);
        const editedGig = editedGigs.find(g => g.id === id);
        if (!originalGig || !editedGig) return;

        let valueToSave = editedGig[field as keyof Gig];
        if (originalGig[field as keyof Gig] === valueToSave) {
             return; // No change
        }
        
        if (field === 'paymentAmount' || field === 'duration') {
            const parsedValue = parseFloat(valueToSave as string);
            valueToSave = isNaN(parsedValue) ? (field === 'duration' ? undefined : 0) : parsedValue;
        }

        if (field === 'eventDate' && valueToSave && valueToSave !== originalGig.eventDate) {
            const dateDiff = new Date(originalGig.paymentDueDate).getTime() - new Date(originalGig.eventDate).getTime();
            const newPaymentDueDate = new Date(new Date(valueToSave as string).getTime() + dateDiff).toISOString().split('T')[0];
            onSave({ id, eventDate: valueToSave as string, paymentDueDate: newPaymentDueDate });
        } else {
            onSave({ id, [field]: valueToSave });
        }
    };


    const handleExport = () => {
        const headers = ['שם אירוע', 'תאריך אירוע', 'סכום לתשלום', 'משך (שעות)', 'סיכום ותובנות'];
        const csvRows = [headers.join(',')];

        for (const gig of editedGigs) {
            const values = [
                `"${gig.name.replace(/"/g, '""')}"`,
                formatDate(gig.eventDate),
                gig.paymentAmount,
                gig.duration || '',
                `"${(gig.summary || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(values.join(','));
        }

        // Add packages to CSV
        const monthlyPackagesList = packages.filter(p => p.billingDate && p.billingDate.startsWith(monthStr));
        if (monthlyPackagesList.length > 0) {
            csvRows.push('');
            csvRows.push('חבילות ריטיינר לחודש זה');
            monthlyPackagesList.forEach(pkg => {
                 const values = [
                    `"${pkg.name} (${pkg.clientName})"`,
                    formatDate(pkg.billingDate || ''),
                    pkg.totalPrice,
                    '',
                    '"חיוב חבילה"'
                ];
                csvRows.push(values.join(','));
            });
        }

        csvRows.push('');

        const totalRow = [
            '',
            '"סה״כ (כולל חבילות)"',
            totalAmount,
            '',
            ''
        ];
        csvRows.push(totalRow.join(','));
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const yearStr = currentDate.getFullYear();
        link.setAttribute('download', `monthly_summary_${yearStr}_${monthStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 md:p-6">
            <div className="max-w-screen-2xl mx-auto space-y-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">סיכום חודשי</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">סקירת אירועים, חבילות וסיכומים לכל חודש.</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <ChevronLeftIcon/>
                            </button>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{getMonthHebrew(currentDate)}</h3>
                                <button onClick={goToToday} className="text-xs font-medium text-primary-600 hover:underline">חזור להיום</button>
                            </div>
                            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <ChevronRightIcon/>
                            </button>
                        </div>
                        <button onClick={handleExport} disabled={editedGigs.length === 0 && monthlyPackageRevenue === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm disabled:bg-primary-300 dark:disabled:bg-primary-800">
                            <ArrowDownTrayIcon/>
                            ייצוא ל-Excel
                        </button>
                    </div>

                    <div className="mb-4 p-4 bg-slate-50 dark:bg-gray-700/50 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-2">
                        <div>
                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                סה״כ (ללא מע״מ): <span className="text-xl font-bold text-primary-600 dark:text-primary-400 mx-2">{formatCurrency(totalAmount)}</span>
                            </h4>
                        </div>
                        {monthlyPackageRevenue > 0 && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                (מתוכם חבילות: {formatCurrency(monthlyPackageRevenue)})
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-slate-50 dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th scope="col" className="px-4 py-3 min-w-[200px]">שם אירוע</th>
                                    <th scope="col" className="px-4 py-3">תאריך</th>
                                    <th scope="col" className="px-4 py-3">סכום</th>
                                    <th scope="col" className="px-4 py-3 w-32">משך (שעות)</th>
                                    <th scope="col" className="px-4 py-3 min-w-[300px]">סיכום ותובנות</th>
                                </tr>
                            </thead>
                            <tbody>
                                {editedGigs.length > 0 ? editedGigs.map(gig => (
                                    <tr key={gig.id} className="bg-white dark:bg-gray-800/80 border-b dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                value={gig.name || ''}
                                                onChange={(e) => handleCellChange(gig.id, 'name', e.target.value)}
                                                onBlur={() => handleCellBlur(gig.id, 'name')}
                                                className="w-full font-semibold bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                                placeholder="שם אירוע"
                                            />
                                            {gig.packageId && (
                                                <span className="text-xs text-blue-600 dark:text-blue-400 block mt-1 mr-1">
                                                    שיוך לחבילה
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="date"
                                                value={gig.eventDate || ''}
                                                onChange={(e) => handleCellChange(gig.id, 'eventDate', e.target.value)}
                                                onBlur={() => handleCellBlur(gig.id, 'eventDate')}
                                                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                             <input
                                                type="number"
                                                value={gig.paymentAmount}
                                                onChange={(e) => handleCellChange(gig.id, 'paymentAmount', e.target.value)}
                                                onBlur={() => handleCellBlur(gig.id, 'paymentAmount')}
                                                disabled={!!gig.packageId}
                                                className={`w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white ${gig.packageId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                placeholder="סכום"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                value={gig.duration || ''}
                                                onChange={(e) => handleCellChange(gig.id, 'duration', e.target.value)}
                                                onBlur={() => handleCellBlur(gig.id, 'duration')}
                                                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                                placeholder="הזן משך"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <textarea
                                                value={gig.summary || ''}
                                                onChange={(e) => handleCellChange(gig.id, 'summary', e.target.value)}
                                                onBlur={() => handleCellBlur(gig.id, 'summary')}
                                                rows={2}
                                                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                                placeholder="הזן סיכום..."
                                            />
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16 text-gray-500 dark:text-gray-400">
                                            אין אירועים בחודש זה.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonthlySummary;

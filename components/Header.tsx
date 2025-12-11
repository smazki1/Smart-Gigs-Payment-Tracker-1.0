
import React, { useRef } from 'react';
import type { Gig } from '../types';
import { generateCsv, parseCsv } from '../utils/helpers';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ListBulletIcon, CalendarDaysIcon, ChartBarIcon, GiftIcon, DocumentTextIcon, CreditCardIcon, ChartPieIcon, BriefcaseIcon } from './icons';

interface HeaderProps {
    gigs: Gig[];
    onPreviewImport: (importedGigs: Gig[]) => void;
    setImportError: (message: string) => void;
    currentView: 'dashboard' | 'table' | 'visualizations' | 'rewards' | 'monthlySummary' | 'expenses' | 'expenseAnalytics' | 'packages';
    onNavigate: (view: 'dashboard' | 'table' | 'visualizations' | 'rewards' | 'monthlySummary' | 'expenses' | 'expenseAnalytics' | 'packages') => void;
}

const Header: React.FC<HeaderProps> = ({ gigs, onPreviewImport, setImportError, currentView, onNavigate }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const csvString = generateCsv(gigs);
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'gigs.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const importedGigs = parseCsv(text);
                    if (importedGigs.length === 0 && text.trim() !== '') {
                        throw new Error("No valid data found in CSV file.");
                    }
                    onPreviewImport(importedGigs);
                } catch (error) {
                    console.error('CSV Parsing Error:', error);
                    setImportError('שגיאה בניתוח הקובץ. אנא ודאו שהקובץ בפורמט CSV תקין ושהעמודות תואמות.');
                }
            };
            reader.onerror = () => {
                 setImportError('שגיאה בקריאת הקובץ.');
            }
            reader.readAsText(file);
        }
        // Reset file input to allow importing the same file again
        if (event.target) {
            event.target.value = '';
        }
    };

    return (
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-gray-950/70 backdrop-blur-lg border-b border-slate-200 dark:border-gray-800">
            <div className="max-w-screen-2xl mx-auto px-4 md:px-6 h-16 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl md:text-2xl font-bold text-primary-600 dark:text-primary-400">מעקב תשלומים חכם</h1>
                    <nav className="hidden xl:flex items-center gap-2 bg-slate-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto">
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${currentView === 'dashboard' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                            <ListBulletIcon className="w-4 h-4"/> לוח בקרה
                        </button>
                        <button
                            onClick={() => onNavigate('table')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${currentView === 'table' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                            <CalendarDaysIcon className="w-4 h-4"/> תצוגת טבלה
                        </button>
                        <button
                            onClick={() => onNavigate('visualizations')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${currentView === 'visualizations' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                           <ChartBarIcon className="w-4 h-4"/> ניתוחים
                        </button>
                         <button
                            onClick={() => onNavigate('monthlySummary')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${currentView === 'monthlySummary' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                           <DocumentTextIcon className="w-4 h-4"/> סיכום חודשי
                        </button>
                        <button
                            onClick={() => onNavigate('expenses')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${currentView === 'expenses' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                           <CreditCardIcon className="w-4 h-4"/> הוצאות
                        </button>
                         <button
                            onClick={() => onNavigate('expenseAnalytics')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${currentView === 'expenseAnalytics' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                           <ChartPieIcon className="w-4 h-4"/> ניתוח הוצאות
                        </button>
                        <button
                            onClick={() => onNavigate('packages')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${currentView === 'packages' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                           <BriefcaseIcon className="w-4 h-4"/> ניהול חבילות
                        </button>
                         <button
                            onClick={() => onNavigate('rewards')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${currentView === 'rewards' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                           <GiftIcon className="w-4 h-4"/> תגמולים
                        </button>
                    </nav>
                     {/* Mobile Menu Dropdown Fallback (Simplified visual cue for small screens) */}
                     <div className="xl:hidden">
                         <select 
                            value={currentView} 
                            onChange={(e) => onNavigate(e.target.value as any)}
                            className="bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm rounded-lg p-2.5 border-none focus:ring-2 focus:ring-primary-500"
                         >
                             <option value="dashboard">לוח בקרה</option>
                             <option value="table">תצוגת טבלה</option>
                             <option value="visualizations">ניתוחים</option>
                             <option value="monthlySummary">סיכום חודשי</option>
                             <option value="expenses">הוצאות</option>
                             <option value="expenseAnalytics">ניתוח הוצאות</option>
                             <option value="packages">ניהול חבילות</option>
                             <option value="rewards">תגמולים</option>
                         </select>
                     </div>
                </div>

                <div className="flex space-x-2 rtl:space-x-reverse">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                    <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors">
                        <ArrowUpTrayIcon />
                        <span className="hidden sm:inline">ייבוא</span>
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">
                        <ArrowDownTrayIcon />
                        <span className="hidden sm:inline">ייצוא</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;

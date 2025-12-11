
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Gig, ParsedGig, RewardNote, RecurringExpense, MonthlyExpenseInstance, Package } from './types';
import { GigStatus } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TableView from './components/TableView';
import Visualizations from './components/Visualizations';
import RewardsView from './components/RewardsView';
import MonthlySummary from './components/MonthlySummary';
import ExpensesForecastTable from './components/ExpensesForecastTable';
import ExpenseAnalytics from './components/ExpenseAnalytics';
import PackagesManager from './components/PackagesManager';
import { GigFormModal, ConfirmationModal, AIReminderModal, ImportStatusModal, ImportPreviewModal, ExpenseFormModal, PackageFormModal } from './components/Modals';
import { syncExpectedIncomeToMake } from './services/webhookService';

// Mock data for initial load in Hebrew
const getInitialGigs = (): Gig[] => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15).toISOString().split('T')[0];
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 10).toISOString().split('T')[0];
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5).toISOString().split('T')[0];
    
    return [
        { id: '1', name: 'סדנת AI', supplierName: 'חברת אקמי', paymentAmount: 4000, eventDate: thisMonth, paymentDueDate: new Date(new Date(thisMonth).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: GigStatus.Pending, createdAt: new Date().toISOString(), notes: 'הלקוח ביקש להתמקד ב-GenAI', duration: 4, summary: 'סדנה מוצלחת, פידבק טוב מהמשתתפים. יש פוטנציאל להמשך עבודה.' },
        { id: '2', name: 'ספרינט עיצוב', supplierName: 'אינובייט בע"מ', paymentAmount: 7500, eventDate: lastMonth, paymentDueDate: new Date(new Date(lastMonth).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: GigStatus.Paid, createdAt: new Date().toISOString(), invoiceNumber: '2024-001', duration: 20, summary: 'פרויקט אינטנסיבי אך מתגמל. הלקוח היה מרוצה מאוד מהתוצאה הסופית.' },
        { id: '3', name: 'הרצאה בכנס טכנולוגי', supplierName: 'כנס DevSummit', paymentAmount: 5000, eventDate: nextMonth, paymentDueDate: new Date(new Date(nextMonth).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: GigStatus.Pending, createdAt: new Date().toISOString() },
        { id: '4', name: 'ייעוץ', supplierName: 'סטארטאפ שקט', paymentAmount: 1500, eventDate: `${currentYear-1}-12-10`, paymentDueDate: `${currentYear-1}-12-25`, status: GigStatus.Pending, createdAt: new Date().toISOString() },
    ];
};

const Toast: React.FC<{ message: string; onUndo?: () => void; onClose: () => void }> = ({ message, onUndo, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white py-3 px-6 rounded-lg shadow-lg flex items-center gap-4 animate-slide-up-fast z-[100]">
            <p>{message}</p>
            {onUndo && (
              <button
                  onClick={() => { onUndo(); onClose(); }}
                  className="font-bold text-primary-400 hover:text-primary-300 transition-colors"
              >
                  ביטול
              </button>
            )}
        </div>
    );
};


const App: React.FC = () => {
    const [gigs, setGigs] = useState<Gig[]>(() => {
        try {
            const savedGigs = localStorage.getItem('gigs');
            return savedGigs ? JSON.parse(savedGigs) : getInitialGigs();
        } catch (error) {
            console.error("Failed to parse gigs from localStorage", error);
            return getInitialGigs();
        }
    });

    const [rewardsNotes, setRewardsNotes] = useState<RewardNote[]>(() => {
        try {
            const savedNotes = localStorage.getItem('rewardsNotes');
            return savedNotes ? JSON.parse(savedNotes) : [];
        } catch (error) {
            console.error("Failed to parse rewards notes from localStorage", error);
            return [];
        }
    });

    const [expenses, setExpenses] = useState<RecurringExpense[]>(() => {
        try {
            const savedExpenses = localStorage.getItem('expenses');
            return savedExpenses ? JSON.parse(savedExpenses) : [];
        } catch (error) {
            console.error("Failed to parse expenses from localStorage", error);
            return [];
        }
    });
    
    const [monthlyInstances, setMonthlyInstances] = useState<MonthlyExpenseInstance[]>(() => {
        try {
            const savedInstances = localStorage.getItem('monthlyInstances');
            return savedInstances ? JSON.parse(savedInstances) : [];
        } catch (error) {
            console.error("Failed to parse monthlyInstances from localStorage", error);
            return [];
        }
    });

    const [packages, setPackages] = useState<Package[]>(() => {
        try {
            const savedPackages = localStorage.getItem('packages');
            return savedPackages ? JSON.parse(savedPackages) : [];
        } catch (error) {
            console.error("Failed to parse packages from localStorage", error);
            return [];
        }
    });

    const [view, setView] = useState<'dashboard' | 'table' | 'visualizations' | 'rewards' | 'monthlySummary' | 'expenses' | 'expenseAnalytics' | 'packages'>('dashboard');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
    
    const [editingGig, setEditingGig] = useState<Gig | null>(null);
    const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
    const [editingPackage, setEditingPackage] = useState<Package | null>(null);

    const [gigToDelete, setGigToDelete] = useState<Gig | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<RecurringExpense | null>(null);
    const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);

    const [bulkGigsToDelete, setBulkGigsToDelete] = useState<string[] | null>(null);
    const [gigForReminder, setGigForReminder] = useState<Gig | null>(null);
    const [importStatus, setImportStatusState] = useState<{ status: 'error' | 'success', message: string } | null>(null);
    const [importPreview, setImportPreview] = useState<{ newGigs: Gig[]; updatedGigs: Gig[] } | null>(null);
    
    const [toast, setToast] = useState<{ key: number; message: string; onUndo?: () => void } | null>(null);
    const lastAction = useRef<{ gigBefore: Gig; type: 'reschedule' } | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem('gigs', JSON.stringify(gigs));
        } catch (error) {
            console.error("Failed to save gigs to localStorage", error);
        }
    }, [gigs]);

    useEffect(() => {
        try {
            localStorage.setItem('rewardsNotes', JSON.stringify(rewardsNotes));
        } catch (error) {
            console.error("Failed to save rewards notes to localStorage", error);
        }
    }, [rewardsNotes]);

    useEffect(() => {
        try {
            localStorage.setItem('expenses', JSON.stringify(expenses));
        } catch (error) {
            console.error("Failed to save expenses to localStorage", error);
        }
    }, [expenses]);

    useEffect(() => {
        try {
            localStorage.setItem('monthlyInstances', JSON.stringify(monthlyInstances));
        } catch (error) {
            console.error("Failed to save monthlyInstances to localStorage", error);
        }
    }, [monthlyInstances]);

    useEffect(() => {
        try {
            localStorage.setItem('packages', JSON.stringify(packages));
        } catch (error) {
            console.error("Failed to save packages to localStorage", error);
        }
    }, [packages]);


    const handleOpenFormModal = useCallback((gig: Gig | null = null, defaultDate?: string) => {
        if (gig) {
            setEditingGig(gig);
        } else {
            const today = new Date().toISOString().split('T')[0];
            const newGigTemplate: Gig = {
                id: '',
                name: '',
                paymentAmount: 0,
                eventDate: defaultDate || today,
                paymentDueDate: defaultDate || today,
                status: GigStatus.Pending,
                createdAt: new Date().toISOString(),
                attachments: [],
            };
            setEditingGig(newGigTemplate);
        }
        setIsFormModalOpen(true);
    }, []);

    const handleSaveGig = useCallback((gigToSave: Partial<Gig> & { id: string }) => {
        setGigs(prevGigs => {
            const index = prevGigs.findIndex(g => g.id === gigToSave.id);
            let savedGig: Gig;

            if (index >= 0) {
                // Update existing gig
                savedGig = { ...prevGigs[index], ...gigToSave };
                const newGigs = [...prevGigs];
                newGigs[index] = savedGig;

                // Fire and forget webhook - only if amount > 0 (don't fire for package linked events with 0 cost)
                if (savedGig.paymentAmount > 0) {
                    setTimeout(() => {
                        const month = savedGig.paymentDueDate.substring(0, 7); // YYYY-MM
                        syncExpectedIncomeToMake(month, savedGig.paymentAmount, {
                            gigId: savedGig.id,
                            status: savedGig.status,
                            name: savedGig.name
                        });
                    }, 0);
                }

                return newGigs;
            } else {
                // Add new gig
                savedGig = gigToSave as Gig;

                // Fire and forget webhook
                if (savedGig.paymentAmount > 0) {
                    setTimeout(() => {
                        const month = savedGig.paymentDueDate.substring(0, 7); // YYYY-MM
                        syncExpectedIncomeToMake(month, savedGig.paymentAmount, {
                            gigId: savedGig.id,
                            status: savedGig.status,
                            name: savedGig.name
                        });
                    }, 0);
                }

                return [...prevGigs, savedGig];
            }
        });
    }, []);
    
    const handleAddNewGig = useCallback((newGig: Gig) => {
        setGigs(prev => [...prev, newGig]);
    }, []);


    const handleDeleteGig = useCallback(() => {
        if (gigToDelete) {
            setGigs(prevGigs => prevGigs.filter(g => g.id !== gigToDelete.id));
            setGigToDelete(null);
        }
    }, [gigToDelete]);

    const handleBulkDelete = useCallback(() => {
        if (bulkGigsToDelete) {
            setGigs(prev => prev.filter(g => !bulkGigsToDelete.includes(g.id)));
            setBulkGigsToDelete(null);
        }
    }, [bulkGigsToDelete]);

    const handleMarkAsPaid = useCallback((gigToUpdate: Gig) => {
        handleSaveGig({ ...gigToUpdate, status: GigStatus.Paid });
    }, [handleSaveGig]);

    const handleBulkMarkAsPaid = useCallback((ids: string[]) => {
        setGigs(prev => prev.map(gig => ids.includes(gig.id) ? { ...gig, status: GigStatus.Paid } : gig));
        setToast({ key: Date.now(), message: `${ids.length} אירועים סומנו כשולמו.` });
    }, []);
    
    const handleSmartAdd = useCallback((parsedGig: ParsedGig) => {
        const newGig: Gig = {
            id: crypto.randomUUID(),
            name: parsedGig.name,
            supplierName: parsedGig.supplierName,
            paymentAmount: parsedGig.paymentAmount,
            eventDate: parsedGig.eventDate,
            paymentDueDate: parsedGig.eventDate,
            status: GigStatus.Pending,
            createdAt: new Date().toISOString()
        };
        setEditingGig(newGig);
        setIsFormModalOpen(true);
    }, []);
    
    const handlePreviewImport = useCallback((importedGigs: Gig[]) => {
        const existingIds = new Set(gigs.map(g => g.id));
        const newGigs = importedGigs.filter(g => !existingIds.has(g.id));
        const updatedGigs = importedGigs.filter(g => existingIds.has(g.id));
        setImportPreview({ newGigs, updatedGigs });
    }, [gigs]);

    const handleConfirmImport = useCallback(() => {
        if (!importPreview) return;
        
        const { newGigs, updatedGigs } = importPreview;

        setGigs(prevGigs => {
            const gigMap = new Map(prevGigs.map(g => [g.id, g]));
            updatedGigs.forEach(g => gigMap.set(g.id, g));
            return [...Array.from(gigMap.values()), ...newGigs];
        });
        
        setImportStatusState({ status: 'success', message: `הייבוא הושלם: ${newGigs.length} נוספו, ${updatedGigs.length} עודכנו.` });
        setImportPreview(null);
    }, [importPreview]);

    const handleReschedule = useCallback((gigId: string, newEventDate: string) => {
        const originalGig = gigs.find(g => g.id === gigId);
        if (!originalGig) return;

        lastAction.current = { gigBefore: originalGig, type: 'reschedule' };

        const dateDiff = new Date(originalGig.paymentDueDate).getTime() - new Date(originalGig.eventDate).getTime();
        const newPaymentDueDate = new Date(new Date(newEventDate).getTime() + dateDiff).toISOString().split('T')[0];

        handleSaveGig({
            id: originalGig.id,
            eventDate: newEventDate,
            paymentDueDate: newPaymentDueDate,
        });
        
        setToast({ key: Date.now(), message: "האירוע נדחה.", onUndo: handleUndo });

    }, [gigs, handleSaveGig]);

    const handleUndo = useCallback(() => {
        if (lastAction.current?.gigBefore) {
            handleSaveGig(lastAction.current.gigBefore);
            lastAction.current = null;
        }
    }, [handleSaveGig]);

    const noteColors = [
        'bg-yellow-200 border-yellow-300 dark:bg-yellow-900/40 dark:border-yellow-800/60',
        'bg-blue-200 border-blue-300 dark:bg-blue-900/40 dark:border-blue-800/60',
        'bg-green-200 border-green-300 dark:bg-green-900/40 dark:border-green-800/60',
        'bg-pink-200 border-pink-300 dark:bg-pink-900/40 dark:border-pink-800/60',
        'bg-purple-200 border-purple-300 dark:bg-purple-900/40 dark:border-purple-800/60',
    ];

    const handleAddNote = useCallback(() => {
        const newNote: RewardNote = {
            id: crypto.randomUUID(),
            content: '',
            color: noteColors[rewardsNotes.length % noteColors.length],
        };
        setRewardsNotes(prev => [newNote, ...prev]);
    }, [rewardsNotes.length]);

    const handleUpdateNote = useCallback((id: string, content: string) => {
        setRewardsNotes(prev => prev.map(note => note.id === id ? { ...note, content } : note));
    }, []);

    const handleDeleteNote = useCallback((id: string) => {
        setRewardsNotes(prev => prev.filter(note => note.id !== id));
    }, []);

    // Expense Handlers
    const handleSaveExpense = useCallback((expense: RecurringExpense) => {
        setExpenses(prev => {
            const index = prev.findIndex(e => e.id === expense.id);
            if (index >= 0) {
                const newExpenses = [...prev];
                newExpenses[index] = expense;
                return newExpenses;
            } else {
                return [...prev, expense];
            }
        });
        setIsExpenseModalOpen(false);
    }, []);

    const handleDeleteExpense = useCallback(() => {
        if (expenseToDelete) {
            setExpenses(prev => prev.filter(e => e.id !== expenseToDelete.id));
            setExpenseToDelete(null);
        }
    }, [expenseToDelete]);

    const handleSaveMonthlyInstance = useCallback((instance: MonthlyExpenseInstance) => {
        setMonthlyInstances(prev => {
            const existingIndex = prev.findIndex(i => i.sourceRecurringExpenseId === instance.sourceRecurringExpenseId && i.monthKey === instance.monthKey);
            if (existingIndex >= 0) {
                const newInstances = [...prev];
                newInstances[existingIndex] = instance;
                return newInstances;
            } else {
                return [...prev, instance];
            }
        });
    }, []);
    
    const handleDeleteMonthlyInstance = useCallback((recurringExpenseId: string, monthKey: string) => {
        setMonthlyInstances(prev => prev.filter(i => !(i.sourceRecurringExpenseId === recurringExpenseId && i.monthKey === monthKey)));
    }, []);

    // Package Handlers
    const handleSavePackage = useCallback((pkg: Package) => {
        setPackages(prev => {
            const index = prev.findIndex(p => p.id === pkg.id);
            if (index >= 0) {
                const newPackages = [...prev];
                newPackages[index] = pkg;
                return newPackages;
            } else {
                return [...prev, pkg];
            }
        });
        setIsPackageModalOpen(false);
    }, []);

    const handleDeletePackage = useCallback(() => {
        if (packageToDelete) {
            setPackages(prev => prev.filter(p => p.id !== packageToDelete.id));
            // Should also remove packageId from linked gigs?
            // Optional: setGigs(prev => prev.map(g => g.packageId === packageToDelete.id ? { ...g, packageId: undefined, billingType: 'per_event' } : g));
            setPackageToDelete(null);
        }
    }, [packageToDelete]);


    return (
        <div className="min-h-screen text-gray-800 dark:text-gray-200">
            <Header 
                gigs={gigs} 
                onPreviewImport={handlePreviewImport}
                setImportError={(message) => setImportStatusState({ status: 'error', message })}
                currentView={view}
                onNavigate={setView}
            />
            <main className="max-w-screen-2xl mx-auto">
                 {view === 'dashboard' ? (
                    <Dashboard
                        gigs={gigs}
                        expenses={expenses}
                        monthlyInstances={monthlyInstances}
                        packages={packages}
                        onAdd={(date) => handleOpenFormModal(null, date)}
                        onEdit={(gig) => handleOpenFormModal(gig)}
                        onSave={handleSaveGig}
                        onDelete={(gig) => setGigToDelete(gig)}
                        onMarkAsPaid={handleMarkAsPaid}
                        onAIReminder={(gig) => setGigForReminder(gig)}
                        onSmartAdd={handleSmartAdd}
                        onReschedule={handleReschedule}
                        onBulkMarkAsPaid={handleBulkMarkAsPaid}
                        onBulkDelete={(ids) => setBulkGigsToDelete(ids)}
                    />
                ) : view === 'table' ? (
                    <TableView
                        gigs={gigs}
                        onSave={handleSaveGig}
                        onAdd={handleAddNewGig}
                        onDelete={(gig) => setGigToDelete(gig)}
                        onEdit={(gig) => handleOpenFormModal(gig)}
                    />
                ) : view === 'visualizations' ? (
                    <Visualizations gigs={gigs} />
                ) : view === 'monthlySummary' ? (
                    <MonthlySummary gigs={gigs} packages={packages} onSave={handleSaveGig} />
                ) : view === 'expenses' ? (
                    <ExpensesForecastTable 
                        expenses={expenses}
                        monthlyInstances={monthlyInstances}
                        gigs={gigs}
                        onAddExpense={handleSaveExpense}
                        onUpdateExpense={handleSaveExpense}
                        onDeleteExpense={(expense) => setExpenseToDelete(expense)}
                        onSaveMonthlyInstance={handleSaveMonthlyInstance}
                        onDeleteMonthlyInstance={handleDeleteMonthlyInstance}
                        onAddClick={() => {
                            setEditingExpense(null);
                            setIsExpenseModalOpen(true);
                        }}
                        onEditClick={(expense) => {
                            setEditingExpense(expense);
                            setIsExpenseModalOpen(true);
                        }}
                    />
                ) : view === 'expenseAnalytics' ? (
                    <ExpenseAnalytics 
                        expenses={expenses}
                        monthlyInstances={monthlyInstances}
                    />
                ) : view === 'packages' ? (
                    <PackagesManager
                        packages={packages}
                        gigs={gigs}
                        onAddPackage={() => {
                            setEditingPackage(null);
                            setIsPackageModalOpen(true);
                        }}
                        onEditPackage={(pkg) => {
                            setEditingPackage(pkg);
                            setIsPackageModalOpen(true);
                        }}
                        onDeletePackage={(pkg) => setPackageToDelete(pkg)}
                    />
                ) : (
                    <RewardsView
                        notes={rewardsNotes}
                        onAddNote={handleAddNote}
                        onUpdateNote={handleUpdateNote}
                        onDeleteNote={handleDeleteNote}
                    />
                )}
            </main>

            {isFormModalOpen && (
                <GigFormModal
                    gig={editingGig}
                    onClose={() => setIsFormModalOpen(false)}
                    onSave={handleSaveGig}
                    gigs={gigs}
                    packages={packages}
                />
            )}
            {isExpenseModalOpen && (
                <ExpenseFormModal
                    expense={editingExpense}
                    onClose={() => setIsExpenseModalOpen(false)}
                    onSave={handleSaveExpense}
                />
            )}
            {isPackageModalOpen && (
                <PackageFormModal
                    packageItem={editingPackage}
                    onClose={() => setIsPackageModalOpen(false)}
                    onSave={handleSavePackage}
                />
            )}

            {gigToDelete && (
                <ConfirmationModal
                    title="מחיקת אירוע"
                    message={`האם למחוק את "${gigToDelete.name}"? לא ניתן לשחזר פעולה זו.`}
                    onConfirm={handleDeleteGig}
                    onCancel={() => setGigToDelete(null)}
                />
            )}
             {expenseToDelete && (
                <ConfirmationModal
                    title="מחיקת הוצאה"
                    message={`האם למחוק את ההוצאה "${expenseToDelete.name}"?`}
                    onConfirm={handleDeleteExpense}
                    onCancel={() => setExpenseToDelete(null)}
                />
            )}
            {packageToDelete && (
                <ConfirmationModal
                    title="מחיקת חבילה"
                    message={`האם למחוק את החבילה "${packageToDelete.name}"? שים לב: אירועים המשויכים לחבילה זו יישארו אך הקישור יאבד.`}
                    onConfirm={handleDeletePackage}
                    onCancel={() => setPackageToDelete(null)}
                />
            )}
             {bulkGigsToDelete && (
                <ConfirmationModal
                    title={`מחיקת ${bulkGigsToDelete.length} אירועים`}
                    message={`האם אתה בטוח שברצונך למחוק ${bulkGigsToDelete.length} אירועים נבחרים? לא ניתן לשחזר פעולה זו.`}
                    onConfirm={handleBulkDelete}
                    onCancel={() => setBulkGigsToDelete(null)}
                />
            )}
            {gigForReminder && (
                <AIReminderModal
                    gig={gigForReminder}
                    onClose={() => setGigForReminder(null)}
                />
            )}
            {importStatus && (
                <ImportStatusModal
                    status={importStatus.status}
                    message={importStatus.message}
                    onClose={() => setImportStatusState(null)}
                />
            )}
            {importPreview && (
                <ImportPreviewModal
                    newGigsCount={importPreview.newGigs.length}
                    updatedGigsCount={importPreview.updatedGigs.length}
                    onConfirm={handleConfirmImport}
                    onCancel={() => setImportPreview(null)}
                />
            )}
            {toast && (
                <Toast
                    key={toast.key}
                    message={toast.message}
                    onUndo={toast.onUndo}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default App;

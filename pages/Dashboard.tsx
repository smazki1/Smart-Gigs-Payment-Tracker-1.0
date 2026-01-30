
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import DashboardComponent from '../components/Dashboard';
import TableView from '../components/TableView';
import Visualizations from '../components/Visualizations';
import MonthlySummary from '../components/MonthlySummary';
import ExpensesForecastTable from '../components/ExpensesForecastTable';
import ExpenseAnalytics from '../components/ExpenseAnalytics';
import PackagesManager from '../components/PackagesManager';
import RewardsView from '../components/RewardsView';

import {
    GigFormModal,
    PackageFormModal,
    AIReminderModal,
    ConfirmationModal,
    ImportPreviewModal,
    ImportStatusModal,
    ExpenseFormModal
} from '../components/Modals';

import {
    subscribeToGigs, addGig, updateGig, deleteGig,
    subscribeToExpenses, addExpense, updateExpense, deleteExpense,
    subscribeToPackages, addPackage, updatePackage, deletePackage,
    subscribeToMonthlyInstances, saveMonthlyInstance, deleteMonthlyInstance,
    subscribeToNotes, addNote, updateNote, deleteNote
} from '../services/firestoreService';

import { parseGigFromString } from '../services/geminiService';
import { Gig, Package, RecurringExpense, MonthlyExpenseInstance, ParsedGig, GigStatus, RewardNote } from '../types';
import { toast } from 'sonner';

export default function Dashboard() {
    // --- State ---
    const [currentView, setCurrentView] = useState<'dashboard' | 'table' | 'visualizations' | 'rewards' | 'monthlySummary' | 'expenses' | 'expenseAnalytics' | 'packages'>('dashboard');

    useEffect(() => {
        console.log("[DEBUG] Dashboard/GigManagement loaded - Fix Version 1.0.1");
    }, []);

    // Data
    const [gigs, setGigs] = useState<Gig[]>([]);
    const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [monthlyInstances, setMonthlyInstances] = useState<MonthlyExpenseInstance[]>([]);
    const [notes, setNotes] = useState<RewardNote[]>([]);

    // Modal States
    const [isGigModalOpen, setIsGigModalOpen] = useState(false);
    const [editingGig, setEditingGig] = useState<Gig | null>(null);

    const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<Package | null>(null);

    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [reminderGig, setReminderGig] = useState<Gig | null>(null);

    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);

    // Import States
    const [importCandidates, setImportCandidates] = useState<Gig[]>([]);
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importStatus, setImportStatus] = useState<{ status: 'error' | 'success', message: string } | null>(null);


    // --- Subscriptions ---
    useEffect(() => {
        const unsubGigs = subscribeToGigs(setGigs);
        const unsubExpenses = subscribeToExpenses(setExpenses);
        const unsubPackages = subscribeToPackages(setPackages);
        const unsubInstances = subscribeToMonthlyInstances(setMonthlyInstances);
        const unsubNotes = subscribeToNotes(setNotes);

        return () => {
            unsubGigs();
            unsubExpenses();
            unsubPackages();
            unsubInstances();
            unsubNotes();
        };
    }, []);


    // --- Handlers ---

    // Navigation
    const handleNavigate = (view: typeof currentView) => {
        setCurrentView(view);
    };

    // Gigs
    const handleAddGigModal = (date?: string) => {
        setEditingGig(date ? { eventDate: date } as Gig : null);
        setIsGigModalOpen(true);
    };

    const handleEditGig = (gig: Gig) => {
        setEditingGig(gig);
        setIsGigModalOpen(true);
    };

    const handleSaveGig = async (gigData: Partial<Gig>) => {
        try {
            // Handle both existing ID (from direct edit) or editingGig state
            const idToUpdate = gigData.id || (editingGig && editingGig.id);

            if (idToUpdate) {
                try {
                    await updateGig(idToUpdate, gigData);
                    toast.success('האירוע עודכן בהצלחה');
                } catch (error: any) {
                    console.error("Update gig error details:", {
                        code: error.code,
                        message: error.message,
                        toString: error.toString()
                    });

                    const errorStr = error.toString();
                    // Check for various forms of "document not found"
                    const isNotFoundError =
                        error.code === 'not-found' ||
                        (error.message && error.message.includes('No document to update')) ||
                        errorStr.includes('No document to update');

                    if (isNotFoundError) {
                        console.warn('Document not found for update, creating new Instead:', idToUpdate);
                        const { id, ...dataToSave } = gigData; // Strip the bad ID
                        await addGig(dataToSave as Omit<Gig, 'id'>);
                        toast.success('האירוע נוסף מחדש (לא נמצא המקור)');
                    } else {
                        throw error;
                    }
                }
            } else {
                await addGig(gigData as Omit<Gig, 'id'>);
                toast.success('האירוע נוסף בהצלחה');
            }
            setIsGigModalOpen(false);
            setEditingGig(null);
        } catch (error) {
            console.error("Save gig error:", error);
            toast.error('שגיאה בשמירת האירוע');
        }
    };

    // For TableView direct add
    const handleDirectAddGig = async (gig: Gig) => {
        try {
            const { id, ...gigData } = gig; // Strip client-generated ID if needed, but keeping it is fine too if we mapped it. 
            // Better to let firestore generate ID or use the one we have? 
            // addGig expects Omit<Gig, 'id'>, so we strip it.
            await addGig(gigData);
            toast.success('האירוע נוסף בהצלחה');
        } catch (error) {
            console.error("Direct add gig error:", error);
            toast.error('שגיאה בהוספת האירוע');
        }
    };

    const handleDeleteGig = async (gig: Gig) => {
        if (confirm('האם אתה בטוח שברצונך למחוק אירוע זה?')) {
            try {
                await deleteGig(gig.id);
                toast.success('האירוע נמחק');
            } catch (error) {
                console.error("Delete gig error:", error);
                toast.error('שגיאה במחיקת האירוע');
            }
        }
    };

    const handleMarkAsPaid = async (gig: Gig) => {
        try {
            await updateGig(gig.id, { status: GigStatus.Paid });
            toast.success('האירוע סומן כשולם');
        } catch (error) {
            console.error("Mark paid error:", error);
            toast.error('שגיאה בעדכון סטטוס');
        }
    };

    const handleReschedule = async (gigId: string, newDate: string) => {
        try {
            await updateGig(gigId, { eventDate: newDate });
            toast.success('מועד האירוע שונה בהצלחה');
        } catch (error) {
            console.error("Reschedule error:", error);
            toast.error('שגיאה בשינוי מועד האירוע');
        }
    };

    const handleBulkMarkAsPaid = async (ids: string[]) => {
        try {
            const promises = ids.map(id => updateGig(id, { status: GigStatus.Paid }));
            await Promise.all(promises);
            toast.success(`${ids.length} אירועים סומנו כשולמו`);
        } catch (error) {
            console.error("Bulk paid error:", error);
            toast.error('שגיאה בעדכון מרובה');
        }
    };

    const handleBulkDelete = async (ids: string[]) => {
        if (confirm(`האם אתה בטוח שברצונך למחוק ${ids.length} אירועים?`)) {
            try {
                const promises = ids.map(id => deleteGig(id));
                await Promise.all(promises);
                toast.success(`${ids.length} אירועים נמחקו`);
            } catch (error) {
                console.error("Bulk delete error:", error);
                toast.error('שגיאה במחיקה מרובה');
            }
        }
    };

    const handleSmartAdd = (parsed: ParsedGig) => {
        const newGig: Partial<Gig> = {
            name: parsed.name,
            paymentAmount: parsed.paymentAmount,
            eventDate: parsed.eventDate,
            status: GigStatus.Pending,
            createdAt: new Date().toISOString(),
        };
        setEditingGig(newGig as Gig);
        setIsGigModalOpen(true);
    };

    const handleAIReminder = (gig: Gig) => {
        setReminderGig(gig);
        setIsReminderModalOpen(true);
    };

    // Packages
    const handleAddPackage = () => {
        setEditingPackage(null);
        setIsPackageModalOpen(true);
    };

    const handleEditPackage = (pkg: Package) => {
        setEditingPackage(pkg);
        setIsPackageModalOpen(true);
    };

    const handleSavePackage = async (pkg: Package) => {
        try {
            if (editingPackage && editingPackage.id) {
                await updatePackage(editingPackage.id, pkg);
                toast.success('החבילה עודכנה בהצלחה');
            } else {
                await addPackage(pkg);
                toast.success('החבילה נוספה בהצלחה');
            }
            setIsPackageModalOpen(false);
            setEditingPackage(null);
        } catch (error) {
            console.error("Save package error:", error);
            toast.error('שגיאה בשמירת החבילה');
        }
    };

    const handleDeletePackage = async (pkg: Package) => {
        if (confirm('האם אתה בטוח שברצונך למחוק חבילה זו?')) {
            try {
                await deletePackage(pkg.id);
                toast.success('החבילה נמחקה');
            } catch (error) {
                console.error("Delete package error:", error);
                toast.error('שגיאה במחיקת החבילה');
            }
        }
    };

    // Expenses
    const handleAddExpense = () => {
        setEditingExpense(null);
        setIsExpenseModalOpen(true);
    };

    const handleEditExpense = (expense: RecurringExpense) => {
        setEditingExpense(expense);
        setIsExpenseModalOpen(true);
    };

    const handleSaveExpense = async (expense: RecurringExpense) => {
        try {
            if (editingExpense && editingExpense.id) {
                await updateExpense(editingExpense.id, expense);
                toast.success('ההוצאה עודכנה בהצלחה');
            } else {
                await addExpense(expense);
                toast.success('ההוצאה נוספה בהצלחה');
            }
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
        } catch (error) {
            console.error("Save expense error:", error);
            toast.error('שגיאה בשמירת ההוצאה');
        }
    };

    const handleDeleteExpense = async (expense: RecurringExpense) => {
        if (confirm('האם אתה בטוח שברצונך למחוק הוצאה זו?')) {
            try {
                await deleteExpense(expense.id);
                toast.success('ההוצאה נמחקה');
            } catch (error) {
                console.error("Delete expense error:", error);
                toast.error('שגיאה במחיקת ההוצאה');
            }
        }
    };

    const handleSaveMonthlyInstance = async (instance: MonthlyExpenseInstance) => {
        try {
            await saveMonthlyInstance(instance);
            toast.success('חריגה נשמרה בהצלחה');
        } catch (error) {
            console.error("Save monthly instance error:", error);
            toast.error('שגיאה בשמירת הנתונים');
        }
    };

    const handleDeleteMonthlyInstance = async (recurringId: string, monthKey: string) => {
        try {
            const instance = monthlyInstances.find(i => i.sourceRecurringExpenseId === recurringId && i.monthKey === monthKey);
            if (instance && instance.id) {
                await deleteMonthlyInstance(instance.id);
                toast.success('החריגה בוטלה');
            }
        } catch (error) {
            console.error("Delete monthly instance error:", error);
            toast.error('שגיאה בביטול החריגה');
        }
    };


    // Rewards / Notes
    const handleAddNote = async () => {
        try {
            await addNote({
                content: '',
                color: 'bg-yellow-100 dark:bg-yellow-900/20'
            });
        } catch (error) {
            console.error("Add note error:", error);
        }
    };

    const handleUpdateNote = async (id: string, content: string) => {
        try {
            await updateNote(id, content);
        } catch (error) {
            // Debounce or silent error might be better for real-time typing
            console.error("Update note error:", error);
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (confirm('למחוק פתקית זו?')) {
            try {
                await deleteNote(id);
                toast.success('הפתקית נמחקה');
            } catch (error) {
                console.error("Delete note error:", error);
                toast.error('שגיאה במחיקה');
            }
        }
    };

    // Import Flow
    const handlePreviewImport = (importedGigs: Gig[]) => {
        setImportCandidates(importedGigs);
        setIsImportPreviewOpen(true);
    };

    const handleImportConfirm = async () => {
        try {
            // Determine which to add and which to update (if we had ID logic, but CSV usually new)
            // Assuming all are new for now unless logic in helper says otherwise. 
            // In helper loop: we assigned them temporary logic or just data.
            // Let's assume they are new insertions.
            const promises = importCandidates.map(gig => addGig(gig)); // addGig strips ID
            await Promise.all(promises);

            setIsImportPreviewOpen(false);
            setImportStatus({ status: 'success', message: `${importCandidates.length} אירועים יובאו בהצלחה!` });
            setImportCandidates([]);
        } catch (error) {
            console.error("Import error:", error);
            setIsImportPreviewOpen(false);
            setImportStatus({ status: 'error', message: 'אירעה שגיאה במהלך הייבוא.' });
        }
    };

    const handleSetImportError = (message: string) => {
        setImportStatus({ status: 'error', message });
    };

    // --- Render View Switcher ---
    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return (
                    <DashboardComponent
                        gigs={gigs}
                        expenses={expenses}
                        monthlyInstances={monthlyInstances}
                        packages={packages}
                        onAdd={handleAddGigModal}
                        onEdit={handleEditGig}
                        onSave={handleSaveGig}
                        onDelete={handleDeleteGig}
                        onMarkAsPaid={handleMarkAsPaid}
                        onAIReminder={handleAIReminder}
                        onSmartAdd={handleSmartAdd}
                        onReschedule={handleReschedule}
                        onBulkMarkAsPaid={handleBulkMarkAsPaid}
                        onBulkDelete={handleBulkDelete}
                        onAddPackage={handleAddPackage}
                        onEditPackage={handleEditPackage}
                        onDeletePackage={handleDeletePackage}
                    />
                );
            case 'table':
                return (
                    <TableView
                        gigs={gigs}
                        onSave={handleSaveGig}
                        onAdd={handleDirectAddGig}
                        onDelete={handleDeleteGig}
                        onEdit={handleEditGig}
                    />
                );
            case 'visualizations':
                return (
                    <Visualizations
                        gigs={gigs}
                        packages={packages}
                    />
                );
            case 'monthlySummary':
                return (
                    <MonthlySummary
                        gigs={gigs}
                        packages={packages}
                        onSave={handleSaveGig}
                    />
                );
            case 'expenses':
                return (
                    <ExpensesForecastTable
                        expenses={expenses}
                        monthlyInstances={monthlyInstances}
                        gigs={gigs}
                        packages={packages}
                        onAddExpense={handleSaveExpense}
                        onUpdateExpense={handleSaveExpense}
                        onDeleteExpense={handleDeleteExpense}
                        onSaveMonthlyInstance={handleSaveMonthlyInstance}
                        onDeleteMonthlyInstance={handleDeleteMonthlyInstance}
                        onAddClick={handleAddExpense}
                        onEditClick={handleEditExpense}
                    />
                );
            case 'expenseAnalytics':
                return (
                    <ExpenseAnalytics
                        expenses={expenses}
                        monthlyInstances={monthlyInstances}
                    />
                );
            case 'packages':
                return (
                    <PackagesManager
                        packages={packages}
                        gigs={gigs}
                        onAddPackage={handleAddPackage}
                        onEditPackage={handleEditPackage}
                        onDeletePackage={handleDeletePackage}
                    />
                );
            case 'rewards':
                return (
                    <RewardsView
                        notes={notes}
                        onAddNote={handleAddNote}
                        onUpdateNote={handleUpdateNote}
                        onDeleteNote={handleDeleteNote}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground rtl:text-right font-sans" dir="rtl">
            <Header
                gigs={gigs}
                onPreviewImport={handlePreviewImport}
                setImportError={handleSetImportError}
                currentView={currentView}
                onNavigate={handleNavigate}
            />

            <main>
                {renderContent()}
            </main>

            {/* --- MODALS --- */}

            {(isGigModalOpen || editingGig) && (
                <GigFormModal
                    // @ts-ignore
                    gig={editingGig}
                    gigs={gigs}
                    packages={packages}
                    onClose={() => { setIsGigModalOpen(false); setEditingGig(null); }}
                    onSave={(gig) => handleSaveGig(gig)}
                />
            )}

            {(isPackageModalOpen || editingPackage) && (
                <PackageFormModal
                    packageItem={editingPackage}
                    onClose={() => { setIsPackageModalOpen(false); setEditingPackage(null); }}
                    onSave={handleSavePackage}
                />
            )}

            {isReminderModalOpen && reminderGig && (
                <AIReminderModal
                    gig={reminderGig}
                    onClose={() => { setIsReminderModalOpen(false); setReminderGig(null); }}
                />
            )}

            {(isExpenseModalOpen || editingExpense) && (
                <ExpenseFormModal
                    expense={editingExpense}
                    onClose={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }}
                    onSave={handleSaveExpense}
                />
            )}

            {isImportPreviewOpen && (
                <ImportPreviewModal
                    newGigsCount={importCandidates.length}
                    updatedGigsCount={0} // Logic for update detection not implemented in basic CSV
                    onConfirm={handleImportConfirm}
                    onCancel={() => { setIsImportPreviewOpen(false); setImportCandidates([]); }}
                />
            )}

            {importStatus && (
                <ImportStatusModal
                    status={importStatus.status}
                    message={importStatus.message}
                    onClose={() => setImportStatus(null)}
                />
            )}
        </div>
    );
}

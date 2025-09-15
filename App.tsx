
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Gig, ParsedGig } from './types';
import { GigStatus } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TableView from './components/TableView';
import Visualizations from './components/Visualizations';
import { GigFormModal, ConfirmationModal, AIReminderModal, ImportStatusModal, ImportPreviewModal } from './components/Modals';

// Mock data for initial load in Hebrew
const getInitialGigs = (): Gig[] => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15).toISOString().split('T')[0];
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 10).toISOString().split('T')[0];
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5).toISOString().split('T')[0];
    
    return [
        { id: '1', name: 'סדנת AI', supplierName: 'חברת אקמי', paymentAmount: 4000, eventDate: thisMonth, paymentDueDate: new Date(new Date(thisMonth).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: GigStatus.Pending, createdAt: new Date().toISOString(), notes: 'הלקוח ביקש להתמקד ב-GenAI' },
        { id: '2', name: 'ספרינט עיצוב', supplierName: 'אינובייט בע"מ', paymentAmount: 7500, eventDate: lastMonth, paymentDueDate: new Date(new Date(lastMonth).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: GigStatus.Paid, createdAt: new Date().toISOString(), invoiceNumber: '2024-001' },
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
    
    const [view, setView] = useState<'dashboard' | 'table' | 'visualizations'>('dashboard');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingGig, setEditingGig] = useState<Gig | null>(null);
    const [gigToDelete, setGigToDelete] = useState<Gig | null>(null);
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

    const handleOpenFormModal = useCallback((gig: Gig | null = null, defaultDate?: string) => {
        setEditingGig(gig);
        if(!gig && defaultDate) {
            const tempGig: Gig = { 
                id: '', name: '', paymentAmount: 0, 
                eventDate: defaultDate, paymentDueDate: defaultDate,
                status: GigStatus.Pending, createdAt: '' 
            };
            setEditingGig(tempGig);
        }
        setIsFormModalOpen(true);
    }, []);

    const handleSaveGig = useCallback((gigToSave: Partial<Gig> & { id: string }) => {
        setGigs(prevGigs => {
            const exists = prevGigs.some(g => g.id === gigToSave.id);
            if (exists) {
                return prevGigs.map(g => g.id === gigToSave.id ? { ...g, ...gigToSave } : g);
            }
            return [...prevGigs, gigToSave as Gig];
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

    const handleMarkAsPaid = useCallback((gigToUpdate: Gig) => {
        handleSaveGig({ id: gigToUpdate.id, status: GigStatus.Paid });
    }, [handleSaveGig]);
    
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
            id: gigId,
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
                        onAdd={(date) => handleOpenFormModal(null, date)}
                        onEdit={(gig) => handleOpenFormModal(gig)}
                        onSave={handleSaveGig}
                        onDelete={(gig) => setGigToDelete(gig)}
                        onMarkAsPaid={handleMarkAsPaid}
                        onAIReminder={(gig) => setGigForReminder(gig)}
                        onSmartAdd={handleSmartAdd}
                        onReschedule={handleReschedule}
                    />
                ) : view === 'table' ? (
                    <TableView
                        gigs={gigs}
                        onSave={handleSaveGig}
                        onAdd={handleAddNewGig}
                        onDelete={(gig) => setGigToDelete(gig)}
                        onEdit={(gig) => handleOpenFormModal(gig)}
                    />
                ) : (
                    <Visualizations gigs={gigs} />
                )}
            </main>

            {isFormModalOpen && (
                <GigFormModal
                    gig={editingGig}
                    onClose={() => setIsFormModalOpen(false)}
                    onSave={(gig) => {
                        if (gig.id && gigs.some(g => g.id === gig.id)) {
                             handleSaveGig(gig)
                        } else {
                            handleAddNewGig(gig)
                        }
                    }}
                    gigs={gigs}
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

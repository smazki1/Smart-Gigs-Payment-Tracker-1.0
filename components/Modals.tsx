
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Gig, FileAttachment } from '../types';
import { GigStatus } from '../types';
import { generateReminderEmail } from '../services/geminiService';
import { XMarkIcon, TrashIcon, PaperClipIcon, InformationCircleIcon } from './icons';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ children, onClose, title }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg transform transition-all animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};


interface GigFormModalProps {
    gig: Gig | null;
    onClose: () => void;
    onSave: (gig: Gig) => void;
    gigs: Gig[];
}

type FormData = Omit<Gig, 'id' | 'createdAt' | 'status' | 'attachments'> & { attachments: FileAttachment[] };


export const GigFormModal: React.FC<GigFormModalProps> = ({ gig, onClose, onSave, gigs }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        supplierName: '',
        paymentAmount: 0,
        eventDate: new Date().toISOString().split('T')[0],
        paymentDueDate: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        notes: '',
        attachments: [],
    });
    const [showConflictModal, setShowConflictModal] = useState(false);

    useEffect(() => {
        if (gig) {
            setFormData({
                name: gig.name || '',
                supplierName: gig.supplierName || '',
                paymentAmount: gig.paymentAmount || 0,
                eventDate: gig.eventDate || new Date().toISOString().split('T')[0],
                paymentDueDate: gig.paymentDueDate || new Date().toISOString().split('T')[0],
                invoiceNumber: gig.invoiceNumber || '',
                notes: gig.notes || '',
                attachments: gig.attachments || [],
            });
        } else {
             const today = new Date().toISOString().split('T')[0];
             setFormData({ name: '', supplierName: '', paymentAmount: 0, eventDate: today, paymentDueDate: today, invoiceNumber: '', notes: '', attachments: [] });
        }
    }, [gig]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    const dataUrl = loadEvent.target?.result as string;
                    const newAttachment: FileAttachment = { name: file.name, type: file.type, dataUrl };
                    setFormData(prev => ({...prev, attachments: [...prev.attachments, newAttachment]}));
                };
                reader.readAsDataURL(file);
            });
        }
    };
    
    const removeAttachment = (index: number) => {
        setFormData(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== index)}));
    };

    const handleSave = () => {
        const gigToSave: Gig = {
            id: gig?.id || crypto.randomUUID(),
            createdAt: gig?.createdAt || new Date().toISOString(),
            status: gig?.status || GigStatus.Pending,
            ...formData,
        };
        onSave(gigToSave);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isEditing = !!gig?.id;
        const dateChanged = isEditing && gig.eventDate !== formData.eventDate;

        if (!isEditing || dateChanged) {
            const conflict = gigs.some(g => g.eventDate === formData.eventDate && g.id !== gig?.id);
            if (conflict) {
                setShowConflictModal(true);
                return;
            }
        }
        handleSave();
    };

    return (
        <>
            <Modal title={gig && gig.id ? 'עריכת אירוע' : 'הוספת אירוע חדש'} onClose={onClose}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">שם האירוע</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" required />
                    </div>
                     <div>
                        <label htmlFor="supplierName" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">שם הספק (המשלם)</label>
                        <input type="text" name="supplierName" id="supplierName" value={formData.supplierName} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="paymentAmount" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">סכום לתשלום (₪)</label>
                        <input type="number" name="paymentAmount" id="paymentAmount" value={formData.paymentAmount} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="eventDate" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">תאריך אירוע</label>
                            <input type="date" name="eventDate" id="eventDate" value={formData.eventDate} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" required />
                        </div>
                        <div>
                            <label htmlFor="paymentDueDate" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">תאריך יעד לתשלום</label>
                            <input type="date" name="paymentDueDate" id="paymentDueDate" value={formData.paymentDueDate} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" required />
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-gray-700">
                         <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">פרטים נוספים</h4>
                         <div>
                            <label htmlFor="invoiceNumber" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">מספר חשבונית</label>
                            <input type="text" name="invoiceNumber" id="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="notes" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">הערות</label>
                            <textarea name="notes" id="notes" rows={3} value={formData.notes} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"></textarea>
                        </div>
                         <div>
                            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">קבצים מצורפים</label>
                            <div className="space-y-2">
                                {formData.attachments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-slate-100 dark:bg-gray-700/50 p-2 rounded-lg">
                                        <a href={file.dataUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 dark:text-primary-400 hover:underline truncate flex items-center gap-2">
                                            <PaperClipIcon className="w-4 h-4" />
                                            {file.name}
                                        </a>
                                        <button type="button" onClick={() => removeAttachment(index)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-sm font-medium text-primary-600 hover:underline">העלה קובץ</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">ביטול</button>
                        <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">שמירה</button>
                    </div>
                </form>
            </Modal>

            {showConflictModal && (
                <ConfirmationModal
                    title="התנגשות תאריכים"
                    message="קיים אירוע אחר בתאריך זה. האם להמשיך בכל זאת?"
                    onConfirm={() => {
                        handleSave();
                        setShowConflictModal(false);
                    }}
                    onCancel={() => setShowConflictModal(false)}
                />
            )}
        </>
    );
};

interface ConfirmationModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel }) => (
    <Modal title={title} onClose={onCancel}>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-3 rtl:space-x-reverse">
            <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">ביטול</button>
            <button onClick={onConfirm} className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">אישור</button>
        </div>
    </Modal>
);

interface AIReminderModalProps {
    gig: Gig;
    onClose: () => void;
}

export const AIReminderModal: React.FC<AIReminderModalProps> = ({ gig, onClose }) => {
    const [reminder, setReminder] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchReminder = useCallback(async () => {
        setIsLoading(true);
        const emailText = await generateReminderEmail(gig);
        setReminder(emailText);
        setIsLoading(false);
    }, [gig]);

    useEffect(() => {
        fetchReminder();
    }, [fetchReminder]);

    const spinner = (
        <div className="flex justify-center items-center h-48">
            <svg className="animate-spin h-10 w-10 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );

    return (
        <Modal title={`תזכורת AI עבור ${gig.name}`} onClose={onClose}>
            {isLoading ? spinner : (
                <div className="space-y-4">
                    <textarea value={reminder} onChange={(e) => setReminder(e.target.value)} rows={12} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700/50 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white whitespace-pre-wrap leading-relaxed"></textarea>
                    <div className="flex justify-end">
                        <button onClick={() => { navigator.clipboard.writeText(reminder); onClose(); }} className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">העתק וסגור</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};


interface ImportStatusModalProps {
  status: 'importing' | 'success' | 'error';
  message: string;
  onClose: () => void;
}

export const ImportStatusModal: React.FC<ImportStatusModalProps> = ({ status, message, onClose }) => {
  return (
    <Modal title="ייבוא קובץ CSV" onClose={onClose}>
      <div className="text-center p-4">
        {status === 'importing' && (
           <div className="flex justify-center items-center mb-4">
             <svg className="animate-spin h-12 w-12 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        <p className="text-lg text-gray-700 dark:text-gray-200">{message}</p>
        {(status === 'success' || status === 'error') && (
           <button onClick={onClose} className="mt-6 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">סגור</button>
        )}
      </div>
    </Modal>
  );
};

interface ImportPreviewModalProps {
    newGigsCount: number;
    updatedGigsCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ newGigsCount, updatedGigsCount, onConfirm, onCancel }) => {
    return (
        <Modal title="תצוגה מקדימה של הייבוא" onClose={onCancel}>
            <div className="space-y-4 text-gray-700 dark:text-gray-200">
                <p>הקובץ נסרק בהצלחה. להלן סיכום השינויים המוצעים:</p>
                <ul className="list-disc list-inside space-y-2 pl-4 bg-slate-100 dark:bg-gray-700/50 p-4 rounded-lg">
                    <li><span className="font-bold">{newGigsCount}</span> אירועים חדשים יתווספו.</li>
                    <li><span className="font-bold">{updatedGigsCount}</span> אירועים קיימים יעודכנו.</li>
                </ul>
                <div className="flex items-start gap-3 text-sm text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                    <InformationCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p>שים לב: תהליך המיזוג יוסיף ויעדכן נתונים. **אף אירוע קיים לא יימחק**.</p>
                </div>
            </div>
             <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-6">
                <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">ביטול</button>
                <button onClick={onConfirm} className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">אשר מיזוג נתונים</button>
            </div>
        </Modal>
    );
};

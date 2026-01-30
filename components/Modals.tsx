
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Gig, FileAttachment, RecurringExpense, MonthlyExpenseInstance, Package } from '../types';
import { GigStatus } from '../types';
import { generateReminderEmail } from '../services/geminiService';
import { uploadAttachment } from '../services/storageService';
import { XMarkIcon, TrashIcon, PaperClipIcon, InformationCircleIcon, CheckCircleIcon } from './icons';

const AVAILABLE_COLORS = [
    { name: 'אדום', value: 'bg-red-500', border: 'border-red-500' },
    { name: 'זהב', value: 'bg-amber-500', border: 'border-amber-500' },
    { name: 'ירוק', value: 'bg-emerald-500', border: 'border-emerald-500' },
    { name: 'טורקיז', value: 'bg-cyan-500', border: 'border-cyan-500' },
    { name: 'כחול', value: 'bg-blue-500', border: 'border-blue-500' },
    { name: 'סגול', value: 'bg-purple-500', border: 'border-purple-500' },
    { name: 'וורוד', value: 'bg-pink-500', border: 'border-pink-500' },
    { name: 'אפור', value: 'bg-slate-500', border: 'border-slate-500' },
];

interface ColorPickerProps {
    selectedColor?: string;
    onSelect: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onSelect }) => {
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {AVAILABLE_COLORS.map((color) => (
                <button
                    key={color.value}
                    type="button"
                    onClick={() => onSelect(color.value === selectedColor ? '' : color.value)}
                    className={`w-8 h-8 rounded-full ${color.value} transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-2 ${selectedColor === color.value ? 'ring-gray-600 dark:ring-gray-300 scale-110' : 'ring-transparent'}`}
                    title={color.name}
                >
                    {selectedColor === color.value && <CheckCircleIcon className="w-5 h-5 text-white mx-auto" />}
                </button>
            ))}
        </div>
    );
};

interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
    title: string;
    accentColor?: string;
}

const Modal: React.FC<ModalProps> = ({ children, onClose, title, accentColor }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Find the matching color object to get the border class safely
    const colorObj = AVAILABLE_COLORS.find(c => c.value === accentColor);
    const borderClass = colorObj ? colorObj.border : 'border-transparent';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg transform transition-all animate-slide-up border-t-8 ${borderClass}`} onClick={(e) => e.stopPropagation()}>
                <div className={`flex justify-between items-center p-4 border-b border-slate-200 dark:border-gray-700 ${accentColor ? 'bg-slate-50 dark:bg-gray-700/30' : ''}`}>
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

// --- Confirmation Modal ---

interface ConfirmationModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel }) => (
    <Modal title={title} onClose={onCancel}>
        <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">{message}</p>
            <div className="flex justify-end gap-3 pt-2">
                <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">ביטול</button>
                <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">אישור</button>
            </div>
        </div>
    </Modal>
);

// --- Gig Form Modal ---

interface GigFormModalProps {
    gig: Gig | null;
    onClose: () => void;
    onSave: (gig: Gig) => void;
    gigs: Gig[];
    packages?: Package[];
}

type FormData = Omit<Gig, 'id' | 'createdAt' | 'status' | 'attachments'> & { attachments: FileAttachment[], billingType: 'per_event' | 'package' };


export const GigFormModal: React.FC<GigFormModalProps> = ({ gig, onClose, onSave, gigs, packages = [] }) => {
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
        duration: undefined,
        summary: '',
        packageId: undefined,
        usageType: undefined,

        billingType: 'per_event',
        backgroundColor: ''
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
                duration: gig.duration,
                summary: gig.summary || '',
                packageId: gig.packageId,
                usageType: gig.usageType,

                billingType: gig.packageId ? 'package' : 'per_event',
                backgroundColor: gig.backgroundColor || ''
            });
        } else {
            const today = new Date().toISOString().split('T')[0];
            setFormData({ name: '', supplierName: '', paymentAmount: 0, eventDate: today, paymentDueDate: today, invoiceNumber: '', notes: '', attachments: [], duration: undefined, summary: '', billingType: 'per_event', backgroundColor: '' });
        }
    }, [gig]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.currentTarget;
        if ((e.currentTarget as HTMLInputElement).type === 'number') {
            const parsedValue = parseFloat(value);
            if (name === 'paymentAmount') {
                setFormData(prev => ({ ...prev, paymentAmount: isNaN(parsedValue) ? 0 : parsedValue }));
            } else {
                setFormData(prev => ({ ...prev, [name]: isNaN(parsedValue) ? undefined : parsedValue }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pkgId = e.target.value;
        const selectedPkg = packages.find(p => p.id === pkgId);

        setFormData(prev => ({
            ...prev,
            packageId: pkgId,
            // Auto-fill supplier name from package if selected
            supplierName: selectedPkg ? selectedPkg.clientName : prev.supplierName
        }));
    };

    const handleBillingTypeChange = (type: 'per_event' | 'package') => {
        setFormData(prev => ({
            ...prev,
            billingType: type,
            paymentAmount: type === 'package' ? 0 : prev.paymentAmount,
            packageId: type === 'per_event' ? undefined : prev.packageId,
            usageType: type === 'per_event' ? undefined : (prev.usageType || 'workshop')
        }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            try {
                // Upload all selected files
                const uploadedAttachments = await Promise.all(files.map(async (file) => {
                    const url = await uploadAttachment(file);
                    return {
                        name: file.name,
                        type: file.type,
                        dataUrl: url
                    };
                }));

                setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...uploadedAttachments] }));
            } catch (error) {
                console.error("Upload failed", error);
                alert("שגיאה בהעלאת קבצים");
            }
        }
    };

    const removeAttachment = (index: number) => {
        setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
    };

    const handleSave = () => {
        const gigToSave: Gig = {
            id: gig?.id || crypto.randomUUID(),
            createdAt: gig?.createdAt || new Date().toISOString(),
            status: gig?.status || GigStatus.Pending,
            name: formData.name,
            supplierName: formData.supplierName,
            paymentAmount: formData.billingType === 'package' ? 0 : formData.paymentAmount,
            eventDate: formData.eventDate,
            paymentDueDate: formData.paymentDueDate,
            invoiceNumber: formData.invoiceNumber,
            notes: formData.notes,
            attachments: formData.attachments,
            duration: formData.duration,
            summary: formData.summary,
            packageId: formData.billingType === 'package' ? formData.packageId : undefined,
            usageType: formData.billingType === 'package' ? formData.usageType : undefined,
            backgroundColor: formData.backgroundColor,
        };
        onSave(gigToSave);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validation
        if (formData.billingType === 'package') {
            if (!formData.packageId) {
                alert('נא לבחור חבילה');
                return;
            }
            if (!formData.usageType) {
                alert('נא לבחור סוג חיוב מהחבילה');
                return;
            }
        }

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
            <Modal title={gig && gig.id ? 'עריכת אירוע' : 'הוספת אירוע חדש'} onClose={onClose} accentColor={formData.backgroundColor}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">שם האירוע</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" required />
                    </div>
                    <div>
                        <label htmlFor="supplierName" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">שם הספק (המשלם)</label>
                        <input type="text" name="supplierName" id="supplierName" value={formData.supplierName} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                    </div>

                    {/* Billing Type Toggle */}
                    <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">סוג חיוב</label>
                        <div className="flex rounded-md shadow-sm" role="group">
                            <button
                                type="button"
                                onClick={() => handleBillingTypeChange('per_event')}
                                className={`px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-r-lg ${formData.billingType === 'per_event' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                חיוב לפי אירוע
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBillingTypeChange('package')}
                                className={`px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-l-lg ${formData.billingType === 'package' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                שיוך לחבילה
                            </button>
                        </div>

                        {formData.billingType === 'package' ? (
                            <div className="mt-4 space-y-3 animate-fade-in">
                                <div>
                                    <label htmlFor="packageId" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">בחר חבילה</label>
                                    <select
                                        name="packageId"
                                        id="packageId"
                                        value={formData.packageId || ''}
                                        onChange={handlePackageChange}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="">-- בחר חבילה --</option>
                                        {packages.map(pkg => (
                                            <option key={pkg.id} value={pkg.id}>{pkg.name} - {pkg.clientName}</option>
                                        ))}
                                    </select>
                                    {packages.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">לא קיימות חבילות פעילות במערכת.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">סוג ניצול</label>
                                    <div className="flex gap-4">
                                        <label className="inline-flex items-center">
                                            <input type="radio" name="usageType" value="workshop" checked={formData.usageType === 'workshop'} onChange={() => setFormData(prev => ({ ...prev, usageType: 'workshop' }))} className="form-radio text-primary-600" />
                                            <span className="mr-2 text-gray-700 dark:text-gray-300">סדנה (מתוך מכסה)</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input type="radio" name="usageType" value="consulting" checked={formData.usageType === 'consulting'} onChange={() => setFormData(prev => ({ ...prev, usageType: 'consulting' }))} className="form-radio text-primary-600" />
                                            <span className="mr-2 text-gray-700 dark:text-gray-300">שעות (מתוך בנק)</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-xs text-blue-800 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800">
                                    <InformationCircleIcon className="w-4 h-4 inline ml-1" />
                                    המחיר לאירוע זה יוגדר כ-0 ₪ כי הוא משולם במסגרת החבילה.
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 animate-fade-in">
                                <label htmlFor="paymentAmount" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">סכום לתשלום (₪)</label>
                                <input type="number" name="paymentAmount" id="paymentAmount" value={formData.paymentAmount} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" required />
                            </div>
                        )}
                    </div>


                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">צבע כרטיסייה</label>
                        <ColorPicker selectedColor={formData.backgroundColor} onSelect={(color) => setFormData(prev => ({ ...prev, backgroundColor: color }))} />
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
                            <label htmlFor="duration" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">משך (בשעות)</label>
                            <input type="number" name="duration" id="duration" value={formData.duration || ''} onChange={handleChange} placeholder="לדוגמה: 4" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="summary" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">סיכום ותובנות</label>
                            <textarea name="summary" id="summary" rows={3} value={formData.summary} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"></textarea>
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
            </Modal >

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
            )
            }
        </>
    );
};

// --- AI Reminder Modal ---

interface AIReminderModalProps {
    gig: Gig;
    onClose: () => void;
}

export const AIReminderModal: React.FC<AIReminderModalProps> = ({ gig, onClose }) => {
    const [emailContent, setEmailContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        generateReminderEmail(gig).then(content => {
            setEmailContent(content);
            setLoading(false);
        });
    }, [gig]);

    const handleCopy = () => {
        navigator.clipboard.writeText(emailContent);
        alert('התוכן הועתק ללוח!');
        onClose();
    };

    return (
        <Modal title="תזכורת תשלום (AI)" onClose={onClose}>
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">מייצר ניסוח...</p>
                    </div>
                ) : (
                    <>
                        <textarea
                            className="w-full h-64 p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={emailContent}
                            onChange={(e) => setEmailContent(e.target.value)}
                        />
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">סגור</button>
                            <button onClick={handleCopy} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">העתק וסגור</button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

// --- Import Status Modal ---

interface ImportStatusModalProps {
    status: 'error' | 'success';
    message: string;
    onClose: () => void;
}

export const ImportStatusModal: React.FC<ImportStatusModalProps> = ({ status, message, onClose }) => (
    <Modal title={status === 'success' ? 'ייבוא הושלם' : 'שגיאה בייבוא'} onClose={onClose}>
        <div className="space-y-4 text-center">
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                {status === 'success' ? (
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                ) : (
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                )}
            </div>
            <p className="text-gray-700 dark:text-gray-300">{message}</p>
            <button onClick={onClose} className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">סגור</button>
        </div>
    </Modal>
);

// --- Import Preview Modal ---

interface ImportPreviewModalProps {
    newGigsCount: number;
    updatedGigsCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ newGigsCount, updatedGigsCount, onConfirm, onCancel }) => (
    <Modal title="אישור ייבוא" onClose={onCancel}>
        <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">נמצאו הנתונים הבאים בקובץ:</p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                <li>{newGigsCount} אירועים חדשים</li>
                <li>{updatedGigsCount} אירועים קיימים לעדכון</li>
            </ul>
            <p className="text-sm text-gray-500">האם להמשיך בייבוא?</p>
            <div className="flex justify-end gap-3 pt-2">
                <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">ביטול</button>
                <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">ייבא נתונים</button>
            </div>
        </div>
    </Modal>
);

// --- Expense Form Modal ---

interface ExpenseFormModalProps {
    expense: RecurringExpense | null;
    onClose: () => void;
    onSave: (expense: RecurringExpense) => void;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ expense, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<RecurringExpense>>({
        name: '',
        monthlyAmount: 0,
        paymentType: '',
        category: '',
        startDate: new Date().toISOString().split('T')[0],
        chargeDayRule: '',
        notes: '',
        isEssential: true,
        isActive: true
    });

    useEffect(() => {
        if (expense) {
            setFormData(expense);
        }
    }, [expense]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: expense?.id || crypto.randomUUID(),
            ...formData as RecurringExpense
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (name === 'monthlyAmount') {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    return (
        <Modal title={expense ? 'עריכת הוצאה' : 'הוספת הוצאה'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">שם ההוצאה</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">סכום חודשי (₪)</label>
                        <input type="number" name="monthlyAmount" value={formData.monthlyAmount} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">קטגוריה</label>
                        <input type="text" name="category" value={formData.category} onChange={handleChange} list="categories" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                        <datalist id="categories">
                            <option value="שיווק" />
                            <option value="תוכנה" />
                            <option value="משרד" />
                            <option value="רכב" />
                            <option value="ביטוח" />
                            <option value="מיסים" />
                        </datalist>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">אמצעי תשלום</label>
                        <input type="text" name="paymentType" value={formData.paymentType} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">יום חיוב (טקסט חופשי)</label>
                        <input type="text" name="chargeDayRule" value={formData.chargeDayRule} onChange={handleChange} placeholder='למשל: "10" או "סוף חודש"' className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">תאריך התחלה</label>
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">תאריך סיום (אופציונלי)</label>
                        <input type="date" name="endDate" value={formData.endDate || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">הערות</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"></textarea>
                </div>
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" name="isEssential" checked={formData.isEssential} onChange={handleChange} className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                        הוצאה חיונית
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                        פעיל
                    </label>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">ביטול</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">שמור</button>
                </div>
            </form>
        </Modal>
    );
};

// --- Package Form Modal ---

interface PackageFormModalProps {
    packageItem: Package | null;
    onClose: () => void;
    onSave: (pkg: Package) => void;
}

export const PackageFormModal: React.FC<PackageFormModalProps> = ({ packageItem, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Package>>({
        name: '',
        clientName: '',
        totalPrice: 0,
        billingDate: '',
        maxWorkshops: 0,
        maxHours: 0,

        status: GigStatus.Pending,
        backgroundColor: ''
    });

    useEffect(() => {
        if (packageItem) {
            setFormData(packageItem);
        }
    }, [packageItem]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: packageItem?.id || crypto.randomUUID(),
            createdAt: packageItem?.createdAt || new Date().toISOString(),
            ...formData as Package
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (['totalPrice', 'maxWorkshops', 'maxHours'].includes(name)) {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    return (
        <Modal title={packageItem ? 'עריכת חבילה' : 'חבילה חדשה'} onClose={onClose} accentColor={formData.backgroundColor}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">שם החבילה</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="לדוגמה: ריטיינר שנתי 2024" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">שם הלקוח</label>
                    <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">מחיר כולל (₪)</label>
                    <input type="number" name="totalPrice" value={formData.totalPrice} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">מכסת סדנאות</label>
                        <input type="number" name="maxWorkshops" value={formData.maxWorkshops} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">בנק שעות</label>
                        <input type="number" name="maxHours" value={formData.maxHours} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">תאריך חיוב (אופציונלי)</label>
                    <input type="date" name="billingDate" value={formData.billingDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                    <p className="text-xs text-gray-500 mt-1">השאר ריק אם טרם חויב.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">צבע כרטיסייה</label>
                    <ColorPicker selectedColor={formData.backgroundColor} onSelect={(color) => setFormData(prev => ({ ...prev, backgroundColor: color }))} />
                </div>
                {formData.billingDate && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">סטטוס תשלום</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border">
                            <option value={GigStatus.Pending}>ממתין</option>
                            <option value={GigStatus.Paid}>שולם</option>
                        </select>
                    </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">ביטול</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">שמור</button>
                </div>
            </form>
        </Modal>
    );
};

// --- Monthly Expense Override Modal ---

interface MonthlyExpenseOverrideModalProps {
    expenseName: string;
    monthLabel: string;
    currentAmount: number;
    existingInstance?: MonthlyExpenseInstance;
    onClose: () => void;
    onSave: (amount: number, notes: string) => void;
}

export const MonthlyExpenseOverrideModal: React.FC<MonthlyExpenseOverrideModalProps> = ({ expenseName, monthLabel, currentAmount, existingInstance, onClose, onSave }) => {
    const [amount, setAmount] = useState(currentAmount);
    const [notes, setNotes] = useState(existingInstance?.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(amount, notes);
        onClose();
    };

    return (
        <Modal title={`עריכת הוצאה לחודש ${monthLabel}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    עריכה נקודתית עבור <strong>{expenseName}</strong>. שינוי זה לא ישפיע על חודשים אחרים.
                </p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">סכום לחודש זה (₪)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">הערות לשינוי</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">ביטול</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">שמור שינוי</button>
                </div>
            </form>
        </Modal>
    );
};

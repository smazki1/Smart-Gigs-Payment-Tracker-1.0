
import React, { useState, useEffect } from 'react';
import type { Gig } from '../types';
import { GigStatus } from '../types';
import { TrashIcon, PlusIcon, PencilIcon } from './icons';

interface TableViewProps {
  gigs: Gig[];
  onSave: (gig: Partial<Gig> & { id: string }) => void;
  onAdd: (gig: Gig) => void;
  onDelete: (gig: Gig) => void;
  onEdit: (gig: Gig) => void;
}

const TableView: React.FC<TableViewProps> = ({ gigs, onSave, onAdd, onDelete, onEdit }) => {
    const [editedGigs, setEditedGigs] = useState(gigs);
    
    useEffect(() => {
        setEditedGigs(gigs);
    }, [gigs]);

    const handleCellChange = (id: string, field: keyof Gig, value: any) => {
        setEditedGigs(currentGigs =>
            currentGigs.map(g => (g.id === id ? { ...g, [field]: value } : g))
        );
    };

    const handleCellBlur = (id: string, field: keyof Gig) => {
        const originalGig = gigs.find(g => g.id === id);
        const editedGig = editedGigs.find(g => g.id === id);
        
        if (originalGig && editedGig && originalGig[field] !== editedGig[field]) {
            let valueToSave = editedGig[field];
            if (field === 'paymentAmount' && typeof valueToSave === 'string') {
                valueToSave = parseFloat(valueToSave) || 0;
            }
            onSave({ id, [field]: valueToSave });
        }
    };
    
    const handleAddNewRow = () => {
        const newGig: Gig = {
            id: crypto.randomUUID(),
            name: 'אירוע חדש',
            supplierName: '',
            paymentAmount: 0,
            eventDate: new Date().toISOString().split('T')[0],
            paymentDueDate: new Date().toISOString().split('T')[0],
            status: GigStatus.Pending,
            createdAt: new Date().toISOString()
        };
        onAdd(newGig);
    };

    const columns = [
        { key: 'name', label: 'שם אירוע', type: 'text' },
        { key: 'supplierName', label: 'ספק', type: 'text' },
        { key: 'paymentAmount', label: 'סכום (₪)', type: 'number' },
        { key: 'eventDate', label: 'תאריך אירוע', type: 'date' },
        { key: 'paymentDueDate', label: 'יעד לתשלום', type: 'date' },
        { key: 'status', label: 'סטטוס', type: 'select' },
    ];
    
    return (
        <div className="p-4 md:p-6">
            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-slate-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} scope="col" className="px-6 py-3 whitespace-nowrap">{col.label}</th>
                                ))}
                                <th scope="col" className="px-6 py-3 text-center">פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editedGigs.map((gig) => (
                                <tr key={gig.id} className="bg-white dark:bg-gray-800/80 border-b dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                    {columns.map(col => (
                                        <td key={col.key} className="px-2 py-1 align-middle" style={{minWidth: col.type === 'text' ? '200px' : '150px'}}>
                                            {col.type === 'select' ? (
                                                <select
                                                    value={gig.status}
                                                    onChange={(e) => onSave({id: gig.id, status: e.target.value as GigStatus})}
                                                    className="w-full bg-transparent border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 p-2"
                                                >
                                                    <option value={GigStatus.Pending}>ממתין</option>
                                                    <option value={GigStatus.Paid}>שולם</option>
                                                </select>
                                            ) : (
                                                <input
                                                    type={col.type}
                                                    value={gig[col.key as keyof Gig] as string | number || ''}
                                                    onChange={(e) => handleCellChange(gig.id, col.key as keyof Gig, e.target.value)}
                                                    onBlur={() => handleCellBlur(gig.id, col.key as keyof Gig)}
                                                    className={`w-full bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-transparent focus:ring-2 focus:ring-primary-500 rounded-md p-2 transition-colors ${col.key === 'name' ? 'font-semibold text-gray-800 dark:text-white' : ''}`}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-4 py-1 align-middle">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => onEdit(gig)} className="p-2 text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-900/50 rounded-full transition-colors" title="עריכה מלאה">
                                                <PencilIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => onDelete(gig)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors" title="מחק שורה">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t dark:border-gray-700">
                    <button
                        onClick={handleAddNewRow}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-4 h-4" />
                        הוסף אירוע
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TableView;
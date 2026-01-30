import React, { useState, useMemo, useEffect } from 'react';
import type { Gig, GigFilterStatus, ParsedGig } from '../types';
import { GigStatus } from '../types';
import { VAT_RATE } from '../constants';
import { formatCurrency, formatDate, isOverdue, getMonthHebrew, getHolidaysForYear } from '../utils/helpers';
import { parseGigFromString } from '../services/geminiService';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, TrashIcon, CheckCircleIcon, PaperAirplaneIcon, PlusIcon, ListBulletIcon, CalendarDaysIcon, SparklesIcon, CurrencyDollarIcon, PaperClipIcon, ChatBubbleBottomCenterTextIcon, XMarkIcon } from './icons';

// --- Smart Add Component ---
interface SmartAddComponentProps {
    onSmartAdd: (parsedGig: ParsedGig) => void;
}
const SmartAddComponent: React.FC<SmartAddComponentProps> = ({ onSmartAdd }) => {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        setError('');
        const parsedGig = await parseGigFromString(text);
        if (parsedGig) {
            onSmartAdd(parsedGig);
            setText('');
        } else {
            setError('לא ניתן היה לנתח את פרטי האירוע. אנא נסו ניסוח אחר.');
        }
        setIsLoading(false);
    };

    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-md border border-slate-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
                <SparklesIcon className="w-6 h-6 text-primary-500" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">הוספה חכמה עם AI</h3>
            </div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                className="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700/50 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                placeholder="לדוגמה: סדנת AI לחברת טק ב-20 באוקטובר ב-5000₪"
            />
            <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="mt-3 w-full flex justify-center items-center gap-2 px-4 py-2.5 text-white font-semibold bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 dark:disabled:bg-primary-800 transition-all duration-300 shadow-sm hover:shadow-md"
            >
                {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'ניתוח והוספה'}
            </button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );
};

// --- Gig Item Component ---
interface GigItemProps {
    gig: Gig;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
    onEdit: (gig: Gig) => void;
    onSave: (gig: Partial<Gig> & { id: string }) => void;
    onDelete: (gig: Gig) => void;
    onMarkAsPaid: (gig: Gig) => void;
    onAIReminder: (gig: Gig) => void;
}
const GigItem: React.FC<GigItemProps> = React.memo(({ gig, isSelected, onToggleSelection, onEdit, onSave, onDelete, onMarkAsPaid, onAIReminder }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(gig.name);
    const nameInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditingName) {
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
        }
    }, [isEditingName]);

    const handleNameSave = () => {
        if (editedName.trim() && editedName.trim() !== gig.name) {
            onSave({ id: gig.id, name: editedName.trim() });
        }
        setIsEditingName(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleNameSave();
        if (e.key === 'Escape') {
            setEditedName(gig.name);
            setIsEditingName(false);
        }
    };

    const overdue = isOverdue(gig);
    const statusMap = {
        [GigStatus.Paid]: { text: 'שולם', color: 'green', Icon: CheckCircleIcon },
        [GigStatus.Pending]: { text: overdue ? 'באיחור' : 'ממתין', color: overdue ? 'red' : 'yellow', Icon: PaperAirplaneIcon },
    };
    const currentStatus = statusMap[gig.status];
    const statusColors = {
        green: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800',
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800',
    };

    return (
        <div className={`p-4 rounded-xl shadow-sm border transition-all duration-200 ${gig.backgroundColor
                ? `${gig.backgroundColor} text-white border-transparent ${isSelected ? 'ring-2 ring-offset-2 ring-primary-500' : 'hover:shadow-md'}`
                : `${isSelected ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700' : 'bg-white dark:bg-gray-800/50 border-slate-200 dark:border-gray-800 hover:shadow-md'}`
            }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelection(gig.id)}
                        aria-label={`Select gig ${gig.name}`}
                        className={`mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer flex-shrink-0 ${gig.backgroundColor ? 'bg-white/20 border-white/40 text-white' : ''}`}
                    />
                    <div className="flex-1 min-w-0">
                        {isEditingName ? (
                            <input
                                ref={nameInputRef}
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onBlur={handleNameSave}
                                onKeyDown={handleKeyDown}
                                className="font-semibold text-lg bg-slate-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-1 -m-1 w-full focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                        ) : (
                            <div>
                                <p onDoubleClick={() => setIsEditingName(true)} className={`font-semibold text-lg truncate cursor-text ${gig.backgroundColor ? 'text-white' : 'text-gray-900 dark:text-white'}`} title="Double-click to edit">
                                    {gig.name}
                                </p>
                                {gig.supplierName && <p className={`text-sm truncate ${gig.backgroundColor ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{gig.supplierName}</p>}
                            </div>
                        )}
                        <div className={`flex items-center space-x-4 rtl:space-x-reverse mt-2 text-sm ${gig.backgroundColor ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${gig.backgroundColor ? 'bg-white/20 text-white border border-white/20' : statusColors[currentStatus.color]}`}>
                                <currentStatus.Icon className="w-3.5 h-3.5" />
                                {currentStatus.text}
                            </span>
                            <div className="flex items-center gap-2">
                                <CalendarDaysIcon className="w-4 h-4" />
                                <span>אירוע: {formatDate(gig.eventDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CurrencyDollarIcon className="w-4 h-4" />
                                <span>לתשלום עד: {formatDate(gig.paymentDueDate)}</span>
                            </div>
                            {gig.notes && <ChatBubbleBottomCenterTextIcon className="w-4 h-4" title={gig.notes} />}
                            {(gig.attachments && gig.attachments.length > 0) && <PaperClipIcon className="w-4 h-4" title={`${gig.attachments.length} files attached`} />}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-auto text-right">
                        <p className={`text-xl font-bold ${gig.backgroundColor ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`}>{formatCurrency(gig.paymentAmount)}</p>
                        <p className={`text-xs ${gig.backgroundColor ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>כולל מע״מ: {formatCurrency(gig.paymentAmount * (1 + VAT_RATE))}</p>
                    </div>
                    <div className={`flex space-x-1 rtl:space-x-reverse p-1 rounded-lg ${gig.backgroundColor ? 'bg-black/10' : 'bg-slate-100 dark:bg-gray-700/50'}`}>
                        {gig.status === GigStatus.Pending && (
                            <>
                                <button onClick={() => onMarkAsPaid(gig)} title="סמן כשולם" className={`p-2 rounded-md transition-colors ${gig.backgroundColor ? 'text-white hover:bg-white/20' : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50'}`}><CheckCircleIcon className="w-5 h-5" /></button>
                                <button onClick={() => onAIReminder(gig)} title="תזכורת AI" className={`p-2 rounded-md transition-colors ${gig.backgroundColor ? 'text-white hover:bg-white/20' : 'text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50'}`}><PaperAirplaneIcon className="w-5 h-5" /></button>
                            </>
                        )}
                        <button onClick={() => onEdit(gig)} title="עריכה" className={`p-2 rounded-md transition-colors ${gig.backgroundColor ? 'text-white hover:bg-white/20' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-900/50'}`}><PencilIcon className="w-5 h-5" /></button>
                        <button onClick={() => onDelete(gig)} title="מחיקה" className={`p-2 rounded-md transition-colors ${gig.backgroundColor ? 'text-white hover:bg-white/20' : 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50'}`}><TrashIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- List View Component ---
interface ListViewProps extends Omit<GigItemProps, 'gig' | 'isSelected' | 'onToggleSelection'> {
    gigs: Gig[];
    selectedGigs: Set<string>;
    onToggleSelection: (id: string) => void;
}
const ListView: React.FC<ListViewProps> = ({ gigs, selectedGigs, onToggleSelection, ...props }) => {
    return (
        <div className="space-y-3">
            {gigs.length > 0 ? (
                gigs.map(gig => <GigItem key={gig.id} gig={gig} isSelected={selectedGigs.has(gig.id)} onToggleSelection={onToggleSelection} {...props} />)
            ) : (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-gray-800 rounded-lg">
                    <CalendarDaysIcon className="mx-auto w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <h3 className="mt-2 text-lg font-medium text-gray-800 dark:text-gray-200">אין אירועים להצגה</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">נסו לשנות את המסננים או להוסיף אירוע חדש.</p>
                </div>
            )}
        </div>
    );
};


// --- Calendar View Component ---
interface CalendarViewProps {
    gigs: Gig[];
    onAdd: (date: string) => void;
    onEdit: (gig: Gig) => void;
    onReschedule: (gigId: string, newDate: string) => void;
    onDelete: (gig: Gig) => void;
}
const CalendarView: React.FC<CalendarViewProps> = ({ gigs, onAdd, onEdit, onReschedule, onDelete }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dragOverDate, setDragOverDate] = useState<string | null>(null);
    const [holidays, setHolidays] = useState<Map<string, string>>(new Map());
    const [loadedYear, setLoadedYear] = useState<number | null>(null);

    useEffect(() => {
        const year = currentDate.getFullYear();
        if (year !== loadedYear) {
            setHolidays(getHolidaysForYear(year));
            setLoadedYear(year);
        }
    }, [currentDate, loadedYear]);

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const goToToday = () => setCurrentDate(new Date());

    const daysOfWeek = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grid = [];
        let day = 1;
        for (let i = 0; i < 6; i++) {
            const week = [];
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < firstDayOfMonth) {
                    week.push(null);
                } else if (day > daysInMonth) {
                    week.push(null);
                } else {
                    week.push(day);
                    day++;
                }
            }
            grid.push(week);
            if (day > daysInMonth) break;
        }
        return grid;
    }, [currentDate]);

    const gigsByDate = useMemo(() => {
        const map = new Map<string, Gig[]>();
        gigs.forEach(gig => {
            const dateKey = gig.eventDate;
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)!.push(gig);
        });
        return map;
    }, [gigs]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const handleDragStart = (e: React.DragEvent, gig: Gig) => {
        e.dataTransfer.setData('application/json', JSON.stringify(gig));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, date: string) => {
        e.preventDefault();
        setDragOverDate(date);
    };

    const handleDrop = (e: React.DragEvent, newDate: string) => {
        e.preventDefault();
        setDragOverDate(null);
        try {
            const gig = JSON.parse(e.dataTransfer.getData('application/json')) as Gig;
            if (gig && gig.eventDate !== newDate) {
                onReschedule(gig.id, newDate);
            }
        } catch (error) {
            console.error("Failed to parse dragged gig data:", error);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(1)} aria-label="החודש הבא" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{getMonthHebrew(currentDate)}</h3>
                    <button onClick={goToToday} className="text-xs font-medium text-primary-600 hover:underline">חזור להיום</button>
                </div>
                <button onClick={() => changeMonth(-1)} aria-label="החודש הקודם" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="grid grid-cols-7 text-center font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2">
                {daysOfWeek.map(day => <div key={day} className="py-2">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 border-t border-r border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {calendarGrid.flat().map((day, index) => {
                    const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                    const dayGigs = dateStr ? gigsByDate.get(dateStr) || [] : [];
                    const holidayName = holidays.get(dateStr);
                    const isHoliday = !!holidayName;
                    const isCurrentMonth = !!day;
                    const dayDate = day ? new Date(dateStr) : null;
                    if (dayDate) dayDate.setHours(12, 0, 0, 0);
                    const isToday = isCurrentMonth && dayDate?.setHours(0, 0, 0, 0) === today.getTime();
                    const isDragOver = dragOverDate === dateStr;

                    return (
                        <div
                            key={index}
                            onClick={() => isCurrentMonth && onAdd(dateStr)}
                            onDragOver={(e) => isCurrentMonth && handleDragOver(e, dateStr)}
                            onDragLeave={() => setDragOverDate(null)}
                            onDrop={(e) => isCurrentMonth && handleDrop(e, dateStr)}
                            className={`relative min-h-[8rem] border-b border-l border-gray-200 dark:border-gray-700 p-2 flex flex-col transition-colors duration-200 ${isHoliday ? 'bg-green-50 dark:bg-green-900/40' :
                                    isCurrentMonth ? 'bg-white dark:bg-gray-800/50' : 'bg-slate-50 dark:bg-gray-900/50'
                                } ${isDragOver ? 'bg-primary-100 dark:bg-primary-900/50' : isCurrentMonth && !isHoliday ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50' : isCurrentMonth && isHoliday ? 'cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/60' : ''}`}
                        >
                            <span className={`self-start font-medium flex justify-center items-center h-7 w-7 rounded-full text-sm ${isToday ? 'bg-primary-600 text-white' : isCurrentMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                {day}
                            </span>
                            {isCurrentMonth && (
                                <div className="flex-1 overflow-y-auto mt-1 space-y-1">
                                    {isHoliday && (
                                        <div className="text-center text-xs text-green-800 dark:text-green-300 font-semibold mb-1 truncate" title={holidayName}>
                                            {holidayName}
                                        </div>
                                    )}
                                    {dayGigs.map(gig => {
                                        const overdue = isOverdue(gig);
                                        const statusColor = gig.status === GigStatus.Paid ? 'bg-green-500' :
                                            overdue ? 'bg-red-500' :
                                                'bg-yellow-500';
                                        return (
                                            <div
                                                key={gig.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, gig)}
                                                className="group relative cursor-grab active:cursor-grabbing"
                                                title={gig.name}
                                            >
                                                <div
                                                    onClick={(e) => { e.stopPropagation(); onEdit(gig); }}
                                                    className={`w-full p-1.5 text-xs rounded-md cursor-pointer flex items-center gap-1.5 ${statusColor} text-white hover:opacity-80 transition-opacity`}
                                                >
                                                    <span className="truncate font-semibold flex-1">{gig.name}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(gig);
                                                    }}
                                                    className="absolute top-1/2 left-1 rtl:right-1 rtl:left-auto transform -translate-y-1/2 p-1 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:bg-red-700 z-10"
                                                    aria-label={`מחק ${gig.name}`}
                                                >
                                                    <TrashIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// --- Main Gig Management Component ---
interface GigManagementProps extends Omit<GigItemProps, 'gig' | 'isSelected' | 'onToggleSelection'> {
    gigs: Gig[];
    onSmartAdd: (parsedGig: ParsedGig) => void;
    onAdd: (date?: string) => void;
    onReschedule: (gigId: string, newDate: string) => void;
    onBulkMarkAsPaid: (ids: string[]) => void;
    onBulkDelete: (ids: string[]) => void;
}
type DateFilter = 'all' | 'thisMonth' | 'lastMonth' | 'thisYear';

const GigManagement: React.FC<GigManagementProps> = ({ gigs, onSmartAdd, onAdd, onReschedule, onBulkMarkAsPaid, onBulkDelete, ...itemProps }) => {
    const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<GigFilterStatus>('All');
    const [sortCriteria, setSortCriteria] = useState('eventDate-desc');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [selectedGigs, setSelectedGigs] = useState<Set<string>>(new Set());

    const filteredGigs = useMemo(() => {
        return gigs
            .filter(gig => {
                // Search Filter
                const searchTermLower = searchTerm.toLowerCase();
                const searchMatch = gig.name.toLowerCase().includes(searchTermLower) || (gig.supplierName && gig.supplierName.toLowerCase().includes(searchTermLower));
                if (!searchMatch) return false;

                // Status Filter
                if (filterStatus !== 'All') {
                    const isGigOverdue = isOverdue(gig);
                    if (filterStatus === 'Paid' && gig.status !== GigStatus.Paid) return false;
                    if (filterStatus === 'Pending' && (gig.status !== GigStatus.Pending || isGigOverdue)) return false;
                    if (filterStatus === 'Overdue' && !isGigOverdue) return false;
                }

                // Date Filter
                if (dateFilter !== 'all') {
                    const now = new Date();
                    const year = now.getFullYear();
                    if (dateFilter === 'thisMonth') {
                        const month = now.getMonth() + 1;
                        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
                        if (!gig.eventDate.startsWith(monthStr)) return false;
                    } else if (dateFilter === 'lastMonth') {
                        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const lastMonthYear = lastMonthDate.getFullYear();
                        const lastMonth = lastMonthDate.getMonth() + 1;
                        const monthStr = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}`;
                        if (!gig.eventDate.startsWith(monthStr)) return false;
                    } else if (dateFilter === 'thisYear') {
                        if (!gig.eventDate.startsWith(String(year))) return false;
                    }
                }

                return true;
            })
            .sort((a, b) => {
                const [sortKey, sortDirection] = sortCriteria.split('-');
                let valA: number;
                let valB: number;
                switch (sortKey) {
                    case 'eventDate': case 'paymentDueDate':
                        return sortDirection === 'asc' ? a[sortKey].localeCompare(b[sortKey]) : b[sortKey].localeCompare(a[sortKey]);
                    case 'paymentAmount':
                        valA = a.paymentAmount;
                        valB = b.paymentAmount;
                        break;
                    case 'name':
                        return sortDirection === 'asc' ? (a.name || '').localeCompare(b.name || '', 'he') : (b.name || '').localeCompare(a.name || '', 'he');
                    case 'supplierName':
                        return sortDirection === 'asc' ? (a.supplierName || '').localeCompare(b.supplierName || '', 'he') : (b.supplierName || '').localeCompare(a.supplierName || '', 'he');
                    default:
                        return b.eventDate.localeCompare(a.eventDate);
                }
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            });
    }, [gigs, searchTerm, filterStatus, dateFilter, sortCriteria]);

    useEffect(() => {
        setSelectedGigs(new Set());
    }, [searchTerm, filterStatus, dateFilter, sortCriteria, activeView]);

    const handleToggleSelection = (gigId: string) => {
        setSelectedGigs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(gigId)) {
                newSet.delete(gigId);
            } else {
                newSet.add(gigId);
            }
            return newSet;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedGigs.size === filteredGigs.length) {
            setSelectedGigs(new Set());
        } else {
            setSelectedGigs(new Set(filteredGigs.map(g => g.id)));
        }
    };

    const handleAddFromCalendar = (date: string) => {
        onAdd(date);
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <SmartAddComponent onSmartAdd={onSmartAdd} />

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-3 bg-white/50 dark:bg-gray-800/30 border border-slate-200 dark:border-gray-800 rounded-lg">
                    <div className="p-1 rounded-lg bg-slate-100 dark:bg-gray-700/50 flex">
                        <button onClick={() => setActiveView('list')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'list' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}> <ListBulletIcon /> רשימה </button>
                        <button onClick={() => setActiveView('calendar')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'calendar' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}><CalendarDaysIcon /> לוח שנה</button>
                    </div>

                    {activeView === 'list' && (
                        <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                            <div className="flex items-center gap-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg px-3 flex-shrink-0">
                                <input id="select-all" type="checkbox" onChange={handleToggleSelectAll} checked={filteredGigs.length > 0 && selectedGigs.size === filteredGigs.length} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer" />
                                <label htmlFor="select-all" className="text-sm font-medium text-gray-700 dark:text-gray-300 pr-1 py-2 cursor-pointer">בחר הכל</label>
                            </div>
                            <input type="text" placeholder="חיפוש לפי שם או ספק..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:flex-1 p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
                            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} className="w-full sm:w-auto p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500">
                                <option value="all">כל הזמנים</option>
                                <option value="thisMonth">חודש נוכחי</option>
                                <option value="lastMonth">חודש שעבר</option>
                                <option value="thisYear">שנה נוכחית</option>
                            </select>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as GigFilterStatus)} className="w-full sm:w-auto p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500">
                                <option value="All">כל הסטטוסים</option>
                                <option value="Pending">ממתין</option>
                                <option value="Paid">שולם</option>
                                <option value="Overdue">באיחור</option>
                            </select>
                            <select value={sortCriteria} onChange={(e) => setSortCriteria(e.target.value)} className="w-full sm:w-auto p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500">
                                <option value="eventDate-desc">מיון: תאריך אירוע (חדש › ישן)</option>
                                <option value="eventDate-asc">מיון: תאריך אירוע (ישן › חדש)</option>
                                <option value="paymentAmount-desc">מיון: סכום (גבוה › נמוך)</option>
                                <option value="paymentAmount-asc">מיון: סכום (נמוך › גבוה)</option>
                                <option value="paymentDueDate-desc">מיון: יעד לתשלום</option>
                                <option value="name-asc">מיון: שם אירוע (א-ת)</option>
                                <option value="supplierName-asc">מיון: שם ספק (א-ת)</option>
                            </select>
                        </div>
                    )}

                    <button onClick={() => onAdd()} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm">
                        <PlusIcon className="w-4 h-4" /> הוסף אירוע
                    </button>
                </div>

                {activeView === 'list' ? (
                    <ListView gigs={filteredGigs} selectedGigs={selectedGigs} onToggleSelection={handleToggleSelection} {...itemProps} />
                ) : (
                    <CalendarView gigs={gigs} onAdd={handleAddFromCalendar} onEdit={itemProps.onEdit} onReschedule={onReschedule} onDelete={itemProps.onDelete} />
                )}
            </div>

            {selectedGigs.size > 0 && activeView === 'list' && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-gray-800 shadow-2xl rounded-lg border border-slate-200 dark:border-gray-700 flex items-center gap-4 px-4 py-3 animate-fade-in">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{selectedGigs.size} נבחרו</span>
                    <div className="w-px h-6 bg-slate-200 dark:bg-gray-600"></div>
                    <button
                        onClick={() => {
                            onBulkMarkAsPaid(Array.from(selectedGigs));
                            setSelectedGigs(new Set());
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                    >
                        <CheckCircleIcon className="w-5 h-5" /> סמן כשולם
                    </button>
                    <button
                        onClick={() => {
                            onBulkDelete(Array.from(selectedGigs));
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                        <TrashIcon className="w-5 h-5" /> מחק
                    </button>
                    <button
                        onClick={() => setSelectedGigs(new Set())}
                        title="נקה בחירה"
                        className="p-2 text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default GigManagement;
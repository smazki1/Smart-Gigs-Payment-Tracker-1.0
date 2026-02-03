
import React, { useMemo } from 'react';
import type { Package, Gig } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, BriefcaseIcon, InformationCircleIcon, ChevronDownIcon, ChevronUpIcon, CalendarDaysIcon } from './icons';

interface PackagesManagerProps {
    packages: Package[];
    gigs: Gig[];
    onAddPackage: () => void;
    onEditPackage: (pkg: Package) => void;
    onDeletePackage: (pkg: Package) => void;
}

const PackageCard: React.FC<{ pkg: Package; usage: { usedWorkshops: number; usedHours: number; usedHoursGigs: Gig[] }; onEdit: () => void; onDelete: () => void; isUnbilled?: boolean }> = ({ pkg, usage, onEdit, onDelete, isUnbilled }) => {
    const [showDetails, setShowDetails] = React.useState(false);
    const workshopProgress = pkg.maxWorkshops > 0 ? (usage.usedWorkshops / pkg.maxWorkshops) * 100 : 0;
    const hoursProgress = pkg.maxHours > 0 ? (usage.usedHours / pkg.maxHours) * 100 : 0;

    return (
        <div className={`rounded-xl shadow-sm border flex flex-col overflow-hidden transition-shadow ${pkg.backgroundColor
            ? `${pkg.backgroundColor} border-transparent text-white hover:shadow-lg`
            : `bg-white dark:bg-gray-800 hover:shadow-md ${isUnbilled ? 'border-orange-300 dark:border-orange-800/60' : 'border-slate-200 dark:border-gray-700'}`
            }`}>
            <div className={`p-5 border-b ${pkg.backgroundColor
                ? 'border-white/20'
                : `${isUnbilled ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/30' : 'border-slate-100 dark:border-gray-700/50'}`
                }`}>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className={`font-bold text-lg truncate ${pkg.backgroundColor ? 'text-white' : 'text-gray-900 dark:text-white'}`} title={pkg.name}>{pkg.name}</h3>
                        <p className={`text-sm ${pkg.backgroundColor ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{pkg.clientName}</p>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={onEdit} className={`p-1.5 rounded-lg transition-colors ${pkg.backgroundColor ? 'text-white/80 hover:bg-white/20 hover:text-white' : 'text-gray-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-gray-700'}`}>
                            <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={onDelete} className={`p-1.5 rounded-lg transition-colors ${pkg.backgroundColor ? 'text-white/80 hover:bg-white/20 hover:text-white' : 'text-gray-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-gray-700'}`}>
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center text-sm mt-3">
                    <div className={`font-semibold ${pkg.backgroundColor ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{formatCurrency(pkg.totalPrice)}</div>
                    {isUnbilled ? (
                        <div className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${pkg.backgroundColor
                            ? 'bg-white/20 text-white border-white/20'
                            : 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/30'
                            }`}>
                            <InformationCircleIcon className="w-3 h-3" />
                            טרם חויב
                        </div>
                    ) : (
                        <div className={`text-xs px-2 py-1 rounded ${pkg.backgroundColor
                            ? 'bg-white/20 text-white/90'
                            : 'text-gray-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700'
                            }`}>
                            חיוב: {formatDate(pkg.billingDate || '')}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-4 flex-1">
                {/* Workshop Quota */}
                <div>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className={`font-medium ${pkg.backgroundColor ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}>סדנאות</span>
                        <span className={`${pkg.backgroundColor ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{usage.usedWorkshops} מתוך {pkg.maxWorkshops}</span>
                    </div>
                    <div className={`w-full rounded-full h-2.5 overflow-hidden ${pkg.backgroundColor ? 'bg-black/20' : 'bg-slate-100 dark:bg-gray-700'}`}>
                        <div
                            className={`h-2.5 rounded-full ${workshopProgress > 100 ? (pkg.backgroundColor ? 'bg-white' : 'bg-red-500') : (pkg.backgroundColor ? 'bg-white' : 'bg-primary-500')}`}
                            style={{ width: `${Math.min(workshopProgress, 100)}%` }}
                        ></div>
                    </div>
                    {workshopProgress > 100 && <p className={`text-xs mt-1 ${pkg.backgroundColor ? 'text-white font-bold' : 'text-red-500'}`}>חריגה מהמכסה!</p>}
                </div>

                {/* Hours Bank */}
                <div>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className={`font-medium ${pkg.backgroundColor ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}>בנק שעות</span>
                        <span className={`${pkg.backgroundColor ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{usage.usedHours} מתוך {pkg.maxHours}</span>
                    </div>
                    <div className={`w-full rounded-full h-2.5 overflow-hidden ${pkg.backgroundColor ? 'bg-black/20' : 'bg-slate-100 dark:bg-gray-700'}`}>
                        <div
                            className={`h-2.5 rounded-full ${hoursProgress > 100 ? (pkg.backgroundColor ? 'bg-white' : 'bg-red-500') : (pkg.backgroundColor ? 'bg-white' : 'bg-purple-500')}`}
                            style={{ width: `${Math.min(hoursProgress, 100)}%` }}
                        ></div>
                    </div>
                    {hoursProgress > 100 && <p className={`text-xs mt-1 ${pkg.backgroundColor ? 'text-white font-bold' : 'text-red-500'}`}>חריגה מהבנק!</p>}
                </div>

                {/* Details Toggle */}
                {usage.usedHoursGigs.length > 0 && (
                    <div className="pt-2">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className={`flex items-center gap-1 text-xs font-medium focus:outline-none ${pkg.backgroundColor ? 'text-white/90 hover:text-white' : 'text-primary-600 hover:text-primary-700 dark:text-primary-400'}`}
                        >
                            {showDetails ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
                            {showDetails ? 'הסתר פירוט שעות' : 'הצג פירוט שעות'}
                        </button>

                        {showDetails && (
                            <div className={`mt-3 space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin ${pkg.backgroundColor ? 'scrollbar-thumb-white/20' : 'scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600'}`}>
                                {usage.usedHoursGigs.map(g => (
                                    <div key={g.id} className={`flex justify-between items-center text-xs p-2 rounded ${pkg.backgroundColor ? 'bg-white/10 text-white' : 'bg-slate-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}>
                                        <div className="flex items-center gap-2 truncate">
                                            <CalendarDaysIcon className="w-3 h-3 opacity-70" />
                                            <span className="truncate max-w-[120px]" title={g.name}>{g.name}</span>
                                            <span className="opacity-70 text-[10px]">{formatDate(g.eventDate)}</span>
                                        </div>
                                        <span className="font-semibold whitespace-nowrap">{g.duration} שעות</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const PackagesManager: React.FC<PackagesManagerProps> = ({ packages, gigs, onAddPackage, onEditPackage, onDeletePackage }) => {

    // Helper to calculate usage
    const getPackageUsage = (pkgId: string) => {
        const linkedGigs = gigs.filter(g => g.packageId === pkgId);

        const usedWorkshops = linkedGigs.filter(g => g.usageType === 'workshop').length;
        const usedHoursGigs = linkedGigs.filter(g => g.usageType === 'consulting');
        const usedHours = usedHoursGigs.reduce((sum, g) => sum + (parseFloat(String(g.duration || 0)) || 0), 0);

        return { usedWorkshops, usedHours, usedHoursGigs };
    };

    const unbilledPackages = useMemo(() => packages.filter(p => !p.billingDate), [packages]);
    const billedPackages = useMemo(() => packages.filter(p => p.billingDate).sort((a, b) => (b.billingDate || '').localeCompare(a.billingDate || '')), [packages]);

    return (
        <div className="p-4 md:p-6 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <BriefcaseIcon className="w-8 h-8 text-primary-600" />
                        ניהול חבילות ריטיינר
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">מעקב אחר חבילות שעות, סדנאות וניצול תקציב מול לקוחות.</p>
                </div>
                <button
                    onClick={onAddPackage}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    הוסף חבילה
                </button>
            </div>

            {packages.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-gray-800/50">
                    <BriefcaseIcon className="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">אין חבילות פעילות</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">צור חבילה חדשה כדי להתחיל לעקוב אחר ריטיינרים ובנקי שעות.</p>
                </div>
            )}

            {unbilledPackages.length > 0 && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                            <InformationCircleIcon className="w-5 h-5" />
                            חבילות שטרם חויבו
                        </h3>
                        <div className="h-px bg-orange-200 dark:bg-orange-900/50 flex-1"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {unbilledPackages.map(pkg => (
                            <PackageCard
                                key={pkg.id}
                                pkg={pkg}
                                usage={getPackageUsage(pkg.id)}
                                onEdit={() => onEditPackage(pkg)}
                                onDelete={() => onDeletePackage(pkg)}
                                isUnbilled={true}
                            />
                        ))}
                    </div>
                </div>
            )}

            {billedPackages.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">היסטוריית חבילות וחיובים</h3>
                        <div className="h-px bg-slate-200 dark:bg-gray-700 flex-1"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {billedPackages.map(pkg => (
                            <PackageCard
                                key={pkg.id}
                                pkg={pkg}
                                usage={getPackageUsage(pkg.id)}
                                onEdit={() => onEditPackage(pkg)}
                                onDelete={() => onDeletePackage(pkg)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackagesManager;

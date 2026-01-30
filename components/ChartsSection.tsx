import React, { useMemo, useState, useRef } from 'react';
import type { Gig, Package } from '../types';
import { GigStatus } from '../types';
import { formatCurrency } from '../utils/helpers';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

// A simple color palette for the pie chart
const PIE_CHART_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#8b5cf6', '#ec4899', '#64748b'];

// --- Combo Chart Component (formerly LineChart) ---
interface ComboChartDataPoint {
  label: string;
  paid: number;
  expected: number;
  eventCount: number;
}
interface ComboChartProps {
  data: ComboChartDataPoint[];
  selectedYear: number;
}

const ComboChart: React.FC<ComboChartProps> = ({ data, selectedYear }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const padding = { top: 20, right: 60, bottom: 30, left: 60 };
  const chartWidth = 500;
  const chartHeight = 300;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const totalValue = useMemo(() => data.reduce((acc, d) => acc + d.paid + d.expected + d.eventCount, 0), [data]);

  const maxValue = useMemo(() => Math.max(...data.flatMap(d => [d.paid, d.expected]), 0) * 1.15 || 100, [data]);
  const maxEventCount = useMemo(() => Math.max(...data.map(d => d.eventCount), 0) * 1.25 || 5, [data]);

  const yAxisLabels = useMemo(() => {
    const ticks = 5;
    return Array.from({ length: ticks }, (_, i) => {
      const value = (maxValue / (ticks - 1)) * i;
      return { value, label: formatCurrency(value) };
    });
  }, [maxValue]);

  const yAxisEventsLabels = useMemo(() => {
    const uniqueCounts = [...new Set(data.map(d => d.eventCount))];
    const maxTickValue = Math.ceil(maxEventCount);
    const ticks = Math.min(maxTickValue + 1, 6);
    if (ticks <= 1) return [];

    return Array.from({ length: ticks }, (_, i) => {
      const value = Math.round((maxTickValue / (ticks - 1)) * i);
      return { value, label: value.toString() };
    }).filter((item, index, self) => self.findIndex(t => t.value === item.value) === index); // unique values
  }, [maxEventCount, data]);


  const xScale = (index: number) => padding.left + (index / (data.length - 1)) * innerWidth;
  const yScale = (value: number) => padding.top + innerHeight - (value / maxValue) * innerHeight;
  const yScaleEvents = (value: number) => padding.top + innerHeight - (value / maxEventCount) * innerHeight;

  const createPath = (key: 'paid' | 'expected') => {
    if (totalValue === 0) return '';
    return data.map((point, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(point[key])}`).join(' ');
  };

  const paidPath = createPath('paid');
  const expectedPath = createPath('expected');
  const areaPath = `${paidPath} L ${xScale(data.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`;

  const activeData = activeIndex !== null ? data[activeIndex] : null;

  const tooltipX = activeIndex !== null ? xScale(activeIndex) : 0;
  const tooltipY = activeIndex !== null ? Math.min(yScale(activeData!.paid), yScale(activeData!.expected)) : 0;

  if (totalValue === 0) {
    return (
      <div className="flex items-center justify-center h-96 w-full text-gray-500 dark:text-gray-400">
        אין נתונים להצגה עבור שנה זו.
      </div>
    );
  }

  return (
    <div className="relative h-96 w-full" dir="ltr">
      <style>{`
            .line-path { stroke-dasharray: 1500; stroke-dashoffset: 1500; animation: draw-line 1.5s ease-out forwards; }
            .area-path { opacity: 0; animation: fade-in 1s 0.5s ease-out forwards; }
            .bar-rect { transform-origin: bottom; animation: grow-bar 0.8s ease-out forwards; }
            .pulse-circle { animation: pulse 1.8s ease-in-out infinite; }
            @keyframes draw-line { to { stroke-dashoffset: 0; } }
            @keyframes fade-in { to { opacity: 1; } }
            @keyframes grow-bar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
            @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.5); opacity: 0; } }
        `}</style>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="text-primary-500" stopColor="currentColor" stopOpacity={0.3} />
            <stop offset="100%" className="text-primary-500" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Left Y-Axis (Income) */}
        {yAxisLabels.map(({ value, label }) => (
          <g key={value} className="text-xs text-gray-400 dark:text-gray-500">
            <line x1={padding.left} x2={chartWidth - padding.right} y1={yScale(value)} y2={yScale(value)} className="stroke-slate-200 dark:stroke-gray-700" strokeWidth="1" strokeDasharray="2 2" />
            <text x={padding.left - 8} y={yScale(value)} dominantBaseline="middle" textAnchor="end">{label}</text>
          </g>
        ))}
        {/* Right Y-Axis (Events) */}
        {yAxisEventsLabels.map(({ value, label }) => (
          <g key={`event-axis-${value}`} className="text-xs text-gray-400 dark:text-gray-500">
            <text x={chartWidth - padding.right + 8} y={yScaleEvents(value)} dominantBaseline="middle" textAnchor="start">{label}</text>
          </g>
        ))}
        <text x={chartWidth - padding.right + 20} y={padding.top - 8} textAnchor="middle" className="text-xs font-semibold text-gray-500 dark:text-gray-400">אירועים</text>


        {/* X-Axis Labels (Months) */}
        {data.map((point, i) => (
          <text key={i} x={xScale(i)} y={chartHeight - padding.bottom + 15} textAnchor="middle" className="text-xs text-gray-500 dark:text-gray-400">{point.label}</text>
        ))}

        {/* Bars for Event Count */}
        {data.map((point, i) => {
          const barHeight = innerHeight - (yScaleEvents(point.eventCount) - padding.top);
          if (barHeight <= 0) return null;
          return (
            <rect
              key={`bar-${i}`}
              x={xScale(i) - 10}
              y={yScaleEvents(point.eventCount)}
              width={20}
              height={barHeight}
              className="fill-red-300 dark:fill-red-700/60 opacity-70 bar-rect"
              rx="2"
            />
          );
        })}

        {/* Lines and Area for Income */}
        <path d={areaPath} fill="url(#areaGradient)" className="area-path" />
        <path d={expectedPath} className="stroke-yellow-400 dark:stroke-yellow-600 fill-none line-path" style={{ animationDelay: '0.2s' }} strokeWidth="2" strokeDasharray="4 4" />
        <path d={paidPath} className="stroke-primary-500 fill-none line-path" strokeWidth="2.5" />

        {/* Interactive Points */}
        {data.map((point, i) => (
          <g
            key={`interactive-group-${i}`}
            onMouseOver={() => setActiveIndex(i)}
            onMouseOut={() => setActiveIndex(null)}
          >
            <rect x={xScale(i) - 12} y={padding.top} width={24} height={innerHeight} fill="transparent" className="cursor-pointer" />
            {activeIndex === i && (
              <>
                <circle cx={xScale(i)} cy={yScale(point.paid)} r="12" className="fill-primary-500/30 pulse-circle pointer-events-none" style={{ transformOrigin: `${xScale(i)}px ${yScale(point.paid)}px` }} />
                <circle cx={xScale(i)} cy={yScale(point.expected)} r="12" className="fill-yellow-400/30 pulse-circle pointer-events-none" style={{ transformOrigin: `${xScale(i)}px ${yScale(point.expected)}px`, animationDelay: '0.2s' }} />
              </>
            )}
            <circle cx={xScale(i)} cy={yScale(point.paid)} r={activeIndex === i ? 7 : 5} className={`fill-primary-500 stroke-white dark:stroke-gray-900 transition-all duration-200 pointer-events-none ${activeIndex === i ? 'stroke-2' : 'stroke-1'}`}><title>Paid in {point.label}: {formatCurrency(point.paid)}</title></circle>
            <circle cx={xScale(i)} cy={yScale(point.expected)} r={activeIndex === i ? 7 : 5} className={`fill-yellow-400 dark:fill-yellow-600 stroke-white dark:stroke-gray-900 transition-all duration-200 pointer-events-none ${activeIndex === i ? 'stroke-2' : 'stroke-1'}`}><title>Expected in {point.label}: {formatCurrency(point.expected)}</title></circle>
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {activeIndex !== null && activeData && (
        <div
          className="absolute text-sm bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-3 rounded-lg shadow-xl pointer-events-none transition-opacity duration-200 z-10"
          style={{ left: `${(tooltipX / chartWidth) * 100}%`, top: `${(tooltipY / chartHeight) * 100}%`, transform: `translate(-50%, -115%)` }}
        >
          <div className="font-bold mb-2 text-center text-gray-800 dark:text-gray-200">{activeData.label} {selectedYear}</div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-primary-500"></span><span className="text-gray-600 dark:text-gray-400">שולם</span></div>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(activeData.paid)}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-yellow-600"></span><span className="text-gray-600 dark:text-gray-400">צפוי</span></div>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(activeData.expected)}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span><span className="text-gray-600 dark:text-gray-400">אירועים</span></div>
              <span className="font-semibold text-gray-900 dark:text-white">{activeData.eventCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-center items-center flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2"><div className="w-8 border-t-2 border-primary-500"></div><span>הכנסות (שולם)</span></div>
        <div className="flex items-center gap-2"><div className="w-8 border-t-2 border-yellow-400 dark:border-yellow-600 border-dashed"></div><span>הכנסות (צפוי)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-red-300 dark:bg-red-700/60"></div><span>מספר אירועים</span></div>
      </div>
    </div>
  );
};


// --- Donut Chart Component ---
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  if (total === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">אין נתונים להצגה</p>;
  }

  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  let accumulatedAngle = -90; // Start from top
  const paths = data.map(item => {
    const angle = (item.value / total) * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    const endAngle = accumulatedAngle;

    const start = {
      x: 50 + 40 * Math.cos(startAngle * Math.PI / 180),
      y: 50 + 40 * Math.sin(startAngle * Math.PI / 180)
    };
    const end = {
      x: 50 + 40 * Math.cos(endAngle * Math.PI / 180),
      y: 50 + 40 * Math.sin(endAngle * Math.PI / 180)
    };
    const largeArcFlag = angle > 180 ? 1 : 0;

    const d = [
      `M ${start.x},${start.y}`,
      `A 40,40 0 ${largeArcFlag},1 ${end.x},${end.y}`
    ].join(' ');

    return { d, ...item };
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative w-48 h-48 flex-shrink-0">
        <svg viewBox="0 0 100 100">
          {paths.map((path, index) => (
            <path
              key={index}
              d={path.d}
              stroke={path.color}
              strokeWidth="12"
              fill="none"
              className="transition-all duration-300"
              style={{ transformOrigin: '50% 50%', transform: hoveredSegment === path.label ? 'scale(1.05)' : 'scale(1)' }}
              onMouseOver={() => setHoveredSegment(path.label)}
              onMouseOut={() => setHoveredSegment(null)}
            >
              <title>{`${path.label}: ${formatCurrency(path.value)} (${((path.value / total) * 100).toFixed(1)}%)`}</title>
            </path>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-gray-500 dark:text-gray-400">סה"כ</span>
          <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatCurrency(total)}</span>
        </div>
      </div>
      <div className="flex-1 w-full space-y-2">
        {data.map(item => (
          <div
            key={item.label}
            className={`flex items-center justify-between text-sm p-2 rounded-lg transition-all ${hoveredSegment === item.label ? 'bg-slate-100 dark:bg-gray-700/50' : ''}`}
            onMouseOver={() => setHoveredSegment(item.label)}
            onMouseOut={() => setHoveredSegment(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{item.label}</span>
            </div>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{((item.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main Charts Section ---
interface ChartsSectionProps {
  gigs: Gig[];
  packages?: Package[];
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ gigs, packages = [] }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const comboChartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(0, i).toLocaleString('he-IL', { month: 'short' }),
      paid: 0,
      expected: 0,
      eventCount: 0,
    }));
    const yearStr = String(selectedYear);

    // 1. Process Gigs
    gigs.forEach(gig => {
      // Logic: Independent Gigs only (prevent double counting with packages)
      if (gig.packageId) return;

      // Filter by Year
      const dateToCheck = gig.status === GigStatus.Paid ? gig.paymentDueDate : gig.paymentDueDate; // Or eventDate? Usually paymentDueDate for financials.
      if (!dateToCheck || !dateToCheck.startsWith(yearStr)) return;

      const monthIndex = parseInt(dateToCheck.substring(5, 7), 10) - 1;
      if (monthIndex < 0 || monthIndex > 11) return;

      if (gig.status === GigStatus.Paid) {
        months[monthIndex].paid += gig.paymentAmount;
      } else if (gig.status === GigStatus.Pending) {
        months[monthIndex].expected += gig.paymentAmount;
      }

      // Event Count (based on eventDate)
      if (gig.eventDate && gig.eventDate.startsWith(yearStr)) {
        const eventMonth = parseInt(gig.eventDate.substring(5, 7), 10) - 1;
        if (eventMonth >= 0 && eventMonth <= 11) {
          months[eventMonth].eventCount++;
        }
      }
    });

    // 2. Process Packages
    packages.forEach(pkg => {
      if (!pkg.billingDate || !pkg.billingDate.startsWith(yearStr)) return;

      const monthIndex = parseInt(pkg.billingDate.substring(5, 7), 10) - 1;
      if (monthIndex < 0 || monthIndex > 11) return;

      if (pkg.status === GigStatus.Paid) {
        months[monthIndex].paid += (pkg.totalPrice || 0);
      } else if (pkg.status === GigStatus.Pending) {
        months[monthIndex].expected += (pkg.totalPrice || 0);
      }
    });

    return months;
  }, [gigs, packages, selectedYear]);

  const pieChartData = useMemo(() => {
    const yearStr = String(selectedYear);
    const paidGigsThisYear = gigs.filter(g =>
      !g.packageId && // Exclude package gigs
      g.status === GigStatus.Paid &&
      g.paymentDueDate.startsWith(yearStr)
    );

    const incomeBySource: { [key: string]: number } = {};
    paidGigsThisYear.forEach(gig => {
      const nameKey = gig.supplierName?.trim() || 'ללא ספק';
      incomeBySource[nameKey] = (incomeBySource[nameKey] || 0) + gig.paymentAmount;
    });

    // Add Packages to Pie Chart
    const paidPackagesThisYear = packages.filter(p =>
      p.status === GigStatus.Paid && p.billingDate && p.billingDate.startsWith(yearStr)
    );

    paidPackagesThisYear.forEach(pkg => {
      const nameKey = pkg.clientName?.trim() || 'לקוח ללא שם';
      incomeBySource[nameKey] = (incomeBySource[nameKey] || 0) + (pkg.totalPrice || 0);
    });

    const sortedSources = Object.entries(incomeBySource)
      .sort(([, a], [, b]) => b - a);

    const mainSources = sortedSources.slice(0, PIE_CHART_COLORS.length - 1);
    const otherSources = sortedSources.slice(PIE_CHART_COLORS.length - 1);

    const chartData = mainSources.map(([label, value], index) => ({
      label,
      value,
      color: PIE_CHART_COLORS[index],
    }));

    if (otherSources.length > 0) {
      const otherValue = otherSources.reduce((sum, [, value]) => sum + value, 0);
      chartData.push({
        label: 'אחר',
        value: otherValue,
        color: PIE_CHART_COLORS[PIE_CHART_COLORS.length - 1],
      });
    }

    return chartData;
  }, [gigs, packages, selectedYear]);

  const availableYears = useMemo(() => {
    // FIX: Explicitly type the Set as Set<number> to ensure correct type inference down the chain.
    const years = new Set<number>([
      ...gigs.flatMap(g => [parseInt(g.paymentDueDate.substring(0, 4)), parseInt(g.eventDate.substring(0, 4))]),
      ...packages.flatMap(p => p.billingDate ? [parseInt(p.billingDate.substring(0, 4))] : [])
    ]);
    years.add(new Date().getFullYear());
    return Array.from(years).filter(y => !isNaN(y)).sort((a, b) => b - a);
  }, [gigs, packages]);

  const changeYear = (direction: number) => {
    const currentIndex = availableYears.indexOf(selectedYear);
    const nextIndex = currentIndex - direction;
    if (nextIndex >= 0 && nextIndex < availableYears.length) {
      setSelectedYear(availableYears[nextIndex]);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white dark:bg-gray-800/50 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">סקירה שנתית ({selectedYear})</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => changeYear(-1)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-700 dark:text-gray-200 w-12 text-center">{selectedYear}</span>
            <button onClick={() => changeYear(1)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        <ComboChart key={selectedYear} data={comboChartData} selectedYear={selectedYear} />
      </div>

      <div className="bg-white dark:bg-gray-800/50 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">מקורות הכנסה (לפי ספק, {selectedYear})</h3>
        <DonutChart data={pieChartData} />
      </div>
    </div>
  );
};

export default ChartsSection;
"use client";

import { useMemo } from 'react';
import { differenceInDays, addDays, format } from 'date-fns';

export function HeatmapCalendar({ heatmap, overdue }: { heatmap: Record<string, number>, overdue: Record<string, boolean> }) {
  const days = useMemo(() => {
    // Generate an array of dates starting from April 1st of current FY
    const now = new Date();
    const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const startDate = new Date(currentYear, 3, 1);
    const endDate = new Date(currentYear + 1, 2, 31);
    
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const array = Array.from({ length: totalDays }).map((_, i) => addDays(startDate, i));
    return array;
  }, []);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[800px] flex flex-wrap gap-[3px]">
        {days.map((date, i) => {
          const dateString = format(date, 'yyyy-MM-dd');
          const count = heatmap[dateString] || 0;
          const isOverdue = overdue[dateString];
          
          let bgColor = 'bg-slate-100'; // no deadlines
          if (isOverdue) bgColor = 'bg-red-500';
          else if (count === 1) bgColor = 'bg-blue-200';
          else if (count === 2) bgColor = 'bg-blue-400';
          else if (count >= 3) bgColor = 'bg-blue-600';
          
          return (
            <div 
              key={i} 
              className={`w-3 h-3 rounded-[2px] ${bgColor} cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all`}
              title={`${format(date, 'MMM do, yyyy')}: ${count} deadlines`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-[var(--color-muted)]">
        <span>Less</span>
        <div className="w-3 h-3 rounded-[2px] bg-slate-100" />
        <div className="w-3 h-3 rounded-[2px] bg-blue-200" />
        <div className="w-3 h-3 rounded-[2px] bg-blue-400" />
        <div className="w-3 h-3 rounded-[2px] bg-blue-600" />
        <span>More</span>
        <div className="w-3 h-3 rounded-[2px] bg-red-500 ml-4" />
        <span>Overdue</span>
      </div>
    </div>
  );
}

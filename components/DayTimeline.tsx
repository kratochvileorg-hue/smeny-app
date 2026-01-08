import React from 'react';
import { Shift, Employee } from '../types';
import { getShiftPercentage, TIMELINE_COLORS, isShopCovered } from '../utils';
import { AlertTriangle } from './Icons';

interface DayTimelineProps {
  shifts: (Shift | undefined)[];
  employees: Employee[];
  date?: Date; // Add date prop
}

export const DayTimeline: React.FC<DayTimelineProps> = ({ shifts, employees, date }) => {
  // Filter only active shifts with valid times
  const activeShifts = shifts
    .map((shift, index) => ({ shift, employee: employees[index] }))
    .filter(item => item.shift && item.shift.startTime && item.shift.endTime && item.shift.confirmedType);

  // Check coverage
  const isCovered = date ? isShopCovered(shifts, date) : true;

  // Config for the timeline view (06:00 to 20:00) - Updated range
  const START_HOUR = 6;
  const END_HOUR = 20;
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  if (activeShifts.length === 0) {
    return (
      <div className="flex items-center gap-2 w-full h-full">
         <div className="h-full flex-1 bg-gray-50 rounded border border-gray-100 flex items-center justify-center text-xs text-gray-300">
           Žádné směny
         </div>
         {/* Alert if no shifts at all (implicitly not covered, unless it's a weekend and we don't care?) 
             Actually, keep simple: if no shifts on a weekday, it's an alert.
         */}
         {date && date.getDay() !== 0 && date.getDay() !== 6 && (
            <div className="text-red-500 animate-pulse" title="Prodejna nepokryta">
                <AlertTriangle size={18} />
            </div>
         )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full h-full relative">
      <div className="relative flex-1 h-full select-none group min-h-[40px]">
        {/* Background grid / Hour markers */}
        <div className="absolute inset-0 flex border-b border-gray-200">
          {hours.map((hour, i) => (
            <div key={hour} className="flex-1 border-l border-gray-100 relative group-hover:border-gray-300 transition-colors first:border-l-0">
              {/* Hour Label (only show some to avoid clutter) */}
              {hour % 2 === 0 || hour === START_HOUR ? (
                  <span className="absolute -top-3 left-0 text-[9px] text-gray-400 font-mono transform -translate-x-1/2 z-10 bg-white/80 px-0.5 rounded">{hour}</span>
              ) : null}
            </div>
          ))}
        </div>

        {/* Coverage Bars */}
        <div className="absolute inset-0 top-1 bottom-1">
          {activeShifts.map((item, idx) => {
            if (!item.shift) return null;
            
            const { left, width } = getShiftPercentage(
              item.shift.startTime, 
              item.shift.endTime, 
              START_HOUR, 
              END_HOUR
            );
            
            const colorClass = TIMELINE_COLORS[item.shift.confirmedType] || 'bg-gray-500';
            
            // Slight vertical offset for overlapping bars to make them distinct
            // We modulo by 3 to cycle through top/middle/bottom positions
            const topOffset = (idx % 3) * 6 + 2; 
            const zIndex = 10 + idx;

            return (
              <div
                key={item.shift.id}
                className={`absolute h-2.5 rounded-sm opacity-90 hover:opacity-100 hover:z-20 transition-all cursor-help border border-white/50 ${colorClass}`}
                style={{ 
                  left: `${left}%`, 
                  width: `${width}%`,
                  top: `${topOffset}px`,
                  zIndex
                }}
                title={`${item.employee.name} (${item.shift.confirmedType}): ${item.shift.startTime} - ${item.shift.endTime}`}
              >
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Coverage Alert Indicator */}
      {!isCovered && (
        <div className="text-red-500 animate-pulse flex-shrink-0" title="Pozor: Prodejna není plně pokryta dle otevírací doby!">
           <AlertTriangle size={20} />
        </div>
      )}
    </div>
  );
};
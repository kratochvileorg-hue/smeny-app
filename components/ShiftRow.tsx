
import React, { useState } from 'react';
import { Shift, ShiftDefinition, ValidationResult, Employee } from '../types';
import { calculateHours, getDayNameCz, SHIFT_STYLES, calculateShiftPreset, formatDuration, formatDate, isCzechHoliday, parseSmartTime } from '../utils';
import { AlertTriangle, Clock, Repeat, Trash2, Undo2 } from './Icons';

interface ShiftRowProps {
  date: Date;
  shift?: Shift;
  employeeId: string;
  employee?: Employee;
  onChange: (updatedShift: Shift, isUndo?: boolean) => void;
  readOnly?: boolean;
  shiftDefinitions: ShiftDefinition[];
  validation?: ValidationResult;
  isLocked?: boolean;
}

export const ShiftRow: React.FC<ShiftRowProps> = ({ 
  date, 
  shift, 
  employeeId, 
  employee,
  onChange, 
  readOnly = false,
  shiftDefinitions,
  validation,
  isLocked = false
}) => {
  const [showHistory, setShowHistory] = useState(false);
  // Fixed: Cannot find name 'day' by replacing it with the prop 'date'
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const holidayName = isCzechHoliday(date);
  const isHoliday = !!holidayName;
  const dateStr = formatDate(date);

  const availability = shift?.availability || '';
  const confirmedType = shift?.confirmedType || '';
  const [localStart, setLocalStart] = useState(shift?.startTime || '');
  const [localEnd, setLocalEnd] = useState(shift?.endTime || '');
  const breakDuration = shift?.breakDuration || 0;
  const note = shift?.note || '';
  const history = shift?.history || [];
  const isOffered = shift?.isOffered || false;

  const dailyFund = (employee?.weeklyFund || 40) / 5;
  const totalHours = calculateHours({
    ...shift,
    startTime: localStart,
    endTime: localEnd,
    confirmedType
  }, dailyFund);

  React.useEffect(() => {
    setLocalStart(shift?.startTime || '');
    setLocalEnd(shift?.endTime || '');
  }, [shift?.startTime, shift?.endTime]);

  const createUpdate = (field: keyof Shift, value: any): Shift => {
    return {
      id: shift?.id || `${employeeId}-${dateStr}`,
      employeeId,
      date: dateStr,
      availability,
      confirmedType,
      startTime: localStart,
      endTime: localEnd,
      breakDuration,
      note,
      isWeekend,
      isOffered,
      history,
      [field]: value
    };
  };

  const handleClearDay = () => {
    if (isLocked) return;
    if (confirm(`Opravdu chcete vyčistit záznam pro ${date.toLocaleDateString()}?`)) {
      onChange({
        id: shift?.id || `${employeeId}-${dateStr}`,
        employeeId,
        date: dateStr,
        availability: '',
        confirmedType: 'OFF',
        startTime: '',
        endTime: '',
        breakDuration: 0,
        note: '',
        isWeekend,
        isOffered: false,
        history
      });
    }
  };

  const handleRestoreVersion = (version: any) => {
    if (isLocked) return;
    if (confirm("Opravdu chcete obnovit tento předchozí stav?")) {
      const restored = { ...version, history }; // Keep history
      onChange(restored, true);
      setShowHistory(false);
    }
  };

  const handleTimeBlur = (field: 'startTime' | 'endTime', value: string) => {
    if (isLocked) return;
    const parsed = parseSmartTime(value);
    if (field === 'startTime') {
      setLocalStart(parsed);
      onChange(createUpdate('startTime', parsed));
    } else {
      setLocalEnd(parsed);
      onChange(createUpdate('endTime', parsed));
    }
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'startTime' | 'endTime') => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      handleTimeBlur(field, (e.target as HTMLInputElement).value);
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isLocked) return;
    const newType = e.target.value;
    const preset = calculateShiftPreset(date, newType, shiftDefinitions);
    setLocalStart(preset.start);
    setLocalEnd(preset.end);
    
    onChange({
      id: shift?.id || `${employeeId}-${dateStr}`,
      employeeId,
      date: dateStr,
      availability,
      confirmedType: newType,
      startTime: preset.start,
      endTime: preset.end,
      breakDuration: preset.breakDuration,
      note,
      isWeekend,
      isOffered,
      history
    });
  };

  const rowClass = isHoliday ? 'bg-amber-50/60' : isWeekend ? 'bg-slate-50' : 'bg-white hover:bg-sky-50/20';
  const inputDisabled = readOnly || isLocked;
  
  return (
    <>
      <tr className={`${rowClass} border-b border-slate-100 transition-colors group relative ${isLocked ? 'opacity-70' : ''}`}>
        <td className="px-6 py-5 text-sm whitespace-nowrap align-middle">
          <div className="font-black text-slate-900 text-base leading-none mb-1">{getDayNameCz(date)}</div>
          <div className="text-slate-500 text-[11px] font-bold">{date.toLocaleDateString('cs-CZ')}</div>
          {isHoliday && <div className="text-[9px] text-amber-600 font-black uppercase mt-0.5">{holidayName}</div>}
        </td>

        <td className="px-2 py-3 align-middle">
          <input type="text" value={availability} onChange={(e) => onChange(createUpdate('availability', e.target.value))} disabled={inputDisabled} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary focus:bg-white bg-slate-50/50 transition-all disabled:cursor-not-allowed" placeholder="..." />
        </td>

        <td className="px-2 py-3 align-middle">
          <select value={confirmedType} onChange={handleTypeChange} disabled={inputDisabled} className={`w-full p-2.5 border rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm disabled:cursor-not-allowed ${confirmedType ? SHIFT_STYLES[confirmedType] : 'border-slate-200 bg-white'}`}>
            <option value="">-</option>
            {shiftDefinitions.map(def => <option key={def.code} value={def.code}>{def.code}</option>)}
            <option value="OFF">OFF</option>
            <option value="DOV">DOV</option>
            <option value="SICK">SICK</option>
          </select>
        </td>

        <td className="px-2 py-3 align-middle">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-1.5">
              <input 
                type="text" value={localStart} disabled={inputDisabled}
                onChange={(e) => setLocalStart(e.target.value)}
                onBlur={(e) => handleTimeBlur('startTime', e.target.value)}
                onKeyDown={(e) => handleTimeKeyDown(e, 'startTime')}
                className="w-20 p-2 text-lg border border-slate-200 rounded-xl text-center font-black text-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all disabled:cursor-not-allowed" 
                placeholder={['DOV','SICK'].includes(confirmedType) ? "" : "09:00"}
              />
              <span className="text-slate-300 font-black text-xl">-</span>
              <input 
                type="text" value={localEnd} disabled={inputDisabled}
                onChange={(e) => setLocalEnd(e.target.value)}
                onBlur={(e) => handleTimeBlur('endTime', e.target.value)}
                onKeyDown={(e) => handleTimeKeyDown(e, 'endTime')}
                className="w-20 p-2 text-lg border border-slate-200 rounded-xl text-center font-black text-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all disabled:cursor-not-allowed" 
                placeholder={['DOV','SICK'].includes(confirmedType) ? "" : "18:00"}
              />
            </div>
            {validation && !validation.isValid && (
              <div className="text-[9px] text-danger mt-1 flex items-center justify-center gap-1 font-black uppercase">
                <AlertTriangle size={10} /> {validation.warnings[0]}
              </div>
            )}
          </div>
        </td>

        <td className="px-2 py-3 align-middle">
          <div className="flex items-center justify-center">
            <input type="number" value={breakDuration} disabled={inputDisabled} onChange={(e) => onChange(createUpdate('breakDuration', Number(e.target.value)))} className="w-16 p-2 text-sm border border-slate-200 rounded-xl text-center font-black text-slate-900 focus:ring-2 focus:ring-primary outline-none disabled:cursor-not-allowed" step="15" min="0" />
          </div>
        </td>

        <td className="px-4 py-3 text-center align-middle">
          <span className={`font-black text-xl tabular-nums ${totalHours > 0 ? 'text-slate-900' : 'text-slate-200'}`}>
            {formatDuration(totalHours)}
          </span>
        </td>

        <td className="px-2 py-3 align-middle">
          <div className="flex items-center gap-2">
            <input type="text" value={note} disabled={inputDisabled} onChange={(e) => onChange(createUpdate('note', e.target.value))} className="w-full p-2.5 border border-transparent hover:border-slate-200 focus:border-primary rounded-xl text-sm text-slate-800 font-bold focus:bg-white transition-all disabled:cursor-not-allowed" placeholder="Poznámka..." />
            <div className="flex items-center gap-1.5 shrink-0">
              {!isLocked && (
                <button onClick={handleClearDay} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Vyčistit den"><Trash2 size={18} /></button>
              )}
              {shift && confirmedType && confirmedType !== 'OFF' && !isLocked && (
                <button 
                  onClick={() => onChange(createUpdate('isOffered', !isOffered))} 
                  className={`p-2.5 rounded-xl border-2 transition-all ${isOffered ? 'bg-orange-500 text-white border-orange-600 shadow-lg scale-110' : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'}`}
                  title="Nabídnout do burzy"
                >
                  <Repeat size={18} />
                </button>
              )}
              <button 
                onClick={() => history.length > 0 && setShowHistory(!showHistory)} 
                disabled={history.length === 0} 
                className={`p-2.5 rounded-xl border-2 transition-all shadow-sm ${showHistory ? 'bg-primary text-white border-primary' : history.length > 0 ? 'bg-white text-primary border-primary hover:bg-primary hover:text-white' : 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed opacity-30'}`}
                title={history.length > 0 ? "Zobrazit historii úprav" : "Žádná historie"}
              >
                <Clock size={18} />
              </button>
            </div>
          </div>
        </td>
      </tr>
      {showHistory && (
        <tr className="bg-slate-100/50">
          <td colSpan={7} className="px-6 py-5 shadow-inner">
            <div className="space-y-3">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest flex items-center gap-2">
                <Clock size={12} /> Detailní historie změn dne:
              </div>
              <div className="grid gap-2 max-w-4xl">
                {history.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="text-[11px] font-bold text-slate-700 flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm group/item">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-slate-400 border-r border-slate-100 pr-4">{new Date(entry.timestamp).toLocaleString('cs-CZ')}</span>
                      <span className="text-primary font-black uppercase tracking-tight w-28 truncate">{entry.userEmail.split('@')[0]}</span>
                      <span className="italic text-slate-900 font-medium">{entry.action}</span>
                    </div>
                    {entry.prevState && !isLocked && (
                      <button 
                        onClick={() => handleRestoreVersion(entry.prevState)}
                        className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase transition-all hover:bg-primary"
                      >
                        <Undo2 size={10} /> Obnovit tuto verzi
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

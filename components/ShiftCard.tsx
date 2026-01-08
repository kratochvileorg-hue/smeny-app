
import React, { useState, useEffect } from 'react';
import { Shift, ShiftDefinition, ValidationResult } from '../types';
import { calculateHours, SHIFT_STYLES, formatDate, calculateShiftPreset, isCzechHoliday } from '../utils';
import { AlertTriangle, Clock, Calendar, Check, X, Repeat, Plus } from './Icons';

interface ShiftCardProps {
  date: Date;
  shifts: Shift[];
  employeeId: string;
  onSave: (shift: Shift) => void;
  shiftDefinitions: ShiftDefinition[];
  validation?: ValidationResult;
  // Added isLocked to props interface
  isLocked?: boolean;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({ 
  date, 
  shifts, 
  employeeId, 
  onSave, 
  shiftDefinitions,
  validation,
  // Added isLocked with default value
  isLocked = false
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  
  // States for new or edited shift
  const [editType, setEditType] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editBreak, setEditBreak] = useState(0);
  const [editNote, setEditNote] = useState('');
  const [editAvailability, setEditAvailability] = useState('');

  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const holidayName = isCzechHoliday(date);
  const isHoliday = !!holidayName;

  const startEditing = (shift?: Shift) => {
    if (isLocked) return; // Prevent editing if locked
    if (shift) {
      setEditingShiftId(shift.id);
      setEditType(shift.confirmedType || '');
      setEditStart(shift.startTime || '');
      setEditEnd(shift.endTime || '');
      setEditBreak(shift.breakDuration || 0);
      setEditNote(shift.note || '');
      setEditAvailability(shift.availability || '');
    } else {
      setIsAdding(true);
      setEditingShiftId(null);
      setEditType('');
      setEditStart('');
      setEditEnd('');
      setEditBreak(0);
      setEditNote('');
      setEditAvailability('');
    }
  };

  const handleTypeSelect = (type: string) => {
    const preset = calculateShiftPreset(date, type, shiftDefinitions);
    setEditType(type);
    setEditStart(preset.start);
    setEditEnd(preset.end);
    setEditBreak(preset.breakDuration);
  };

  const handleSave = () => {
    const newShift: Shift = {
      id: editingShiftId || `${employeeId}-${formatDate(date)}-${Date.now()}`,
      employeeId,
      date: formatDate(date),
      availability: editAvailability,
      confirmedType: editType,
      startTime: editStart,
      endTime: editEnd,
      breakDuration: editBreak,
      note: editNote,
      isWeekend: isWeekend,
      isOffered: false,
      history: []
    };
    onSave(newShift);
    setIsAdding(false);
    setEditingShiftId(null);
  };

  const dayHasShifts = shifts.some(s => s.confirmedType && s.confirmedType !== 'OFF');

  return (
    <div className={`rounded-[32px] border shadow-sm overflow-hidden flex flex-col transition-all mb-4 ${
      isHoliday ? 'border-amber-200 bg-amber-50/30' : 
      isWeekend ? 'border-slate-200 bg-slate-50' : 'bg-white border-slate-100'
    } ${isLocked ? 'opacity-75' : ''}`}>
      <div className="px-6 py-4 flex justify-between items-center border-b border-black/5">
        <div className="flex items-baseline gap-2">
          <span className="font-black text-xl text-slate-900">{date.getDate()}. {date.getMonth() + 1}.</span>
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'][date.getDay()]}</span>
          {isHoliday && <div className="text-[9px] font-black text-amber-600 uppercase bg-amber-100 px-2 py-0.5 rounded-md ml-1">{holidayName}</div>}
        </div>
        {/* Disable add button if locked */}
        {!isAdding && !editingShiftId && !isLocked && (
          <button onClick={() => startEditing()} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-primary hover:text-white transition-all"><Plus size={18} /></button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* List of existing shifts */}
        {!isAdding && !editingShiftId && (
          <>
            {shifts.filter(s => s.confirmedType !== 'OFF').length === 0 ? (
              <div className="text-center py-4 text-slate-300 italic text-sm">Žádné směny</div>
            ) : (
              shifts.filter(s => s.confirmedType !== 'OFF').map((s, idx) => (
                <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl border shadow-sm transition-transform active:scale-95 ${SHIFT_STYLES[s.confirmedType] || 'bg-slate-100'}`}>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-black">{s.confirmedType}</div>
                    <div className="flex flex-col">
                      <span className="font-black text-lg leading-none">{s.startTime}-{s.endTime}</span>
                      {s.availability && <span className="text-[10px] uppercase font-bold opacity-60 mt-1">{s.availability}</span>}
                    </div>
                  </div>
                  {/* Hide editing actions if locked */}
                  {!isLocked && (
                    <div className="flex gap-2">
                      <button onClick={() => onSave({ ...s, isOffered: !s.isOffered })} className={`p-2 rounded-xl border ${s.isOffered ? 'bg-orange-500 text-white border-orange-600' : 'bg-white/50 text-orange-600 border-orange-200'}`}><Repeat size={16} /></button>
                      <button onClick={() => startEditing(s)} className="px-3 py-1.5 bg-white/50 text-slate-700 font-black text-[10px] uppercase rounded-xl border border-black/10">Upravit</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* Edit/Add Form */}
        {(isAdding || editingShiftId) && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-4 gap-2">
              {shiftDefinitions.map(def => (
                <button key={def.code} onClick={() => handleTypeSelect(def.code)} className={`p-2 text-xs rounded-xl font-black border transition-all ${editType === def.code ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-600'}`}>{def.code}</button>
              ))}
              <button onClick={() => handleTypeSelect('DOV')} className={`p-2 text-xs rounded-xl font-black border ${editType === 'DOV' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'}`}>DOV</button>
              <button onClick={() => handleTypeSelect('SICK')} className={`p-2 text-xs rounded-xl font-black border ${editType === 'SICK' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600'}`}>SICK</button>
              <button onClick={() => { handleTypeSelect('OFF'); handleSave(); }} className={`p-2 text-xs rounded-xl font-black border ${editType === 'OFF' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>SMAZAT</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Od</label>
                 <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} className="w-full p-3 border rounded-xl font-black bg-slate-50 outline-none focus:bg-white" />
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Do</label>
                 <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="w-full p-3 border rounded-xl font-black bg-slate-50 outline-none focus:bg-white" />
               </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setIsAdding(false); setEditingShiftId(null); }} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase text-xs">Zrušit</button>
              <button onClick={handleSave} className="flex-2 py-3 bg-primary text-white font-black rounded-2xl shadow-lg uppercase text-xs">Uložit směnu</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

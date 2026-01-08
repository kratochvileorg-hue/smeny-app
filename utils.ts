
import { Shift, Stats, ShiftDefinition, ValidationResult } from './types';

export const SHIFT_STYLES: Record<string, string> = {
  'R': 'bg-sky-50 text-sky-800 border-sky-200',       
  'C': 'bg-sky-100 text-sky-900 border-sky-300',       
  'O': 'bg-amber-50 text-amber-800 border-amber-200', 
  'S': 'bg-slate-100 text-slate-800 border-slate-200',    
  'P': 'bg-emerald-50 text-emerald-800 border-emerald-200',       
  'S/P': 'bg-sky-50 text-sky-700 border-sky-200',
  'P/S': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'RS': 'bg-cyan-50 text-cyan-800 border-cyan-200',
  'OS': 'bg-amber-100 text-amber-900 border-amber-300',
  'D': 'bg-blue-50 text-blue-800 border-blue-200', 
  'N': 'bg-purple-50 text-purple-800 border-purple-200', 
  'DOV': 'bg-primary/10 text-primary border-primary/20',
  'OFF': 'bg-slate-100 text-slate-400 border-slate-200',
  'SICK': 'bg-red-50 text-red-800 border-red-200',
};

export const TIMELINE_COLORS: Record<string, string> = {
  'R': 'bg-sky-400',
  'C': 'bg-sky-600',
  'O': 'bg-amber-400',
  'S': 'bg-slate-400',
  'P': 'bg-emerald-400',
  'S/P': 'bg-sky-300',
  'P/S': 'bg-emerald-300',
  'RS': 'bg-cyan-400',
  'OS': 'bg-amber-500',
  'D': 'bg-blue-400',
  'N': 'bg-purple-400',
  'DOV': 'bg-sky-500',
  'OFF': 'bg-slate-300',
  'SICK': 'bg-red-400',
};

export const DEFAULT_SHIFT_DEFINITIONS: ShiftDefinition[] = [
  { code: 'R', startTime: '09:00', endTime: '13:30', breakDuration: 0 },
  { code: 'C', startTime: '09:00', endTime: '18:00', breakDuration: 30 },
  { code: 'O', startTime: '13:30', endTime: '18:00', breakDuration: 0 },
  { code: 'S', startTime: '09:00', endTime: '18:00', breakDuration: 30 },
  { code: 'P', startTime: '09:00', endTime: '18:00', breakDuration: 30 },
  { code: 'RS', startTime: '09:00', endTime: '13:30', breakDuration: 0 },
  { code: 'OS', startTime: '13:30', endTime: '18:00', breakDuration: 0 },
  { code: 'D', startTime: '09:00', endTime: '18:00', breakDuration: 30 },
  { code: 'N', startTime: '09:00', endTime: '18:00', breakDuration: 30 },
  { code: 'S/P', startTime: '09:00', endTime: '18:00', breakDuration: 30 },
  { code: 'P/S', startTime: '09:00', endTime: '18:00', breakDuration: 30 },
];

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseSmartTime = (input: string): string => {
  if (!input) return "";
  let clean = input.replace(/[^0-9]/g, "");
  if (!clean) return input;
  if (clean.length === 1) return `0${clean}:00`;
  if (clean.length === 2) {
    let hour = parseInt(clean);
    if (hour > 23) hour = 23;
    return `${hour.toString().padStart(2, "0")}:00`;
  }
  if (clean.length === 3) {
    let hour = parseInt(clean.substring(0, 1));
    let min = parseInt(clean.substring(1, 3));
    if (min > 59) min = 59;
    return `0${hour}:${min.toString().padStart(2, "0")}`;
  }
  if (clean.length >= 4) {
    let hour = parseInt(clean.substring(0, 2));
    let min = parseInt(clean.substring(2, 4));
    if (hour > 23) hour = 23;
    if (min > 59) min = 59;
    return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
  }
  return input;
};

export const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const isCzechHoliday = (date: Date): string | null => {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  if (d === 1 && m === 1) return "Nový rok";
  if (d === 1 && m === 5) return "Svátek práce";
  if (d === 8 && m === 5) return "Den vítězství";
  if (d === 5 && m === 7) return "Den slovanských věrozvěstů";
  if (d === 6 && m === 7) return "Den upálení mistra Jana Husa";
  if (d === 28 && m === 9) return "Den české státnosti";
  if (d === 28 && m === 10) return "Den vzniku samostatného státu";
  if (d === 17 && m === 11) return "Den boje za svobodu";
  if (d === 24 && m === 12) return "Štědrý den";
  if (d === 25 && m === 12) return "1. svátek vánoční";
  if (d === 26 && m === 12) return "2. svátek vánoční";
  return null;
};

export const calculateHours = (shift: Partial<Shift>, dailyFund: number = 8): number => {
  if (shift.startTime && shift.endTime) {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    const startDate = new Date(0, 0, 0, startH, startM);
    const endDate = new Date(0, 0, 0, endH, endM);
    let diff = (endDate.getTime() - startDate.getTime()) / 1000 / 60; 
    if (diff < 0) diff += 24 * 60; 
    return Math.max(0, (diff - (shift.breakDuration || 0)) / 60);
  }
  if (shift.confirmedType === 'DOV' || shift.confirmedType === 'SICK') return dailyFund;
  return 0;
};

export const formatDuration = (decimalHours: number): string => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const calculateStats = (shifts: Shift[], monthlyFundTarget: number, weeklyFund: number = 40): Stats => {
  let workHours = 0;
  let vacationHours = 0;
  let sickHours = 0;
  let mealVouchers = 0;
  let workDays = 0;
  const dailyFund = weeklyFund / 5;

  shifts.forEach(shift => {
    if (!shift.confirmedType || shift.confirmedType === 'OFF') return;
    const hours = calculateHours(shift, dailyFund);
    if (shift.confirmedType === 'DOV') {
      vacationHours += hours;
      workDays += 1;
    } else if (shift.confirmedType === 'SICK') {
      sickHours += hours;
      workDays += 1;
    } else {
      workHours += hours;
      if (hours >= 6) mealVouchers += 1;
      if (hours > 0) workDays += 1;
    }
  });

  const totalHours = workHours + vacationHours + sickHours;
  return { 
    totalHours, 
    workHours, 
    vacationHours, 
    sickHours, 
    mealVouchers, 
    workDays, 
    monthlyFund: monthlyFundTarget, 
    diff: totalHours - monthlyFundTarget 
  };
};

export const getDayNameCz = (date: Date): string => {
  const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  return days[date.getDay()];
};

export const getDayShortNameCz = (date: Date): string => {
  const days = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  return days[date.getDay()];
};

interface ShiftPreset {
  start: string;
  end: string;
  breakDuration: number;
}

export const calculateShiftPreset = (date: Date, type: string, definitions: ShiftDefinition[] = DEFAULT_SHIFT_DEFINITIONS): ShiftPreset => {
  if (['OFF', 'DOV', 'SICK'].includes(type)) return { start: '', end: '', breakDuration: 0 };
  const def = definitions.find(d => d.code === type);
  const day = date.getDay(); 
  const isMonOrWed = day === 1 || day === 3;
  if (!def) return { start: '', end: '', breakDuration: 0 };
  let start = def.startTime;
  let end = def.endTime;
  let breakDuration = def.breakDuration;
  if (['O', 'OS'].includes(type)) { start = isMonOrWed ? '14:00' : '13:30'; }
  if (['R', 'RS'].includes(type)) { end = isMonOrWed ? '14:00' : '13:30'; }
  else if (['O', 'OS', 'D', 'N', 'C', 'S', 'P', 'S/P', 'P/S'].includes(type)) { end = isMonOrWed ? '19:00' : '18:00'; }
  return { start, end, breakDuration };
};

export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const getShiftPercentage = (startTime: string, endTime: string, dayStartHour = 6, dayEndHour = 22) => {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const dayStartMin = dayStartHour * 60;
  const totalDayMin = (dayEndHour - dayStartHour) * 60;
  if (startMin === 0 && endMin === 0) return { left: 0, width: 0 };
  let left = ((startMin - dayStartMin) / totalDayMin) * 100;
  let width = ((endMin - startMin) / totalDayMin) * 100;
  if (left < 0) { width += left; left = 0; }
  if (left + width > 100) { width = 100 - left; }
  return { left: Math.max(0, left), width: Math.max(0, width) };
};

export const isShopCovered = (shifts: (Shift | undefined)[], date: Date): boolean => {
  const day = date.getDay();
  const closingHour = (day === 1 || day === 3) ? 19 : 18;
  const SHOP_OPEN = 9 * 60; 
  const SHOP_CLOSE = closingHour * 60; 
  const intervals: [number, number][] = [];
  shifts.forEach(shift => {
    if (shift && shift.startTime && shift.endTime && !['OFF', 'DOV', 'SICK'].includes(shift.confirmedType)) {
      const start = timeToMinutes(shift.startTime);
      const end = timeToMinutes(shift.endTime);
      if (start < end) intervals.push([start, end]);
    }
  });
  if (intervals.length === 0) return false;
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  let [currStart, currEnd] = intervals[0];
  for (let i = 1; i < intervals.length; i++) {
    const [nextStart, nextEnd] = intervals[i];
    if (nextStart <= currEnd) currEnd = Math.max(currEnd, nextEnd);
    else { merged.push([currStart, currEnd]); currStart = nextStart; currEnd = nextEnd; }
  }
  merged.push([currStart, currEnd]);
  let coveredStart = SHOP_OPEN;
  for (const [start, end] of merged) {
    if (start > coveredStart) return false;
    coveredStart = Math.max(coveredStart, end);
    if (coveredStart >= SHOP_CLOSE) return true;
  }
  return coveredStart >= SHOP_CLOSE;
};

export const validateShiftRules = (currentShift: Shift, prevShift?: Shift): ValidationResult => {
  const result: ValidationResult = { isValid: true, warnings: [], errors: [] };
  if (!currentShift.startTime || !currentShift.endTime || ['OFF', 'DOV', 'SICK'].includes(currentShift.confirmedType)) return result;
  const workMinutes = calculateHours(currentShift) * 60;
  if (workMinutes > 360 && currentShift.breakDuration < 30) {
    result.warnings.push("Chybí povinná přestávka (30 min) po 6h práce.");
    result.isValid = false; 
  }
  if (prevShift && prevShift.endTime) {
    const prevEndMin = timeToMinutes(prevShift.endTime);
    const currStartMin = timeToMinutes(currentShift.startTime) + 1440;
    const restMinutes = currStartMin - prevEndMin;
    if (restMinutes < 660) {
      result.warnings.push(`Krátký odpočinek mezi směnami (${(restMinutes/60).toFixed(1)}h). Minimum 11h.`);
      result.isValid = false;
    }
  }
  return result;
};

export const smartRoundTime = (scannedTime: string, plannedTime: string): { finalTime: string, status: 'MATCH' | 'ROUNDED' | 'ANOMALY' } => {
  if (!scannedTime || !plannedTime) return { finalTime: scannedTime, status: 'ANOMALY' };
  const sMin = timeToMinutes(scannedTime);
  const pMin = timeToMinutes(plannedTime);
  const diff = Math.abs(sMin - pMin);
  if (diff <= 15) return { finalTime: plannedTime, status: diff === 0 ? 'MATCH' : 'ROUNDED' };
  return { finalTime: scannedTime, status: 'ANOMALY' };
};

export const generateICS = (shifts: Shift[], employeeName: string): string => {
  const N = "\r\n";
  const formatLocal = (dateStr: string, timeStr: string) => dateStr.replace(/-/g, '') + 'T' + timeStr.replace(/:/g, '') + '00';
  let icsContent = `BEGIN:VCALENDAR${N}VERSION:2.0${N}PRODID:-//ShiftMaster//CZ${N}METHOD:PUBLISH${N}`;
  shifts.forEach(shift => {
    if (shift.startTime && !['OFF', 'DOV'].includes(shift.confirmedType)) {
      const start = formatLocal(shift.date, shift.startTime);
      const end = formatLocal(shift.date, shift.endTime);
      icsContent += `BEGIN:VEVENT${N}UID:${shift.id}@shiftmaster.app${N}SUMMARY:Směna ${shift.confirmedType} (${employeeName})${N}DTSTART;TZID=Europe/Prague:${start}${N}DTEND;TZID=Europe/Prague:${end}${N}END:VEVENT${N}`;
    }
  });
  icsContent += `END:VCALENDAR${N}`;
  return icsContent;
};

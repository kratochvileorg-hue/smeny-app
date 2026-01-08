
import { Employee, Shift, ShiftType } from './types';

// DŮLEŽITÉ: E-maily musí přesně odpovídat Google účtům, kterými se zaměstnanci přihlazují.
export const EMPLOYEES: Employee[] = [
  { id: '3', name: 'Filip', role: 'admin', weeklyFund: 32.5, email: 'filip.vicar01@seznam.cz' },
  { id: '4', name: 'Petr', role: 'employee', weeklyFund: 5, email: 'petr@kratochvile.org' },
  { id: '1', name: 'Hanna', role: 'employee', weeklyFund: 8, email: 'hanna@kratochvile.org' },
  { id: '9', name: 'Matěj', role: 'employee', weeklyFund: 20, email: 'matej@kratochvile.org' },
  { id: '5', name: 'Lukáš', role: 'admin', weeklyFund: 40, email: 'weipro4@gmail.com' },
  { id: '6', name: 'Renata', role: 'admin', weeklyFund: 40, email: 'renabotkovaa@gmail.com' },
];

export const INITIAL_SHIFTS: Shift[] = [
  { id: 'f1', employeeId: '3', date: '2025-11-03', availability: 'R', confirmedType: 'R', startTime: '07:00', endTime: '15:00', breakDuration: 30, note: '', isWeekend: false },
  { id: 'f2', employeeId: '3', date: '2025-11-04', availability: 'R', confirmedType: 'R', startTime: '07:45', endTime: '15:00', breakDuration: 30, note: '', isWeekend: false },
  { id: 'p1', employeeId: '4', date: '2025-11-03', availability: 'C', confirmedType: 'C', startTime: '10:22', endTime: '19:00', breakDuration: 30, note: 'můžu od 10:30', isWeekend: false },
  { id: 'p2', employeeId: '4', date: '2025-11-04', availability: 'O', confirmedType: 'O', startTime: '13:33', endTime: '18:00', breakDuration: 0, note: '', isWeekend: false },
  { id: 'h1', employeeId: '1', date: '2025-11-05', availability: 'O', confirmedType: 'O', startTime: '15:00', endTime: '19:00', breakDuration: 0, note: '', isWeekend: false },
];

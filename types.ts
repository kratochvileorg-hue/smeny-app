
export enum ShiftType {
  R = 'R',   // Ranní
  C = 'C',   // Celodenní
  O = 'O',   // Odpolední
  S = 'S',   // Sklad
  P = 'P',   // Prodejna
  SP = 'S/P', // Sklad + Prodejna
  RS = 'RS', // Ranní služba
  OS = 'OS', // Odpolední služba
  PS = 'P/S', // Prodejna + Sklad
  D = 'D',   // Nový typ dle vzorce
  N = 'N',   // Nový typ dle vzorce
  DOV = 'DOV', // Dovolená
  OFF = 'OFF', // Volno
  SICK = 'SICK' // Nemocenská
}

export interface Employee {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  email?: string; 
  weeklyFund: number; 
}

export interface ShiftHistoryEntry {
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  prevState?: Partial<Shift> | null; // Přidáno | null pro kompatibilitu
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string;
  availability: string;
  confirmedType: ShiftType | string;
  startTime: string; 
  endTime: string; 
  breakDuration: number; 
  note: string;
  isWeekend: boolean;
  isOffered?: boolean;
  isAudit?: boolean; // True pokud jde o interní kopii pro superadmina
  history?: ShiftHistoryEntry[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId: string | null;
  createdBy: string;
  createdAt: string;
  discordMessageId?: string;
  dueDate?: string;
  notes?: string;
}

export interface Stats {
  totalHours: number;
  workHours: number;
  vacationHours: number;
  sickHours: number;
  mealVouchers: number;
  workDays: number;
  monthlyFund: number;
  diff: number;
}

export interface ShiftDefinition {
  code: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  isMonWedOnly?: boolean; 
}

export interface AppUser {
  uid: string;
  email: string | null;
  role: 'admin' | 'employee';
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

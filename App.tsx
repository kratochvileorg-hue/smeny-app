
import React, { useState, useMemo, useEffect, useCallback, CSSProperties } from 'react';
import { utils, writeFile } from 'xlsx';
// @ts-ignore
import { FixedSizeList as List } from 'react-window';
// @ts-ignore
import AutoSizerImport from 'react-virtualized-auto-sizer';
import { EMPLOYEES as STATIC_EMPLOYEES } from './mockData';
import { Shift, ShiftDefinition, AppUser, Employee, Task, ShiftHistoryEntry } from './types';
import { getDaysInMonth, formatDate, SHIFT_STYLES, calculateHours, getDayShortNameCz, DEFAULT_SHIFT_DEFINITIONS, isCzechHoliday, validateShiftRules, calculateStats, formatDuration } from './utils';
import { ShiftRow } from './components/ShiftRow';
import { ShiftCard } from './components/ShiftCard';
import { Login } from './components/Login';
import { DayTimeline } from './components/DayTimeline';
import { AttendanceScanner } from './components/AttendanceScanner';
import PrintableTimesheet from './components/PrintableTimesheet';
import { HelpModal } from './components/HelpModal';
import { StatsCard } from './components/StatsCard';
import { TaskBoard } from './components/TaskBoard';
import { Users, ChevronLeft, ChevronRight, FileDown, Loader2, X, Plus, Calendar, Camera, Printer, Repeat, UserCog, Trash, Undo2, Lock, Unlock, AlertTriangle, Check, LogOut, FileUp } from './components/Icons';
import { subscribeToShifts, saveShiftToDb, auth, logoutUser, updateEmployeeMetadata, getEmployeeOverrides, subscribeToTasks, saveTaskToDb, deleteTaskFromDb, subscribeToCustomShifts, saveCustomShiftToDb, deleteCustomShiftFromDb, db } from './firebase';

const AutoSizer = (AutoSizerImport as any).default || AutoSizerImport;

const AllEmployeesRow = ({ index, style, data }: { index: number, style: CSSProperties, data: any }) => {
  const { daysInMonth, employees, getShiftsForDay, gridCols } = data;
  const day = daysInMonth[index];
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  const holiday = isCzechHoliday(day);
  
  return (
    <div style={{ ...style, display: 'grid', gridTemplateColumns: gridCols }} className={`border-b border-slate-100 items-center ${holiday ? 'bg-amber-50' : isWeekend ? 'bg-slate-50' : 'hover:bg-sky-50/10'}`}>
      <div className="px-4 py-2 border-r h-full flex items-center gap-1 font-black text-sm text-slate-800">
        {day.getDate()}. {day.getMonth() + 1}. <span className="text-[10px] text-slate-400 font-bold">{getDayShortNameCz(day)}</span>
      </div>
      {employees.map((emp: Employee) => {
        const shArr = getShiftsForDay(day, emp.id);
        return (
          <div key={emp.id} className="px-1 text-center border-r border-slate-100 h-full flex items-center justify-center">
            {shArr.length > 0 ? (
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[11px] border ${SHIFT_STYLES[shArr[0].confirmedType] || 'bg-slate-100'}`}>
                {shArr[0].confirmedType}{shArr.length > 1 && '+'}
              </div>
            ) : <span className="text-slate-200">-</span>}
          </div>
        );
      })}
      <div className="px-4 py-1 h-full flex items-center">
        <DayTimeline shifts={employees.map((emp: Employee) => getShiftsForDay(day, emp.id)[0])} employees={employees} date={day} />
      </div>
    </div>
  );
};

const ProfileModal = ({ isOpen, onClose, currentEmployee, currentUser, employees, onUpdateEmployee, customShifts, onSaveCustomShift, onDeleteCustomShift, onBulkFillHpp, isLocked, onToggleLock }: { 
  isOpen: boolean, onClose: () => void, currentEmployee: Employee | null, currentUser: AppUser | null, employees: Employee[], onUpdateEmployee: (id: string, data: Partial<Employee>) => void, customShifts: ShiftDefinition[], onSaveCustomShift: (def: ShiftDefinition) => void, onDeleteCustomShift: (code: string) => void, onBulkFillHpp: (id: string) => void, isLocked: boolean, onToggleLock: () => void
}) => {
  const [activeTab, setActiveTab] = useState<'me' | 'team' | 'definitions'>('me');
  const [newShift, setNewShift] = useState<ShiftDefinition>({ code: '', startTime: '09:00', endTime: '18:00', breakDuration: 30 });
  if (!isOpen) return null;
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-2 sm:p-4 backdrop-blur-md">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl flex flex-col border border-slate-100 max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-slate-50/50">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><UserCog className="text-primary" /> Nastavení</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate max-w-[200px] sm:max-w-none">Přihlášen: {currentUser?.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-full shadow-sm border"><X size={24} /></button>
        </div>

        <div className="flex border-b bg-white overflow-x-auto no-scrollbar shrink-0">
          <button onClick={() => setActiveTab('me')} className={`px-4 sm:px-8 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'me' ? 'border-primary text-primary bg-sky-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Můj Úvazek</button>
          {isAdmin && <button onClick={() => setActiveTab('team')} className={`px-4 sm:px-8 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'team' ? 'border-primary text-primary bg-sky-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Správa týmu</button>}
          <button onClick={() => setActiveTab('definitions')} className={`px-4 sm:px-8 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'definitions' ? 'border-primary text-primary bg-sky-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Typy směn</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-slate-50/30 no-scrollbar">
          {activeTab === 'me' && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Calendar size={20} /></div>
                   <h3 className="font-black text-slate-800">Můj týdenní fond</h3>
                </div>
                {currentEmployee ? (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Hodin týdně</label>
                    <div className="flex gap-4 items-center">
                      <input type="number" step="0.5" value={currentEmployee.weeklyFund} onChange={e => onUpdateEmployee(currentEmployee.id, { weeklyFund: Number(e.target.value) })} className="flex-1 p-4 border-2 rounded-2xl font-black text-2xl bg-slate-50 outline-none focus:border-primary transition-all" />
                      <div className="text-slate-400 font-bold">h</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 text-center">
                    <AlertTriangle className="mx-auto mb-2" size={32} />
                    Účet není spárován se zaměstnancem.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'team' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-white p-4 sm:p-6 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div>
                  <h3 className="font-black text-slate-900">Zámek měsíce</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase mt-1">Po uzamčení nelze v tomto měsíci měnit data</p>
                </div>
                <button 
                  onClick={onToggleLock}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all ${isLocked ? 'bg-red-500 text-white shadow-red-200 shadow-lg' : 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg'}`}
                >
                  {isLocked ? <><Lock size={18} /> Uzamčeno</> : <><Unlock size={18} /> Odemčeno</>}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employees.sort((a,b) => a.name.localeCompare(b.name)).map(emp => (
                  <div key={emp.id} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="font-black text-lg text-slate-900">{emp.name}</span>
                        <span className={`w-fit px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${emp.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{emp.role === 'admin' ? 'Administrátor' : 'Zaměstnanec'}</span>
                      </div>
                      {!isLocked && (
                        <button 
                          onClick={() => onBulkFillHpp(emp.id)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          Doplnit HPP
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-tight">E-mail (Google)</label>
                        <input value={emp.email || ''} onChange={e => onUpdateEmployee(emp.id, { email: e.target.value })} className="w-full mt-1 p-3 border rounded-xl text-sm font-bold bg-slate-50 outline-none focus:bg-white transition-all" placeholder="zatím nepřiřazeno..." />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Týdenní úvazek</label>
                        <input type="number" step="0.5" value={emp.weeklyFund} onChange={e => onUpdateEmployee(emp.id, { weeklyFund: Number(e.target.value) })} className="w-full mt-1 p-3 border rounded-xl text-sm font-bold bg-slate-50 outline-none focus:bg-white transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'definitions' && (
            <div className="space-y-8">
              <div className="bg-primary/5 p-5 sm:p-8 rounded-[32px] border border-primary/10">
                <h3 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2"><Plus className="text-primary" /> Vytvořit nový typ směny</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                   <div>
                     <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Kód směny (např. S)</label>
                     <input value={newShift.code} onChange={e => setNewShift({...newShift, code: e.target.value.toUpperCase()})} className="w-full p-4 border-2 rounded-2xl font-black bg-white outline-none focus:border-primary shadow-sm" placeholder="Kód" />
                   </div>
                   <div className="grid grid-cols-2 gap-2 sm:block">
                     <div>
                       <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Začátek</label>
                       <input type="time" value={newShift.startTime} onChange={e => setNewShift({...newShift, startTime: e.target.value})} className="w-full p-4 border-2 rounded-2xl font-black bg-white outline-none focus:border-primary shadow-sm" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Konec</label>
                       <input type="time" value={newShift.endTime} onChange={e => setNewShift({...newShift, endTime: e.target.value})} className="w-full p-4 border-2 rounded-2xl font-black bg-white outline-none focus:border-primary shadow-sm" />
                     </div>
                   </div>
                   <button onClick={() => { if(!newShift.code) return; onSaveCustomShift(newShift); setNewShift({ code: '', startTime: '09:00', endTime: '18:00', breakDuration: 30 }); }} className="py-4 bg-primary text-white font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all">ULOŽIT TYP SMĚNY</button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">KNIHOVNA TYPŮ SMĚN</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {customShifts.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-slate-300 italic">Zatím nejsou vytvořeny žádné vlastní směny.</div>
                  ) : customShifts.map(cs => (
                    <div key={cs.code} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-black text-sm border border-sky-100">{cs.code}</div>
                         <div>
                           <div className="font-bold text-slate-800">{cs.startTime} - {cs.endTime}</div>
                           <div className="text-[10px] text-slate-400 font-bold uppercase">Časové rozmezí</div>
                         </div>
                       </div>
                       <button onClick={() => onDeleteCustomShift(cs.code)} className="p-2 text-slate-300 hover:text-danger transition-colors"><Trash size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t bg-slate-50/50 flex justify-end shrink-0">
          <button onClick={onClose} className="w-full sm:w-auto px-10 py-4 bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:bg-slate-900 transition-all active:scale-95">Zavřít</button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(STATIC_EMPLOYEES);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all'); 
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [appMode, setAppMode] = useState<'shifts' | 'tasks'>('shifts');
  const [mobileVsechView, setMobileVsechView] = useState<'dnes' | 'mesic'>('mesic');
  const [monthLocked, setMonthLocked] = useState(false);
  const [undoStack, setUndoStack] = useState<{ shift: Shift, timeout: any } | null>(null);
  const [viewMode, setViewMode] = useState<'live' | 'audit'>('live');
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customShifts, setShifts_customShifts] = useState<ShiftDefinition[]>([]);

  const isAdmin = currentUser?.role === 'admin';

  const loadEmployees = async () => {
    const overrides = await getEmployeeOverrides();
    const merged = STATIC_EMPLOYEES.map(emp => {
      const override = overrides[emp.id] || {};
      return { ...emp, ...override, email: (override.email && override.email.trim() !== '') ? override.email : emp.email };
    });
    setEmployees(merged);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        const emailLower = user.email.toLowerCase().trim();
        const adminEmails = ['weipro4@gmail.com', 'renabotkovaa@gmail.com', 'kratochvile.org@gmail.com', 'filip.vicar01@gmail.com', 'filip.vicar01@seznam.cz'];
        const isUserAdmin = adminEmails.includes(emailLower);
        setCurrentUser({ uid: user.uid, email: user.email, role: isUserAdmin ? 'admin' : 'employee' });
      } else { setCurrentUser(null); }
      setAuthLoading(false);
    });
    loadEmployees();
    const unsubTasks = subscribeToTasks(setTasks);
    const unsubCustomShifts = subscribeToCustomShifts(setShifts_customShifts);
    return () => { unsubscribe(); unsubTasks(); unsubCustomShifts(); };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const monthStr = formatDate(currentDate).substring(0, 7);
    setLoading(true);
    const isAuditMode = viewMode === 'audit';
    const unsubscribe = subscribeToShifts(monthStr, isAuditMode, (serverData) => {
      setShifts(serverData);
      setLoading(false);
    }, () => setLoading(false));

    const unsubLock = db.collection("locks").doc(monthStr).onSnapshot(doc => {
      setMonthLocked(doc.exists && doc.data()?.locked === true);
    });

    return () => { unsubscribe && unsubscribe(); unsubLock(); };
  }, [currentDate, currentUser, viewMode]);

  const allShiftDefinitions = useMemo(() => [...DEFAULT_SHIFT_DEFINITIONS, ...customShifts], [customShifts]);
  const daysInMonth = useMemo(() => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const currentIdentity = useMemo(() => {
    if (!currentUser?.email) return null;
    return employees.find(e => e.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()) || null;
  }, [employees, currentUser]);
  
  const offeredShifts = useMemo(() => shifts.filter(s => s.isOffered), [shifts]);

  const handleUpdateEmployee = async (id: string, data: Partial<Employee>) => {
    await updateEmployeeMetadata(id, data);
    await loadEmployees();
  };

  const toggleMonthLock = async () => {
    if (currentUser?.role !== 'admin') return;
    const monthStr = formatDate(currentDate).substring(0, 7);
    await db.collection("locks").doc(monthStr).set({ locked: !monthLocked, updatedAt: new Date().toISOString() });
  };

  const handleCloneMonth = async () => {
    if (!isAdmin) return;
    const monthStr = formatDate(currentDate).substring(0, 7);
    if (!confirm(`Opravdu chcete vytvořit AUTORITATIVNÍ KOPII měsíce ${monthStr}? Tím se překlopí aktuální ostrá data do admin verze pro další úpravy.`)) return;
    
    setIsSaving(true);
    try {
      const snap = await db.collection("shifts")
        .where("date", ">=", monthStr + "-01")
        .where("date", "<=", monthStr + "-31")
        .get();
      
      const batches: Promise<void>[] = [];
      snap.forEach(doc => {
        const data = doc.data() as Shift;
        if (!data.isAudit) {
          const auditShift: Shift = {
            ...data,
            id: `audit-${data.id}`,
            isAudit: true,
            isOffered: false,
            history: [...(data.history || []), {
              timestamp: new Date().toISOString(),
              userId: currentUser?.uid || 'sys',
              userEmail: currentUser?.email || 'sys',
              action: 'Vytvořena auditní kopie z ostrých dat'
            }]
          };
          batches.push(saveShiftToDb(auditShift));
        }
      });
      
      await Promise.all(batches);
      alert(`Hotovo! Vytvořeno ${batches.length} záznamů v autoritativním plánu.`);
      setViewMode('audit');
    } catch (e) {
      console.error(e);
      alert("Chyba při klonování dat.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkFillHpp = async (empId: string) => {
    if (monthLocked && viewMode === 'live') return alert("Měsíc je uzamčen.");
    if (!confirm("Tato akce vyplní směny 09:00–17:30 (8h) na všechny pracovní dny tohoto měsíce. Chcete pokračovat?")) return;
    setIsSaving(true);
    const updates: Shift[] = daysInMonth.filter(d => d.getDay() !== 0 && d.getDay() !== 6 && !isCzechHoliday(d)).map(d => {
      const dateStr = formatDate(d);
      const shiftId = viewMode === 'audit' ? `audit-${empId}-${dateStr}` : `${empId}-${dateStr}`;
      return {
        id: shiftId,
        employeeId: empId,
        date: dateStr,
        availability: '',
        confirmedType: 'C',
        startTime: '09:00',
        endTime: '17:30',
        breakDuration: 30,
        note: 'Automatické HPP',
        isWeekend: false,
        isOffered: false,
        isAudit: viewMode === 'audit',
        history: [{ timestamp: new Date().toISOString(), userId: currentUser?.uid || 'sys', userEmail: currentUser?.email || 'sys', action: 'Hromadné vyplnění HPP' }]
      };
    });
    try {
      const batches: Promise<void>[] = updates.map(shift => saveShiftToDb(shift));
      await Promise.all(batches);
      alert(`Hotovo! Vyplněno ${updates.length} směn.`);
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleShiftChange = async (updatedShift: Shift, isUndoAction = false) => {
    if (monthLocked && viewMode === 'live') return alert("Měsíc je uzamčen. Změny nejsou povoleny.");
    const oldShift = shifts.find(s => s.id === updatedShift.id);
    
    // Vytvoříme kopii bez pole history, abychom zamezili rekurzivnímu zanořování a chybám s undefined
    let oldShiftWithoutHistory = null;
    if (oldShift) {
        const { history, ...rest } = oldShift;
        oldShiftWithoutHistory = rest;
    }

    const historyEntry: ShiftHistoryEntry = {
      timestamp: new Date().toISOString(),
      userId: currentUser?.uid || 'unknown',
      userEmail: currentUser?.email || 'unknown',
      action: isUndoAction ? "Vrácení změny" : `Změna: ${updatedShift.confirmedType} (${updatedShift.startTime || '?'}-${updatedShift.endTime || '?'})`,
      // Zde přetypujeme na Partial<Shift> nebo null, aby to sedělo s definicí v types.ts
      prevState: (oldShiftWithoutHistory as Partial<Shift>) || null
    };

    const shiftWithHistory: Shift = { 
        ...updatedShift, 
        history: [...(updatedShift.history || []), historyEntry], 
        isAudit: viewMode === 'audit' 
    };

    setIsSaving(true);
    try { 
      await saveShiftToDb(shiftWithHistory); 
      if (!isUndoAction && oldShift) {
        if (undoStack) clearTimeout(undoStack.timeout);
        const timeout = setTimeout(() => setUndoStack(null), 6000);
        setUndoStack({ shift: oldShift, timeout });
      }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleUndo = async () => {
    if (!undoStack) return;
    await handleShiftChange(undoStack.shift, true);
    setUndoStack(null);
  };

  const handleClaimShift = async (shift: Shift) => {
    if (monthLocked && viewMode === 'live') return alert("Měsíc je uzamčen.");
    if (!currentIdentity) return alert(`Musíte mít přiřazený profil. Kontaktujte administrátora.`);
    const updatedShift: Shift = { ...shift, employeeId: currentIdentity.id, id: `${currentIdentity.id}-${shift.date}-${Date.now()}`, isOffered: false };
    await handleShiftChange(updatedShift);
    alert(`Směna dne ${shift.date} převzata do vašeho rozpisu.`);
  };

  const handleSaveCustomShift = async (def: ShiftDefinition) => {
    setIsSaving(true);
    try { await saveCustomShiftToDb(def); } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleDeleteCustomShift = async (code: string) => {
    if (!confirm(`Opravdu chcete smazat typ směny ${code}?`)) return;
    setIsSaving(true);
    try { await deleteCustomShiftFromDb(code); } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleTaskAction = async (task: Task, action: 'create' | 'update' | 'delete') => {
    setIsSaving(true);
    try {
      if (action === 'delete') {
        if (confirm("Opravdu smazat tento úkol?")) { await deleteTaskFromDb(task.id); }
      } else { await saveTaskToDb(task); }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleExportIndividual = () => {
    if (!selectedEmployee) return;
    const isAuditMode = viewMode === 'audit';
    const fileName = `Export_${selectedEmployee.name}_${formatDate(currentDate).substring(0, 7)}${isAuditMode ? '_AUTORITATIVNI' : ''}`;
    const wb = utils.book_new();
    const data: any[][] = [['Datum', 'Den', 'Typ Směny', 'Od', 'Do', 'Pauza', 'Hodin']];
    daysInMonth.forEach(day => {
      const sArr = shifts.filter(x => x.date === formatDate(day) && x.employeeId === selectedEmployee.id);
      sArr.forEach(s => {
        if (s && s.confirmedType && s.confirmedType !== 'OFF') {
          const hDec = calculateHours(s, (selectedEmployee.weeklyFund || 40) / 5);
          data.push([day.toLocaleDateString('cs-CZ'), getDayShortNameCz(day), s.confirmedType, s.startTime || '-', s.endTime || '-', s.breakDuration || 0, formatDuration(hDec)]);
        }
      });
    });
    utils.book_append_sheet(wb, utils.aoa_to_sheet(data), "Docházka");
    writeFile(wb, `${fileName}.xlsx`);
  };

  const handleExportAll = () => {
    const isAuditMode = viewMode === 'audit';
    const fileName = `Export_Vsech_${formatDate(currentDate).substring(0, 7)}${isAuditMode ? '_AUTORITATIVNI' : ''}`;
    const wb = utils.book_new();
    const summaryData: any[][] = [['Datum', 'Den', 'Zaměstnanec', 'Směna', 'Od', 'Do', 'Pauza', 'Hodin']];
    daysInMonth.forEach(day => {
      employees.forEach(emp => {
        const sArr = shifts.filter(x => x.date === formatDate(day) && x.employeeId === emp.id);
        sArr.forEach(s => {
          if (s && s.confirmedType && s.confirmedType !== 'OFF') {
            const h = calculateHours(s, (emp.weeklyFund || 40) / 5);
            summaryData.push([day.toLocaleDateString('cs-CZ'), getDayShortNameCz(day), emp.name, s.confirmedType, s.startTime || '-', s.endTime || '-', s.breakDuration || 0, formatDuration(h)]);
          }
        });
      });
    });
    utils.book_append_sheet(wb, utils.aoa_to_sheet(summaryData), "Měsíční přehled");
    employees.forEach(emp => {
      const empData: any[][] = [['Datum', 'Den', 'Směna', 'Od', 'Do', 'Pauza', 'Hodin']];
      daysInMonth.forEach(day => {
        const sArr = shifts.filter(x => x.date === formatDate(day) && x.employeeId === emp.id);
        sArr.forEach(s => {
          if (s && s.confirmedType && s.confirmedType !== 'OFF') {
            const h = calculateHours(s, (emp.weeklyFund || 40) / 5);
            empData.push([day.toLocaleDateString('cs-CZ'), getDayShortNameCz(day), s.confirmedType, s.startTime || '-', s.endTime || '-', s.breakDuration || 0, formatDuration(h)]);
          }
        });
      });
      const sheetName = emp.name.substring(0, 31).replace(/[\\/?*[\]]/g, '_');
      utils.book_append_sheet(wb, utils.aoa_to_sheet(empData), sheetName);
    });
    writeFile(wb, `${fileName}.xlsx`);
  };

  const getShiftsForDay = useCallback((date: Date, empId: string) => {
    const dateStr = formatDate(date);
    return shifts.filter(s => s.date === dateStr && s.employeeId === empId);
  }, [shifts]);

  const gridCols = useMemo(() => `110px repeat(${employees.length}, 80px) 1fr`, [employees]);

  const employeeStats = useMemo(() => {
    if (selectedEmployeeId === 'all' || selectedEmployeeId === 'market') return null;
    const empShifts = shifts.filter(s => s.employeeId === selectedEmployeeId && s.date.startsWith(formatDate(currentDate).substring(0, 7)));
    const workDaysInMonth = daysInMonth.filter(d => d.getDay() !== 0 && d.getDay() !== 6 && !isCzechHoliday(d)).length;
    const fund = ((selectedEmployee?.weeklyFund || 40) / 5) * workDaysInMonth;
    const stats = calculateStats(empShifts, fund, selectedEmployee?.weeklyFund || 40);
    return { stats, progress: Math.min(100, (stats.totalHours / (fund || 1)) * 100) };
  }, [shifts, selectedEmployeeId, currentDate, daysInMonth, selectedEmployee]);

  const listData = useMemo(() => ({ daysInMonth, employees, getShiftsForDay, gridCols }), [daysInMonth, employees, getShiftsForDay, gridCols]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-surface"><Loader2 size={48} className="text-primary" /></div>;
  if (!currentUser) return <Login />;

  const mobileDisplayDays = mobileVsechView === 'dnes' 
    ? [daysInMonth.find(d => formatDate(d) === formatDate(new Date())) || new Date()]
    : daysInMonth;

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased overflow-hidden ${viewMode === 'audit' ? 'bg-sky-50/20' : 'bg-surface'}`}>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ProfileModal 
        isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} currentEmployee={currentIdentity} currentUser={currentUser} employees={employees}
        onUpdateEmployee={handleUpdateEmployee} customShifts={customShifts} onSaveCustomShift={handleSaveCustomShift} onDeleteCustomShift={handleDeleteCustomShift} onBulkFillHpp={handleBulkFillHpp}
        isLocked={monthLocked} onToggleLock={toggleMonthLock}
      />
      {isScannerOpen && <AttendanceScanner shifts={shifts} onApplyChanges={() => {}} onClose={() => setIsScannerOpen(false)} />}
      {isPrintOpen && <PrintableTimesheet isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} />}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl text-white shadow-lg shrink-0 ${viewMode === 'audit' ? 'bg-secondary' : 'bg-primary'}`}><Users size={20} /></div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">Směny Kratochvíle <span className="text-[9px] text-primary/50 ml-1">v1.1</span></h1>
              <div className="flex items-center gap-1.5">
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{isSaving ? 'Ukládám...' : 'Uloženo'}</div>
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" title="Data OK" />
              </div>
            </div>
            {monthLocked && viewMode === 'live' && <div className="ml-1 sm:ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-lg flex items-center gap-1 text-[8px] sm:text-[10px] font-black uppercase shrink-0"><Lock size={10} /> Uzamčeno</div>}
            {viewMode === 'audit' && <div className="ml-1 sm:ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1 text-[8px] sm:text-[10px] font-black uppercase shrink-0">AUTORITATIVNÍ PLÁN</div>}
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl sm:rounded-2xl shadow-inner mx-1 sm:mx-4 shrink-0">
            <button onClick={() => setAppMode('shifts')} className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all ${appMode === 'shifts' ? 'bg-white text-primary shadow-md' : 'text-slate-500'}`}>Rozpis</button>
            <button onClick={() => setAppMode('tasks')} className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all ${appMode === 'tasks' ? 'bg-primary text-white shadow-lg' : 'text-slate-500'}`}>Úkoly</button>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
             <button onClick={() => setIsPrintOpen(true)} className="p-2 text-slate-600 hover:text-primary transition-colors"><Printer size={20} /></button>
             <button onClick={() => setIsScannerOpen(true)} className="p-2 text-slate-600 hover:text-primary transition-colors"><Camera size={20} /></button>
             <button onClick={() => setIsProfileOpen(true)} className="p-2 text-slate-600 hover:text-primary transition-transform active:scale-90"><UserCog size={22} /></button>
             <button onClick={logoutUser} className="p-2 text-danger hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1" title="Odhlásit">
               <span className="hidden sm:inline text-[10px] font-black uppercase">Odhlásit</span>
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-6 lg:px-8 py-4 flex flex-col overflow-hidden">
        {appMode === 'tasks' ? (
          <TaskBoard tasks={tasks} employees={employees} currentUser={currentUser} currentIdentity={currentIdentity} onTaskChange={handleTaskAction} />
        ) : (
          <>
            <div className="mb-6 flex overflow-x-auto pb-2 space-x-2 no-scrollbar items-center shrink-0">
              {isAdmin && (
                <div className="flex bg-slate-200/60 p-1 rounded-2xl mr-4 shrink-0 shadow-sm border border-slate-200">
                   <button onClick={() => setViewMode('live')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${viewMode === 'live' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Ostrý provoz</button>
                   <button onClick={() => setViewMode('audit')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${viewMode === 'audit' ? 'bg-secondary text-white shadow-md' : 'text-slate-500'}`}>Autoritativní plán</button>
                </div>
              )}
              <button onClick={() => setSelectedEmployeeId('all')} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${selectedEmployeeId === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-700 border border-slate-200 hover:border-primary'}`}>Všichni</button>
              {viewMode === 'live' && <button onClick={() => setSelectedEmployeeId('market')} className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all flex items-center gap-2 border-2 ${selectedEmployeeId === 'market' ? 'bg-orange-500 text-white border-orange-600 shadow-lg' : 'bg-orange-50 text-orange-600 border-orange-200'}`}><Repeat size={18} /> Burza směn {offeredShifts.length > 0 && <span className="bg-danger text-white px-1.5 py-0.5 rounded-full text-[10px]">{offeredShifts.length}</span>}</button>}
              <div className="w-px h-8 bg-slate-200 mx-2 shrink-0"></div>
              {employees.map(emp => <button key={emp.id} onClick={() => setSelectedEmployeeId(emp.id)} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${selectedEmployeeId === emp.id ? 'bg-primary text-white shadow-lg' : 'bg-white text-slate-700 border border-slate-200 hover:border-primary'}`}>{emp.name}</button>)}
            </div>

            <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl shadow-inner w-fit mx-auto mb-6">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-white rounded-lg text-slate-700"><ChevronLeft size={20} /></button>
              <span className="font-bold text-slate-900 w-36 text-center text-sm capitalize">{currentDate.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => currentDate && setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-white rounded-lg text-slate-700"><ChevronRight size={20} /></button>
            </div>

            {viewMode === 'audit' && (
              <div className="mb-6 mx-auto">
                 <button 
                  onClick={handleCloneMonth}
                  className="px-6 py-4 bg-white border-2 border-secondary text-secondary rounded-3xl font-black text-xs uppercase flex items-center gap-3 shadow-xl shadow-amber-100 hover:bg-secondary hover:text-white transition-all active:scale-95 group"
                 >
                   <div className="bg-secondary text-white p-2 rounded-xl group-hover:bg-white group-hover:text-secondary transition-colors">
                     <FileUp size={20} />
                   </div>
                   Vytvořit Autoritativní kopii z aktuálních ostrých dat
                 </button>
              </div>
            )}

            <div className="hidden md:flex flex-1 flex-col overflow-hidden min-h-0">
              {selectedEmployeeId === 'all' ? (
                <div className={`rounded-3xl shadow-sm border overflow-hidden flex flex-col flex-1 ${viewMode === 'audit' ? 'bg-sky-50/20 border-secondary/30' : 'bg-white border-slate-200'}`}>
                  <div className="bg-slate-100/50 border-b border-slate-200 flex justify-between items-center px-6 py-4 shrink-0">
                    <h2 className="text-sm font-black text-slate-800 uppercase">Rozpis celého týmu {viewMode === 'audit' && '(AUTORITATIVNÍ)'}</h2>
                    <button onClick={handleExportAll} className="text-xs font-bold flex items-center gap-2 bg-white border-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                      <FileDown size={16} /> Exportovat vše (Excel)
                    </button>
                  </div>
                  <div className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 uppercase text-[9px] grid items-center shrink-0" style={{ gridTemplateColumns: gridCols }}>
                    <div className="px-4 py-3">Datum</div>
                    {employees.map(emp => <div key={emp.id} className="px-1 py-3 text-center truncate">{emp.name}</div>)}
                    <div className="px-4 py-3">Vytížení dne</div>
                  </div>
                  <div className="flex-1">
                    <AutoSizer>
                      {({ height, width }: any) => (
                        <List height={height} itemCount={daysInMonth.length} itemSize={65} width={width} itemData={listData}>
                          {AllEmployeesRow}
                        </List>
                      )}
                    </AutoSizer>
                  </div>
                </div>
              ) : selectedEmployeeId === 'market' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto p-2">
                    {offeredShifts.length === 0 ? (
                        <div className="col-span-full py-20 text-center opacity-30">
                            <Repeat size={48} className="mx-auto mb-4" />
                            <p className="font-bold">Burza je momentálně prázdná.</p>
                        </div>
                    ) : offeredShifts.map(s => (
                        <div key={s.id} className="bg-white rounded-3xl border-2 border-orange-200 p-6 shadow-sm flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                              <div>
                                <div className="text-lg font-black">{new Date(s.date).toLocaleDateString('cs-CZ')}</div>
                                <div className="text-xs text-slate-500 font-bold">Nabízí: {employees.find(e => e.id === s.employeeId)?.name}</div>
                              </div>
                              <div className={`px-3 py-1 rounded-full font-black text-xs ${SHIFT_STYLES[s.confirmedType] || 'bg-slate-100'}`}>{s.confirmedType}</div>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-xl flex justify-between font-mono font-bold border border-slate-200"><span>{s.startTime} - {s.endTime}</span><span>Pauza: {s.breakDuration}m</span></div>
                          <button onClick={() => handleClaimShift(s)} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md active:scale-95">PŘEVZÍT SMĚNU</button>
                        </div>
                    ))}
                </div>
              ) : (
                <div className={`rounded-3xl shadow-sm border overflow-hidden flex flex-col flex-1 ${viewMode === 'audit' ? 'bg-sky-50/20 border-secondary/30' : 'bg-white border-slate-200'}`}>
                  <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-black text-slate-800 text-xl">Výkaz: {selectedEmployee?.name} {viewMode === 'audit' && '(AUTORITATIVNÍ)'}</h2>
                    <button onClick={handleExportIndividual} className="text-xs font-bold flex items-center gap-2 bg-white border-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                      <FileDown size={16} /> Exportovat výkaz (Excel)
                    </button>
                  </div>
                  {employeeStats && (
                    <div className="px-8 py-5 bg-white border-b">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-black uppercase text-slate-400">Měsíční plnění</span>
                        <span className="text-sm font-black text-primary">{Math.round(employeeStats.progress)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${viewMode === 'audit' ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${employeeStats.progress}%` }}></div>
                      </div>
                      <div className="mt-6"><StatsCard stats={employeeStats.stats} /></div>
                    </div>
                  )}
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 border-b sticky top-0 z-10">
                        <tr className="text-slate-500 text-[10px] uppercase font-black tracking-widest">
                          <th className="px-6 py-4 w-40">Den</th>
                          <th className="px-2 py-4 w-48">Dostupnost</th>
                          <th className="px-2 py-4 w-32">Směna</th>
                          <th className="px-2 py-4 w-64 text-center">Čas</th>
                          <th className="px-2 py-4 w-24 text-center">Pauza</th>
                          <th className="px-4 py-4 text-center w-24">Hodin</th>
                          <th className="px-2 py-4">Akce</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {daysInMonth.map((day) => {
                          const prevDay = new Date(day.getTime() - 86400000);
                          const psArr = getShiftsForDay(prevDay, selectedEmployeeId);
                          const sArr = getShiftsForDay(day, selectedEmployeeId);
                          return <ShiftRow key={day.toISOString()} date={day} employeeId={selectedEmployeeId} employee={selectedEmployee} shift={sArr[0]} onChange={handleShiftChange} shiftDefinitions={allShiftDefinitions} validation={sArr[0] ? validateShiftRules(sArr[0], prevDay ? psArr[0] : undefined) : undefined} isLocked={monthLocked && viewMode === 'live'} />;
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="md:hidden flex-1 flex flex-col min-h-0">
              <div className="flex bg-slate-200/60 p-1 rounded-2xl mb-4 self-center shrink-0 border border-slate-200">
                 <button onClick={() => setViewMode('live')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'live' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Ostrý</button>
                 <button onClick={() => setViewMode('audit')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'audit' ? 'bg-secondary text-white shadow-sm' : 'text-slate-500'}`}>Admin</button>
              </div>

              <div className="flex bg-slate-200 p-1 rounded-xl mb-4 self-center shrink-0">
                <button onClick={() => setMobileVsechView('dnes')} className={`px-6 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${mobileVsechView === 'dnes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Dnes</button>
                <button onClick={() => setMobileVsechView('mesic')} className={`px-6 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${mobileVsechView === 'mesic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Měsíc</button>
              </div>

              {selectedEmployeeId === 'all' ? (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-6 pb-20 no-scrollbar">
                    {mobileVsechView === 'mesic' && (
                      <div className="px-2 space-y-3">
                        {viewMode === 'audit' && (
                          <button onClick={handleCloneMonth} className="w-full py-4 bg-amber-50 border-2 border-secondary rounded-[24px] text-[10px] font-black uppercase text-secondary flex items-center justify-center gap-3 shadow-sm active:bg-amber-100">
                             <FileUp size={16} /> Kopírovat ostrá data sem
                          </button>
                        )}
                        <button onClick={handleExportAll} className="w-full py-4 bg-white border-2 border-slate-100 rounded-[24px] text-[10px] font-black uppercase text-slate-600 flex items-center justify-center gap-3 shadow-sm active:bg-slate-50">
                           <FileDown size={18} /> Exportovat tým (Excel)
                        </button>
                      </div>
                    )}
                    {mobileDisplayDays.map(day => {
                      const dSh = employees.map(emp => ({ emp, shiftArr: getShiftsForDay(day, emp.id) })).filter(item => item.shiftArr.some(s => s.confirmedType && s.confirmedType !== 'OFF'));
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const holiday = isCzechHoliday(day);
                      return (
                        <div key={day.toISOString()} className={`rounded-[32px] border shadow-sm overflow-hidden ${holiday ? 'bg-amber-50 border-amber-200' : isWeekend ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'}`}>
                          <div className="px-6 py-4 border-b border-black/5 flex justify-between items-center">
                            <span className="font-black text-slate-900 text-lg">{day.getDate()}. {day.getMonth()+1}. <span className="text-xs text-slate-400 uppercase ml-2">{getDayShortNameCz(day)}</span></span>
                            {holiday && <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">{holiday}</span>}
                          </div>
                          <div className="p-4 space-y-3">
                            {dSh.length === 0 ? <div className="text-center py-4 text-slate-300 italic text-sm">Volný den</div> : dSh.map(({ emp, shiftArr }) => (
                              <div key={emp.id} className="space-y-2">
                                {shiftArr.filter(s => s.confirmedType !== 'OFF').map((shift, sIdx) => (
                                  <div key={sIdx} className={`flex items-center justify-between p-4 rounded-2xl border shadow-sm ${SHIFT_STYLES[shift!.confirmedType] || 'bg-slate-100'}`}>
                                    <span className="font-black text-lg">{emp.name} {shiftArr.length > 1 && `(${sIdx+1})`}</span>
                                    <div className="text-right font-black">
                                      <div className="text-[10px] uppercase opacity-60 leading-none mb-1">{shift!.confirmedType}</div>
                                      <div className="text-base">{shift!.startTime || 'Fond'}-{shift!.endTime || ''}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : selectedEmployeeId === 'market' ? (
                 <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
                    {offeredShifts.map(s => (
                        <div key={s.id} className={`bg-white rounded-3xl border-2 border-orange-200 p-6 shadow-sm flex flex-col gap-4 ${viewMode === 'audit' ? 'opacity-50' : ''}`}>
                          <div className="flex justify-between items-start">
                              <div>
                                <div className="text-xl font-black">{new Date(s.date).toLocaleDateString('cs-CZ')}</div>
                                <div className="text-xs text-slate-500 font-bold">Nabízí: {employees.find(e => e.id === s.employeeId)?.name}</div>
                              </div>
                              <div className={`px-4 py-1.5 rounded-xl font-black text-sm border-2 ${SHIFT_STYLES[s.confirmedType] || 'bg-slate-100'}`}>{s.confirmedType}</div>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl flex justify-between font-mono font-black text-lg border-2 border-dashed border-slate-200"><span>{s.startTime} - {s.endTime}</span><span>Pauza: {s.breakDuration}m</span></div>
                          <button onClick={() => handleClaimShift(s)} disabled={viewMode === 'audit'} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg hover:bg-orange-600 active:scale-95 transition-all disabled:grayscale disabled:opacity-50">PŘEVZÍT SMĚNU</button>
                        </div>
                    ))}
                 </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
                  {employeeStats && mobileVsechView === 'mesic' && (
                    <div className={`bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-4 ${viewMode === 'audit' ? 'border-secondary/30 bg-sky-50/10' : ''}`}>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-black uppercase text-slate-400">Plnění fondu {viewMode === 'audit' && '(ADMIN)'}</span>
                        <span className="text-base font-black text-primary">{Math.round(employeeStats.progress)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${viewMode === 'audit' ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${employeeStats.progress}%` }}></div>
                      </div>
                      <div className="mt-4"><StatsCard stats={employeeStats.stats} /></div>
                      <button onClick={handleExportIndividual} className="w-full mt-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                        <FileDown size={16} /> Exportovat Excel
                      </button>
                    </div>
                  )}
                  {mobileDisplayDays.map(day => { 
                    const prevDay = new Date(day.getTime() - 86400000);
                    const psArr = getShiftsForDay(prevDay, selectedEmployeeId); 
                    const sArr = getShiftsForDay(day, selectedEmployeeId); 
                    return <ShiftCard key={day.toISOString()} date={day} employeeId={selectedEmployeeId} shifts={sArr} onSave={handleShiftChange} shiftDefinitions={allShiftDefinitions} validation={sArr[0] ? validateShiftRules(sArr[0], prevDay ? psArr[0] : undefined) : undefined} isLocked={monthLocked && viewMode === 'live'} />; 
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Undo Snackbar */}
      {undoStack && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 bg-slate-900 text-white px-6 py-4 rounded-[24px] shadow-2xl animate-in slide-in-from-bottom-10">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase text-slate-400">Záznam upraven</span>
            <span className="text-sm font-bold">Chcete to vrátit?</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleUndo} className="bg-primary hover:bg-primaryHover text-white px-5 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2">
              <Undo2 size={16} /> Vzít zpět
            </button>
            <button onClick={() => setUndoStack(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

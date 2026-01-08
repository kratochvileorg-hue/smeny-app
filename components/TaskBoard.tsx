
import React, { useState } from 'react';
import { Task, Employee, AppUser } from '../types';
import { Plus, Trash, Check, Clock, X, Users, MessageSquare, Discord } from './Icons';

interface TaskBoardProps {
  tasks: Task[];
  employees: Employee[];
  currentUser: AppUser | null;
  currentIdentity: Employee | null;
  onTaskChange: (task: Task, action: 'create' | 'update' | 'delete') => void;
}

const NewTaskModal = ({ isOpen, onClose, employees, currentUser, onSave }: { 
  isOpen: boolean, 
  onClose: () => void, 
  employees: Employee[], 
  currentUser: AppUser | null,
  onSave: (task: Task) => void 
}) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title) return alert("Zadejte název úkolu.");
    const newTask: Task = {
      id: '', 
      title,
      description: desc,
      status: 'todo',
      priority,
      assigneeId,
      createdBy: currentUser?.email || 'system',
      createdAt: new Date().toISOString()
    };
    onSave(newTask);
    onClose();
    setTitle(''); setDesc(''); setPriority('medium'); setAssigneeId(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">Vytvořit nový úkol</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Název úkolu</label>
            <input 
              placeholder="Co je potřeba udělat?" 
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Popis / Poznámky</label>
            <textarea 
              placeholder="Bližší detaily..." 
              rows={3}
              value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Priorita</label>
               <select 
                value={priority} onChange={e => setPriority(e.target.value as any)}
                className="w-full p-3 border rounded-xl outline-none bg-white"
               >
                 <option value="low">Nízká</option>
                 <option value="medium">Střední</option>
                 <option value="high">Vysoká</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Přiřazení</label>
               <select 
                value={assigneeId || ''} onChange={e => setAssigneeId(e.target.value || null)}
                className="w-full p-3 border rounded-xl outline-none bg-white"
               >
                 <option value="">Veřejný úkol</option>
                 {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
               </select>
            </div>
          </div>
        </div>
        <div className="p-6 border-t bg-slate-50 flex gap-3 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-600">Zrušit</button>
          <button onClick={handleSave} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg">Vytvořit úkol</button>
        </div>
      </div>
    </div>
  );
};

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, employees, currentUser, currentIdentity, onTaskChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const activeTasks = tasks.filter(t => t.status === 'in-progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const TaskCard = ({ task }: { task: Task }) => {
    const assignee = employees.find(e => e.id === task.assigneeId);
    const priorityColor = task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-orange-400' : 'bg-blue-400';
    
    return (
      <div className={`bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all group relative`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${priorityColor}`} />
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">
              {task.discordMessageId ? 'Z externího zdroje' : 'Interní záznam'}
            </span>
          </div>
          <button onClick={() => onTaskChange(task, 'delete')} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-opacity">
            <Trash size={14} />
          </button>
        </div>
        <h4 className="font-bold text-slate-900 mb-1">{task.title}</h4>
        {task.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>}
        
        {task.discordMessageId && (
          <div className="mb-3 px-2 py-1.5 bg-slate-50 rounded-lg text-[9px] font-mono text-slate-500 flex justify-between border border-slate-100">
            <span className="flex items-center gap-1"><Discord size={10} /> Link ID:</span>
            <span className="font-bold text-primary">{task.discordMessageId}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
            {assignee ? (
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{assignee.name}</span>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Nepřiřazeno</span>
            )}
          </div>
          
          <div className="flex gap-2">
            {task.status !== 'done' ? (
              <button 
                onClick={() => onTaskChange({ ...task, status: task.status === 'todo' ? 'in-progress' : 'done' }, 'update')}
                className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase hover:bg-primary transition-colors shadow-sm"
              >
                {task.status === 'todo' ? 'Zahájit' : 'Dokončit'}
              </button>
            ) : (
              <div className="flex items-center gap-1 text-green-600 font-bold text-[10px] uppercase">
                <Check size={14} /> Hotovo
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <NewTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} employees={employees} currentUser={currentUser} onSave={t => onTaskChange(t, 'create')} />

      <div className="flex justify-between items-center mb-6 shrink-0 px-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Nástěnka úkolů</h2>
          <p className="text-xs text-slate-500 font-medium">Přehled a stav probíhajících prací</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primaryHover transition-all shadow-lg shadow-blue-100">
          <Plus size={18} /> NOVÝ ÚKOL
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden pb-4">
        {/* Sloupec: K vyřízení */}
        <div className="flex flex-col gap-3 min-h-0 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">K vyřízení ({todoTasks.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
            {todoTasks.map(t => <TaskCard key={t.id} task={t} />)}
            {todoTasks.length === 0 && (
              <div className="py-10 text-center opacity-30 italic text-xs text-slate-400">Žádné nové úkoly</div>
            )}
          </div>
        </div>

        {/* Sloupec: V procesu */}
        <div className="flex flex-col gap-3 min-h-0 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">V procesu ({activeTasks.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
            {activeTasks.map(t => <TaskCard key={t.id} task={t} />)}
          </div>
        </div>

        {/* Sloupec: Dokončeno */}
        <div className="flex flex-col gap-3 min-h-0 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Dokončeno ({doneTasks.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
            {doneTasks.map(t => <TaskCard key={t.id} task={t} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

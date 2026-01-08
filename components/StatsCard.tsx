
import React from 'react';
import { Stats } from '../types';
import { Clock, Calendar, CreditCard, AlertTriangle, Check } from './Icons';

interface StatsCardProps {
  stats: Stats;
}

export const StatsCard: React.FC<StatsCardProps> = ({ stats }) => {
  const isDeficit = stats.diff < 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Pracovní dny</p>
            <p className="text-xl font-black text-slate-900">{stats.workDays}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Fond / Rozdíl</p>
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-black text-slate-900">{stats.monthlyFund}</span>
              <span className={`text-sm font-black ${isDeficit ? 'text-danger' : 'text-success'}`}>
                ({stats.diff > 0 ? '+' : ''}{stats.diff.toFixed(1)}h)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-full text-amber-600">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Stravenky (6h+)</p>
            <p className="text-xl font-black text-slate-900">{stats.mealVouchers}</p>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl shadow-lg flex items-center space-x-4 text-white">
          <div className="p-3 bg-white/10 rounded-full">
            <Check size={24} className="text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Celkem pro mzdu</p>
            <p className="text-xl font-black">{stats.totalHours.toFixed(1)}h</p>
          </div>
        </div>
      </div>

      {/* Rozpis pro účetní */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
        <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Detailní rozpis pro mzdovou účetní</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-600">Reálně odpracováno:</span>
            <span className="text-lg font-black text-slate-900">{stats.workHours.toFixed(1)} h</span>
          </div>
          <div className="flex flex-col border-l-0 sm:border-l border-slate-200 sm:pl-6">
            <span className="text-xs font-bold text-emerald-600">Čerpaná dovolená:</span>
            <span className="text-lg font-black text-emerald-700">{stats.vacationHours.toFixed(1)} h</span>
          </div>
          <div className="flex flex-col border-l-0 sm:border-l border-slate-200 sm:pl-6">
            <span className="text-xs font-bold text-red-500">Nemocenské volno:</span>
            <span className="text-lg font-black text-red-600">{stats.sickHours.toFixed(1)} h</span>
          </div>
        </div>
      </div>
    </div>
  );
};

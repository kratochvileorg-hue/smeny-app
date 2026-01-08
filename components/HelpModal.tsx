
import React from 'react';
import { SHIFT_STYLES } from '../utils';
import { X, Calendar, Camera, FileDown, Settings, HelpCircle, FileUp, Printer } from './Icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const legendItems = [
    { code: 'R', desc: 'Ranní směna', detail: 'Začátek obvykle ráno (např. 09:00 - 13:30).' },
    { code: 'C', desc: 'Celodenní směna', detail: 'Plná pracovní doba (např. 09:00 - 18:00).' },
    { code: 'O', desc: 'Odpolední směna', detail: 'Začátek odpoledne do zavíračky (např. 13:30 - 18:00).' },
    { code: 'S', desc: 'Sklad', detail: 'Práce ve skladu.' },
    { code: 'P', desc: 'Prodejna', detail: 'Práce na prodejně.' },
    { code: 'OFF', desc: 'Volno', detail: 'Nastaví den jako volný (vynuluje časy). Nepočítá se do fondu.' },
    { code: 'DOV', desc: 'Dovolená', detail: 'Placená dovolená.' },
    { code: 'SICK', desc: 'Nemocenská', detail: 'Zdravotní neschopnost.' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="text-primary" size={24} /> 
            Nápověda
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 p-1 rounded-full hover:bg-slate-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8 flex-1">
          
          {/* Section 1: Legenda směn */}
          <section>
            <h3 className="text-sm uppercase tracking-wider font-bold text-slate-500 mb-4 border-b border-slate-100 pb-2">
              Typy směn a legenda
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {legendItems.map((item) => (
                <div key={item.code} className="flex items-start gap-3 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-sm border shadow-sm ${SHIFT_STYLES[item.code] || 'bg-slate-100 text-slate-600'}`}>
                    {item.code}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{item.desc}</div>
                    <div className="text-xs text-slate-500 leading-tight mt-0.5">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Funkce */}
          <section>
            <h3 className="text-sm uppercase tracking-wider font-bold text-slate-500 mb-4 border-b border-slate-100 pb-2">
              Funkce aplikace
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 h-fit"><FileDown size={20} /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Export Excel</h4>
                  <p className="text-xs text-slate-500">Stáhne aktuální měsíc do souboru .xlsx pro zálohu nebo tisk.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 h-fit"><Calendar size={20} /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Export Kalendář (.ics)</h4>
                  <p className="text-xs text-slate-500">
                    Umožní nahrát směny do vašeho kalendáře (Google, Apple). Na iPhonu se otevře sdílecí dialog.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 h-fit"><Camera size={20} /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">AI Skener</h4>
                  <p className="text-xs text-slate-500">
                    Vyfoťte papírovou docházku a umělá inteligence automaticky rozpozná a vyplní časy příchodů a odchodů.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 h-fit"><Printer size={20} /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Tisk</h4>
                  <p className="text-xs text-slate-500">
                    Vytvoří tiskovou sestavu docházky pro podpis.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Jak zapisovat */}
          <section className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
              💡 Jak správně zapisovat
            </h3>
            <ul className="list-disc list-inside text-xs text-blue-700 space-y-1 ml-1">
              <li>Časy zadávejte ve formátu <strong>HH:MM</strong> (např. 09:00).</li>
              <li>Pro smazání směny vyberte typ <strong>OFF</strong> (automaticky vymaže časy).</li>
              <li>Pauza se zadává v minutách (např. 30). Zákonná pauza je povinná po 6 hodinách.</li>
              <li>V mobilní verzi klikněte na tlačítko <strong>"Upravit"</strong> pro detailní editaci.</li>
            </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-sm">
            Rozumím
          </button>
        </div>
      </div>
    </div>
  );
};


import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, X } from './Icons';

interface PrintableTimesheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrintableTimesheet: React.FC<PrintableTimesheetProps> = ({ isOpen, onClose }) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Dochazka`,
  });

  if (!isOpen) return null;

  // Masivní "hřeben" na čas
  const TimeComb = () => (
    <div className="flex items-center gap-[2px]">
      {/* Hodiny */}
      <div className="w-7 h-6 border-2 border-gray-800 bg-white"></div>
      <div className="w-7 h-6 border-2 border-gray-800 bg-white"></div>
      
      <span className="font-black text-xl px-0.5 pb-1 leading-none text-black">:</span>
      
      {/* Minuty */}
      <div className="w-7 h-6 border-2 border-gray-800 bg-white"></div>
      <div className="w-7 h-6 border-2 border-gray-800 bg-white"></div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col border border-slate-100 max-h-[95vh]">
        
        {/* Toolbar */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Printer className="text-primary" /> Tisk docházky
            </h2>
          </div>

          <div className="flex items-center gap-2">
             <button 
              onClick={() => handlePrint()}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primaryHover transition-all shadow font-bold text-sm"
            >
              <Printer size={18} />
              Vytisknout
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-2 rounded-full hover:bg-slate-200 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* PREVIEW / PRINT AREA */}
        <div className="p-4 bg-gray-500 flex-1 overflow-auto flex justify-center">
          <div 
            ref={componentRef} 
            className="bg-white shadow-2xl print:shadow-none text-black font-sans mx-auto relative print:m-0"
            style={{ 
              width: '210mm', 
              height: '296mm',      // A4
              padding: '8mm 10mm',  // Okraje
              boxSizing: 'border-box',
              overflow: 'hidden',   
              pageBreakAfter: 'avoid'
            }}
          >
            <div className="flex flex-col h-full w-full">
              
              {/* Hlavička */}
              <div className="flex justify-between items-end border-b-4 border-black pb-1 mb-1">
                <h1 className="text-3xl font-black uppercase tracking-widest text-black leading-none transform translate-y-1">DOCHÁZKA</h1>
                
                <div className="flex gap-4 items-end">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-600 leading-none mb-0.5">Měsíc / Rok:</span>
                        <div className="border-2 border-gray-600 w-28 h-8 bg-white"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-600 leading-none mb-0.5">ID / Jméno:</span>
                        <div className="border-2 border-gray-600 w-40 h-8 bg-white"></div>
                    </div>
                </div>
              </div>

              {/* Tabulka */}
              <div className="flex-1">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-black text-white text-[10px] uppercase tracking-wider">
                      <th className="py-0.5 px-1 border border-black w-10 text-center">Datum</th>
                      <th className="py-0.5 px-1 border border-black text-center">Příchod</th>
                      <th className="py-0.5 px-1 border border-black text-center">Odchod</th>
                      <th className="py-0.5 px-1 border border-black w-12 text-center">Pauza</th>
                      <th className="py-0.5 px-1 border border-black w-16 text-center">Přejezd</th>
                      <th className="py-0.5 px-1 border border-black text-left pl-2">Poznámka</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 31 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-400 h-[8.2mm]"> {/* Mírně zvýšeno, protože není patička */}
                        
                        {/* Datum */}
                        <td className="text-center font-bold text-black border-r border-gray-400 text-sm bg-gray-100/50 leading-none">
                          {i + 1}.
                        </td>

                        {/* Příchod */}
                        <td className="text-center px-1 border-r border-gray-400 bg-blue-50/10 w-[65px]">
                          <div className="flex justify-center items-center h-full pt-[1px]">
                              <TimeComb />
                          </div>
                        </td>

                        {/* Odchod */}
                        <td className="text-center px-1 border-r border-gray-400 bg-orange-50/10 w-[65px]">
                          <div className="flex justify-center items-center h-full pt-[1px]">
                               <TimeComb />
                          </div>
                        </td>

                         {/* Pauza */}
                        <td className="text-center border-r border-gray-400 px-1 align-middle">
                           <div className="border-b-2 border-gray-300 mx-auto w-8 h-4"></div>
                        </td>

                        {/* Přejezd - Nový sloupec */}
                        <td className="text-center border-r border-gray-400 px-1 align-middle">
                           <div className="border-b-2 border-gray-300 mx-auto w-12 h-4"></div>
                        </td>

                         {/* Poznámka - Nový sloupec (zabere zbytek) */}
                        <td className="border-r border-gray-400 bg-gray-50/10"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Patička odstraněna dle požadavku, necháno jen malé místo dole */}
              <div className="h-2 w-full"></div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableTimesheet;

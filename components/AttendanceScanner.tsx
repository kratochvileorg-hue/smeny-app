import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Shift } from '../types';
import { smartRoundTime } from '../utils';
import { Camera, Check, X, AlertTriangle, Loader2, ArrowRight } from './Icons';

interface ScannedRecord {
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
}

interface ReconciliationItem {
  shiftId: string;
  employeeName: string;
  date: string;
  planned: { start: string; end: string };
  scanned: { start: string; end: string };
  final: { start: string; end: string };
  status: 'MATCH' | 'ROUNDED' | 'ANOMALY' | 'MISSING_PLAN';
}

interface AttendanceScannerProps {
  shifts: Shift[];
  onApplyChanges: (updates: Partial<Shift>[]) => void;
  onClose: () => void;
}

export const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ shifts, onApplyChanges, onClose }) => {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setIsProcessing(true);

    try {
      const base64Data = image.split(',')[1];
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data,
              },
            },
            {
              text: `Analyzuj tuto fotku docházkového archu. 
              Extrahuj záznamy o docházce a vrať je v JSON formátu. 
              U každého záznamu uveď: "employeeName", "date" (ve formátu RRRR-MM-DD), "checkIn" (HH:MM) a "checkOut" (HH:MM).
              Pokud je údaj nečitelný, použij null.`
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              records: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    employeeName: { type: Type.STRING, description: "Jméno zaměstnance" },
                    date: { type: Type.STRING, description: "Datum ve formátu YYYY-MM-DD" },
                    checkIn: { type: Type.STRING, description: "Čas příchodu HH:MM" },
                    checkOut: { type: Type.STRING, description: "Čas odchodu HH:MM" }
                  },
                  required: ["employeeName", "date"]
                }
              }
            }
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text) as { records: ScannedRecord[] };
        const reconciliation = performSmartReconciliation(data.records);
        setReconciliationData(reconciliation);
      }

    } catch (error) {
      console.error("AI Processing failed:", error);
      alert("Zpracování selhalo. Zkontrolujte připojení k internetu a platnost API klíče.");
    } finally {
      setIsProcessing(false);
    }
  };

  const performSmartReconciliation = (scannedRecords: ScannedRecord[]): ReconciliationItem[] => {
    const results: ReconciliationItem[] = [];

    scannedRecords.forEach(record => {
      const matchedShift = shifts.find(s => s.date === record.date);
      
      if (matchedShift) {
        const roundStart = smartRoundTime(record.checkIn || '', matchedShift.startTime);
        const roundEnd = smartRoundTime(record.checkOut || '', matchedShift.endTime);

        let status: ReconciliationItem['status'] = 'MATCH';
        if (roundStart.status === 'ANOMALY' || roundEnd.status === 'ANOMALY') status = 'ANOMALY';
        else if (roundStart.status === 'ROUNDED' || roundEnd.status === 'ROUNDED') status = 'ROUNDED';

        results.push({
          shiftId: matchedShift.id,
          employeeName: record.employeeName || 'Neznámý',
          date: record.date,
          planned: { start: matchedShift.startTime, end: matchedShift.endTime },
          scanned: { start: record.checkIn || '-', end: record.checkOut || '-' },
          final: { start: roundStart.finalTime, end: roundEnd.finalTime },
          status
        });
      }
    });

    return results;
  };

  const handleConfirm = () => {
    const updates: Partial<Shift>[] = reconciliationData.map(item => ({
      id: item.shiftId,
      startTime: item.final.start,
      endTime: item.final.end,
      note: `Importováno přes AI (${new Date().toLocaleDateString()})`
    }));
    onApplyChanges(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
        <div className="p-6 border-b flex justify-between items-center bg-sky-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Camera className="text-primary" /> Skener docházky
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Automatické rozpoznání textu z fotky</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed border-sky-100 rounded-[48px] p-12 text-center hover:bg-white hover:border-sky-300 cursor-pointer transition-all group bg-white/50"
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <div className="mx-auto w-24 h-24 bg-sky-500/10 text-sky-600 rounded-[32px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                <Camera size={48} />
              </div>
              <p className="font-black text-slate-700 text-2xl">Vložte fotku docházky</p>
              <p className="text-sm text-slate-400 font-bold uppercase mt-2">Podporuje obrázky z galerie i přímé focení</p>
            </div>
          ) : (
            <div className="space-y-6">
              {!reconciliationData.length && !isProcessing && (
                 <div className="relative rounded-[40px] overflow-hidden shadow-2xl border-8 border-white">
                    <img src={image} alt="Preview" className="w-full max-h-96 object-cover" />
                    <div className="absolute inset-0 bg-sky-900/20 flex items-center justify-center backdrop-blur-[1px]">
                      <button onClick={processImage} className="px-10 py-5 bg-primary text-white font-black rounded-3xl shadow-2xl hover:scale-105 transition-transform flex items-center gap-3 uppercase text-sm tracking-widest border-2 border-sky-400">
                        Zahájit analýzu
                      </button>
                    </div>
                 </div>
              )}

              {isProcessing && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                    <Loader2 size={80} className="text-primary mb-6" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-4 h-4 bg-sky-500 rounded-full animate-ping" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-800">AI analyzuje záznamy...</p>
                  <p className="text-sm text-slate-400 font-bold uppercase mt-2 animate-pulse">Trvá to obvykle 5-10 sekund</p>
                </div>
              )}

              {reconciliationData.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest flex items-center gap-2">
                       <Check className="text-primary" /> Nalezené záznamy
                    </h3>
                    <div className="flex gap-4 text-[10px] font-black uppercase">
                       <span className="flex items-center gap-1 text-sky-600"><div className="w-2 h-2 rounded-full bg-sky-500"/> Shoda / Zaokrouhleno</span>
                       <span className="flex items-center gap-1 text-red-600"><div className="w-2 h-2 rounded-full bg-red-500"/> Anomálie</span>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {reconciliationData.map((item, idx) => (
                      <div key={idx} className={`p-5 rounded-[28px] border-2 flex flex-col md:flex-row items-center justify-between gap-4 transition-all shadow-sm ${
                        item.status === 'ANOMALY' ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100 hover:border-sky-200'
                      }`}>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white shadow-lg text-lg ${
                             item.status === 'ANOMALY' ? 'bg-red-500' : 'bg-sky-500'
                           }`}>
                             {item.employeeName.charAt(0)}
                           </div>
                           <div>
                             <div className="font-black text-slate-900 text-lg leading-tight">{item.employeeName}</div>
                             <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{new Date(item.date).toLocaleDateString('cs-CZ')}</div>
                           </div>
                        </div>
                        
                        <div className="flex items-center justify-between w-full md:w-auto gap-4 bg-slate-100/50 p-4 rounded-2xl border border-slate-200">
                           <div className="text-center px-2">
                             <div className="text-[8px] uppercase text-slate-400 font-black">Plán</div>
                             <div className="font-mono text-xs font-bold text-slate-500">{item.planned.start} - {item.planned.end}</div>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                           <div className="text-center px-2">
                             <div className="text-[8px] uppercase text-slate-400 font-black">Naskenováno</div>
                             <div className="font-mono text-xs font-bold text-slate-800">{item.scanned.start} - {item.scanned.end}</div>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                           <div className="text-center px-2">
                             <div className="text-[8px] uppercase text-primary font-black">K zápisu</div>
                             <div className={`font-mono font-black text-lg ${item.status === 'ANOMALY' ? 'text-red-600' : 'text-primary'}`}>{item.final.start} - {item.final.end}</div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {reconciliationData.length > 0 && (
          <div className="p-8 border-t bg-white flex flex-col sm:flex-row justify-end gap-3">
            <button onClick={() => { setImage(null); setReconciliationData([]); }} className="px-8 py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-700 transition-colors">Zkusit znovu</button>
            <button onClick={handleConfirm} className="px-10 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-sky-100 hover:bg-primaryHover transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest border-b-4 border-sky-700">
              <Check size={20} /> Zapsat do docházky
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
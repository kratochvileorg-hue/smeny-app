
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logErrorToDb } from '../firebase';
import { AlertTriangle, RefreshCw, X } from './Icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    logErrorToDb(error, `React ErrorBoundary: ${errorInfo.componentStack}`);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-red-100 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Ups, něco se pokazilo</h1>
            <p className="text-slate-500 mb-6">
              Omlouváme se, aplikace narazila na chybu. Incident byl automaticky nahlášen vývojáři k opravě.
            </p>

            <div className="bg-slate-50 rounded-lg p-3 mb-8 text-left border border-slate-200 overflow-hidden">
               <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Technický detail:</div>
               <div className="text-xs font-mono text-red-600 truncate">
                 {this.state.error?.message}
               </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primaryHover active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Obnovit aplikaci
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
              >
                Zkusit pokračovat
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Fix: Class components access props via this.props
    return this.props.children;
  }
}

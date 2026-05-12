import { Minus, Square, X, Monitor, Cpu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => {
    try {
      const electron = (window as any).require('electron');
      electron.ipcRenderer.invoke('window-minimize');
    } catch (e) {
      console.warn('Electron IPC not available');
    }
  };

  const handleMaximize = () => {
    try {
      const electron = (window as any).require('electron');
      electron.ipcRenderer.invoke('window-maximize');
      setIsMaximized(!isMaximized);
    } catch (e) {
      console.warn('Electron IPC not available');
    }
  };

  const handleClose = () => {
    try {
      const electron = (window as any).require('electron');
      electron.ipcRenderer.invoke('window-close');
    } catch (e) {
      console.warn('Electron IPC not available');
    }
  };

  return (
    <div 
      className="h-12 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 select-none z-[1000] sticky top-0"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center px-6 gap-3">
        <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu size={14} className="text-white" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">
          SmartControl <span className="text-indigo-600">IoT</span>
        </span>
      </div>

      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={handleMinimize}
          className="px-5 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-900 transition-all group"
        >
          <Minus size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </button>
        <button 
          onClick={handleMaximize}
          className="px-5 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-900 transition-all group"
        >
          <Square size={13} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </button>
        <button 
          onClick={handleClose}
          className="px-5 flex items-center justify-center hover:bg-red-500 transition-all group"
        >
          <X size={16} className="text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}

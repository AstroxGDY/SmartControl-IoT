// src/components/DeviceCard.tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface DeviceCardProps {
  name: string;
  status: string;
  isOn?: boolean;
  icon: LucideIcon;
  variant: 'purple' | 'blue';
  children?: React.ReactNode;
  showSwitch?: boolean;
}

export const DeviceCard = ({ name, status, isOn, icon: Icon, variant, children, showSwitch }: DeviceCardProps) => {
  const isPurple = variant === 'purple';
  
  return (
    <div className={`p-5 rounded-3xl border shadow-sm transition-all flex flex-col justify-between h-48
      ${isPurple ? 'bg-gradient-to-br from-purple-50 to-white border-purple-100 shadow-purple-100/50' : 'bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-blue-100/50'}`}>
      
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl ${isPurple ? 'bg-purple-100 text-purple-500' : 'bg-blue-100 text-blue-500'}`}>
          <Icon size={22} />
        </div>
        <h4 className="font-bold text-[15px] text-slate-800 leading-tight mt-1">{name}</h4>
      </div>

      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter mb-1">{status}</span>
          {children}
        </div>

        {showSwitch && (
          <div className={`w-12 h-6 rounded-full p-1 flex items-center cursor-pointer transition-colors ${isOn ? 'bg-purple-500 justify-end' : 'bg-slate-800 justify-start'}`}>
            <span className="text-[8px] font-black text-white mx-1">{isOn ? 'ON' : 'OFF'}</span>
            <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
          </div>
        )}
      </div>
    </div>
  );
};
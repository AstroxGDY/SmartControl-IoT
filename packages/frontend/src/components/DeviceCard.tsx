import React, { useState } from 'react';
import { 
  Lightbulb, Thermometer, Camera, Activity, 
  Plus, Wifi, Plug, Bot, Droplets, LucideIcon 
} from 'lucide-react';
import { DeviceDetailsModal } from './DeviceDetailsModal';
import type { DeviceType, DeviceStatus } from '../../../shared/types';

// Mapa estático para evitar el error "Created during render"
const ICON_MAP: Record<string, LucideIcon> = {
  'smart-bulb': Lightbulb,
  'thermostat': Thermometer,
  'camera': Camera,
  'sensor': Droplets,
  'outlet': Plug,
  'robot': Bot,
  'default': Wifi
};

interface DeviceCardProps {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  isOn: boolean;
  variant: 'purple' | 'blue';
}

export const DeviceCard = ({ id, name, type, status, isOn, variant }: DeviceCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const Icon = ICON_MAP[type] || ICON_MAP.default;
  const isPurple = variant === 'purple';

  return (
    <>
      <div className={`p-5 rounded-[2.5rem] border shadow-sm transition-all flex flex-col justify-between h-48
        ${isPurple 
          ? 'bg-gradient-to-br from-purple-50 to-white border-purple-100 shadow-purple-100/40' 
          : 'bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-blue-100/40'}`}>
        
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${isPurple ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
            <Icon size={24} />
          </div>
          <div className="flex flex-col">
            <h4 className="font-bold text-[16px] text-slate-800 leading-tight mt-1">{name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-slate-300'}`} />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{status}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className={`w-full py-3.5 rounded-2xl font-black text-[11px] tracking-widest transition-all flex items-center justify-center gap-2
            ${isPurple 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 hover:bg-purple-700' 
              : 'bg-slate-800 text-white shadow-lg shadow-slate-200 hover:bg-slate-900'}`}
        >
          <Plus size={14} />
          VER DETALLES
        </button>
      </div>

      <DeviceDetailsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        deviceId={id} 
        deviceName={name} 
      />
    </>
  );
};
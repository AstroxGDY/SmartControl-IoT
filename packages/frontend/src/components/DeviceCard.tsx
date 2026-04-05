import { useState } from 'react';
import {
  Lightbulb, Thermometer, Camera, Activity,
  Plus, Wifi, Plug, Bot, Droplets, type LucideIcon
} from 'lucide-react';
import { DeviceDetailsModal } from './DeviceDetailsModal';
import type { DeviceType, DeviceStatus } from '../../../shared/types';

// Mapa de iconos estáticos por tipo de dispositivo
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
  device: any; // IDevice
}

export const DeviceCard = ({ device }: DeviceCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const Icon = ICON_MAP[device.type] || ICON_MAP.default;

  // Adivinar isOn genéricamente o usar esquema
  let isOn = false;
  const dps = device.attributes?.dps;
  const schema = device.attributes?.schema || [];

  if (schema.length > 0 && dps) {
    const primarySwitch = schema.find((s: any) => s.code && s.code.startsWith('switch') && s.type === 'Boolean');
    if (primarySwitch && dps[String(primarySwitch.dp_id)] !== undefined) {
      isOn = dps[String(primarySwitch.dp_id)] === true;
    } else if (dps['1'] !== undefined) {
      isOn = dps['1'] === true; // Fallback
    }
  } else if (dps) {
    isOn = dps['20'] === true || dps['1'] === true || Object.values(dps).includes(true);
  }

  const isPurple = isOn;
  const statusText = device.status === 'online' ? (isOn ? 'Encendido' : 'Apagado') : 'Desconectado';
  const statusColor = device.status === 'online' ? (isOn ? 'bg-green-500' : 'bg-yellow-400') : 'bg-slate-300';

  return (
    <>
      <div className={`p-5 rounded-[2.5rem] border shadow-sm transition-all flex flex-col justify-between h-48
        ${isPurple
          ? 'bg-gradient-to-br from-purple-50 to-white border-purple-100 shadow-purple-100/40'
          : 'bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-blue-100/40'}`}>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-sm shrink-0 flex items-center justify-center border border-gray-100">
            {device.image && device.image.startsWith('http') ? (
              <img src={device.image} alt={device.name} className="w-full h-full object-contain" />
            ) : (
              <div className={`p-3 rounded-2xl ${isPurple ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                <Icon size={24} />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h4 className="font-bold text-[16px] text-slate-800 leading-tight mt-1 truncate">{device.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{statusText}</span>
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

      {isModalOpen && (
        <DeviceDetailsModal
          device={device}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};
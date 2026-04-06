import { useState } from 'react';
import {
  Lightbulb, Thermometer, Camera,
  Plus, Wifi, Plug, Bot, Droplets, Trash2, AlertTriangle, Loader2, type LucideIcon
} from 'lucide-react';
import { DeviceDetailsModal } from './DeviceDetailsModal';

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
  onDeleted?: (id: string) => void;
}

export const DeviceCard = ({ device, onDeleted }: DeviceCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unlinkStep, setUnlinkStep] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

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

  const handleUnlink = async () => {
    setUnlinkStep('deleting');
    setUnlinkError(null);
    console.log('[Delete] Enviando DELETE para', device._id);
    try {
      const res = await fetch(`http://localhost:3000/devices/${device._id}`, { method: 'DELETE' });
      console.log('[Delete] Respuesta:', res.status);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setUnlinkStep('idle');
      onDeleted?.(device._id);
    } catch (e: any) {
      console.error('[Delete] Fallo:', e);
      setUnlinkError(e.message ?? 'Error desconocido');
      setUnlinkStep('confirm');
    }
  };

  return (
    <>
      {/* Overlay de confirmación de desvinculación */}
      {unlinkStep !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', animation: 'fadeIn .15s ease' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5"
            style={{ animation: 'modalIn .2s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-base">¿Desvincular dispositivo?</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Se eliminará <strong className="text-slate-700">{device.name}</strong> de la base de datos local.
                  Podrás volver a añadirlo desde el escáner de red.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">Esta acción solo borra el registro local. El dispositivo físico no se verá afectado.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setUnlinkStep('idle'); setUnlinkError(null); }}
                disabled={unlinkStep === 'deleting'}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinkStep === 'deleting'}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {unlinkStep === 'deleting' ? (
                  <><Loader2 size={14} className="animate-spin" /> Desvinculando...</>
                ) : (
                  <><Trash2 size={14} /> Sí, eliminar</>
                )}
              </button>
            </div>
            {unlinkError && (
              <p className="text-xs text-red-600 font-semibold text-center mt-1">Error: {unlinkError}</p>
            )}
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modalIn {
              from { opacity: 0; transform: scale(0.92) translateY(10px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}

      <div className={`p-5 rounded-[2.5rem] border shadow-sm transition-all flex flex-col justify-between h-48 relative
        ${isPurple
          ? 'bg-gradient-to-br from-purple-50 to-white border-purple-100 shadow-purple-100/40'
          : 'bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-blue-100/40'}`}>

        {/* Botón desvincular en esquina superior derecha */}
        <button
          onClick={() => setUnlinkStep('confirm')}
          title="Eliminar dispositivo"
          className="absolute top-3 right-3 p-1.5 rounded-xl bg-white/80 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors border border-transparent hover:border-red-200 shadow-sm"
        >
          <Trash2 size={14} />
        </button>

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
          onDeleted={(id) => {
            setIsModalOpen(false);
            onDeleted?.(id);
          }}
        />
      )}
    </>
  );
};
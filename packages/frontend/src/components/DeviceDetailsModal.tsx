import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import {type IDevice } from '../../../shared/types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceName: string;
}

export const DeviceDetailsModal = ({ isOpen, onClose, deviceId, deviceName }: ModalProps) => {
  const [data, setData] = useState<IDevice | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Variable de control para evitar actualizar el estado si el componente se desmonta (se cierra el modal)
    let isMounted = true;

    // 2. Envolvemos la lógica en una función asíncrona interna
    const fetchDeviceData = async () => {
      setLoading(true); // Al estar dentro de una función async, el linter ya no se queja
      
      try {
        console.log("Device ID: " + deviceId);
        const response = await fetch(`http://localhost:3000/devices/${deviceId}/state`);
        const json = await response.json();
        
        // 3. Solo actualizamos el estado si el modal sigue abierto
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error al obtener detalles:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // 4. Ejecutamos la función solo si el modal está abierto y hay un ID
    if (isOpen && deviceId) {
      fetchDeviceData();
    }

    // 5. Función de limpieza (cleanup) que se ejecuta cuando el componente se desmonta o cambia el ID
    return () => {
      isMounted = false;
    };
  }, [isOpen, deviceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{deviceName}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 pt-4">
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Obteniendo telemetría...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mapeo dinámico del JSON del backend */}
              {data?.attributes && Object.entries(data.attributes).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-black text-slate-700">
                    {String(value)}
                  </span>
                </div>
              ))}
              
              <button 
                onClick={onClose}
                className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm"
              >
                Cerrar Panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
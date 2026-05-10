import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceCard } from '../components/DeviceCard';
import { Search, SlidersHorizontal, LayoutGrid, ListFilter, XCircle } from 'lucide-react';
import type { IDevice } from '../../../shared/types';

export default function Devices() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<IDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDevices = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch('http://localhost:3000/devices')
      .then(res => res.json())
      .then(data => {
        setDevices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const filteredDevices = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase().trim();
    if (!lowerSearch) return devices;
    
    return devices.filter(d => 
        d.name.toLowerCase().includes(lowerSearch) ||
        d._id.toLowerCase().includes(lowerSearch) ||
        d.attributes?.tuyaId?.toLowerCase().includes(lowerSearch) ||
        d.type.toLowerCase().includes(lowerSearch) ||
        d.ip?.toLowerCase().includes(lowerSearch)
    );
  }, [devices, searchTerm]);

  if (loading) {
    return (
        <div className="p-8 flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <div className="w-12 h-12 border-4 border-purple-100 dark:border-purple-900/30 border-t-purple-600 rounded-full animate-spin mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">{t('common.loading')}</p>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header & Search Bar */}
      <header className="mb-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                    {t('dashboard.manage_all', 'Gestión de Dispositivos')}
                </h1>
                <p className="text-slate-400 font-medium mt-1">
                    Controla, configura y audita tus <span className="text-purple-500 font-bold">{devices.length}</span> dispositivos vinculados
                </p>
            </div>
            <div className="flex gap-2">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
                    <LayoutGrid size={18} className="text-purple-500" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{devices.length} Total</span>
                </div>
            </div>
        </div>

        {/* Search Input Container */}
        <div className="relative group max-w-2xl">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search size={20} className="text-slate-400 group-focus-within:text-purple-500 transition-colors" />
            </div>
            <input
                type="text"
                placeholder="Busca por nombre, ID, Tuya ID, IP o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-12 py-4 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-purple-500/30 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none outline-none text-slate-700 dark:text-white font-medium placeholder:text-slate-400 transition-all"
            />
            {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-5 flex items-center text-slate-300 hover:text-red-500 transition-colors"
                >
                    <XCircle size={20} />
                </button>
            )}
        </div>
      </header>

      {filteredDevices.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 shadow-sm animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <ListFilter size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Sin resultados</h3>
            <p className="text-slate-400 font-medium mt-2">No hemos encontrado ningún dispositivo que coincida con "<span className="text-purple-500 font-bold">{searchTerm}</span>"</p>
            <button 
                onClick={() => setSearchTerm('')}
                className="mt-6 text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest hover:underline"
            >
                Limpiar búsqueda
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device._id}
              device={device}
              onDeleted={() => fetchDevices(true)} // silent refresh
            />
          ))}
        </div>
      )}
    </div>
  );
}
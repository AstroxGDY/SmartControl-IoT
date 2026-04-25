import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Battery, Zap, Clock, Smartphone, Database } from 'lucide-react';
const API_URL = 'http://localhost:3000';

interface DeviceStats {
  totalRecords: number;
  latestStatus: 'online' | 'offline' | 'error';
  latestBattery?: number;
  avgBattery?: number;
}

interface GlobalStatsData {
  device: {
    _id: string;
    name: string;
    type: string;
    image: string;
    connectionType: string;
  };
  stats: DeviceStats;
}

export default function DeviceStatistics() {
  const { t } = useTranslation();
  const [data, setData] = useState<GlobalStatsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/stats/global`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Error al obtener estadísticas');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'offline': return 'bg-slate-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-200';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div>
        <h1 className="text-4xl font-extrabold flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          <BarChart className="text-blue-600" size={40} />
          {t('statistics.title', 'Estadísticas Globales')}
        </h1>
        <p className="text-slate-500 mt-2">
          {t('statistics.subtitle', 'Visualiza el histórico de batería y estado de todos tus dispositivos')}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Database size={48} className="animate-bounce mb-4 text-blue-500" />
          <p>Consultando base de datos histórica...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-medium">
          Error: {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map(({ device, stats }) => (
            <div key={device._id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={device.image} 
                      alt={device.name} 
                      className="w-16 h-16 rounded-2xl object-cover bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.svgrepo.com/show/508699/landscape-placeholder.svg' }}
                    />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${getStatusColor(stats.latestStatus)}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate max-w-[150px]">{device.name}</h3>
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md w-fit mt-1">
                      {device.connectionType === 'Bluetooth' ? <Smartphone size={12} /> : <Zap size={12} />}
                      {device.connectionType}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {stats.latestBattery !== undefined && stats.latestBattery !== null ? (
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Battery size={20} />
                      <span className="font-semibold text-sm">Batería Actual</span>
                    </div>
                    <span className="font-black text-xl text-blue-700 dark:text-blue-300">
                      {stats.latestBattery}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-slate-400">
                     <div className="flex items-center gap-2">
                        <Battery size={20} />
                        <span className="font-medium text-sm">Sin datos de batería</span>
                     </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1">
                        <Database size={14} /> Registros
                     </div>
                     <div className="font-bold text-slate-700 dark:text-slate-200">
                        {stats.totalRecords} <span className="text-xs font-normal text-slate-400">horas</span>
                     </div>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1">
                        <Clock size={14} /> Estado
                     </div>
                     <div className="font-bold text-slate-700 dark:text-slate-200 capitalize">
                        {stats.latestStatus}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400">
              Aún no hay estadísticas recolectadas. Espera a que el cronjob se ejecute o añade dispositivos.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

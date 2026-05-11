import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DeviceCard } from '../components/DeviceCard';
import { Loader2, Activity, Shapes, ListPlus, RadioTower } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { IDevice } from '../../../shared/types';

export default function Dashboard() {
    const { t, i18n } = useTranslation();
    const [devices, setDevices] = useState<IDevice[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDevices = (silent = false) => {
        if (!silent) setLoading(true);
        fetch('http://localhost:3000/devices')
            .then(res => res.json())
            .then(data => {
                setDevices(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching devices", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleDeviceDeleted = () => {
        fetchDevices(true); // silent: no spinner, solo actualiza la lista
    };

    if (loading) {
        return (
            <div className="p-8 animate-in fade-in flex flex-col items-center justify-center h-[70vh]">
                <Loader2 size={64} className="text-blue-500 dark:text-blue-400 animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">{t('dashboard.analyzing')}</h2>
                <p className="text-gray-400 dark:text-gray-500">{t('dashboard.syncing')}</p>
            </div>
        );
    }

    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    
    // Contar por tipo
    const typeCounts = devices.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Ordenar dispositivo por fecha (más recientes primero)
    const recentActivity = [...devices].sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 4);

    return (
        <div className="p-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="mb-8 border-b pb-4 border-gray-100 dark:border-slate-800 flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100">{t('dashboard.title')}</h1>
                    <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">{new Date().toLocaleDateString(i18n.language || 'es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </header>

            {/* SECCIÓN 1: RESUMEN ORGÁNICO */}
            <section className="mb-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Card: Estado General Red */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl shadow-xl shadow-blue-200 dark:shadow-none text-white flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute -right-8 -top-8 opacity-10">
                            <RadioTower size={180} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-bold text-blue-100 mb-1 flex items-center gap-2"><Activity size={18} /> {t('dashboard.network_pulse')}</h3>
                            <p className="text-sm text-blue-200 mb-6 font-medium">{t('dashboard.network_pulse_desc')}</p>
                            
                            <div className="flex items-end gap-3 mt-4">
                                <span className="text-7xl font-black">{onlineDevices}</span>
                                <span className="text-2xl font-bold text-blue-300 pb-2">/ {totalDevices}</span>
                            </div>
                        </div>
                        
                        <div className="mt-4 bg-white/10 rounded-xl p-3 flex justify-between items-center relative z-10 backdrop-blur-sm">
                            <span className="font-semibold text-sm">{t('dashboard.ecosystem_health')}</span>
                            <span className="font-black text-sm bg-blue-500 px-3 py-1 rounded-full shadow-inner">{totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0}%</span>
                        </div>
                    </div>

                    {/* Card: Inventario */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 col-span-1 lg:col-span-2">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Shapes size={20} className="text-purple-600 dark:text-purple-400"/> {t('dashboard.inventory')}</h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 uppercase font-bold tracking-widest">{t('dashboard.distribution_type')}</p>
                            </div>
                        </div>
                        
                        {Object.keys(typeCounts).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-24 text-gray-400 dark:text-gray-500 text-sm font-semibold">
                                {t('dashboard.no_devices')}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(typeCounts).map(([type, count]) => (
                                    <div key={type} className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col shadow-sm dark:shadow-none">
                                        <span className="text-[10px] uppercase font-black tracking-wider text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 w-fit px-2 py-0.5 rounded-md mb-2 truncate max-w-full">
                                            {typeof type === 'string' && type !== 'undefined' ? type : t('common.generic')}
                                        </span>
                                        <span className="text-3xl font-black text-slate-700 dark:text-slate-200 mt-auto">{count}</span>
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('dashboard.units')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* SECCIÓN 2: ACCESO RÁPIDO */}
            <section className="mb-10">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">{t('dashboard.quick_access')}</h2>
                        <p className="text-sm text-gray-400 dark:text-gray-500">{t('dashboard.active_devices')}</p>
                    </div>
                    <Link to="/devices" className="inline-block bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-cyan-600 transition-all shadow-md shadow-cyan-100 dark:shadow-none text-center">
                        {t('dashboard.manage_all')}
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {devices.length === 0 ? (
                         <div className="col-span-full border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl p-8 text-center text-gray-400 flex flex-col items-center justify-center">
                             <Shapes size={48} className="mb-4 text-gray-300" />
                             <p className="font-bold">{t('dashboard.empty_ecosystem')}</p>
                             <p className="text-sm">{t('dashboard.empty_ecosystem_desc')}</p>
                         </div>
                    ) : (
                        devices.slice(0, 4).map((device) => (
                            <DeviceCard key={device._id} device={device} onDeleted={handleDeviceDeleted} />
                        ))
                    )}
                </div>
            </section>

            {/* SECCIÓN 3: ACTIVIDAD */}
            <section className="mb-10">
                <h2 className="text-xl font-bold mb-6 text-slate-700 dark:text-slate-300 flex items-center gap-2"><ListPlus size={24} className="text-purple-600 dark:text-purple-400"/> {t('dashboard.recent_activity')}</h2>
                <div className="space-y-4 max-w-4xl">
                    {recentActivity.length === 0 ? (
                        <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 italic">{t('dashboard.no_activity')}</p>
                    ) : (
                        recentActivity.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none transition-all hover:border-blue-200 dark:hover:border-blue-800">
                                <div className="bg-blue-50 dark:bg-blue-900/30 shrink-0 border border-blue-100 dark:border-blue-800/30 w-12 h-12 rounded-xl text-blue-600 dark:text-blue-400 flex items-center justify-center overflow-hidden p-1.5 object-contain">
                                    {item.image ? <img src={item.image} alt="device" className="w-full h-full object-contain" /> : <Shapes size={20} />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-base">{item.name}</p>
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5">{t('dashboard.via')} {item.connectionType || t('dashboard.local_udp')} • ID: {item.attributes?.tuyaId?.substring(0,6) || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 py-1.5 px-3 rounded-xl border border-gray-200 dark:border-slate-700 whitespace-nowrap">
                                        {new Date(item.createdAt).toLocaleString(i18n.language || 'es', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

        </div>
    );
}
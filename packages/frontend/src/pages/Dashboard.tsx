import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DeviceCard } from '../components/DeviceCard';
import { Loader2, Activity, Shapes, ListPlus, RadioTower, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
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
        fetchDevices(true);
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-[70vh]">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                >
                    <Loader2 size={64} className="text-indigo-500 animate-spin mb-6" />
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{t('dashboard.analyzing')}</h2>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">{t('dashboard.syncing')}</p>
                </motion.div>
            </div>
        );
    }

    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    
    const typeCounts = devices.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const recentActivity = [...devices].sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 4);

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                duration: 0.5,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="p-8 max-w-7xl mx-auto space-y-12"
        >
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200/60 dark:border-slate-800 pb-8">
                <div>
                    <h1 className="text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">{t('dashboard.title')}</h1>
                    <p className="text-slate-400 mt-3 font-bold uppercase text-xs tracking-[0.2em]">{new Date().toLocaleDateString(i18n.language || 'es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </header>

            {/* SECCIÓN 1: RESUMEN ORGÁNICO */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Card: Estado General Red */}
                <motion.div 
                    variants={itemVariants}
                    className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[3rem] shadow-2xl shadow-indigo-500/20 text-white flex flex-col justify-between relative overflow-hidden group"
                >
                    <div className="absolute -right-12 -top-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <RadioTower size={240} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-indigo-100 mb-6 flex items-center gap-2"><Activity size={16} /> {t('dashboard.network_pulse')}</h3>
                        
                        <div className="flex items-baseline gap-3">
                            <span className="text-8xl font-black leading-none">{onlineDevices}</span>
                            <span className="text-2xl font-bold text-indigo-300">/ {totalDevices}</span>
                        </div>
                        <p className="text-sm text-indigo-200 mt-4 font-bold opacity-80">{t('dashboard.network_pulse_desc')}</p>
                    </div>
                    
                    <div className="mt-8 bg-white/10 rounded-2xl p-4 flex justify-between items-center relative z-10 backdrop-blur-md border border-white/10">
                        <span className="font-black text-[10px] uppercase tracking-widest">{t('dashboard.ecosystem_health')}</span>
                        <span className="font-black text-lg">{totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0}%</span>
                    </div>
                </motion.div>

                {/* Card: Inventario */}
                <motion.div 
                    variants={itemVariants}
                    className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200/60 dark:border-slate-800 col-span-1 lg:col-span-2 shadow-sm"
                >
                    <div className="mb-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <Shapes className="text-indigo-500" size={24}/> {t('dashboard.inventory')}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-[0.2em] opacity-60">{t('dashboard.distribution_type')}</p>
                    </div>
                    
                    {Object.keys(typeCounts).length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-300 dark:text-slate-700">
                            <Shapes size={48} className="mb-4 opacity-20" />
                            <p className="font-black uppercase text-[10px] tracking-widest">{t('dashboard.no_devices')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {Object.entries(typeCounts).map(([type, count]) => (
                                <div key={type} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-[2rem] p-5 flex flex-col hover:border-indigo-500/30 transition-colors">
                                    <span className="text-[9px] uppercase font-black tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-fit px-2.5 py-1 rounded-lg mb-4 truncate max-w-full">
                                        {typeof type === 'string' && type !== 'undefined' ? type : t('common.generic')}
                                    </span>
                                    <div className="mt-auto">
                                        <span className="text-4xl font-black text-slate-800 dark:text-white">{count}</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mt-1">{t('dashboard.units')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </section>

            {/* SECCIÓN 2: ACCESO RÁPIDO */}
            <section>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t('dashboard.quick_access')}</h2>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mt-1 opacity-60">{t('dashboard.active_devices')}</p>
                    </div>
                    <Link to="/devices" className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-200 dark:shadow-none">
                        {t('dashboard.manage_all')} <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <AnimatePresence>
                        {devices.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="col-span-full border-4 border-dashed border-slate-200/60 dark:border-slate-800 rounded-[3rem] p-16 text-center text-slate-300 dark:text-slate-700 flex flex-col items-center justify-center"
                            >
                                <Shapes size={64} className="mb-6 opacity-20" />
                                <p className="font-black uppercase tracking-[0.2em] text-sm text-slate-400">{t('dashboard.empty_ecosystem')}</p>
                                <p className="text-[10px] font-bold uppercase mt-2 opacity-60 tracking-widest">{t('dashboard.empty_ecosystem_desc')}</p>
                            </motion.div>
                        ) : (
                            devices.slice(0, 4).map((device) => (
                                <motion.div key={device._id} variants={itemVariants}>
                                    <DeviceCard device={device} onDeleted={handleDeviceDeleted} />
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </section>

            {/* SECCIÓN 3: ACTIVIDAD */}
            <section className="pb-12">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                    <ListPlus size={28} className="text-indigo-500"/> {t('dashboard.recent_activity')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentActivity.length === 0 ? (
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{t('dashboard.no_activity')}</p>
                    ) : (
                        recentActivity.map((item: any, i: number) => (
                            <motion.div 
                                key={i} 
                                variants={itemVariants}
                                className="flex items-center gap-5 bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 hover:shadow-lg hover:shadow-slate-200/50 transition-all group"
                            >
                                <div className="bg-slate-50 dark:bg-slate-800 shrink-0 border border-slate-200/50 dark:border-slate-700 w-16 h-16 rounded-2xl flex items-center justify-center p-2 transition-transform group-hover:scale-110">
                                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-contain" /> : <Shapes size={24} className="text-slate-300" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight truncate">{item.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                        {t('dashboard.via')} {item.connectionType || t('dashboard.local_udp')} • ID: {item.attributes?.tuyaId?.substring(0,8) || 'N/A'}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                        {new Date(item.createdAt).toLocaleString(i18n.language || 'es', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </section>
        </motion.div>
    );
}
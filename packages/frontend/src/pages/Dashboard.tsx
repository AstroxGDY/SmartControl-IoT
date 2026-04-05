import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DeviceCard } from '../components/DeviceCard';
import { Loader2, Activity, Shapes, ListPlus, RadioTower } from 'lucide-react';
import type { IDevice } from '../../../shared/types';

export default function Dashboard() {
    const [devices, setDevices] = useState<IDevice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
    }, []);

    if (loading) {
        return (
            <div className="p-8 animate-in fade-in flex flex-col items-center justify-center h-[70vh]">
                <Loader2 size={64} className="text-blue-500 animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-slate-700">Analizando el Entorno</h2>
                <p className="text-gray-400">Escaneando red local y sincronizando estadísticas...</p>
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
            <header className="mb-8 border-b pb-4 border-gray-100 flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-800">Panel de Control</h1>
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mt-2">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </header>

            {/* SECCIÓN 1: RESUMEN ORGÁNICO */}
            <section className="mb-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Card: Estado General Red */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl shadow-xl shadow-blue-200 text-white flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute -right-8 -top-8 opacity-10">
                            <RadioTower size={180} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-bold text-blue-100 mb-1 flex items-center gap-2"><Activity size={18} /> Pulso de Red</h3>
                            <p className="text-sm text-blue-200 mb-6 font-medium">Dispositivos reportando telemetría local UDP</p>
                            
                            <div className="flex items-end gap-3 mt-4">
                                <span className="text-7xl font-black">{onlineDevices}</span>
                                <span className="text-2xl font-bold text-blue-300 pb-2">/ {totalDevices}</span>
                            </div>
                        </div>
                        
                        <div className="mt-4 bg-white/10 rounded-xl p-3 flex justify-between items-center relative z-10 backdrop-blur-sm">
                            <span className="font-semibold text-sm">Salud del Ecosistema</span>
                            <span className="font-black text-sm bg-blue-500 px-3 py-1 rounded-full shadow-inner">{totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0}%</span>
                        </div>
                    </div>

                    {/* Card: Inventario */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shapes size={20} className="text-purple-600"/> Inventario de Dispositivos</h3>
                                <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">Distribución por Tipo</p>
                            </div>
                        </div>
                        
                        {Object.keys(typeCounts).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-24 text-gray-400 text-sm font-semibold">
                                No tienes dispositivos registrados aún.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(typeCounts).map(([type, count]) => (
                                    <div key={type} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col shadow-sm">
                                        <span className="text-[10px] uppercase font-black tracking-wider text-purple-600 bg-purple-100 w-fit px-2 py-0.5 rounded-md mb-2 truncate max-w-full">
                                            {typeof type === 'string' && type !== 'undefined' ? type : 'GENERIC'}
                                        </span>
                                        <span className="text-3xl font-black text-slate-700 mt-auto">{count}</span>
                                        <span className="text-xs font-bold text-gray-500">Unidades</span>
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
                        <h2 className="text-xl font-bold text-slate-700">Acceso Rápido</h2>
                        <p className="text-sm text-gray-400">Tus dispositivos activos</p>
                    </div>
                    <Link to="/devices" className="inline-block bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-cyan-600 transition-all shadow-md shadow-cyan-100 text-center">
                        Gestionar Todos
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {devices.length === 0 ? (
                         <div className="col-span-full border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center text-gray-400 flex flex-col items-center justify-center">
                             <Shapes size={48} className="mb-4 text-gray-300" />
                             <p className="font-bold">Aún no hay ecosistema</p>
                             <p className="text-sm">Escanea la red para descubrir dispositivos</p>
                         </div>
                    ) : (
                        devices.slice(0, 4).map((device) => (
                            <DeviceCard key={device._id} device={device} />
                        ))
                    )}
                </div>
            </section>

            {/* SECCIÓN 3: ACTIVIDAD */}
            <section className="mb-10">
                <h2 className="text-xl font-bold mb-6 text-slate-700 flex items-center gap-2"><ListPlus size={24} className="text-purple-600"/> Añadidos Recientemente</h2>
                <div className="space-y-4 max-w-4xl">
                    {recentActivity.length === 0 ? (
                        <p className="text-sm font-semibold text-gray-400 italic">No hay registros históricos...</p>
                    ) : (
                        recentActivity.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-hover hover:border-blue-200">
                                <div className="bg-blue-50 shrink-0 border border-blue-100 w-12 h-12 rounded-xl text-blue-600 flex items-center justify-center overflow-hidden p-1.5 object-contain">
                                    {item.image ? <img src={item.image} alt="device" className="w-full h-full object-contain" /> : <Shapes size={20} />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 text-base">{item.name}</p>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Vía {item.connectionType || 'Red Local UDP'} • ID: {item.attributes?.tuyaId?.substring(0,6) || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold bg-gray-100 text-gray-600 py-1.5 px-3 rounded-xl border border-gray-200 whitespace-nowrap">
                                        {new Date(item.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
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
import { Lightbulb, Thermometer, Camera, Wind, Plug, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { DeviceCard } from '../components/DeviceCard';
import { Link } from 'react-router-dom';

export default function Dashboard() {
return (
<div className="p-8 animate-in fade-in duration-500">
    {/* Header */}
    <header className="mb-8">
        <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase">Smart-Control IoT &gt; Dashboard</p>
        <h1 className="text-4xl font-black mt-1 text-slate-800">Dashboard</h1>
    </header>

    {/* SECCIÓN 1: RESUMEN */}
    <section className="mb-10">
        <h2 className="text-xl font-bold mb-4 text-slate-700">Resumen del Sistema</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Card: Estado Dispositivos */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                <h3 className="font-bold text-slate-800 self-start mb-6">Estado de Dispositivos</h3>
                <div className="relative flex flex-col items-center">
                    <div className="w-32 h-16 overflow-hidden relative">
                        <div className="w-32 h-32 border-[12px] border-slate-100 rounded-full"></div>
                        <div
                            className="absolute top-0 w-32 h-32 border-[12px] border-green-500 rounded-full border-b-transparent border-r-transparent -rotate-45">
                        </div>
                    </div>
                    <div className="mt-[-20px] text-center">
                        <p className="text-3xl font-black text-slate-800">15<span
                                className="text-slate-300 text-xl">/20</span></p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Online</p>
                    </div>
                </div>
                <p className="mt-6 text-sm text-gray-400">Todo funcionando correctamente</p>
            </div>

            {/* Card: Consumo */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-800">Consumo Energético Hoy</h3>
                    <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-md">+2% vs
                        ayer</span>
                </div>
                <p className="text-3xl font-black mt-2">5.8 kWh</p>
                <div className="h-24 mt-4 bg-purple-50 rounded-2xl relative overflow-hidden">
                    <div className="absolute bottom-0 w-full h-12 bg-purple-200"
                        style={{ clipPath: 'polygon(0 80%, 20% 50%, 40% 70%, 60% 30%, 80% 60%, 100% 20%, 100% 100%, 0 100%)' }}>
                    </div>
                </div>
            </div>

            {/* Card: Alertas */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-purple-200">
                <h3 className="font-bold text-slate-800 mb-4">Alertas Activas</h3>
                <div className="space-y-3">
                    <div
                        className="bg-[#A855F7] text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-purple-200">
                        <AlertTriangle size={20} />
                        <span className="text-xs font-bold">Puerta Garaje Abierta (hace 10m)</span>
                    </div>
                    <div
                        className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-3 text-slate-600 shadow-sm">
                        <AlertTriangle size={20} className="text-purple-500" />
                        <span className="text-xs font-bold">Sensor Humedad Baño (batería baja)</span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    {/* SECCIÓN 2: FAVORITOS */}
    <section className="mb-10">
        <div className="flex justify-between items-end mb-6">
            <div>
                <h2 className="text-xl font-bold text-slate-700">Mis Favoritos</h2>
                <p className="text-sm text-gray-400">Vista Detallada de Dispositivos</p>
            </div>
            <Link to="/devices"
                className="inline-block bg-[#A855F7] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-purple-600 transition-all shadow-lg shadow-purple-100 text-center">
            Ver Todos
            </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

        </div>
    </section>

    {/* SECCIÓN 3: ACCIONES Y ACTIVIDAD */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
            <h2 className="text-xl font-bold mb-6 text-slate-700">Acciones Rápidas</h2>
            <div className="flex flex-wrap gap-4">
                <button
                    className="bg-purple-400 text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-purple-100 hover:-translate-y-1 transition-all">
                    Modo "Salir de Casa"
                </button>
                <button
                    className="bg-purple-400 text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-purple-100 hover:-translate-y-1 transition-all">
                    Modo "Noche"
                </button>
            </div>
        </div>

        <div>
            <h2 className="text-xl font-bold mb-6 text-slate-700">Actividad Reciente</h2>
            <div className="space-y-4">
                {[
                { time: "10:45 AM", text: "Puerta Garaje se abrió", icon: LayoutDashboard },
                { time: "09:20 AM", text: "Calefacción activada automáticamente", icon: Thermometer }
                ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-sm bg-white p-3 rounded-2xl border border-gray-50">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                        <item.icon size={16} />
                    </div>
                    <span className="text-slate-400 font-bold w-20">{item.time}</span>
                    <span className="text-slate-700 font-medium">{item.text}</span>
                </div>
                ))}
            </div>
        </div>
    </div>
</div>
);
}
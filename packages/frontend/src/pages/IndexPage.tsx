import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Home,
  PlusCircle,
  BarChart2,
  Settings,
  AlertTriangle,
  Cpu,
  Thermometer
} from 'lucide-react';
import { DeviceDetailsModal } from '../components/DeviceDetailsModal';

export default function IndexPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);

  useEffect(() => {
    fetch('http://localhost:3000/devices')
      .then(res => res.json())
      .then(data => setDevices(data || []))
      .catch(e => console.error("Error cargando dispositivos", e));
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800">
      {/* SidePanel de Detalles Dinámico */}
      {selectedDevice && (
        <DeviceDetailsModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className="w-16 md:w-20 bg-[#A855F7] flex flex-col items-center py-8 gap-8 text-white">
        <div className="p-2"><LayoutDashboard size={28} /></div>
        <div className="flex flex-col gap-6 mt-10">
          <Home className="cursor-pointer opacity-80 hover:opacity-100" />
          <PlusCircle className="cursor-pointer opacity-80 hover:opacity-100" />
          <BarChart2 className="cursor-pointer opacity-80 hover:opacity-100" />
        </div>
        <div className="mt-auto">
          <Settings className="cursor-pointer opacity-80 hover:opacity-100" />
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* Header */}
        <header className="mb-8">
          <p className="text-xs text-gray-500 font-medium">Smart-Control IoT &gt; Dashboard</p>
          <h1 className="text-4xl font-bold mt-1">Dashboard</h1>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Resumen del Sistema</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Estado de Dispositivos */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-bold mb-4 self-start">Estado de Dispositivos</h3>
              <div className="relative w-40 h-20 overflow-hidden">
                <div className="w-40 h-40 border-[16px] border-gray-100 rounded-full"></div>
                <div className="absolute top-0 left-0 w-40 h-40 border-[16px] border-green-500 rounded-full border-t-transparent border-r-transparent -rotate-45"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                  <span className="text-2xl font-bold text-green-600">15<span className="text-gray-400 text-lg">/20</span></span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Online</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500">Todo funcionando correctamente</p>
            </div>

            {/* Consumo Energético */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold">Consumo Energético Hoy</h3>
                <span className="text-xs font-bold text-gray-400">+2% vs ayer</span>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">5.8 kWh</span>
              </div>
              {/* Placeholder de Gráfico */}
              <div className="h-24 w-full bg-gradient-to-t from-purple-50 to-purple-200 rounded-lg relative overflow-hidden">
                <svg className="absolute bottom-0 w-full" viewBox="0 0 100 40">
                  <path d="M0 40 Q 25 10 50 25 T 100 5" fill="none" stroke="#A855F7" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* Alertas Activas */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-purple-200">
              <h3 className="text-lg font-bold mb-4">Alertas Activas</h3>
              <div className="space-y-3">
                <div className="bg-[#A855F7] text-white p-3 rounded-xl flex items-center gap-3">
                  <AlertTriangle size={20} />
                  <span className="text-sm font-medium">Puerta Garaje Abierta (hace 10m)</span>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm p-3 rounded-xl flex items-center gap-3 text-gray-600">
                  <AlertTriangle size={20} className="text-purple-500" />
                  <span className="text-sm font-medium">Sensor Humedad Baño (batería baja)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- DETALLE DISPOSITIVOS --- */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-700">Mis Favoritos</h2>
              <p className="text-sm text-gray-400 font-medium">Vista Dinámica de Metadatos Tuya</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {devices.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-2xl shadow border border-gray-100 flex flex-col items-center text-gray-500">
                <Cpu size={40} className="mb-4 text-purple-200" />
                <p>Aún no has emparejado dispositivos Tuya en la nueva BBDD genérica.</p>
              </div>
            ) : (
              devices.map((bicho) => {
                // Lógica ultra-genérica para sacar si está "ON" y su status
                const is_on = bicho.attributes?.is_on_guess || (bicho.attributes?.dps ? Object.values(bicho.attributes.dps).includes(true) : false);

                return (
                  <div key={bicho._id} className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-white rounded-lg p-1 border border-purple-100 shadow-sm shrink-0">
                          {bicho.image && bicho.image.startsWith('http') ? (
                            <img src={bicho.image} alt={bicho.name} className="w-full h-full object-contain" />
                          ) : <Cpu size={24} className="text-purple-400 mx-auto mt-2" />}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-sm text-gray-800 truncate">{bicho.name}</h4>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${is_on ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`}></div>
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">
                              {bicho.type.substring(0, 10)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedDevice(bicho)}
                      className="mt-4 w-full bg-white border border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white font-bold text-xs py-2 rounded-xl transition-colors"
                    >
                      Ver detalles
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* --- BOTTOM SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Acciones Rápidas */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Acciones Rápidas</h2>
            <div className="flex flex-wrap gap-4">
              <button className="bg-purple-400 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-500 transition-all">
                Modo "Salir de Casa"
              </button>
              <button className="bg-purple-400 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-500 transition-all">
                Modo "Noche"
              </button>
            </div>
          </section>

          {/* Actividad Reciente */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Actividad Reciente</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="bg-gray-200 p-2 rounded-lg text-gray-600"><LayoutDashboard size={16} /></div>
                <span className="text-gray-400 font-medium">10:45 AM -</span>
                <span className="text-gray-700 font-semibold">Puerta Garaje se abrió</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="bg-gray-200 p-2 rounded-lg text-gray-600"><Thermometer size={16} /></div>
                <span className="text-gray-400 font-medium">09:20 AM -</span>
                <span className="text-gray-700 font-semibold">Calefacción activada automáticamente</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
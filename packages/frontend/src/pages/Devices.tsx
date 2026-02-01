import { 
  Search, Lightbulb, Thermometer, Camera, Wind, Plug, 
  Bot, Warehouse, Coffee, Droplets, Plus 
} from 'lucide-react';
import { DeviceCard } from '../components/DeviceCard';

export default function Devices() {
  const categories = ["Todos", "Iluminación", "Clima", "Seguridad", "Energía"];

  return (
    <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER CON BUSCADOR */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Smart-Control IoT &gt; Mis Dispositivos</p>
          <h1 className="text-4xl font-black mt-1 text-slate-800">Mis Dispositivos</h1>
        </div>
        
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="pl-6 pr-12 py-3 rounded-xl border border-gray-200 w-64 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50 transition-all text-sm font-medium"
          />
          <Search className="absolute right-4 top-3 text-slate-800 group-focus-within:text-purple-500 transition-colors" size={20} />
        </div>
      </header>

      {/* CATEGORÍAS */}
      <nav className="flex gap-3 mb-10">
        {categories.map((cat, i) => (
          <button 
            key={cat}
            className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all border
              ${i === 0 
                ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-200' 
                : 'bg-white text-slate-600 border-purple-200 hover:border-purple-400'}`}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* GRID DE DISPOSITIVOS (4 Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        
        {/* FILA 1 */}
        <DeviceCard name="Luz Salón" status="Encendido" isOn icon={Lightbulb} variant="purple" showSwitch />
        <DeviceCard name="Luz Cocina" status="Apagado" isOn={false} icon={Lightbulb} variant="purple" showSwitch />
        
        <DeviceCard name="Cámara Entrada" status="" icon={Camera} variant="blue">
          <img src="https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=200" className="rounded-xl h-16 w-full object-cover grayscale hover:grayscale-0 transition-all" alt="cam" />
        </DeviceCard>

        <DeviceCard name="Enchufe Inteligente TV" status="Apagado" isOn={false} icon={Plug} variant="purple" showSwitch />

        {/* FILA 2 */}
        <DeviceCard name="Robot aspirador" status="Limpiando 'Salón'" icon={Bot} variant="blue" />
        
        <DeviceCard name="Termostato" status="Calefacción Activa" icon={Thermometer} variant="purple">
          <div className="flex flex-col items-center">
            <span className="text-xl font-black text-slate-800">21 °C</span>
            <div className="flex gap-1 mt-1">
              <button className="bg-purple-500 text-white w-10 h-6 rounded-md font-bold hover:bg-purple-600">-</button>
              <button className="bg-purple-500 text-white w-10 h-6 rounded-md font-bold hover:bg-purple-600">+</button>
            </div>
          </div>
        </DeviceCard>

        <DeviceCard name="Cámara Patio" status="" icon={Camera} variant="blue">
          <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=200" className="rounded-xl h-16 w-full object-cover grayscale hover:grayscale-0 transition-all" alt="cam" />
        </DeviceCard>

        <DeviceCard name="Sensor Agua" status="Sin alertas" icon={Droplets} variant="blue">
          <span className="text-xl font-black text-slate-800">5% Humedad</span>
        </DeviceCard>

        {/* FILA 3 */}
        <DeviceCard name="Ventilador" status="Encendido" isOn icon={Wind} variant="purple" showSwitch />
        <DeviceCard name="Puerta Garaje" status="Puerta Garaje cerrada" icon={Warehouse} variant="blue" />
        <DeviceCard name="Enchufe Inteligente Coche" status="Encendido" isOn icon={Plug} variant="purple" showSwitch />
        <DeviceCard name="Cafetera" status="Realizando 'Café con Leche'" icon={Coffee} variant="blue" />
      </div>

      {/* BOTÓN AÑADIR */}
      <button className="flex items-center gap-2 bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-purple-200 hover:bg-purple-600 hover:-translate-y-1 transition-all">
        <Plus size={20} strokeWidth={3} />
        Añadir dispositivo
      </button>
    </div>
  );
}
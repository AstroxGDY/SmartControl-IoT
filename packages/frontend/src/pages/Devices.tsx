import { useState, useEffect } from 'react';
import { 
  Search, Lightbulb, Thermometer, Camera, Plug, 
  Bot, Droplets, Plus, Wifi 
} from 'lucide-react';
import { DeviceCard } from '../components/DeviceCard';
import type { LucideIcon } from 'lucide-react'; // <--- Importamos el tipo

// Importa tu tipo compartido (ajusta la ruta según tu estructura)
import type { IDevice } from '../../../shared/types'; // O la ruta correcta

// 1. DICCIONARIO DE ICONOS
// Relaciona el string de la BDD con el componente visual
const iconMap: Record<string, LucideIcon> = {
  'smart-bulb': Lightbulb,
  'thermostat': Thermometer,
  'camera': Camera,
  'sensor': Droplets,
  'outlet': Plug, // Asumiendo que añadas enchufes
  'robot': Bot,
  'default': Wifi
};

export default function Devices() {
  // 2. ESTADOS
  const [devices, setDevices] = useState<IDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const categories = ["Todos", "Iluminación", "Clima", "Seguridad", "Energía"];

  // 3. CARGAR DATOS (FETCH)
  useEffect(() => {
    fetch('http://localhost:3000/devices')
      .then(res => res.json())
      .then(data => {
        setDevices(data);
        setLoading(false);
      })
      .catch(err => console.error("Error cargando dispositivos:", err));
  }, []);

  // 4. LÓGICA DE CONTENIDO DINÁMICO
  // Esta función decide qué pintar DENTRO de la card según el tipo
  const renderDeviceContent = (device: IDevice) => {
    switch (device.type) {
      case 'thermostat':
        return (
          <div className="flex flex-col items-center">
            <span className="text-xl font-black text-slate-800">
              {device.attributes.temperature}°C
            </span>
            <div className="flex gap-1 mt-1">
              <button className="bg-purple-500 text-white w-10 h-6 rounded-md font-bold hover:bg-purple-600">-</button>
              <button className="bg-purple-500 text-white w-10 h-6 rounded-md font-bold hover:bg-purple-600">+</button>
            </div>
          </div>
        );
      
      case 'camera':
        return (
          // Usamos la imagen del dispositivo o una por defecto
          <img 
            src={device.image || "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=200"} 
            className="rounded-xl h-16 w-full object-cover grayscale hover:grayscale-0 transition-all" 
            alt={device.name} 
          />
        );

      case 'sensor':
        return (
           <span className="text-xl font-black text-slate-800">
             {device.attributes.humidity ? `${device.attributes.humidity}% Hum` : 'Activo'}
           </span>
        );

      default:
        // Para luces y otros, mostramos atributos genéricos si existen
        return (
          <div className="text-xs text-slate-500 font-medium">
            {Object.entries(device.attributes).map(([key, val]) => (
               // Solo mostramos valores simples (texto/numero)
               (typeof val === 'string' || typeof val === 'number') 
                ? <div key={key}>{key}: {val}</div> 
                : null
            ))}
          </div>
        );
    }
  };

  if (loading) return <div className="p-8">Cargando tus dispositivos inteligentes...</div>;

  return (
    <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER (Igual que antes) */}
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

      {/* CATEGORÍAS (Igual que antes) */}
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

      {/* GRID DINÁMICO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        
        {devices.map((device) => {
          // 1. Elegir icono
          const IconComponent = iconMap[device.type] || iconMap['default'];
          
          // 2. Elegir variante de color (Purple si está ON, Blue si OFF)
          // Puedes cambiar la lógica según prefieras
          const cardVariant = device.isOn ? 'purple' : 'blue';

          return (
            <DeviceCard 
              key={device._id} // IMPORTANTE: Clave única de Mongo
              name={device.name}
              status={(device.isOn ? 'Encendido' : 'Apagado')}
              isOn={device.isOn}
              icon={IconComponent}
              variant={cardVariant}
              showSwitch={device.type === 'smart-bulb' || device.type === 'thermostat' || device.type === 'camera'} // Solo mostrar switch en ciertos tipos
            >
              {/* 3. Insertar contenido hijo dinámico */}
              {renderDeviceContent(device)}
            </DeviceCard>
          );
        })}

        {/* Card para añadir (siempre al final) */}
         <button className="flex flex-col items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-300 text-slate-400 p-5 rounded-3xl h-48 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-500 transition-all group">
            <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Plus size={24} />
            </div>
            <span className="font-bold text-sm">Añadir Nuevo</span>
         </button>

      </div>
    </div>
  );
}
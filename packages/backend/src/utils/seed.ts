import { Device } from '../models/Device.js';
import { User } from '../models/User.js';

export const seedDatabase = async () => {
  try {
    // 1. Verificar si ya hay datos
    const deviceCount = await Device.countDocuments();
    if (deviceCount > 0) {
      console.log('📦 La base de datos ya tiene datos. Saltando seed.');
      return;
    }

    console.log('🌱 Base de datos vacía. Sembrando datos por defecto...');

    // 2. Crear un Usuario "Mock" (Simulacro)
    // Usamos upsert para no duplicarlo si reiniciamos
    let demoUser = await User.findOne({ email: 'demo@smartcontrol.local' });
    if (!demoUser) {
        demoUser = await User.create({
            name: "Usuario Demo",
            email: "demo@smartcontrol.local"
        });
        console.log('👤 Usuario Demo creado');
    }

    // 3. Crear Dispositivos vinculados a ese usuario
    const devices = [
      {
        name: "Luz Salón",
        type: "smart-bulb",
        connectionType: "WiFi",
        status: "online",
        isOn: true,
        image: "https://placehold.co/100x100/orange/white?text=Bulb",
        attributes: { brightness: 80, color: "#FFA500" },
        owner: demoUser._id // <--- Vinculación
      },
      {
        name: "Termostato Pasillo",
        type: "thermostat",
        connectionType: "Zigbee",
        status: "online",
        isOn: true,
        image: "https://placehold.co/100x100/blue/white?text=Thermo",
        attributes: { temperature: 21.5, humidity: 45 },
        owner: demoUser._id
      },
      {
        name: "Cámara Entrada",
        type: "camera",
        connectionType: "WiFi",
        status: "offline",
        isOn: true,
        image: "https://placehold.co/100x100/black/white?text=Cam",
        attributes: { resolution: "1080p" },
        owner: demoUser._id
      }
    ];

    await Device.insertMany(devices);
    console.log('✅ Dispositivos por defecto creados correctamente.');

  } catch (error) {
    console.error('❌ Error en el seed:', error);
  }
};
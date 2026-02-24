export type DeviceStatus = 'online' | 'offline' | 'error';
export type ConnectionType = 'WiFi' | 'Zigbee' | 'Bluetooth' | 'LoRa';
export type DeviceType = 'smart-bulb' | 'thermostat' | 'camera' | 'sensor';

// 1. INFORMACIÓN ESTÁTICA (Base de datos / Registro)
// Datos que rara vez cambian una vez el dispositivo está configurado.
export interface IDeviceInfo {
  _id?: string;             // Opcional al crear, Obligatorio al leer
  name: string;             // Nombre dado por el usuario (ej. "Luz Salón")
  type: DeviceType;         // Tipo de hardware
  connectionType: ConnectionType; 
  image?: string;           // URL de la imagen representativa
  owner?: string;           // ID del usuario dueño
  createdAt?: Date;
  updatedAt?: Date;
}

// 2. INFORMACIÓN DINÁMICA (Estado / Telemetría)
// Datos volátiles que cambian constantemente mediante MQTT, WebSockets o peticiones del hardware.
export interface IDeviceState {
  status: DeviceStatus;     // ¿Hay conexión física con él ahora mismo?
  isOn: boolean;            // ¿Está encendido/apagado el relé principal?
  attributes: Record<string, any>; // Flexible: { battery: 80, brightness: 50, temp: 24.5 }
}

// 3. INTERFAZ COMPUESTA (Opcional, pero muy útil)
// Úsala cuando tu backend envíe el objeto completo al Frontend en una sola petición GET.
export interface IDevice extends IDeviceInfo, IDeviceState {}
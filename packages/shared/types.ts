export type DeviceStatus = 'online' | 'offline' | 'error';
// ConnectionType genérico (WiFi, Zigbee, Bluetooth, etc)
export type ConnectionType = string; 
// DeviceType genérico (dj, cz, smart-bulb, etc)
export type DeviceType = string;     

export interface IDeviceInfo {
  _id?: string;             
  name: string;             
  type: DeviceType;         // "smart-bulb", "thermostat", "dj", etc.
  connectionType: ConnectionType; 
  image?: string;           
  owner?: string;           
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDeviceState {
  status: DeviceStatus;
  // Attributes contiene la matriz clave valor real del dispositivo (Data Points, IPs, versión)
  attributes: {
    ip?: string;
    tuyaId?: string;
    version?: string;
    localKey?: string;
    productKey?: string;
    // dps es donde Tuya guarda todos sus valores en tiempo real (temperatura, modos, switches)
    dps?: Record<string, any>;
    [key: string]: any;
  }; 
}

export interface IDevice extends IDeviceInfo, IDeviceState {}
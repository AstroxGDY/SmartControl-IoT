// /shared/types.ts

export type DeviceStatus = 'online' | 'offline' | 'error';
export type ConnectionType = 'WiFi' | 'Zigbee' | 'Bluetooth' | 'LoRa';
export type DeviceType = 'smart-bulb' | 'thermostat' | 'camera' | 'sensor';

// Esta es la interfaz que viaja por la red (JSON)
export interface IDevice {
    _id?: string; // Opcional al crear, Obligatorio al leer
    name: string;
    type: DeviceType;
    connectionType: ConnectionType;
    status: DeviceStatus;
    isOn: boolean;
    image?: string;
    attributes: Record<string, any>; // Flexible para brillo, temp, etc.
    owner?: string; // ID del usuario como string
    createdAt?: Date;
    updatedAt?: Date;
}
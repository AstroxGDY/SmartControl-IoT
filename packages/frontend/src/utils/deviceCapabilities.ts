export type DPType = 'boolean' | 'integer' | 'enum' | 'string';

export interface DeviceDP {
  code: string; // Tuya DP Code
  name: string; // Friendly name
  type: DPType;
  min?: number;
  max?: number;
  values?: string[]; // For enum
  readOnly?: boolean; // If true, UI won't allow modification
  unit?: string;      // e.g. "V", "W", "mA"
  divider?: number;   // e.g. 10 if 2300 means 230.0
}

export interface DeviceCapability {
  category: string;
  name: string;
  dps: DeviceDP[];
}

export const DEVICE_CAPABILITIES: Record<string, DeviceCapability> = {
  // Bombillas (dj = Light)
  dj: {
    category: 'dj',
    name: 'Iluminación',
    dps: [
      { code: '20', name: 'Interruptor', type: 'boolean' },
      { code: '21', name: 'Modo', type: 'enum', values: ['white', 'colour', 'scene', 'music'] },
      { code: '22', name: 'Brillo', type: 'integer', min: 10, max: 1000 },
      { code: '23', name: 'Temperatura', type: 'integer', min: 0, max: 1000 },
    ]
  },
  // Enchufes (cz = Socket)
  cz: {
    category: 'cz',
    name: 'Enchufe Inteligente',
    dps: [
      { code: '1', name: 'Interruptor', type: 'boolean' },
      { code: '18', name: 'Corriente', type: 'integer', readOnly: true, unit: 'mA' },
      { code: '19', name: 'Potencia', type: 'integer', readOnly: true, unit: 'W', divider: 10 },
      { code: '20', name: 'Voltaje', type: 'integer', readOnly: true, unit: 'V', divider: 10 },
    ]
  },
  // Regletas (pc = Power Strip)
  pc: {
    category: 'pc',
    name: 'Regleta Inteligente',
    dps: [
      { code: '1', name: 'Interruptor 1', type: 'boolean' },
      { code: '2', name: 'Interruptor 2', type: 'boolean' },
      { code: '3', name: 'Interruptor 3', type: 'boolean' },
      { code: '101', name: 'Consumo Total', type: 'integer', readOnly: true, unit: 'kWh', divider: 100 },
    ]
  },
  // Aire Acondicionado (kt = Air Conditioner)
  kt: {
    category: 'kt',
    name: 'Aire Acondicionado',
    dps: [
      { code: '1', name: 'Interruptor', type: 'boolean' },
      { code: '2', name: 'Temperatura consigna', type: 'integer', min: 16, max: 30, unit: '°C' },
      { code: '4', name: 'Modo', type: 'enum', values: ['cold', 'heat', 'dry', 'fan', 'auto'] },
      { code: '18', name: 'Temp. actual', type: 'integer', readOnly: true, unit: '°C' },
    ]
  },
  // Sensores (sensor)
  sensor: {
    category: 'sensor',
    name: 'Sensor',
    dps: [
      { code: '1', name: 'Temperatura', type: 'integer', readOnly: true, unit: '°C', divider: 10 },
      { code: '2', name: 'Humedad', type: 'integer', readOnly: true, unit: '%' },
      { code: '3', name: 'Batería', type: 'integer', readOnly: true, unit: '%' },
    ]
  },
  // Genérico (Si no se reconoce la categoría)
  generic: {
    category: 'generic',
    name: 'Dispositivo Inteligente',
    dps: [
      { code: '1', name: 'Interruptor', type: 'boolean' },
      { code: '20', name: 'Interruptor Principal', type: 'boolean' },
    ]
  }
};

export const getCapabilitiesForCategory = (category: string): DeviceCapability => {
  return DEVICE_CAPABILITIES[category] || DEVICE_CAPABILITIES.generic;
};

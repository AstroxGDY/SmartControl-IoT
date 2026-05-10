export type DPType = 'boolean' | 'integer' | 'enum' | 'string';

export interface DeviceDP {
  code: string; // Tuya DP Code (often string representation of number)
  name: string; // Friendly name
  type: DPType;
  min?: number;
  max?: number;
  values?: string[]; // For enum
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
    ]
  },
  // Aire Acondicionado (kt = Air Conditioner)
  kt: {
    category: 'kt',
    name: 'Aire Acondicionado',
    dps: [
      { code: '1', name: 'Interruptor', type: 'boolean' },
      { code: '2', name: 'Temperatura consigna', type: 'integer', min: 16, max: 30 },
      { code: '4', name: 'Modo', type: 'enum', values: ['cold', 'heat', 'dry', 'fan', 'auto'] },
    ]
  },
  // Genérico (Si no se reconoce la categoría)
  generic: {
    category: 'generic',
    name: 'Dispositivo Inteligente',
    dps: [
      { code: '1', name: 'Interruptor', type: 'boolean' },
    ]
  }
};

export const getCapabilitiesForCategory = (category: string): DeviceCapability => {
  return DEVICE_CAPABILITIES[category] || DEVICE_CAPABILITIES.generic;
};

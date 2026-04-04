import { type IDeviceState } from '../../../shared/types.js';

// Simulamos la respuesta cruda (raw) que te daría la API de Tuya o MQTT
// Tuya suele devolver el estado como un array de { code, value }
export interface TuyaStatus {
  code: string;
  value: any;
}

// ==========================================
// MAPPER GENÉRICO (Cualquier dispositivo)
// ==========================================
export function mapGenericTuya(dps: Record<string, any> | any[]): IDeviceState {
  
  // Convertimos array de Cloud [{code, value}] a un diccionario plano para frontend si viene en ese formato
  const dictionary: Record<string, any> = {};
  
  if (Array.isArray(dps)) {
    dps.forEach(item => {
      if (item.code) dictionary[item.code] = item.value;
    });
  } else if (typeof dps === 'object' && dps !== null) {
    Object.assign(dictionary, dps);
  }

  // Tratamos de adivinar si está encendido para fines de compatibilidad rápida (buscar "switch" en las claves)
  const isSwitchOn = Object.entries(dictionary).some(([key, val]) => 
     (key.toLowerCase().includes('switch') && val === true) || 
     (key === '20' && val === true)
  );

  return {
    status: 'online', 
    attributes: {
      is_on_guess: isSwitchOn,
      dps: dictionary
    }
  };
}
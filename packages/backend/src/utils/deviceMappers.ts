import { type IDeviceState } from '../../../shared/types.js';

// Simulamos la respuesta cruda (raw) que te daría la API de Tuya o MQTT
// Tuya suele devolver el estado como un array de { code, value }
export interface TuyaStatus {
  code: string;
  value: any;
}

// ==========================================
// MAPPER 1: BOMBILLA (Protocolo Local Tuya - DPs numéricos)
// ==========================================
export function mapSmartBulb(dps: Record<string, any>): IDeviceState {
  
  // Parseamos el color feo del DP 24
  let parsedColor = {};
  try {
    if (dps["24"]) {
      parsedColor = typeof dps["24"] === 'string' ? JSON.parse(dps["24"]) : dps["24"];
    }
  } catch (e) {
    console.error("Error parseando color", e);
  }

  return {
    status: 'online', 
    isOn: dps["20"] ?? false,                  // DP 20: Encendido/Apagado
    attributes: {
      modo: dps["21"] ?? 'white',              // DP 21: Modo de trabajo
      brillo: dps["22"] ?? 0,                  // DP 22: Brillo
      temperatura_color: dps["23"] ?? 0,       // DP 23: Temp Color
      color: parsedColor,                      // DP 24: Objeto JSON con h, s, v
      cuenta_atras: dps["26"] ?? 0             // DP 26: Temporizador
    }
  };
}
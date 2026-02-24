import mongoose, { Schema, Document } from 'mongoose';
// Importamos la interfaz combinada (que une Info + State)
import { type IDevice } from '../../../shared/types.js';

// 1. Interfaz del Documento
// Omitimos '_id' de nuestra interfaz porque Mongoose usa el suyo propio (ObjectId).
// Al extender de Document, ya heredamos métodos como .save() o ._id
export interface IDeviceDocument extends Omit<IDevice, '_id'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

// 2. Definición del Esquema
const DeviceSchema: Schema = new Schema<IDeviceDocument>({
  
  // --- PARTE ESTÁTICA (IDeviceInfo) ---
  name: { type: String, required: true },
  type: { type: String, required: true },
  connectionType: { 
    type: String, 
    enum: ['WiFi', 'Zigbee', 'Bluetooth', 'LoRa'], 
    required: true 
  },
  image: { type: String, default: "https://www.svgrepo.com/show/508699/landscape-placeholder.svg" },
  owner: { type: Schema.Types.ObjectId, ref: 'User' },

  // --- PARTE DINÁMICA (IDeviceState) ---
  status: { 
    type: String, 
    enum: ['online', 'offline', 'error'], 
    default: 'offline' 
  },
  isOn: { type: Boolean, default: false },
  // 'Mixed' permite guardar objetos JSON flexibles (temperatura, color, batería, etc.)
  attributes: { type: Schema.Types.Mixed, default: {} },

}, { 
  timestamps: true // Esto inyecta createdAt y updatedAt automáticamente
});

// 3. Exportación del Modelo
// OJO: Le pasamos IDeviceDocument al modelo, no IDevice, para que tenga los métodos de Mongoose
export const Device = mongoose.model<IDeviceDocument>('Device', DeviceSchema);
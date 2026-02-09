import mongoose, { Schema, Document } from 'mongoose';
import { type IDevice } from '../../../shared/types.js';

// Interfaz TypeScript para usar en el código
export interface IDeviceDocument extends Omit<IDevice, '_id'>, Document {
  // Aquí Mongoose ya pone su propio _id: ObjectId automáticamente
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema: Schema = new Schema<IDeviceDocument>({
  name: { type: String, required: true },
  type: { type: String, required: true },
  connectionType: { 
    type: String, 
    enum: ['WiFi', 'Zigbee', 'Bluetooth', 'LoRa'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['online', 'offline', 'error'], 
    default: 'offline' 
  },
  isOn: { type: Boolean, default: false },
  image: { type: String, default: "https://www.svgrepo.com/show/508699/landscape-placeholder.svg" },
  // 'Mixed' permite guardar objetos JSON arbitrarios
  attributes: { type: Schema.Types.Mixed, default: {} },

  owner: { type: Schema.Types.ObjectId, ref: 'User' }
}, { 
  timestamps: true // Añade createdAt y updatedAt automáticamente
});

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
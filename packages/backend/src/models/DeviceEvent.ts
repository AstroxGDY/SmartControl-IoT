import mongoose, { Schema, Document } from 'mongoose';

export interface IDeviceEvent extends Document {
  deviceId: mongoose.Types.ObjectId;
  code: string;
  value: any;
  eventTime: Date;
}

const DeviceEventSchema: Schema = new Schema({
  deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
  code: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  eventTime: { type: Date, required: true }
}, { timestamps: true });

// Índice único para evitar duplicados al re-sincronizar los mismos eventos de Tuya
DeviceEventSchema.index({ deviceId: 1, code: 1, eventTime: 1 }, { unique: true });

export const DeviceEvent = mongoose.model<IDeviceEvent>('DeviceEvent', DeviceEventSchema);

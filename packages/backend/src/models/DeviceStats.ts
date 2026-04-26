import mongoose, { Schema, Document } from 'mongoose';

export interface IDeviceStatsDocument extends Document {
  deviceId: mongoose.Types.ObjectId;
  timestamp: Date;
  batteryLevel?: number;
  status: 'online' | 'offline' | 'error';
  // Extra metrics for analysis
  clicks?: number;
  distance?: number;
  dps?: Record<string, any>;
}

const DeviceStatsSchema: Schema = new Schema<IDeviceStatsDocument>({
  deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
  timestamp: { type: Date, default: Date.now },
  batteryLevel: { type: Number },
  status: { type: String, enum: ['online', 'offline', 'error'], required: true },
  clicks: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  dps: { type: Schema.Types.Mixed },
}, {
  // We want to be able to query fast by device and time
});

DeviceStatsSchema.index({ deviceId: 1, timestamp: -1 });

export const DeviceStats = mongoose.model<IDeviceStatsDocument>('DeviceStats', DeviceStatsSchema);

import { Device } from '../models/Device.js';
import { DeviceEvent } from '../models/DeviceEvent.js';
import { 
    resolveScript, 
    getPythonCommand, 
    pythonEnv, 
    extractJson, 
    execAsync, 
    EXEC_MAX_BUFFER 
} from '../utils/pythonUtils.js';

export async function syncDeviceLogs(deviceId: string) {
  const device = await Device.findById(deviceId).lean();
  if (!device || !device.attributes?.tuyaId) return { success: false, error: 'Device not found or no Tuya ID' };

  const tuyaId = device.attributes.tuyaId;
  const scriptPath = resolveScript('get_logs.py');

  try {
    const { stdout } = await execAsync(
      `${getPythonCommand(scriptPath)}`,
      { 
        env: pythonEnv({ TUYA_DEVICE_ID: tuyaId }),
        maxBuffer: EXEC_MAX_BUFFER 
      }
    );

    const result = extractJson(stdout) as any;
    if (result.success && result.result?.logs) {
      const logs = result.result.logs;
      let count = 0;
      for (const log of logs) {
        try {
          const eventTime = new Date(log.event_time);
          await DeviceEvent.create({
            deviceId: device._id,
            code: log.code,
            value: log.value,
            eventTime: eventTime
          });
          count++;
        } catch (e: any) {
          // Ignore duplicates (code 11000)
        }
      }
      return { success: true, count };
    }
    return { success: false, error: result.error || 'Tuya API returned failure' };
  } catch (e: any) {
    console.error(`[LogService] Error syncing logs for ${deviceId}:`, e.message);
    return { success: false, error: e.message };
  }
}

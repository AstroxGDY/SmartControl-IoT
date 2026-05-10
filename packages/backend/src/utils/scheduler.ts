import { Device } from '../models/Device.js';
import { DeviceStats } from '../models/DeviceStats.js';
import { DeviceEvent } from '../models/DeviceEvent.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { 
    resolveScript, 
    getPythonCommand, 
    pythonEnv, 
    extractJson, 
    execAsync, 
    EXEC_MAX_BUFFER 
} from './pythonUtils.js';
import { syncDeviceLogs } from '../services/logService.js';

export const startScheduler = () => {
  // 1. Recolección de estadísticas (1 hora)
  const STATS_INTERVAL = 60 * 60 * 1000; 
  // 2. Sincronización de Logs (10 minutos)
  const LOGS_INTERVAL = 10 * 60 * 1000;

  console.log(`[Scheduler] Tarea en segundo plano iniciada.`);
  console.log(` - Estadísticas: cada ${STATS_INTERVAL / 1000}s`);
  console.log(` - Historial (Logs): cada ${LOGS_INTERVAL / 1000}s`);

  // --- INTERVALO ESTADÍSTICAS ---
  setInterval(async () => {
    console.log('[Scheduler] Iniciando recolección de estadísticas periódica...');
    try {
      const devices = await Device.find().lean();
      for (const device of devices) {
        let batteryLevel: number | undefined;
        let dps: any;
        let status: 'online' | 'offline' | 'error' = 'offline';

        if (device.attributes?.bluetoothId) {
          try {
            const scriptPath = resolveScript('mouse_sniffer.py');
            const { stdout } = await execAsync(
              `${getPythonCommand(scriptPath)} battery "${device.attributes.bluetoothId}"`, 
              { env: pythonEnv() }
            );
            const res = JSON.parse(stdout) as any;
            if (res.battery !== undefined && res.battery !== null) {
              batteryLevel = res.battery;
              status = 'online';
            }
          } catch (e) {
             console.warn(`[Scheduler] Error leyendo batería de BT ${device.name}`);
             status = 'offline';
          }
        } 
        else if (device.attributes?.tuyaId && device.attributes?.ip && device.attributes?.localKey) {
          try {
            const tempFile = path.join(os.tmpdir(), `sc_query_sched_${Date.now()}.json`);
            await fs.writeFile(tempFile, JSON.stringify([{
              _id: device._id.toString(),
              tuyaId: device.attributes.tuyaId,
              ip: device.attributes.ip,
              localKey: device.attributes.localKey,
              version: device.attributes.version ?? '3.3'
            }]), 'utf-8');

            const scriptPath = resolveScript('get_statuses.py');
            const { stdout } = await execAsync(
              `${getPythonCommand(scriptPath)} "${tempFile}"`,
              { env: pythonEnv(), maxBuffer: EXEC_MAX_BUFFER }
            );
            await fs.unlink(tempFile).catch(() => {});

            const result = extractJson(stdout) as any;
            if (result.success && Array.isArray(result.results)) {
              const live = result.results[0];
              if (live && live.success && live.dps) {
                 status = 'online';
                 dps = live.dps;
                 await Device.updateOne({ _id: device._id }, { $set: { status: 'online', 'attributes.dps': live.dps } });
              } else {
                 status = 'offline';
                 await Device.updateOne({ _id: device._id }, { $set: { status: 'offline' } });
              }
            }
          } catch (e) {
            console.warn(`[Scheduler] Error leyendo estado Tuya de ${device.name}`);
            status = 'offline';
          }
        } else {
           status = (device as any).status;
        }

        const statsEntry = new DeviceStats({
          deviceId: device._id,
          timestamp: new Date(),
          batteryLevel,
          status,
          dps,
        });
        await statsEntry.save();
      }
      console.log(`[Scheduler] Recolección completada.`);
    } catch (error) {
      console.error('[Scheduler] Fallo estadísticas:', error);
    }
  }, STATS_INTERVAL);

  setInterval(async () => {
    console.log('[Scheduler] Sincronizando historial de eventos con Tuya Cloud...');
    try {
      const devices = await Device.find({ 'attributes.tuyaId': { $exists: true } }).lean();
      for (const device of devices) {
        const res = await syncDeviceLogs(device._id.toString());
        if (res.success && (res.count ?? 0) > 0) {
          console.log(`[Scheduler] [${device.name}] +${res.count} nuevos eventos.`);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Fallo global sincronización logs:', error);
    }
  }, LOGS_INTERVAL);
};

import { Device } from '../models/Device.js';
import { DeviceStats } from '../models/DeviceStats.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

const execAsync = promisify(exec);
const EXEC_MAX_BUFFER = 10 * 1024 * 1024;

const pythonEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  ...process.env,
  PYTHONIOENCODING: 'utf-8',
  PYTHONUTF8: '1',
  ...extra,
});

function extractJson(stdout: string): unknown {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No se encontró JSON en la salida del script.');
  return JSON.parse(stdout.substring(start, end + 1));
}

export const startScheduler = () => {
  // Configurado a 1 hora (3600000 ms)
  const INTERVAL = 60 * 60 * 1000; 

  console.log(`[Scheduler] Tarea en segundo plano iniciada. Recolectará estadísticas cada ${INTERVAL / 1000}s`);

  setInterval(async () => {
    console.log('[Scheduler] Iniciando recolección de estadísticas periódica...');
    
    try {
      const devices = await Device.find().lean();
      
      for (const device of devices) {
        let batteryLevel: number | undefined;
        let dps: any;
        let status: 'online' | 'offline' | 'error' = 'offline';

        // Si es un dispositivo Bluetooth (Audio/Ratón)
        if (device.attributes?.bluetoothId) {
          try {
            const scriptPath = path.resolve(process.cwd(), 'src', 'scripts', 'mouse_sniffer.py');
            const { stdout } = await execAsync(
              `python "${scriptPath}" battery "${device.attributes.bluetoothId}"`, 
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
        // Si es un dispositivo Tuya (WiFi)
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

            const scriptPath = path.resolve(process.cwd(), 'src', 'scripts', 'get_statuses.py');
            const { stdout } = await execAsync(
              `python "${scriptPath}" "${tempFile}"`,
              { env: pythonEnv(), maxBuffer: EXEC_MAX_BUFFER }
            );
            await fs.unlink(tempFile).catch(() => {});

            const result = extractJson(stdout) as any;
            if (result.success && Array.isArray(result.results)) {
              const live = result.results[0];
              if (live && live.success && live.dps) {
                 status = 'online';
                 dps = live.dps;
                 // Actualizar DB de Device en vivo también
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
           // Dispositivos creados manualmente o sin credenciales locales
           status = device.status as 'online' | 'offline' | 'error';
        }

        // Guardar las estadísticas
        const statsEntry = new DeviceStats({
          deviceId: device._id,
          timestamp: new Date(),
          batteryLevel,
          status,
          dps,
        });

        await statsEntry.save();
      }
      console.log(`[Scheduler] Recolección completada. Guardados ${devices.length} registros.`);
    } catch (error) {
      console.error('[Scheduler] Fallo durante la recolección periódica:', error);
    }
  }, INTERVAL);
};

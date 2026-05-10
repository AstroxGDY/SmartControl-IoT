import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

export const execAsync = promisify(exec);

export const EXEC_MAX_BUFFER = 10 * 1024 * 1024;

const isProduction = process.env.NODE_ENV === 'production';

export function resolveScript(scriptName: string): string {
  if (isProduction) {
    return path.join((process as any).resourcesPath, 'bin', `${scriptName.replace('.py', '.exe')}`);
  }
  return path.resolve(process.cwd(), 'src', 'scripts', scriptName);
}

export function getPythonCommand(scriptPath: string): string {
  return isProduction ? `"${scriptPath}"` : `python "${scriptPath}"`;
}

export function pythonEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...extra,
    PYTHONIOENCODING: 'utf-8',
    TUYA_API_REGION: process.env.TUYA_API_REGION || 'eu',
    TUYA_API_KEY: process.env.TUYA_API_KEY,
    TUYA_API_SECRET: process.env.TUYA_API_SECRET,
  };
}

export function extractJson(stdout: string): any {
  try {
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('{') || line.trim().startsWith('[')) {
        return JSON.parse(line);
      }
    }
  } catch (e) {
    return { error: 'No se pudo parsear el JSON de salida del script.' };
  }
  return { error: 'No se encontró una salida JSON válida.' };
}

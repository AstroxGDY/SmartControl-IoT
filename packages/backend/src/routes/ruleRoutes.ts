import type { FastifyInstance } from 'fastify';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execAsync = promisify(exec);

const isProduction = process.env.NODE_ENV === 'production';

function resolveScript(scriptName: string): string {
  if (isProduction) {
    return path.join((process as any).resourcesPath, 'bin', `${scriptName.replace('.py', '.exe')}`);
  }
  return path.resolve(process.cwd(), 'src', 'scripts', scriptName);
}

function getPythonCommand(scriptPath: string): string {
  return isProduction ? `"${scriptPath}"` : `python "${scriptPath}"`;
}

// Reutilizamos la lógica de entorno de deviceRoutes o la definimos aquí
const pythonEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  ...process.env,
  PYTHONIOENCODING: 'utf-8',
  PYTHONUTF8: '1',
  PYTHONUNBUFFERED: '1',
  ...extra,
});

function extractJson(stdout: string): unknown {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No se encontró JSON en la salida del script.');
  return JSON.parse(stdout.substring(start, end + 1));
}

export default async function ruleRoutes(fastify: FastifyInstance) {
  
  // Listar reglas
  fastify.get('/', async (_request, reply) => {
    const scriptPath = resolveScript('manage_rules.py');
    try {
      const { stdout } = await execAsync(`${getPythonCommand(scriptPath)} list`, { env: pythonEnv() });
      return extractJson(stdout);
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Ejecutar (Trigger) una regla manual
  fastify.post('/:id/trigger', async (request, reply) => {
    const { id } = request.params as { id: string };
    const scriptPath = resolveScript('manage_rules.py');
    try {
      const { stdout } = await execAsync(`${getPythonCommand(scriptPath)} trigger ${id}`, { env: pythonEnv() });
      return extractJson(stdout);
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Eliminar una regla
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const scriptPath = resolveScript('manage_rules.py');
    try {
      const { stdout } = await execAsync(`${getPythonCommand(scriptPath)} delete ${id}`, { env: pythonEnv() });
      return extractJson(stdout);
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Crear una nueva regla
  fastify.post('/', async (request, reply) => {
    const scriptPath = resolveScript('manage_rules.py');
    const ruleData = JSON.stringify(request.body);
    
    // Usamos spawn o pasamos el JSON por stdin para evitar problemas de escape en shell
    const { spawn } = await import('node:child_process');
    
    return new Promise((resolve, reject) => {
      const py = spawn(isProduction ? scriptPath : 'python', isProduction ? ['create'] : [scriptPath, 'create'], {
        env: pythonEnv(),
      });
      
      let stdout = '';
      let stderr = '';
      
      py.stdin.write(ruleData);
      py.stdin.end();
      
      py.stdout.on('data', (data) => { stdout += data; });
      py.stderr.on('data', (data) => { stderr += data; });
      
      py.on('close', (code) => {
        if (code !== 0) {
          reply.status(500).send({ error: stderr || 'Error desconocido al crear regla' });
          return resolve(undefined);
        }
        try {
          resolve(extractJson(stdout));
        } catch (e) {
          reject(e);
        }
      });
    });
  });
}

const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { getSystemDefaults } = require('./system_secrets.cjs');

// ── Servicios del Sistema ───────────────────────────────────────────
let backendProcess = null;

function startBackend() {
  const isProd = app.isPackaged;
  const backendPath = isProd
    ? path.join(app.getAppPath(), 'packages', 'backend', 'dist', 'packages', 'backend', 'src', 'server.js')
    : path.join(__dirname, '..', 'packages', 'backend', 'src', 'server.ts');

  console.log(`🚀 Iniciando backend desde: ${backendPath}`);

  if (isProd) {
    // En producción usamos node directamente sobre el JS compilado
    backendProcess = exec(`node "${backendPath}"`, (error, stdout, stderr) => {
      if (error) console.error(`Backend error: ${error}`);
      console.log(`Backend stdout: ${stdout}`);
      console.error(`Backend stderr: ${stderr}`);
    });
  } else {
    // En desarrollo ya lo iniciamos con concurrently, pero si quisiéramos:
    // backendProcess = spawn('npx', ['tsx', backendPath]);
  }
}

function ensureDatabase() {
  console.log('🔍 Comprobando servicio MongoDB...');
  // Intentamos arrancar el servicio. Si ya está corriendo, net start devolverá un error inocuo (error 2)
  const cmd = process.platform === 'win32' ? 'net start MongoDB' : 'brew services start mongodb-community';
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      if (error.code === 2) {
        console.log('✅ MongoDB ya está en ejecución.');
      } else {
        console.warn('⚠️ No se pudo iniciar MongoDB automáticamente:', stderr || error.message);
        console.log('Sugerencia: Ejecuta la aplicación como Administrador si el servicio no arranca.');
      }
    } else {
      console.log('🚀 MongoDB iniciado correctamente.');
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "SmartControl - TFG",
    webPreferences: {
      // Esto permite que el front y el back se comuniquen mejor
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.removeMenu();
  
  startBackend();

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../packages/frontend/dist/index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }

  // Abre las herramientas de desarrollo automáticamente (puedes quitarlo luego)
  // win.webContents.openDevTools();
}

// ── Configuración Segura ──────────────────────────────────────────────
const CONFIG_PATH = path.join(app.getPath('userData'), 'secure_config.json');

function getSecrets() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    const rawData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const encryptedData = JSON.parse(rawData);
    
    const decrypted = {};
    for (const key in encryptedData) {
      if (safeStorage.isEncryptionAvailable()) {
        decrypted[key] = safeStorage.decryptString(Buffer.from(encryptedData[key], 'base64'));
      } else {
        // Fallback si no hay cifrado disponible (no recomendado en prod)
        decrypted[key] = encryptedData[key];
      }
    }
    return decrypted;
  } catch (e) {
    console.error('Error leyendo config segura:', e);
    return {};
  }
}

function saveSecrets(secrets) {
  try {
    const encrypted = {};
    for (const key in secrets) {
      if (safeStorage.isEncryptionAvailable()) {
        encrypted[key] = safeStorage.encryptString(secrets[key]).toString('base64');
      } else {
        encrypted[key] = secrets[key];
      }
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(encrypted, null, 2));
    return true;
  } catch (e) {
    console.error('Error guardando config segura:', e);
    return false;
  }
}

ipcMain.handle('get-tuya-config', async () => {
  const customSecrets = getSecrets();
  const hasCustom = Object.keys(customSecrets).length > 0;
  
  // Si no hay custom, devolvemos los del sistema pero marcados
  if (!hasCustom) {
    return {
      ...getSystemDefaults(),
      isDefault: true
    };
  }
  
  return {
    ...customSecrets,
    isDefault: false
  };
});

ipcMain.handle('save-tuya-config', async (event, config) => {
  return saveSecrets(config);
});

// Nuevo handler para borrar config (volver a modo simple)
ipcMain.handle('reset-tuya-config', async () => {
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
    return true;
  }
  return false;
});

app.whenReady().then(() => {
  ensureDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
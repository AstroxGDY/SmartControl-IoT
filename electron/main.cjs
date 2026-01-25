const { app, BrowserWindow } = require('electron');
const path = require('path');

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

  // IMPORTANTE: Cargamos la URL donde corre Vite
  win.loadURL('http://localhost:5173');

  // Abre las herramientas de desarrollo automáticamente (puedes quitarlo luego)
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
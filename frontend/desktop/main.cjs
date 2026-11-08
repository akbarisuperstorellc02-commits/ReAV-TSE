const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// Electron normally returns an absolute Windows userData path. Repair the
// known drive-relative form (C:Users\\...) before passing it to Python.
function getSafeUserDataPath() {
  let value = app.getPath('userData');
  if (process.platform === 'win32') {
    value = value.replace(/^([A-Za-z]):(?=Users[\\/])/i, '$1:' + '\\');
    if (!path.win32.isAbsolute(value)) {
      throw new Error(`Electron returned a non-absolute userData path: ${value}`);
    }
    return path.win32.normalize(value);
  }
  return path.resolve(value);
}

const API_PORT = 8765;
const API_BASE = `http://127.0.0.1:${API_PORT}`;
let backend = null;
let mainWindow = null;

function healthCheck() {
  return new Promise((resolve) => {
    const req = http.get(`${API_BASE}/api/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

async function waitForBackend() {
  for (let i = 0; i < 90; i += 1) {
    if (await healthCheck()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function startBackend() {
  const exe = path.join(process.resourcesPath, 'backend', 'reav_backend.exe');
  backend = spawn(exe, [], {
    cwd: process.resourcesPath,
    env: {
      ...process.env,
      REAV_API_PORT: String(API_PORT),
      REAV_DATA_DIR: path.join(getSafeUserDataPath(), 'data'),
      TORCH_HOME: path.join(process.resourcesPath, 'torch_cache'),
      REAV_AUDIO_MODEL_DIR: path.join(process.resourcesPath, 'audio_models', 'sepformer-wsj02mix')
    },
    windowsHide: true,
    stdio: 'ignore'
  });
  backend.on('error', (error) => {
    dialog.showErrorBox('ReAV-TSE backend error', error.message);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#08080a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(async () => {
  startBackend();
  const ready = await waitForBackend();
  if (!ready) {
    dialog.showErrorBox(
      'ReAV-TSE could not start',
      'The local AI service did not become ready. Check that this PC has enough memory and that the application files are complete.'
    );
    app.quit();
    return;
  }
  await createWindow();
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('before-quit', () => {
  if (backend && !backend.killed) backend.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

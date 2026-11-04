const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('reavDesktop', Object.freeze({
  apiBase: 'http://127.0.0.1:8765',
  platform: process.platform
}));

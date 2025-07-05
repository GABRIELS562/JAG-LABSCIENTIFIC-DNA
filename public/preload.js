const { contextBridge, ipcRenderer } = require('electron');

// Expose Osiris API to the renderer process
contextBridge.exposeInMainWorld('osirisAPI', {
  // Osiris control methods
  analyzeCase: (caseData) => ipcRenderer.invoke('osiris-analyze-case', caseData),
  openGUI: (caseData) => ipcRenderer.invoke('osiris-open-gui', caseData),
  selectInstallation: () => ipcRenderer.invoke('osiris-select-installation'),
  
  // Event listeners
  onStatusUpdate: (callback) => ipcRenderer.on('osiris-status', (event, data) => callback(data)),
  onResults: (callback) => ipcRenderer.on('osiris-results', (event, data) => callback(data)),
  onLog: (callback) => ipcRenderer.on('osiris-log', (event, data) => callback(data)),
  onGUIClosed: (callback) => ipcRenderer.on('osiris-gui-closed', (event, data) => callback(data)),
  
  // File system operations
  selectFSAFiles: () => ipcRenderer.invoke('select-fsa-files'),
  saveResults: (data) => ipcRenderer.invoke('save-results', data),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Expose general electron API
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // File operations
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
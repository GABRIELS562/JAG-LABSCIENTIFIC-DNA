const { contextBridge, ipcRenderer } = require('electron');

// Expose file operations API to the renderer process
contextBridge.exposeInMainWorld('fileAPI', {
  // File selection
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  
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
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Menu events
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-case', () => callback('new-case'));
    ipcRenderer.on('menu-import', () => callback('import'));
  }
});
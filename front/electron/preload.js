const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (data) => ipcRenderer.invoke('save-file', data),
    saveFileTo: (filePath, data) => ipcRenderer.invoke('save-file-to', filePath, data),
    openFile: () => ipcRenderer.invoke('open-file'),
    moveWindow: (dx, dy) => ipcRenderer.send('move-window', dx, dy),
});

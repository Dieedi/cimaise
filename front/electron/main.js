const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const windowConfig = require('../../config/window.json');
const appConfig = require('../../config/app.json');
const fs = require('fs');

const resolution = windowConfig.resolution;
let win;
const createWindow = () => {
    win = new BrowserWindow({
        width: resolution.width,
        height: resolution.height,
        frame: windowConfig.frame,
        webPreferences: {
            preload: path.join(__dirname, '/preload.js'),
        }
    })
    win.loadURL(appConfig.server_url);
}

app.whenReady().then(createWindow)

ipcMain.handle('save-file', async (_event, data) => {
    const result = await dialog.showSaveDialog(win, {
        title: 'save',
        defaultPath: appConfig.save.defaultFilename,
        filters: [{ name: appConfig.save.fileTypeName, extensions: [appConfig.save.fileExtension] }],
    });
    if (result.canceled === true) {
        return;
    }
    fs.writeFileSync(result.filePath, data);
})
ipcMain.handle('open-file', async (_event) => {
    const result = await dialog.showOpenDialog(win, {
        title: 'Open',
        filters: [{ name: appConfig.save.fileTypeName, extensions: [appConfig.save.fileExtension] }],
        properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    const data = fs.readFileSync(result.filePaths[0]);
    return data;
})
app.on('window-all-closed', () => {
    app.quit();
})
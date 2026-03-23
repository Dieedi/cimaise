const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// In packaged mode, config is bundled next to the app
const isDev = !app.isPackaged;
const configPath = isDev
    ? path.join(__dirname, '../../config')
    : path.join(process.resourcesPath, 'config');

const windowConfig = require(path.join(configPath, 'window.json'));
const appConfig = require(path.join(configPath, 'app.json'));

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

    if (isDev) {
        win.loadURL(appConfig.server_url);
    } else {
        win.loadFile(path.join(__dirname, '../dist/front/browser/index.html'));
    }
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
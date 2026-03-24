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
    const iconPath = isDev
        ? path.join(__dirname, '../public/icon.png')
        : path.join(__dirname, '../dist/front/browser/icon.png');

    win = new BrowserWindow({
        width: resolution.width,
        height: resolution.height,
        frame: windowConfig.frame,
        icon: iconPath,
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

ipcMain.on('move-window', (_event, deltaX, deltaY) => {
    const [x, y] = win.getPosition();
    win.setPosition(x + deltaX, y + deltaY);
});

ipcMain.handle('save-file-to', async (_event, filePath, data) => {
    fs.writeFileSync(filePath, data);
})
ipcMain.handle('save-file', async (_event, data) => {
    const result = await dialog.showSaveDialog(win, {
        title: 'save',
        defaultPath: appConfig.save.defaultFilename,
        filters: [{ name: appConfig.save.fileTypeName, extensions: [appConfig.save.fileExtension] }],
    });
    if (result.canceled === true) {
        return null;
    }
    fs.writeFileSync(result.filePath, data);
    return result.filePath;
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
    const filePath = result.filePaths[0];
    const buffer = fs.readFileSync(filePath);
    // Convert Buffer to Uint8Array so it serializes cleanly through IPC
    const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    return [data, filePath];
})
app.on('window-all-closed', () => {
    app.quit();
})
const { app, BrowserWindow } = require('electron');
const windowConfig = require('../../config/window.json');
const appConfig = require('../../config/app.json');

const resolution = windowConfig.resolution;
const createWindow = () => {
    const win = new BrowserWindow({
        width: resolution.width,
        height: resolution.height,
        frame: windowConfig.frame
    })

    win.loadURL(appConfig.server_url);
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    app.quit();
})
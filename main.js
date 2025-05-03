const path = require('path');
const { app, BrowserWindow, Menu } = require('electron');

function createMainWindow () {
    const mainWindow = new BrowserWindow({
        title: 'Page Replacement Algorithm',
        width: 1500,
        height: 785
    })

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
    createMainWindow();
});
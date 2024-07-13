const { app, BrowserWindow, ipcMain, autoUpdater } = require('electron');
const path = require('path');
const { SerialPort, SerialPortList } = require('serialport');

let mainWindow;
let port;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 840,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.setMenu(null);
    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('resize-window', (event, { width, height }) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.setSize(width, height, true);
    }
});

ipcMain.on('send-to-serial', (event, data) => {
    if (port) {
        port.write(data, (err) => {
            if (err) {
                event.reply('serial-error', err.message);
                return;
            }
            console.log('Message written:', data);
        });
    }
});

ipcMain.on('send-mouse-data', (event, buffer) => {
    if (port) {
        port.write(buffer, (err) => {
            if (err) {
                console.error('Failed to send mouse data:', err);
            }
            console.log('Mouse data sent:', buffer.toString('hex'));
        });
    }
});

ipcMain.on('send-keyboard-data', (event, data) => {
    if (port) {
        const buffer = Buffer.from(data);
        port.write(buffer, (err) => {
            if (err) {
                console.error('Failed to send keyboard data:', err);
            }
            console.log('Keyboard data sent:', buffer);
        });
    }
});

ipcMain.on('list-serial-ports', async (event) => {
    try {
        const ports = await SerialPort.list();
        event.reply('serial-ports-listed', ports);
    } catch (err) {
        console.error('Failed to list serial ports:', err);
    }
});

ipcMain.on('connect-to-serial-port', (event, portPath) => {
    if (port) {
        port.close();
    }
    port = new SerialPort({
        path: portPath,
        baudRate: 115200
    });

    port.on('open', () => {
        console.log(`Connected to ${portPath}`);
    });

    port.on('error', (err) => {
        console.error('Failed to connect to serial port:', err);
    });
});
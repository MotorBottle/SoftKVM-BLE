const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendToSerial: (data) => {
        ipcRenderer.send('send-to-serial', data);
    },
    sendMouseEvent: (buttons, xMove, yMove, wheelMove) => {
        const data = Buffer.alloc(5);
        data.writeUInt8(1, 0); // Mouse data identifier
        data.writeUInt8(buttons, 1);
        data.writeInt8(xMove, 2);
        data.writeInt8(yMove, 3);
        data.writeInt8(wheelMove, 4);
        ipcRenderer.send('send-mouse-data', data);
    },
    sendKeyboardEvent: (modifier, keyCodes) => {
        const data = [
            2, // 设定数据类型为键盘数据
            modifier, // 修饰键字节
            ...keyCodes, // 最多六个键码
            ...Array(6 - keyCodes.length).fill(0) // 不足六个键时填充0
        ];
        ipcRenderer.send('send-keyboard-data', data);
    },
    onSerialData: (callback) => {
        ipcRenderer.on('serial-data', (event, data) => callback(data));
    },
    resizeWindow: (width, height) => {
        ipcRenderer.send('resize-window', { width, height });
    },
    listSerialPorts: () => {
        ipcRenderer.send('list-serial-ports');
    },
    onSerialPortsListed: (callback) => {
        ipcRenderer.on('serial-ports-listed', (event, ports) => callback(ports));
    },
    connectToSerialPort: (portPath) => {
        ipcRenderer.send('connect-to-serial-port', portPath);
    }
});

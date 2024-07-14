document.addEventListener('DOMContentLoaded', () => {
    const interfaceDiv = document.getElementById('hotkeyInterface');
    const clearSelectionButton = document.getElementById('clearSelectionButton');
    const sendKeysButton = document.getElementById('sendKeysButton');
    const keys = ['Esc', 'Ctrl', 'Alt/Opt', 'Tab', 'Shift', 'Win/Cmd'];
    const keyList = document.getElementById('keyList');
    const selectedKeys = [];
    const fullScreenButton = document.getElementById('fullScreenButton');
    const captureButton = document.getElementById('captureButton');
    const serialPortSelect = document.getElementById('serialPortSelect');
    const ctrlMetaToggle = document.getElementById('ctrlMetaToggle');
    const invertScrollToggle = document.getElementById('invertScrollToggle');
    let lastUnlockTime = 0;

    // Populate key list
    keys.forEach(key => {
        let li = document.createElement('li');
        li.textContent = key;
        li.onclick = () => toggleSelectKey(key);
        keyList.appendChild(li);
    });

    function toggleSelectKey(key) {
        const keyIndex = selectedKeys.indexOf(key);
        if (keyIndex === -1) {
            selectedKeys.push(key); // Add key if not already selected
        } else {
            selectedKeys.splice(keyIndex, 1); // Remove key if already selected
        }
        updateSelectedKeysDisplay();
    }

    function updateSelectedKeysDisplay() {
        const selectedKeysList = document.getElementById('selectedKeys');
        selectedKeysList.innerHTML = '';
        selectedKeys.forEach(key => {
            let li = document.createElement('li');
            li.textContent = key;
            selectedKeysList.appendChild(li);
        });
    }

    document.getElementById('hotkeyInterface').addEventListener('click', (event) => {
        if (interfaceDiv.style.display !== "block") {
            return; // Do nothing if the interface is not displayed
        }

        const target = event.target; // The clicked element

        if (target.id === 'clearSelectionButton') {
            clearSelection();
        } else if (target.id === 'sendKeysButton') {
            sendKeys();
            clearSelection();
        }
    });

    function clearSelection() {
        selectedKeys.length = 0; // Clear the array
        updateSelectedKeysDisplay();
    }

    function sendKeys() {
        console.log('Sending keys:', selectedKeys.join('+'));
        // Add your method to send keys to the client machine
    }



    // No need as the interface is the main Window
    // document.addEventListener('keydown', function(event) {
    //     if (event.altKey && event.key === 's') {
    //         toggleInterface();
    //     }
    // });

    // function toggleInterface() {
    //     // Check if the document is in pointer lock
    //     if (document.pointerLockElement) {
    //         // Exit pointer lock
    //         document.exitPointerLock();
    //         // Wait for the pointer lock to be released before showing the interface
    //         showInterface();
    //     } else {
    //         // Directly toggle interface visibility if not in pointer lock
    //         showInterface();
    //     }
    // }

    // function showInterface() {
    //     let displayStyle = window.getComputedStyle(interfaceDiv).display;
    //     clearSelection();
    //     interfaceDiv.style.display = (displayStyle === 'none' || displayStyle === '') ? 'block' : 'none';
    // }

    /*-------------------------全屏切换---------------------------*/
    fullScreenButton.addEventListener('click', () => {
        // Check if we are currently in fullscreen mode
        if (!document.fullscreenElement) {
            // If not in fullscreen, request fullscreen
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            // If in fullscreen, exit fullscreen
            document.exitFullscreen();
        }
    });

    // Listener for fullscreen change
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullScreenButton.textContent = 'Exit Full Screen';
        } else {
            fullScreenButton.textContent = 'Full Screen Mode';
        }
    });

    // Optionally, handle fullscreen errors
    document.addEventListener('fullscreenerror', (event) => {
        console.error('An error occurred while trying to switch in or out of full-screen mode.');
        fullScreenButton.textContent = 'Full Screen Mode'; // Ensure button text is reset if fullscreen entry fails
    });

    /*-------------------------全屏切换---------------------------*/

    /*-------------------------控制部分---------------------------*/
    let mouseController = new MouseController();
    let keyboardController = new KeyboardController(captureButton);

    // 加载保存的设置
    const savedCtrlMetaToggle = localStorage.getItem('ctrlMetaToggle') === 'true';
    const savedInvertScrollToggle = localStorage.getItem('invertScrollToggle') === 'true';

    ctrlMetaToggle.checked = savedCtrlMetaToggle;
    invertScrollToggle.checked = savedInvertScrollToggle;

    keyboardController.setSwapMetaCtrl(savedCtrlMetaToggle);
    mouseController.setInvertScroll(savedInvertScrollToggle);
    
    captureButton.addEventListener('click', () => {
        const now = Date.now();
        if (now - lastUnlockTime < 1300) {
            showMessage('You operated too fast, please wait 1 second and retry.');
            return;
        }
        if (!keyboardController.isLocked) {
            keyboardController.lockKeyboard();
        }
        if (!mouseController.captured) {
            mouseController.capture();
        }

    });

    document.addEventListener('pointerlockchange', () => {
        if (!document.pointerLockElement) {
            if (keyboardController.isLocked || mouseController.captured) {
                lastUnlockTime = Date.now(); // 更新解锁时间
            }
            if (keyboardController.isLocked) {
                keyboardController.unlockKeyboard();
            }
            if (mouseController.captured) {
                mouseController.release();  // 调用销毁方法，清理资源
            }
        }
    });

    document.addEventListener('pointerlockerror', () => {
        console.error('Pointer Lock Error');
    });

    function showMessage(message, duration = 3000) {
        const messageArea = document.getElementById('messageArea');
        messageArea.textContent = message;
        messageArea.style.display = 'block';
        setTimeout(() => {
            messageArea.textContent = ''; // Clear the text content
            messageArea.style.display = 'none'; // Hide the message area again
        }, duration);
    }

    /*-------------------------控制部分---------------------------*/

    // 列出可用的串口
    electronAPI.listSerialPorts();

    // 处理列出串口的回调
    electronAPI.onSerialPortsListed((ports) => {
        serialPortSelect.innerHTML = ''; // 清空当前选项
        ports.forEach(port => {
            let option = document.createElement('option');
            option.value = port.path;
            option.textContent = port.path;
            serialPortSelect.appendChild(option);
        });

        // 默认选择第一个串口并连接
        if (serialPortSelect.options.length > 0) {
            serialPortSelect.selectedIndex = 0;
            const selectedPort = serialPortSelect.value;
            electronAPI.connectToSerialPort(selectedPort);
            console.log(`Automatically connecting to ${selectedPort}`);
        }
    });

    // 当用户选择一个串口时连接到它
    serialPortSelect.addEventListener('change', () => {
        const selectedPort = serialPortSelect.value;
        if (selectedPort) {
            electronAPI.connectToSerialPort(selectedPort);
            console.log(`Connecting to ${selectedPort}`);
        }
    });

    // 监听 Ctrl/Meta 切换复选框状态变化
    ctrlMetaToggle.addEventListener('change', () => {
        const swapMetaCtrl = ctrlMetaToggle.checked;
        keyboardController.setSwapMetaCtrl(swapMetaCtrl);
        localStorage.setItem('ctrlMetaToggle', swapMetaCtrl); // 保存设置
        console.log(`Swap Meta and Ctrl: ${swapMetaCtrl}`);
    });

    // 监听滚轮反转复选框状态变化
    invertScrollToggle.addEventListener('change', () => {
        const invertScroll = invertScrollToggle.checked;
        mouseController.setInvertScroll(invertScroll);
        localStorage.setItem('invertScrollToggle', invertScroll); // 保存设置
        console.log(`Invert Scroll: ${invertScroll}`);
    });
});

function updateFullScreenButton() {
    const fullScreenButton = document.getElementById('fullScreenButton');
    if (document.fullscreenElement) {
        fullScreenButton.textContent = 'Exit Full Screen';
    } else {
        fullScreenButton.textContent = 'Full Screen Mode';
    }
}

class MouseController {
    constructor() {
        this.captured = false;
        this.currentButtons = 0; // Tracks currently pressed buttons
        this.buttonMask = 0; // Mask of buttons to send to the serial port
        this.throttledMouseMove = this.throttle(this.handleMouseMove.bind(this), 2);
        this.throttledWheelMove = this.throttle(this.handleWheelMove.bind(this), 8);
        this.invertScroll = false;
        this.bindMouseHandlers();
    }

    bindMouseHandlers() {
        this.handleMouseButtons = {
            mousedown: this.handleMouseButtons.bind(this, 'mousedown'),
            mouseup: this.handleMouseButtons.bind(this, 'mouseup')
        };
    }

    capture() {
        document.addEventListener('mousemove', this.throttledMouseMove, false);
        document.addEventListener('wheel', this.throttledWheelMove, false);
        ['mousedown', 'mouseup'].forEach(eventType => {
            document.addEventListener(eventType, this.handleMouseButtons[eventType], false);
        });
        this.captured = true;
        console.log('MouseController captured');
    }

    release() {
        document.removeEventListener('mousemove', this.throttledMouseMove, false);
        document.removeEventListener('wheel', this.throttledWheelMove, false);
        ['mousedown', 'mouseup'].forEach(eventType => {
            document.removeEventListener(eventType, this.handleMouseButtons[eventType], false);
        });
        this.captured = false;
        console.log('MouseController released.');
    }

    handleMouseButtons(eventType, event) {
        let mask = this.getButtonMask(event.button);
        if (eventType === 'mousedown') {
            this.currentButtons |= mask; // Add the current button state
        } else {
            this.currentButtons &= ~mask; // Remove the current button state
            mask = 0; // Clear mask on button release
        }

        // Check for special case: both left and right buttons pressed simultaneously
        if (this.currentButtons === (1 | 2)) {
            this.buttonMask = 3; // Special code for both buttons pressed
        } else {
            this.buttonMask = mask;
        }

        this.sendRepeatedly(this.buttonMask, eventType === 'mousedown' ? 3 : 2, 8);
    }

    handleMouseMove(event) {
        this.accumulatedX = event.movementX;
        this.accumulatedY = event.movementY;

        this.sendMouseEventIfNeeded();
    }

    sendMouseEventIfNeeded() {
        while (Math.abs(this.accumulatedX) > 128 || Math.abs(this.accumulatedY) > 128) {
            let sendX = Math.sign(this.accumulatedX) * Math.min(Math.abs(this.accumulatedX), 128);
            let sendY = Math.sign(this.accumulatedY) * Math.min(Math.abs(this.accumulatedY), 128);
            electronAPI.sendMouseEvent(this.buttonMask, sendX, sendY, 0);
            this.accumulatedX -= sendX;
            this.accumulatedY -= sendY;
        }
    
        if (this.accumulatedX !== 0 || this.accumulatedY !== 0) {
            electronAPI.sendMouseEvent(this.buttonMask, this.accumulatedX, this.accumulatedY, 0);
            this.accumulatedX = 0;
            this.accumulatedY = 0;
        }
    }

    handleWheelMove(event) {
        const wheelMove = Math.sign(event.deltaY) * (this.invertScroll ? 1 : -1);
        electronAPI.sendMouseEvent(this.buttonMask, 0, 0, wheelMove);
    }

    getButtonMask(button) {
        switch (button) {
            case 0: return 1; // Left button
            case 1: return 4; // Middle button
            case 2: return 2; // Right button
        }
    }

    sendRepeatedly(buttonMask, count, delay) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                electronAPI.sendMouseEvent(buttonMask, 0, 0, 0);
            }, delay);
        }
    }

    throttle(callback, limit) {
        let lastEventTimestamp = null;
        let timeout;
        return function() {
            const now = Date.now();
            const timeSinceLastEvent = now - (lastEventTimestamp || 0);
            if (lastEventTimestamp && timeSinceLastEvent < limit) {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    lastEventTimestamp = now;
                    callback.apply(this, arguments);
                }, limit - timeSinceLastEvent);
            } else {
                lastEventTimestamp = now;
                callback.apply(this, arguments);
            }
        };
    }

    setInvertScroll(invert) {
        this.invertScroll = invert;
    }
}

class KeyboardController {
    constructor(captureButton) {
        this.captureButton = captureButton;
        this.isLocked = false;
        this.modifiers = 0; // Modifier bitmask
        this.pressedKeys = new Set(); // Tracks pressed keys
        this.swapMetaCtrl = false;
        this.init();
    }

    init() {
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.handleKeyUpBound = this.handleKeyUp.bind(this);
    }

    handleKeyDown(event) {
        event.preventDefault(); // Prevent default to avoid triggering other shortcuts
        if (event.altKey && event.ctrlKey) {
            electronAPI.sendKeyboardEvent(0x00, []);
            this.unlockKeyboard(); // Directly call unlockKeyboard
            return; // Skip further processing
        }

        if (this.isModifierKey(event.code)) {
            this.updateModifiers(event, true);
            this.sendKeyboardEvent();
            return; // Skip further processing for modifier keys
        }

        let keyCode = HID_USAGE_ID_MAP[event.code];
        if (keyCode && !this.pressedKeys.has(keyCode)) {
            this.pressedKeys.add(keyCode);
            this.sendKeyboardEvent();
        }
    }

    handleKeyUp(event) {
        if (this.isModifierKey(event.code)) {
            this.updateModifiers(event, false);
            this.sendKeyboardEvent();
            return; // Skip further processing for modifier keys
        }

        let keyCode = HID_USAGE_ID_MAP[event.code];
        if (keyCode && this.pressedKeys.has(keyCode)) {
            this.pressedKeys.delete(keyCode);
            this.sendKeyboardEvent();
        }
    }

    sendKeyboardEvent() {
        let modifiersToSend = this.modifiers;
        let keyCodes = Array.from(this.pressedKeys).slice(0, 6);
        this.sendRepeatedly(modifiersToSend, keyCodes, 3, 1);
    }

    sendRepeatedly(modifiers, keyCodes, count, delay) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                electronAPI.sendKeyboardEvent(modifiers, keyCodes);
            }, delay);
        }
    }

    isModifierKey(code) {
        return ['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', ''].includes(code);
    }

    updateModifiers(event, isKeyDown) {
        let mask = 0;
        let code = event.code;

        // Swap Meta and Ctrl if the flag is set
        if (this.swapMetaCtrl) {
            if (code === 'ControlLeft') code = 'MetaLeft';
            else if (code === 'ControlRight') code = 'MetaRight';
            else if (code === 'MetaLeft') code = 'ControlLeft';
            else if (code === 'MetaRight') code = 'ControlRight';
        }

        switch (code) {
            case 'ControlLeft': mask = 0x01; break;
            case 'ControlRight': mask = 0x10; break;
            case 'ShiftLeft': mask = 0x02; break;
            // case 'ShiftRight': mask = 0x20; break; // due to a possible bug in kb lock api, shiftRight's code appear to be empty
            case 'AltLeft': mask = 0x04; break;
            case 'AltRight': mask = 0x40; break;
            case 'MetaLeft': mask = 0x08; break;
            case 'MetaRight': mask = 0x80; break;
            case '':
                if (event.key === 'Shift') {
                    mask = 0x20;
                    break;
                }
        }
    
        if (isKeyDown) {
            this.modifiers |= mask;
        } else {
            this.modifiers &= ~mask;
        }
        // console.log(this.modifiers);
    }

    lockKeyboard() {
        if (this.isLocked) return;
        navigator.keyboard.lock().then(() => {
            console.log('Keyboard locked');
            document.addEventListener('keydown', this.handleKeyDownBound);
            document.addEventListener('keyup', this.handleKeyUpBound);
            if (!document.pointerLockElement) {
                this.captureButton.requestPointerLock();
            }
            this.isLocked = true;
            this.modifiers = 0; // Reset modifiers when locking
            this.pressedKeys.clear(); // Clear any previously pressed keys
        }).catch(console.error);
    }

    unlockKeyboard() {
        if (!this.isLocked) return;
        navigator.keyboard.unlock();
        console.log('Keyboard unlocked');
        document.removeEventListener('keydown', this.handleKeyDownBound);
        document.removeEventListener('keyup', this.handleKeyUpBound);
        if (document.pointerLockElement === this.captureButton) {
            document.exitPointerLock();
        }
        this.modifiers = 0;
        this.pressedKeys.clear();
        this.isLocked = false;
    }

    destroy() {
        if (this.isLocked) {
            this.unlockKeyboard();
        }
    }

    setSwapMetaCtrl(swap) {
        this.swapMetaCtrl = swap;
    }
}

const HID_USAGE_ID_MAP = {
    "KeyA": 0x04,
    "KeyB": 0x05,
    "KeyC": 0x06,
    "KeyD": 0x07,
    "KeyE": 0x08,
    "KeyF": 0x09,
    "KeyG": 0x0A,
    "KeyH": 0x0B,
    "KeyI": 0x0C,
    "KeyJ": 0x0D,
    "KeyK": 0x0E,
    "KeyL": 0x0F,
    "KeyM": 0x10,
    "KeyN": 0x11,
    "KeyO": 0x12,
    "KeyP": 0x13,
    "KeyQ": 0x14,
    "KeyR": 0x15,
    "KeyS": 0x16,
    "KeyT": 0x17,
    "KeyU": 0x18,
    "KeyV": 0x19,
    "KeyW": 0x1A,
    "KeyX": 0x1B,
    "KeyY": 0x1C,
    "KeyZ": 0x1D,
    "Digit1": 0x1E,
    "Digit2": 0x1F,
    "Digit3": 0x20,
    "Digit4": 0x21,
    "Digit5": 0x22,
    "Digit6": 0x23,
    "Digit7": 0x24,
    "Digit8": 0x25,
    "Digit9": 0x26,
    "Digit0": 0x27,
    "F1": 0x3A,
    "F2": 0x3B,
    "F3": 0x3C,
    "F4": 0x3D,
    "F5": 0x3E,
    "F6": 0x3F,
    "F7": 0x40,
    "F8": 0x41,
    "F9": 0x42,
    "F10": 0x43,
    "F11": 0x44,
    "F12": 0x45,
    "F13": 0x68,
    "F14": 0x69,
    "F15": 0x6A,
    "F16": 0x6B,
    "F17": 0x6C,
    "F18": 0x6D,
    "F19": 0x6E,
    "F20": 0x6F,
    "F21": 0x70,
    "F22": 0x71,
    "F23": 0x72,
    "F24": 0x73,
    "Enter": 0x28,
    "Escape": 0x29,
    "Backspace": 0x2A,
    "Tab": 0x2B,
    "Space": 0x2C,
    "Minus": 0x2D,
    "Equal": 0x2E,
    "BracketLeft": 0x2F,
    "BracketRight": 0x30,
    "Backslash": 0x31,
    "Semicolon": 0x33,
    "Quote": 0x34,
    "Backquote": 0x35,
    "Comma": 0x36,
    "Period": 0x37,
    "Slash": 0x38,
    "CapsLock": 0x39,
    "PrintScreen": 0x46,
    "ScrollLock": 0x47,
    "Pause": 0x48,
    "Insert": 0x49,
    "Home": 0x4A,
    "PageUp": 0x4B,
    "Delete": 0x4C,
    "End": 0x4D,
    "PageDown": 0x4E,
    "ArrowRight": 0x4F,
    "ArrowLeft": 0x50,
    "ArrowDown": 0x51,
    "ArrowUp": 0x52,
    "NumLock": 0x53,
    "NumpadDivide": 0x54,
    "NumpadMultiply": 0x55,
    "NumpadSubtract": 0x56,
    "NumpadAdd": 0x57,
    "NumpadEnter": 0x58,
    "Numpad1": 0x59,
    "Numpad2": 0x5A,
    "Numpad3": 0x5B,
    "Numpad4": 0x5C,
    "Numpad5": 0x5D,
    "Numpad6": 0x5E,
    "Numpad7": 0x5F,
    "Numpad8": 0x60,
    "Numpad9": 0x61,
    "Numpad0": 0x62,
    "NumpadDecimal": 0x63,
    "Power": 0x66,
    "NumpadEqual": 0x67,
    "Open": 0x74,
    "Help": 0x75,
    "ContextMenu": 0x76,
    "Select": 0x77,
    "MediaStop": 0x78,
    "Again": 0x79,
    "Undo": 0x7A,
    "Cut": 0x7B,
    "Copy": 0x7C,
    "Paste": 0x7D,
    "Find": 0x7E,
    "AudioVolumeMute": 0x7F,
    "AudioVolumeUp": 0x80,
    "AudioVolumeDown": 0x81,
    "NumpadComma": 0x85,
    "Lang1": 0x90,
    "Lang2": 0x91,
    "Lang3": 0x92,
    "Lang4": 0x93,
    "Lang5": 0x94,
    "Lang6": 0x95,
    "Lang7": 0x96,
    "Lang8": 0x97,
    "Lang9": 0x98,
}
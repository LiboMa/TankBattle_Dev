/**
 * Xbox游戏手柄管理器
 * 支持双手柄控制 - Player 1 和 Player 2
 * 兼容Xbox One/Series X|S 控制器
 */

class GamepadManager {
    constructor() {
        this.gamepads = {};
        this.deadzone = 0.15; // 摇杆死区
        this.triggerThreshold = 0.1; // 扳机阈值
        this.buttonStates = {}; // 按钮状态跟踪
        this.previousButtonStates = {}; // 上一帧按钮状态

        // Xbox控制器按钮映射
        this.XBOX_BUTTONS = {
            A: 0,           // A按钮 (射击)
            B: 1,           // B按钮 (备用)
            X: 2,           // X按钮 (备用)
            Y: 3,           // Y按钮 (备用)
            LB: 4,          // 左肩键 (散弹/特殊射击)
            RB: 5,          // 右肩键 (散弹/特殊射击)
            LT: 6,          // 左扳机 (作为按钮)
            RT: 7,          // 右扳机 (作为按钮)
            SELECT: 8,      // 选择键 (暂停)
            START: 9,       // 开始键 (暂停)
            LS: 10,         // 左摇杆按下
            RS: 11,         // 右摇杆按下
            DPAD_UP: 12,    // 方向键上
            DPAD_DOWN: 13,  // 方向键下
            DPAD_LEFT: 14,  // 方向键左
            DPAD_RIGHT: 15, // 方向键右
            XBOX: 16        // Xbox按钮
        };

        // 摇杆轴映射
        this.XBOX_AXES = {
            LEFT_X: 0,      // 左摇杆X轴 (移动)
            LEFT_Y: 1,      // 左摇杆Y轴 (移动)
            RIGHT_X: 2,     // 右摇杆X轴 (瞄准)
            RIGHT_Y: 3,     // 右摇杆Y轴 (瞄准)
            LT_AXIS: 4,     // 左扳机轴
            RT_AXIS: 5      // 右扳机轴
        };

        this.setupEventListeners();
        console.log('🎮 GamepadManager initialized - Xbox controllers supported');
    }

    setupEventListeners() {
        // 手柄连接事件
        window.addEventListener('gamepadconnected', (e) => {
            console.log(`🎮 Gamepad connected: ${e.gamepad.id} (Index: ${e.gamepad.index})`);
            this.gamepads[e.gamepad.index] = e.gamepad;
            this.buttonStates[e.gamepad.index] = {};
            this.previousButtonStates[e.gamepad.index] = {};

            // 显示连接提示
            this.showGamepadNotification(`Controller ${e.gamepad.index + 1} Connected`, 'success');
        });

        // 手柄断开事件
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log(`🎮 Gamepad disconnected: ${e.gamepad.id} (Index: ${e.gamepad.index})`);
            delete this.gamepads[e.gamepad.index];
            delete this.buttonStates[e.gamepad.index];
            delete this.previousButtonStates[e.gamepad.index];

            // 显示断开提示
            this.showGamepadNotification(`Controller ${e.gamepad.index + 1} Disconnected`, 'warning');
        });
    }

    // 更新手柄状态 (每帧调用)
    update() {
        const gamepads = navigator.getGamepads();

        // 检查所有可能的手柄位置 (通常0-3)
        for (let i = 0; i < 3; i++) {
            if (gamepads[i] && gamepads[i].connected) {
                // 手柄已连接
                if (!this.gamepads[i]) {
                    // 新连接的手柄
                    console.log(`🎮 Gamepad ${i} detected and cached`);
                    this.gamepads[i] = gamepads[i];
                    this.buttonStates[i] = {};
                    this.previousButtonStates[i] = {};
                } else {
                    // 更新现有手柄状态
                    this.gamepads[i] = gamepads[i];
                }
                this.updateButtonStates(i);
            } else {
                // 手柄未连接或已断开
                if (this.gamepads[i]) {
                    // 手柄已断开
                    console.log(`🎮 Gamepad ${i} disconnected`);
                    delete this.gamepads[i];
                    delete this.buttonStates[i];
                    delete this.previousButtonStates[i];
                }
            }
        }
    }

    // 更新按钮状态
    updateButtonStates(gamepadIndex) {
        const gamepad = this.gamepads[gamepadIndex];
        if (!gamepad) return;

        // 保存上一帧状态
        this.previousButtonStates[gamepadIndex] = { ...this.buttonStates[gamepadIndex] };

        // 更新当前状态
        this.buttonStates[gamepadIndex] = {};

        // 更新所有按钮状态
        for (let i = 0; i < gamepad.buttons.length; i++) {
            this.buttonStates[gamepadIndex][i] = gamepad.buttons[i].pressed;
        }

        // 更新扳机轴作为按钮
        if (gamepad.axes[this.XBOX_AXES.LT_AXIS] !== undefined) {
            this.buttonStates[gamepadIndex]['LT_AXIS'] = gamepad.axes[this.XBOX_AXES.LT_AXIS] > this.triggerThreshold;
        }
        if (gamepad.axes[this.XBOX_AXES.RT_AXIS] !== undefined) {
            this.buttonStates[gamepadIndex]['RT_AXIS'] = gamepad.axes[this.XBOX_AXES.RT_AXIS] > this.triggerThreshold;
        }

        // 🎮 更新扳机状态 (用于导弹发射检测)
        this.buttonStates[gamepadIndex]['trigger_RT'] = this.isTriggerPressed(gamepadIndex, 'RT');
        this.buttonStates[gamepadIndex]['trigger_LT'] = this.isTriggerPressed(gamepadIndex, 'LT');
    }

    // 检查按钮是否按下
    isButtonPressed(gamepadIndex, button) {
        if (!this.buttonStates[gamepadIndex]) return false;

        if (typeof button === 'string') {
            return this.buttonStates[gamepadIndex][button] || false;
        }
        return this.buttonStates[gamepadIndex][button] || false;
    }

    // 检查按钮是否刚刚按下 (按下瞬间)
    isButtonJustPressed(gamepadIndex, button) {
        if (!this.buttonStates[gamepadIndex] || !this.previousButtonStates[gamepadIndex]) return false;

        const current = this.buttonStates[gamepadIndex][button] || false;
        const previous = this.previousButtonStates[gamepadIndex][button] || false;

        return current && !previous;
    }

    // 获取摇杆值 (应用死区)
    getAxisValue(gamepadIndex, axis) {
        const gamepad = this.gamepads[gamepadIndex];
        if (!gamepad || !gamepad.axes[axis]) return 0;

        const value = gamepad.axes[axis];
        return Math.abs(value) > this.deadzone ? value : 0;
    }

    // 🎮 检查扳机是否按下 (支持RT/LT扳机)
    isTriggerPressed(gamepadIndex, trigger) {
        const gamepad = this.gamepads[gamepadIndex];
        if (!gamepad) return false;

        let triggerValue = 0;

        if (trigger === 'RT') {
            // 右扳机 - 检查轴值和按钮状态
            triggerValue = gamepad.axes[this.XBOX_AXES.RT_AXIS] || 0;
            const buttonPressed = gamepad.buttons[this.XBOX_BUTTONS.RT]?.pressed || false;
            return triggerValue > this.triggerThreshold || buttonPressed;
        } else if (trigger === 'LT') {
            // 左扳机 - 检查轴值和按钮状态
            triggerValue = gamepad.axes[this.XBOX_AXES.LT_AXIS] || 0;
            const buttonPressed = gamepad.buttons[this.XBOX_BUTTONS.LT]?.pressed || false;
            return triggerValue > this.triggerThreshold || buttonPressed;
        }

        return false;
    }

    // 🎮 检查扳机是否刚刚按下 (按下瞬间)
    isTriggerJustPressed(gamepadIndex, trigger) {
        if (!this.buttonStates[gamepadIndex] || !this.previousButtonStates[gamepadIndex]) return false;

        const triggerKey = `trigger_${trigger}`;
        const current = this.isTriggerPressed(gamepadIndex, trigger);
        const previous = this.previousButtonStates[gamepadIndex][triggerKey] || false;

        return current && !previous;
    }

    // 获取左摇杆值 (移动控制)
    getLeftStick(gamepadIndex) {
        return {
            x: this.getAxisValue(gamepadIndex, this.XBOX_AXES.LEFT_X),
            y: this.getAxisValue(gamepadIndex, this.XBOX_AXES.LEFT_Y)
        };
    }

    // 获取右摇杆值 (瞄准控制)
    getRightStick(gamepadIndex) {
        return {
            x: this.getAxisValue(gamepadIndex, this.XBOX_AXES.RIGHT_X),
            y: this.getAxisValue(gamepadIndex, this.XBOX_AXES.RIGHT_Y)
        };
    }

    // 获取扳机值
    getTriggerValue(gamepadIndex, trigger) {
        const gamepad = this.gamepads[gamepadIndex];
        if (!gamepad) return 0;

        if (trigger === 'LT' && gamepad.axes[this.XBOX_AXES.LT_AXIS] !== undefined) {
            return Math.max(0, gamepad.axes[this.XBOX_AXES.LT_AXIS]);
        }
        if (trigger === 'RT' && gamepad.axes[this.XBOX_AXES.RT_AXIS] !== undefined) {
            return Math.max(0, gamepad.axes[this.XBOX_AXES.RT_AXIS]);
        }
        return 0;
    }

    // 检查手柄是否连接
    isGamepadConnected(gamepadIndex) {
        // 首先检查内部缓存
        if (this.gamepads[gamepadIndex] !== undefined) {
            return true;
        }

        // 然后检查navigator.getGamepads()的实时状态
        const gamepads = navigator.getGamepads();
        if (gamepads && gamepads[gamepadIndex] && gamepads[gamepadIndex].connected) {
            // 如果发现连接的手柄但内部缓存没有，更新缓存
            this.gamepads[gamepadIndex] = gamepads[gamepadIndex];
            this.buttonStates[gamepadIndex] = {};
            this.previousButtonStates[gamepadIndex] = {};
            return true;
        }

        return false;
    }

    // 获取连接的手柄数量
    getConnectedGamepadCount() {
        return Object.keys(this.gamepads).length;
    }

    // 获取手柄信息
    getGamepadInfo(gamepadIndex) {
        const gamepad = this.gamepads[gamepadIndex];
        if (!gamepad) return null;

        return {
            id: gamepad.id,
            index: gamepad.index,
            connected: gamepad.connected,
            timestamp: gamepad.timestamp,
            buttonsCount: gamepad.buttons.length,
            axesCount: gamepad.axes.length
        };
    }

    // 手柄震动 (如果支持)
    vibrate(gamepadIndex, duration = 200, strongMagnitude = 1.0, weakMagnitude = 1.0) {
        // 🎮 检查震动设置
        if (window.gameSettings && !window.gameSettings.gamepadVibrationEnabled) {
            return false; // 震动被禁用
        }

        const gamepad = this.gamepads[gamepadIndex];
        if (!gamepad || !gamepad.vibrationActuator) return false;

        try {
            gamepad.vibrationActuator.playEffect('dual-rumble', {
                duration: duration,
                strongMagnitude: Math.min(1.0, Math.max(0.0, strongMagnitude)),
                weakMagnitude: Math.min(1.0, Math.max(0.0, weakMagnitude))
            });
            return true;
        } catch (e) {
            console.warn('Gamepad vibration not supported:', e);
            return false;
        }
    }

    // 显示手柄通知
    showGamepadNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `gamepad-notification ${type}`;
        notification.textContent = message;

        // 样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            ${type === 'success' ? 'background: linear-gradient(135deg, #00AA00, #00FF00);' : ''}
            ${type === 'warning' ? 'background: linear-gradient(135deg, #FF8800, #FFAA00);' : ''}
            ${type === 'info' ? 'background: linear-gradient(135deg, #0088FF, #00AAFF);' : ''}
        `;

        // 添加动画样式
        if (!document.getElementById('gamepad-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'gamepad-notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 获取玩家控制输入 (用于游戏集成)
    getPlayerInput(playerIndex) {
        const gamepadIndex = playerIndex - 1; // Player 1 = Gamepad 0, Player 2 = Gamepad 1

        if (!this.isGamepadConnected(gamepadIndex)) {
            return null; // 手柄未连接
        }

        const leftStick = this.getLeftStick(gamepadIndex);
        const rightStick = this.getRightStick(gamepadIndex);

        return {
            // 🕹️ 移动控制 (左摇杆)
            moveX: leftStick.x,
            moveY: leftStick.y,

            // 🎯 瞄准控制 (右摇杆) - 已恢复使用
            aimX: rightStick.x,
            aimY: rightStick.y,

            // 射击控制
            shoot: this.isButtonPressed(gamepadIndex, this.XBOX_BUTTONS.A) ||
                   this.getTriggerValue(gamepadIndex, 'RT') > this.triggerThreshold,

            // 特殊射击 (肩键)
            specialShoot: this.isButtonPressed(gamepadIndex, this.XBOX_BUTTONS.RB) ||
                         this.isButtonPressed(gamepadIndex, this.XBOX_BUTTONS.LB),

            // 方向键控制 (备用移动)
            dpadUp: this.isButtonPressed(gamepadIndex, this.XBOX_BUTTONS.DPAD_UP),
            dpadDown: this.isButtonPressed(gamepadIndex, this.XBOX_BUTTONS.DPAD_DOWN),
            dpadLeft: this.isButtonPressed(gamepadIndex, this.XBOX_BUTTONS.DPAD_LEFT),
            dpadRight: this.isButtonPressed(gamepadIndex, this.XBOX_BUTTONS.DPAD_RIGHT),

            // 系统控制
            pause: this.isButtonJustPressed(gamepadIndex, this.XBOX_BUTTONS.START) ||
                   this.isButtonJustPressed(gamepadIndex, this.XBOX_BUTTONS.SELECT),

            // 生命转移 (X/Y按钮)
            transferLife: this.isButtonJustPressed(gamepadIndex, this.XBOX_BUTTONS.X) ||
                         this.isButtonJustPressed(gamepadIndex, this.XBOX_BUTTONS.Y),

            // 🚀 跟踪导弹发射 (B按钮直接触发)
            launchMissiles: this.isButtonJustPressed(gamepadIndex, this.XBOX_BUTTONS.B),

            // 原始手柄对象 (用于高级控制)
            gamepad: this.gamepads[gamepadIndex]
        };
    }

    // 调试信息
    getDebugInfo() {
        const info = {
            connectedGamepads: this.getConnectedGamepadCount(),
            gamepads: {}
        };

        for (const [index, gamepad] of Object.entries(this.gamepads)) {
            info.gamepads[index] = this.getGamepadInfo(parseInt(index));
        }

        return info;
    }

    // 🎮 getInput方法 - 作为getGamepadInfo的别名，保持向后兼容
    getInput(gamepadIndex) {
        return this.getGamepadInfo(gamepadIndex);
    }
}

// 导出全局实例
window.GamepadManager = GamepadManager;

console.log('🎮 GamepadManager loaded - Ready for Xbox controllers!');

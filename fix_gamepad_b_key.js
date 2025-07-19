/**
 * 🎮 手柄B键问题诊断和修复脚本
 * 用于检测和修复导弹发射B键不响应的问题
 */

console.log('🔧 开始手柄B键诊断...');

// 1. 检查GamepadManager是否正确加载
function checkGamepadManager() {
    console.log('📋 检查GamepadManager...');
    
    if (typeof window.GamepadManager === 'undefined') {
        console.error('❌ GamepadManager类未定义');
        return false;
    }
    
    if (typeof window.gamepadManager === 'undefined') {
        console.error('❌ gamepadManager实例未创建');
        return false;
    }
    
    console.log('✅ GamepadManager检查通过');
    return true;
}

// 2. 检查手柄连接
function checkGamepadConnection() {
    console.log('📋 检查手柄连接...');
    
    const gamepads = navigator.getGamepads();
    let connectedCount = 0;
    
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            connectedCount++;
            console.log(`🎮 手柄 ${i}: ${gamepads[i].id}`);
        }
    }
    
    if (connectedCount === 0) {
        console.warn('⚠️ 未检测到手柄连接');
        return false;
    }
    
    console.log(`✅ 检测到 ${connectedCount} 个手柄`);
    return true;
}

// 3. 检查B键映射
function checkButtonMapping() {
    console.log('📋 检查B键映射...');
    
    if (!window.gamepadManager) {
        console.error('❌ gamepadManager未初始化');
        return false;
    }
    
    const bButtonIndex = window.gamepadManager.XBOX_BUTTONS.B;
    console.log(`🅱️ B按钮索引: ${bButtonIndex}`);
    
    if (bButtonIndex !== 1) {
        console.error('❌ B按钮映射错误，应该是1');
        return false;
    }
    
    console.log('✅ B键映射正确');
    return true;
}

// 4. 测试B键响应
function testBKeyResponse() {
    console.log('📋 测试B键响应...');
    
    if (!window.gamepadManager) {
        console.error('❌ gamepadManager未初始化');
        return;
    }
    
    let testCount = 0;
    const maxTests = 50; // 5秒测试
    
    const testInterval = setInterval(() => {
        window.gamepadManager.update();
        
        // 测试手柄0 (Player 1)
        const gamepad0 = navigator.getGamepads()[0];
        if (gamepad0) {
            const bPressed = gamepad0.buttons[1] && gamepad0.buttons[1].pressed;
            const bJustPressed = window.gamepadManager.isButtonJustPressed(0, 1);
            
            if (bPressed) {
                console.log(`🅱️ 手柄0 B键按下 - 原始状态: ${bPressed}, 刚按下: ${bJustPressed}`);
            }
            
            // 测试getPlayerInput
            const playerInput = window.gamepadManager.getPlayerInput(1);
            if (playerInput && playerInput.launchMissiles) {
                console.log('🚀 Player 1 导弹发射触发!');
            }
        }
        
        testCount++;
        if (testCount >= maxTests) {
            clearInterval(testInterval);
            console.log('⏹️ B键测试完成');
        }
    }, 100);
    
    console.log('🎮 请按下手柄B键进行测试 (5秒)...');
}

// 5. 修复函数
function fixGamepadBKey() {
    console.log('🔧 尝试修复B键问题...');
    
    // 重新初始化GamepadManager
    if (window.gamepadManager) {
        console.log('🔄 重新初始化GamepadManager...');
        window.gamepadManager = new GamepadManager();
    }
    
    // 强制更新手柄状态
    if (window.gamepadManager) {
        window.gamepadManager.update();
        console.log('✅ 手柄状态已更新');
    }
    
    // 检查按钮状态初始化
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && window.gamepadManager) {
            window.gamepadManager.updateButtonStates(i);
            console.log(`🔄 手柄 ${i} 按钮状态已初始化`);
        }
    }
}

// 6. 主诊断函数
function diagnoseGamepadBKey() {
    console.log('🚀 开始完整诊断...');
    
    const checks = [
        checkGamepadManager,
        checkGamepadConnection,
        checkButtonMapping
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
        if (!check()) {
            allPassed = false;
        }
    }
    
    if (!allPassed) {
        console.log('🔧 尝试修复问题...');
        fixGamepadBKey();
    } else {
        console.log('✅ 所有检查通过，开始B键响应测试...');
        testBKeyResponse();
    }
}

// 7. 实时监控函数
function startRealTimeMonitoring() {
    console.log('📊 开始实时监控...');
    
    const monitorInterval = setInterval(() => {
        if (!window.gamepadManager) return;
        
        window.gamepadManager.update();
        
        // 监控Player 1
        const input1 = window.gamepadManager.getPlayerInput(1);
        if (input1) {
            const gamepad = navigator.getGamepads()[0];
            if (gamepad) {
                const bRaw = gamepad.buttons[1] && gamepad.buttons[1].pressed;
                const bProcessed = window.gamepadManager.isButtonPressed(0, 1);
                const bJustPressed = window.gamepadManager.isButtonJustPressed(0, 1);
                const launchMissiles = input1.launchMissiles;
                
                if (bRaw || bProcessed || bJustPressed || launchMissiles) {
                    console.log(`🎮 P1 - 原始B:${bRaw} 处理B:${bProcessed} 刚按下:${bJustPressed} 导弹:${launchMissiles}`);
                }
            }
        }
        
        // 监控Player 2
        const input2 = window.gamepadManager.getPlayerInput(2);
        if (input2) {
            const gamepad = navigator.getGamepads()[1];
            if (gamepad) {
                const bRaw = gamepad.buttons[1] && gamepad.buttons[1].pressed;
                const bProcessed = window.gamepadManager.isButtonPressed(1, 1);
                const bJustPressed = window.gamepadManager.isButtonJustPressed(1, 1);
                const launchMissiles = input2.launchMissiles;
                
                if (bRaw || bProcessed || bJustPressed || launchMissiles) {
                    console.log(`🎮 P2 - 原始B:${bRaw} 处理B:${bProcessed} 刚按下:${bJustPressed} 导弹:${launchMissiles}`);
                }
            }
        }
    }, 100);
    
    // 30秒后停止监控
    setTimeout(() => {
        clearInterval(monitorInterval);
        console.log('⏹️ 实时监控已停止');
    }, 30000);
    
    console.log('📊 实时监控已启动 (30秒)，请按B键测试...');
}

// 导出函数到全局作用域
window.diagnoseGamepadBKey = diagnoseGamepadBKey;
window.fixGamepadBKey = fixGamepadBKey;
window.startRealTimeMonitoring = startRealTimeMonitoring;

// 自动运行诊断
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(diagnoseGamepadBKey, 1000);
    });
} else {
    setTimeout(diagnoseGamepadBKey, 1000);
}

console.log('🔧 诊断脚本已加载');
console.log('💡 可用命令:');
console.log('  - diagnoseGamepadBKey() : 运行完整诊断');
console.log('  - fixGamepadBKey() : 尝试修复问题');
console.log('  - startRealTimeMonitoring() : 开始实时监控');

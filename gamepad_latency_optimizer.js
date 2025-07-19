/**
 * 游戏手柄延迟优化模块
 * 专门用于减少蓝牙手柄的操作延迟
 */

class GamepadLatencyOptimizer {
    constructor() {
        this.updateRate = 120; // 提高更新频率到120Hz
        this.inputBuffer = new Map(); // 输入缓冲
        this.predictionEnabled = true; // 启用输入预测
        this.smoothingEnabled = true; // 启用输入平滑
        this.lastUpdateTime = 0;
        this.frameTime = 1000 / this.updateRate;
        
        // 延迟监控
        this.latencyStats = {
            samples: [],
            average: 0,
            max: 0,
            min: Infinity
        };
        
        console.log('🚀 GamepadLatencyOptimizer initialized - High-frequency polling enabled');
    }
    
    // 高频率更新游戏手柄状态
    startHighFrequencyPolling(gamepadManager) {
        const pollGamepads = () => {
            const currentTime = performance.now();
            
            if (currentTime - this.lastUpdateTime >= this.frameTime) {
                const startTime = performance.now();
                
                // 更新游戏手柄状态
                if (gamepadManager) {
                    gamepadManager.update();
                }
                
                // 记录延迟统计
                const processingTime = performance.now() - startTime;
                this.updateLatencyStats(processingTime);
                
                this.lastUpdateTime = currentTime;
            }
            
            // 使用requestAnimationFrame确保最高优先级
            requestAnimationFrame(pollGamepads);
        };
        
        pollGamepads();
        console.log(`🎮 High-frequency polling started at ${this.updateRate}Hz`);
    }
    
    // 输入预测 - 减少感知延迟
    predictInput(gamepadIndex, currentInput, deltaTime) {
        if (!this.predictionEnabled) return currentInput;
        
        const bufferId = `gamepad_${gamepadIndex}`;
        
        if (!this.inputBuffer.has(bufferId)) {
            this.inputBuffer.set(bufferId, {
                history: [],
                velocity: { x: 0, y: 0 },
                acceleration: { x: 0, y: 0 }
            });
        }
        
        const buffer = this.inputBuffer.get(bufferId);
        
        // 记录输入历史
        buffer.history.push({
            input: { ...currentInput },
            timestamp: performance.now()
        });
        
        // 保持历史记录在合理范围内
        if (buffer.history.length > 5) {
            buffer.history.shift();
        }
        
        // 计算输入速度和加速度
        if (buffer.history.length >= 2) {
            const current = buffer.history[buffer.history.length - 1];
            const previous = buffer.history[buffer.history.length - 2];
            const timeDiff = (current.timestamp - previous.timestamp) / 1000;
            
            if (timeDiff > 0) {
                // 计算速度
                const newVelocityX = (current.input.moveX - previous.input.moveX) / timeDiff;
                const newVelocityY = (current.input.moveY - previous.input.moveY) / timeDiff;
                
                // 计算加速度
                buffer.acceleration.x = (newVelocityX - buffer.velocity.x) / timeDiff;
                buffer.acceleration.y = (newVelocityY - buffer.velocity.y) / timeDiff;
                
                buffer.velocity.x = newVelocityX;
                buffer.velocity.y = newVelocityY;
            }
        }
        
        // 预测下一帧的输入
        const predictionTime = deltaTime * 0.5; // 预测半帧时间
        const predictedInput = { ...currentInput };
        
        if (Math.abs(buffer.velocity.x) > 0.1 || Math.abs(buffer.velocity.y) > 0.1) {
            predictedInput.moveX += buffer.velocity.x * predictionTime;
            predictedInput.moveY += buffer.velocity.y * predictionTime;
            
            // 限制预测值在合理范围内
            predictedInput.moveX = Math.max(-1, Math.min(1, predictedInput.moveX));
            predictedInput.moveY = Math.max(-1, Math.min(1, predictedInput.moveY));
        }
        
        return predictedInput;
    }
    
    // 输入平滑 - 减少抖动
    smoothInput(gamepadIndex, rawInput) {
        if (!this.smoothingEnabled) return rawInput;
        
        const smoothId = `smooth_${gamepadIndex}`;
        
        if (!this.inputBuffer.has(smoothId)) {
            this.inputBuffer.set(smoothId, {
                smoothedX: 0,
                smoothedY: 0,
                smoothedAimX: 0,
                smoothedAimY: 0
            });
        }
        
        const smooth = this.inputBuffer.get(smoothId);
        const smoothingFactor = 0.7; // 平滑系数
        
        // 应用指数移动平均
        smooth.smoothedX = smooth.smoothedX * smoothingFactor + rawInput.moveX * (1 - smoothingFactor);
        smooth.smoothedY = smooth.smoothedY * smoothingFactor + rawInput.moveY * (1 - smoothingFactor);
        smooth.smoothedAimX = smooth.smoothedAimX * smoothingFactor + rawInput.aimX * (1 - smoothingFactor);
        smooth.smoothedAimY = smooth.smoothedAimY * smoothingFactor + rawInput.aimY * (1 - smoothingFactor);
        
        return {
            ...rawInput,
            moveX: smooth.smoothedX,
            moveY: smooth.smoothedY,
            aimX: smooth.smoothedAimX,
            aimY: smooth.smoothedAimY
        };
    }
    
    // 自适应死区调整
    adaptiveDeadzone(input, baseDeadzone = 0.15) {
        // 根据输入速度动态调整死区
        const inputMagnitude = Math.sqrt(input.moveX * input.moveX + input.moveY * input.moveY);
        
        if (inputMagnitude < baseDeadzone) {
            return { moveX: 0, moveY: 0, aimX: input.aimX, aimY: input.aimY };
        }
        
        // 动态死区：快速移动时减小死区，慢速移动时增大死区
        const dynamicDeadzone = baseDeadzone * (1 - Math.min(inputMagnitude, 0.5));
        
        if (inputMagnitude < dynamicDeadzone) {
            return { moveX: 0, moveY: 0, aimX: input.aimX, aimY: input.aimY };
        }
        
        return input;
    }
    
    // 更新延迟统计
    updateLatencyStats(processingTime) {
        this.latencyStats.samples.push(processingTime);
        
        // 保持最近100个样本
        if (this.latencyStats.samples.length > 100) {
            this.latencyStats.samples.shift();
        }
        
        // 计算统计数据
        const samples = this.latencyStats.samples;
        this.latencyStats.average = samples.reduce((a, b) => a + b, 0) / samples.length;
        this.latencyStats.max = Math.max(...samples);
        this.latencyStats.min = Math.min(...samples);
    }
    
    // 获取延迟统计信息
    getLatencyStats() {
        return {
            ...this.latencyStats,
            updateRate: this.updateRate,
            predictionEnabled: this.predictionEnabled,
            smoothingEnabled: this.smoothingEnabled
        };
    }
    
    // 蓝牙连接优化建议
    getBluetoothOptimizationTips() {
        return {
            hardware: [
                "使用USB有线连接以获得最低延迟",
                "确保手柄电池电量充足（>50%）",
                "减少手柄与接收器之间的距离（<3米）",
                "移除手柄与电脑之间的障碍物"
            ],
            software: [
                "关闭其他蓝牙设备以减少干扰",
                "更新蓝牙驱动程序到最新版本",
                "在Windows中禁用蓝牙省电模式",
                "使用Chrome或Edge浏览器以获得最佳性能"
            ],
            environment: [
                "远离WiFi路由器和微波炉",
                "避免在2.4GHz频段拥挤的环境中使用",
                "考虑使用5GHz WiFi以减少干扰",
                "在游戏时关闭不必要的无线设备"
            ],
            gameSettings: [
                "启用高频率轮询模式",
                "开启输入预测功能",
                "调整输入平滑设置",
                "使用自适应死区"
            ]
        };
    }
    
    // 延迟测试工具
    async testLatency(gamepadManager, duration = 5000) {
        console.log('🧪 Starting latency test...');
        
        const testResults = {
            inputLatency: [],
            processingLatency: [],
            totalLatency: []
        };
        
        const startTime = performance.now();
        
        return new Promise((resolve) => {
            const testInterval = setInterval(() => {
                const testStart = performance.now();
                
                // 模拟输入处理
                if (gamepadManager) {
                    gamepadManager.update();
                }
                
                const processingTime = performance.now() - testStart;
                testResults.processingLatency.push(processingTime);
                
                if (performance.now() - startTime >= duration) {
                    clearInterval(testInterval);
                    
                    // 计算平均延迟
                    const avgProcessing = testResults.processingLatency.reduce((a, b) => a + b, 0) / testResults.processingLatency.length;
                    
                    console.log(`🧪 Latency test completed:
                        Average processing time: ${avgProcessing.toFixed(2)}ms
                        Max processing time: ${Math.max(...testResults.processingLatency).toFixed(2)}ms
                        Min processing time: ${Math.min(...testResults.processingLatency).toFixed(2)}ms`);
                    
                    resolve({
                        averageProcessing: avgProcessing,
                        maxProcessing: Math.max(...testResults.processingLatency),
                        minProcessing: Math.min(...testResults.processingLatency),
                        samples: testResults.processingLatency.length
                    });
                }
            }, 1);
        });
    }
    
    // 启用所有优化
    enableAllOptimizations() {
        this.predictionEnabled = true;
        this.smoothingEnabled = true;
        this.updateRate = 120;
        this.frameTime = 1000 / this.updateRate;
        
        console.log('🚀 All latency optimizations enabled');
    }
    
    // 禁用所有优化（用于对比测试）
    disableAllOptimizations() {
        this.predictionEnabled = false;
        this.smoothingEnabled = false;
        this.updateRate = 60;
        this.frameTime = 1000 / this.updateRate;
        
        console.log('⚠️ All latency optimizations disabled');
    }
}

// 导出全局实例
window.GamepadLatencyOptimizer = GamepadLatencyOptimizer;

console.log('🚀 GamepadLatencyOptimizer loaded - Ready to reduce input lag!');

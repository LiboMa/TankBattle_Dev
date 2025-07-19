#!/usr/bin/env node

/**
 * 批量替换console.log为Debug模式的脚本
 */

const fs = require('fs');
const path = require('path');

// 定义替换规则
const replacementRules = [
    // 导弹相关
    { pattern: /console\.log\(`🚀 Player \$\{this\.playerIndex\} missile on cooldown:.*?\`\);/, replacement: `if (window.debugManager) window.debugManager.log(\`🚀 Player \${this.playerIndex} missile on cooldown: \${this.lastMissileLaunch.toFixed(2)}s / \${this.missileCooldown}s\`, 'missile');`, category: 'missile' },
    { pattern: /console\.log\(`🚀 Player \$\{this\.playerIndex\} launched 3 stray missiles!.*?\`\);/, replacement: `if (window.debugManager) window.debugManager.log(\`🚀 Player \${this.playerIndex} launched 3 stray missiles! Remaining: \${this.strayMissiles}\`, 'missile');`, category: 'missile' },
    { pattern: /console\.log\(`🚀 StrayMissile created by Player.*?\`\);/, replacement: `if (window.debugManager) window.debugManager.log(\`🚀 StrayMissile created by Player \${owner.playerIndex} - Enhanced tracking\`, 'missile');`, category: 'missile' },
    { pattern: /console\.log\(`🎯 Missile acquired new target.*?\`\);/, replacement: `if (window.debugManager) window.debugManager.log(\`🎯 Missile acquired new target at distance: \${Math.round(this.getDistanceToTarget())}\`, 'missile');`, category: 'missile' },
    { pattern: /console\.log\(`🔒 Missile locked onto target!\`\);/, replacement: `if (window.debugManager) window.debugManager.log('🔒 Missile locked onto target!', 'missile');`, category: 'missile' },
    { pattern: /console\.log\(`🎯 Missile tracking:.*?\`\);/, replacement: `if (window.debugManager) window.debugManager.log(\`🎯 Missile tracking: distance=\${Math.round(distance)}, angle=\${Math.round(this.angle * 180 / Math.PI)}°\`, 'missile');`, category: 'missile' },
    
    // 手柄相关
    { pattern: /console\.log\(`💀 Player \$\{this\.playerIndex\} death vibration triggered\`\);/, replacement: `if (window.debugManager) window.debugManager.log(\`💀 Player \${this.playerIndex} death vibration triggered\`, 'gamepad');`, category: 'gamepad' },
    { pattern: /console\.log\(`💥 Player \$\{this\.playerIndex\} damage vibration:.*?\`\);/, replacement: `if (window.debugManager) window.debugManager.log(\`💥 Player \${this.playerIndex} damage vibration: \${Math.round(vibrationStrength * 100)}% strength, \${vibrationDuration}ms\`, 'gamepad');`, category: 'gamepad' },
    { pattern: /console\.log\('🎮 Xbox controller support enabled'\);/, replacement: `if (window.debugManager) window.debugManager.log('🎮 Xbox controller support enabled', 'gamepad');`, category: 'gamepad' },
    
    // 输入相关
    { pattern: /console\.log\('🖱️ Player 1 right mouse click detected for missile launch'\);/, replacement: `if (window.debugManager) window.debugManager.log('🖱️ Player 1 right mouse click detected for missile launch', 'input');`, category: 'input' },
    { pattern: /console\.log\('⌨️ Player 1 Q key detected for missile launch'\);/, replacement: `if (window.debugManager) window.debugManager.log('⌨️ Player 1 Q key detected for missile launch', 'input');`, category: 'input' },
    { pattern: /console\.log\('🚀 Player 1 B键直接触发导弹'\);/, replacement: `if (window.debugManager) window.debugManager.log('🚀 Player 1 B键直接触发导弹', 'input');`, category: 'input' },
    { pattern: /console\.log\('⌨️ Player 2 E key detected for missile launch'\);/, replacement: `if (window.debugManager) window.debugManager.log('⌨️ Player 2 E key detected for missile launch', 'input');`, category: 'input' },
    { pattern: /console\.log\('🔢 Player 2 Numpad\+ detected for missile launch'\);/, replacement: `if (window.debugManager) window.debugManager.log('🔢 Player 2 Numpad+ detected for missile launch', 'input');`, category: 'input' },
    { pattern: /console\.log\('🚀 Player 2 B键直接触发导弹'\);/, replacement: `if (window.debugManager) window.debugManager.log('🚀 Player 2 B键直接触发导弹', 'input');`, category: 'input' },
    
    // 道具相关
    { pattern: /console\.log\('Chain Bullet activated permanently, replacing previous primary bullet effect'\);/, replacement: `if (window.debugManager) window.debugManager.log('Chain Bullet activated permanently, replacing previous primary bullet effect', 'powerup');`, category: 'powerup' },
    { pattern: /console\.log\('Mega Shotgun activated permanently, can stack with other effects'\);/, replacement: `if (window.debugManager) window.debugManager.log('Mega Shotgun activated permanently, can stack with other effects', 'powerup');`, category: 'powerup' },
    { pattern: /console\.log\('Thunder Bullet activated permanently, replacing previous primary bullet effect'\);/, replacement: `if (window.debugManager) window.debugManager.log('Thunder Bullet activated permanently, replacing previous primary bullet effect', 'powerup');`, category: 'powerup' },
    { pattern: /console\.log\('Bullet Speed Boost activated for', duration, 'seconds'\);/, replacement: `if (window.debugManager) window.debugManager.log(\`Bullet Speed Boost activated for \${duration} seconds\`, 'powerup');`, category: 'powerup' },
    { pattern: /console\.log\('All power-up effects reset for level transition'\);/, replacement: `if (window.debugManager) window.debugManager.log('All power-up effects reset for level transition', 'powerup');`, category: 'powerup' },
    
    // 通用游戏逻辑
    { pattern: /console\.log\('Starting game\.\.\.'\);/, replacement: `if (window.debugManager) window.debugManager.log('Starting game...', 'general');`, category: 'general' },
    { pattern: /console\.log\('Game started successfully'\);/, replacement: `if (window.debugManager) window.debugManager.log('Game started successfully', 'general');`, category: 'general' },
    { pattern: /console\.log\('Page loaded, initializing game\.\.\.'\);/, replacement: `if (window.debugManager) window.debugManager.log('Page loaded, initializing game...', 'general');`, category: 'general' }
];

// 读取文件并应用替换
function processFile(filePath) {
    console.log(`Processing ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changeCount = 0;
    
    // 应用所有替换规则
    replacementRules.forEach(rule => {
        const matches = content.match(rule.pattern);
        if (matches) {
            content = content.replace(rule.pattern, rule.replacement);
            changeCount++;
            console.log(`  - Replaced ${rule.category} log`);
        }
    });
    
    // 处理剩余的简单console.log
    const simpleLogPattern = /console\.log\(([^)]+)\);/g;
    content = content.replace(simpleLogPattern, (match, args) => {
        changeCount++;
        return `if (window.debugManager) window.debugManager.log(${args}, 'general');`;
    });
    
    if (changeCount > 0) {
        fs.writeFileSync(filePath, content);
        console.log(`  ✅ Made ${changeCount} changes`);
    } else {
        console.log(`  ℹ️ No changes needed`);
    }
}

// 处理主要文件
const filesToProcess = [
    './tank_game_fixed.js',
    './gamepad_manager.js',
    './game_settings_manager.js'
];

console.log('🔧 Starting console.log replacement...\n');

filesToProcess.forEach(file => {
    if (fs.existsSync(file)) {
        processFile(file);
    } else {
        console.log(`⚠️ File not found: ${file}`);
    }
});

console.log('\n✅ Console.log replacement completed!');
console.log('📝 Remember to:');
console.log('  1. Add debug_manager.js to your HTML file');
console.log('  2. Use Ctrl+Shift+D to toggle debug panel');
console.log('  3. Enable specific debug categories as needed');

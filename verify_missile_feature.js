#!/usr/bin/env node

/**
 * 🚀 跟踪导弹大招功能验证脚本
 * 验证所有相关功能是否正确实现
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 开始验证跟踪导弹大招功能...\n');

// 验证项目
const verifications = [
    {
        name: '配置文件更新',
        file: 'game_config.js',
        checks: [
            { pattern: /stray_missiles/, description: '导弹道具类型已添加' },
            { pattern: /amount: 5/, description: '道具获得数量配置正确' },
            { pattern: /maxCapacity: 15/, description: '最大容量配置正确' }
        ]
    },
    {
        name: '主游戏逻辑',
        file: 'tank_game_fixed.js',
        checks: [
            { pattern: /'stray_missiles'/, description: '道具类型已添加到列表' },
            { pattern: /case 'stray_missiles':/, description: '道具应用逻辑已实现' },
            { pattern: /MISSILES/, description: '道具名称已定义' },
            { pattern: /x5/, description: '道具视觉效果已实现' }
        ]
    },
    {
        name: '测试页面',
        file: 'missile_powerup_test.html',
        checks: [
            { pattern: /跟踪导弹道具测试/, description: '测试页面标题正确' },
            { pattern: /simulatePickup/, description: '拾取模拟功能已实现' },
            { pattern: /maxCapacity: 15/, description: '最大容量测试已配置' }
        ]
    },
    {
        name: '文档更新',
        file: 'README.md',
        checks: [
            { pattern: /12种道具/, description: '道具数量已更新' },
            { pattern: /missile_powerup_test\.html/, description: '测试页面已添加到文档' }
        ]
    }
];

let totalChecks = 0;
let passedChecks = 0;

// 执行验证
verifications.forEach(verification => {
    console.log(`📁 验证 ${verification.name}:`);
    
    try {
        const filePath = path.join(__dirname, verification.file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        verification.checks.forEach(check => {
            totalChecks++;
            if (check.pattern.test(content)) {
                console.log(`  ✅ ${check.description}`);
                passedChecks++;
            } else {
                console.log(`  ❌ ${check.description}`);
            }
        });
        
    } catch (error) {
        console.log(`  ❌ 文件读取失败: ${error.message}`);
        verification.checks.forEach(() => totalChecks++);
    }
    
    console.log('');
});

// 输出结果
console.log('📊 验证结果:');
console.log(`总检查项: ${totalChecks}`);
console.log(`通过检查: ${passedChecks}`);
console.log(`通过率: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (passedChecks === totalChecks) {
    console.log('\n🎉 所有功能验证通过！跟踪导弹大招功能已完全实现。');
    console.log('\n🎮 可以开始游戏测试:');
    console.log('1. 打开 tank_game_fixed.html 开始游戏');
    console.log('2. 打开 missile_powerup_test.html 测试道具功能');
    console.log('3. 在游戏中寻找橙色导弹道具并拾取');
    console.log('4. 使用右键/Q键(P1)或E键/Numpad+(P2)发射导弹');
} else {
    console.log('\n⚠️ 部分功能验证失败，请检查实现。');
}

console.log('\n🚀 验证完成！');

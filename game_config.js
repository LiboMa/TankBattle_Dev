// 游戏配置文件 - 集中管理所有可配置参数
const GameConfig = {
    // === 子弹配置 ===
    bullet: {
        speed: 300,              // 基础子弹速度
        acceleratedSpeed: 450,   // 加速子弹速度
        radius: 3,               // 子弹半径
        life: 3,                 // 子弹生命值
        explosionRadius: 80,     // 爆炸半径
        maxBounces: 3,           // 闪电弹最大反弹次数
        friendlyFire: false      // 队友伤害开关
    },

    // === 难度配置 ===
    difficulty: {
        // 8个关卡的详细配置 - 基数60，每关增加30%
        levels: [
            { // Level 1 - 新手教学 (60个敌人)
                enemySpawnInterval: 2.0,
                maxEnemies: 3,
                enemySpeed: 50,
                enemyHealth: 25,
                enemyShootInterval: 2.0,
                powerUpFrequency: 10,
                killTarget: 60
            },
            { // Level 2 - 基础挑战 (78个敌人 = 60 * 1.3)
                enemySpawnInterval: 1.8,
                maxEnemies: 4,
                enemySpeed: 60,
                enemyHealth: 30,
                enemyShootInterval: 1.8,
                powerUpFrequency: 9,
                killTarget: 78
            },
            { // Level 3 - 增强敌人 (101个敌人 = 78 * 1.3)
                enemySpawnInterval: 1.5,
                maxEnemies: 5,
                enemySpeed: 70,
                enemyHealth: 35,
                enemyShootInterval: 1.5,
                powerUpFrequency: 8,
                killTarget: 101
            },
            { // Level 4 - 中等难度 (131个敌人 = 101 * 1.3)
                enemySpawnInterval: 1.3,
                maxEnemies: 6,
                enemySpeed: 80,
                enemyHealth: 40,
                enemyShootInterval: 1.3,
                powerUpFrequency: 8,
                killTarget: 131
            },
            { // Level 5 - 困难模式 (170个敌人 = 131 * 1.3)
                enemySpawnInterval: 1.0,
                maxEnemies: 7,
                enemySpeed: 90,
                enemyHealth: 45,
                enemyShootInterval: 1.0,
                powerUpFrequency: 7,
                killTarget: 170
            },
            { // Level 6 - 专家级 (221个敌人 = 170 * 1.3)
                enemySpawnInterval: 0.8,
                maxEnemies: 8,
                enemySpeed: 100,
                enemyHealth: 50,
                enemyShootInterval: 0.8,
                powerUpFrequency: 7,
                killTarget: 221
            },
            { // Level 7 - 大师级 (287个敌人 = 221 * 1.3)
                enemySpawnInterval: 0.6,
                maxEnemies: 10,
                enemySpeed: 110,
                enemyHealth: 55,
                enemyShootInterval: 0.6,
                powerUpFrequency: 6,
                killTarget: 287
            },
            { // Level 8 - 地狱模式 (373个敌人 = 287 * 1.3)
                enemySpawnInterval: 0.5,
                maxEnemies: 12,
                enemySpeed: 120,
                enemyHealth: 60,
                enemyShootInterval: 0.5,
                powerUpFrequency: 6,
                killTarget: 373
            }
        ]
    },

    // === 道具效果配置 ===
    powerUps: {
        types: ['health', 'speed', 'explosive', 'invincible', 'shotgun', 'life', 'thunder', 'eagle_shield', 'chain_bullet', 'mega_shotgun', 'bullet_speed', 'stray_missiles'],
        spawnInterval: 8,        // 道具生成间隔(秒)
        maxActive: 3,            // 最多同时存在的道具数量

        effects: {
            health: {
                healAmount: 50,
                instant: true
            },
            speed: {
                multiplier: 1.5,
                duration: 10,
                stackable: true
            },
            explosive: {
                damage: 80,
                radius: 80,
                duration: 15,
                maxTargets: 3
            },
            invincible: {
                duration: 8
            },
            shotgun: {
                bulletCount: 3,
                angleSpread: 0.3,
                duration: 20
            },
            life: {
                amount: 1,
                instant: true
            },
            thunder: {
                chainRange: 120,
                chainDamage: 35,
                maxChains: 3,
                bounces: 3,
                permanent: true
            },
            eagle_shield: {
                duration: 15
            },
            chain_bullet: {
                chainDirections: 4,
                chainSpeed: 250,
                permanent: true
            },
            mega_shotgun: {
                bulletCount: 7,
                angleSpread: 0.4,
                permanent: true
            },
            bullet_speed: {
                speedMultiplier: 1.5,
                duration: 20
            },
            stray_missiles: {
                amount: 5,           // 每次拾取获得5发导弹
                instant: true,       // 立即生效
                maxCapacity: 15      // 最大容量提升到15发
            }
        }
    },

    // === 敌人配置 ===
    enemy: {
        colors: ['#FF4444', '#FF8800', '#8800FF', '#FF0088'],
        detectionRange: 200,
        directionChangeInterval: 3,
        ammoCount: 50,
        shootCooldown: 1.0
    },

    // === 玩家配置 ===
    player: {
        maxHealth: 100,
        speed: 100,
        maxLives: 9,
        startLives: 3,
        invulnerabilityDuration: 3.0,
        shootCooldown: 0.3
    },

    // === 老鹰配置 ===
    eagle: {
        maxHealth: 3,
        width: 40,
        height: 40
    },

    // === 游戏系统配置 ===
    game: {
        maxLevel: 8,
        lifeRewardScore: 20000,  // 每20000分奖励1条生命
        scorePerKill: 500,      // 普通击杀分数
        scorePerExplosionKill: 800, // 爆炸击杀分数
        scorePerThunderKill: 500    // 闪电击杀分数
    },

    // === 地图配置 ===
    map: {
        width: 800,
        height: 600,
        patterns: 4  // 地图布局模式数量
    }
};

// 导出配置对象
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
} else if (typeof window !== 'undefined') {
    window.GameConfig = GameConfig;
}

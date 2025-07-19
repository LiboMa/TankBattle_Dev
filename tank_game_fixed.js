// Tank Fighting Game - 修复版本

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }
    
    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }
    
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(this.x / mag, this.y / mag);
    }
}

class Tank {
    constructor(x, y, color, controls, isPlayer = true, level = 1, playerIndex = 0) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.turretAngle = 0; // 🎯 炮塔初始角度与坦克角度一致
        this.color = color;
        this.controls = controls;
        this.isPlayer = isPlayer;
        this.level = level;
        this.playerIndex = playerIndex; // 🎮 用于游戏手柄识别 (1 = Player1, 2 = Player2)
        this.width = 30;
        this.height = 20;
        
        // 安全地获取配置，添加防御性检查
        let levelConfig = null;
        if (typeof GameConfig !== 'undefined' && 
            GameConfig.difficulty && 
            GameConfig.difficulty.levels && 
            GameConfig.difficulty.levels[level - 1]) {
            levelConfig = GameConfig.difficulty.levels[level - 1];
        } else {
            // 如果配置不可用，使用默认值
            levelConfig = {
                enemySpeed: 50,
                enemyHealth: 25,
                enemyShootInterval: 2.0
            };
            console.warn(`Using default config for level ${level}, GameConfig may not be loaded`);
        }
        
        // 使用配置文件中的参数或默认值
        if (isPlayer) {
            this.speed = (typeof GameConfig !== 'undefined' && GameConfig.player) ? GameConfig.player.speed : 100;
            this.maxHealth = (typeof GameConfig !== 'undefined' && GameConfig.player) ? GameConfig.player.maxHealth : 100;
            this.ammo = Infinity;
        } else {
            this.speed = levelConfig.enemySpeed;
            this.maxHealth = levelConfig.enemyHealth;
            this.ammo = (typeof GameConfig !== 'undefined' && GameConfig.enemy) ? GameConfig.enemy.ammoCount : 50;
        }
        
        this.health = this.maxHealth;
        this.lastShot = 0;
        this.shootCooldown = isPlayer ? GameConfig.player.shootCooldown : levelConfig.enemyShootInterval;
        this.alive = true;
        
        // 🚀 B类辅助武器系统 - 跟踪导弹
        if (isPlayer) {
            this.strayMissiles = 10; // 每次重生10发导弹
            this.maxStrayMissiles = 10;
            this.lastMissileLaunch = 0.5; // 初始化为冷却时间，可以立即发射
            this.missileCooldown = 0.5; // 导弹发射冷却时间(秒)
        }
        
        // 子弹效果系统 - 散弹可以与其他效果叠加
        this.primaryBulletEffect = null; // 主要效果: 'chain', 'thunder', 'explosive'
        this.shotgunEffect = null; // 散弹效果: 'shotgun', 'mega_shotgun'
        this.bulletEffectTime = 0; // 临时效果的剩余时间
        this.shotgunEffectTime = 0; // 散弹效果的剩余时间
        this.speedBoost = 1;
        this.speedBoostTime = 0;
        this.bulletSpeedBoost = false; // 子弹加速效果
        this.bulletSpeedBoostTime = 0;
        
        // 无敌期
        this.invulnerable = isPlayer;
        this.invulnerabilityTime = isPlayer ? GameConfig.player.invulnerabilityDuration : 0;
        this.blinkTimer = 0;
        
        // AI属性
        if (!isPlayer) {
            this.aiDirection = Math.random() * Math.PI * 2;
            this.lastDirectionChange = 0;
            this.directionChangeInterval = GameConfig.enemy.directionChangeInterval;
            this.detectionRange = GameConfig.enemy.detectionRange;
            this.shootRange = 120 + level * 15;
        }
    }
    
    update(deltaTime, input, mousePos, playerTanks = [], game = null) {
        if (!this.alive) return;
        
        // 更新无敌期
        if (this.invulnerable && this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
            this.blinkTimer += deltaTime;
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
            }
        }
        
        // 更新道具效果时间
        if (this.speedBoostTime > 0) {
            this.speedBoostTime -= deltaTime;
            if (this.speedBoostTime <= 0) {
                this.speedBoost = 1;
            }
        }
        
        // 更新子弹加速效果时间
        if (this.bulletSpeedBoostTime > 0) {
            this.bulletSpeedBoostTime -= deltaTime;
            if (this.bulletSpeedBoostTime <= 0) {
                this.bulletSpeedBoost = false;
            }
        }
        
        // 更新主要子弹特效时间（临时效果）
        if (this.bulletEffectTime > 0) {
            this.bulletEffectTime -= deltaTime;
            if (this.bulletEffectTime <= 0) {
                // 如果是临时效果，清除激活状态
                if (this.primaryBulletEffect === 'explosive') {
                    this.primaryBulletEffect = null;
                }
            }
        }
        
        // 更新散弹效果时间（临时效果）
        if (this.shotgunEffectTime > 0) {
            this.shotgunEffectTime -= deltaTime;
            if (this.shotgunEffectTime <= 0) {
                // 如果是临时散弹效果，清除激活状态
                if (this.shotgunEffect === 'shotgun') {
                    this.shotgunEffect = null;
                }
            }
        }
        
        if (this.isPlayer) {
            this.updatePlayerControls(deltaTime, input, mousePos, game);
        } else {
            this.updateAI(deltaTime, playerTanks, game);
        }
    }
    
    checkObstacleCollision(newX, newY, game) {
        const tempBounds = {
            x: newX - this.width/2,
            y: newY - this.height/2,
            width: this.width,
            height: this.height
        };
        
        // 检查与障碍物的碰撞
        for (const obstacle of game.obstacles) {
            if (obstacle.destroyed) continue;
            
            if (game.checkCollision(tempBounds, obstacle.getBounds())) {
                return true; // 碰撞了
            }
        }
        
        // 检查与其他坦克的碰撞
        if (this.checkTankCollision(tempBounds, game)) {
            return true;
        }
        
        return false; // 没有碰撞
    }
    
    checkTankCollision(tempBounds, game) {
        // 检查与玩家坦克的碰撞
        if (game.player1 && game.player1 !== this) {
            if (game.checkCollision(tempBounds, game.player1.getBounds())) {
                return true;
            }
        }
        
        if (game.player2 && game.player2 !== this) {
            if (game.checkCollision(tempBounds, game.player2.getBounds())) {
                return true;
            }
        }
        
        // 检查与敌方坦克的碰撞
        for (const enemyTank of game.enemyTanks) {
            if (enemyTank !== this && !enemyTank.destroyed) {
                if (game.checkCollision(tempBounds, enemyTank.getBounds())) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    updatePlayerControls(deltaTime, input, mousePos, game) {
        const currentSpeed = this.speed * this.speedBoost;
        
        // 🎮 检查游戏手柄输入
        let gamepadInput = null;
        if (window.gamepadManager && (!window.gameSettings || window.gameSettings.gamepadEnabled !== false)) {
            gamepadInput = window.gamepadManager.getPlayerInput(this.playerIndex);
            
            // 🚀 应用延迟优化
            if (gamepadInput && window.latencyOptimizer) {
                // 输入预测
                gamepadInput = window.latencyOptimizer.predictInput(this.playerIndex, gamepadInput, deltaTime);
                
                // 输入平滑
                gamepadInput = window.latencyOptimizer.smoothInput(this.playerIndex, gamepadInput);
                
                // 自适应死区
                gamepadInput = window.latencyOptimizer.adaptiveDeadzone(gamepadInput);
            }
        }
        
        // 获取按键状态 (键盘输入) - 支持小键盘方向键
        let upPressed = input[this.controls.up];
        let downPressed = input[this.controls.down];
        let leftPressed = input[this.controls.left];
        let rightPressed = input[this.controls.right];
        
        // 🔢 添加小键盘方向键支持 (Numpad)
        if (this.controls.numpadSupport !== false && (!window.gameSettings || window.gameSettings.numpadEnabled !== false)) {
            upPressed = upPressed || input['Numpad8'];     // 小键盘8 = 上
            downPressed = downPressed || input['Numpad2']; // 小键盘2 = 下
            leftPressed = leftPressed || input['Numpad4']; // 小键盘4 = 左
            rightPressed = rightPressed || input['Numpad6']; // 小键盘6 = 右
            
            // 小键盘对角线方向支持
            const numpad7 = input['Numpad7']; // 左上
            const numpad9 = input['Numpad9']; // 右上
            const numpad1 = input['Numpad1']; // 左下
            const numpad3 = input['Numpad3']; // 右下
            
            // 对角线按键转换为组合按键
            if (numpad7) { upPressed = true; leftPressed = true; }      // 7 = 上+左
            if (numpad9) { upPressed = true; rightPressed = true; }     // 9 = 上+右
            if (numpad1) { downPressed = true; leftPressed = true; }    // 1 = 下+左
            if (numpad3) { downPressed = true; rightPressed = true; }   // 3 = 下+右
        }
        
        // 计算移动方向和角度
        let dx = 0, dy = 0, newAngle = this.angle;
        let aimX = 0, aimY = 0; // 瞄准方向
        
        // 🎮 游戏手柄控制优先
        if (gamepadInput) {
            // 🕹️ 左摇杆控制移动
            dx = gamepadInput.moveX;
            dy = gamepadInput.moveY;
            
            // 🎯 右摇杆控制瞄准
            aimX = gamepadInput.aimX;
            aimY = gamepadInput.aimY;
            
            // 方向键作为备用移动控制
            if (gamepadInput.dpadUp) dy -= 1;
            if (gamepadInput.dpadDown) dy += 1;
            if (gamepadInput.dpadLeft) dx -= 1;
            if (gamepadInput.dpadRight) dx += 1;
            
            // 设置移动角度
            if (dx !== 0 || dy !== 0) {
                newAngle = Math.atan2(dy, dx);
            }
            
            // 🎯 右摇杆控制炮塔角度（恢复双摇杆控制）
            if (aimX !== 0 || aimY !== 0) {
                this.turretAngle = Math.atan2(aimY, aimX);
            }
            // 如果右摇杆无输入，保持当前炮塔角度不变
        } else if (this.controls.useMouse && (!window.gameSettings || window.gameSettings.keyboardEnabled !== false)) {
            // 玩家1 - 传统4方向控制 + 鼠标瞄准 (检查键盘设置)
            if (upPressed) dy -= 1;
            if (downPressed) dy += 1;
            if (leftPressed) dx -= 1;
            if (rightPressed) dx += 1;
            
            // 设置角度（仅用于坦克朝向）
            if (dx !== 0 || dy !== 0) {
                newAngle = Math.atan2(dy, dx);
            }
        } else if (!window.gameSettings || window.gameSettings.keyboardEnabled !== false) {
            // 玩家2 - 增强的8方向控制
            if (upPressed && leftPressed) {
                dx = -0.707; dy = -0.707; // 左上 (45度角标准化)
                newAngle = -3 * Math.PI / 4;
            } else if (upPressed && rightPressed) {
                dx = 0.707; dy = -0.707; // 右上
                newAngle = -Math.PI / 4;
            } else if (downPressed && leftPressed) {
                dx = -0.707; dy = 0.707; // 左下
                newAngle = 3 * Math.PI / 4;
            } else if (downPressed && rightPressed) {
                dx = 0.707; dy = 0.707; // 右下
                newAngle = Math.PI / 4;
            } else if (upPressed) {
                dy = -1; // 上
                newAngle = -Math.PI / 2;
            } else if (downPressed) {
                dy = 1; // 下
                newAngle = Math.PI / 2;
            } else if (leftPressed) {
                dx = -1; // 左
                newAngle = Math.PI;
            } else if (rightPressed) {
                dx = 1; // 右
                newAngle = 0;
            }
        }
        
        // 应用移动
        if (dx !== 0 || dy !== 0) {
            const newX = this.x + dx * currentSpeed * deltaTime;
            const newY = this.y + dy * currentSpeed * deltaTime;
            
            // 检查碰撞
            if (!this.checkObstacleCollision(newX, newY, game)) {
                this.x = newX;
                this.y = newY;
                this.angle = newAngle;
            }
        }
        
        // 🎮 炮塔朝向控制 - 恢复右摇杆控制
        if (gamepadInput) {
            // 🎯 游戏手柄：右摇杆优先控制炮塔
            if (aimX !== 0 || aimY !== 0) {
                // 右摇杆有输入时，炮塔跟随右摇杆方向
                this.turretAngle = Math.atan2(aimY, aimX);
            } else if (dx !== 0 || dy !== 0) {
                // 右摇杆无输入但左摇杆有输入时，炮塔跟随移动方向
                this.turretAngle = Math.atan2(dy, dx);
            }
            // 🎯 关键：两个摇杆都无输入时，保持炮塔当前角度不变
        } else if (this.controls.useMouse && mousePos) {
            // 玩家1 - 鼠标瞄准（鼠标始终更新炮塔角度）
            const mouseX = mousePos.x - this.x;
            const mouseY = mousePos.y - this.y;
            this.turretAngle = Math.atan2(mouseY, mouseX);
        } else {
            // 玩家2 - 键盘控制
            if (dx !== 0 || dy !== 0) {
                // 只有在有移动输入时才更新炮塔角度
                this.turretAngle = this.angle;
            }
            // 🎯 关键：当键盘无输入时，保持炮塔当前角度不变
        }
        
        // 更新射击冷却
        this.lastShot += deltaTime;
        
        // 🚀 更新导弹冷却时间
        this.updateMissileCooldown(deltaTime);
    }
    
    updateAI(deltaTime, playerTanks, game) {
        this.lastShot += deltaTime;
        this.lastDirectionChange += deltaTime;
        
        let closestPlayer = null;
        let closestDistance = Infinity;
        
        for (const player of playerTanks) {
            if (!player.alive) continue;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPlayer = player;
            }
        }
        
        if (closestPlayer && closestDistance < this.detectionRange) {
            const dx = closestPlayer.x - this.x;
            const dy = closestPlayer.y - this.y;
            this.turretAngle = Math.atan2(dy, dx);
            this.aiDirection = Math.atan2(dy, dx);
        } else {
            if (this.lastDirectionChange >= this.directionChangeInterval) {
                this.aiDirection = Math.random() * Math.PI * 2;
                this.lastDirectionChange = 0;
            }
            this.turretAngle = this.aiDirection;
        }
        
        // AI移动时检查障碍物碰撞
        const currentSpeed = this.speed * this.speedBoost;
        const newX = this.x + Math.cos(this.aiDirection) * currentSpeed * deltaTime;
        const newY = this.y + Math.sin(this.aiDirection) * currentSpeed * deltaTime;
        
        // 只有在不会碰撞障碍物时才移动
        if (!this.checkObstacleCollision(newX, newY, game)) {
            this.x = newX;
            this.y = newY;
        } else {
            // 如果碰撞了，改变方向
            this.aiDirection = Math.random() * Math.PI * 2;
            this.lastDirectionChange = 0;
        }
        
        this.angle = this.aiDirection;
    }
    
    addSpeedBoost(duration = 5) {
        this.speedBoost = 1.5;
        this.speedBoostTime = duration;
    }
    
    addExplosiveAmmo(duration = 15) {
        this.primaryBulletEffect = 'explosive';
        this.bulletEffectTime = duration;
        console.log('Explosive ammo activated, replacing previous primary bullet effect');
    }
    
    addInvincibility(duration = 5) {
        this.invulnerable = true;
        this.invulnerabilityTime = duration;
        this.blinkTimer = 0;
    }
    
    addShotgunAmmo(duration = 20) {
        this.shotgunEffect = 'shotgun';
        this.shotgunEffectTime = duration;
        console.log('Shotgun ammo activated, can stack with other effects');
    }
    
    addChainBullet() {
        this.primaryBulletEffect = 'chain';
        this.bulletEffectTime = 0; // 永久效果
        console.log('Chain Bullet activated permanently, replacing previous primary bullet effect');
    }
    
    addMegaShotgun() {
        this.shotgunEffect = 'mega_shotgun';
        this.shotgunEffectTime = 0; // 永久效果
        console.log('Mega Shotgun activated permanently, can stack with other effects');
    }
    
    addThunderBullet() {
        this.primaryBulletEffect = 'thunder';
        this.bulletEffectTime = 0; // 永久效果
        console.log('Thunder Bullet activated permanently, replacing previous primary bullet effect');
    }
    
    addBulletSpeedBoost(duration = 20) {
        this.bulletSpeedBoost = true;
        this.bulletSpeedBoostTime = duration;
        console.log('Bullet Speed Boost activated for', duration, 'seconds');
    }
    
    // 重置所有道具效果 - 用于关卡切换
    resetAllEffects() {
        // 重置移动效果
        this.speedBoost = 1;
        this.speedBoostTime = 0;
        
        // 重置子弹效果
        this.bulletSpeedBoost = false;
        this.bulletSpeedBoostTime = 0;
        this.primaryBulletEffect = null;
        this.bulletEffectTime = 0;
        this.shotgunEffect = null;
        this.shotgunEffectTime = 0;
        
        // 重置无敌状态（除了关卡切换时的保护无敌）
        // this.invulnerable 和 this.invulnerabilityTime 由resetPlayerPositions处理
        
        console.log('All power-up effects reset for level transition');
    }
    
    // 🚀 B类辅助武器 - 发射跟踪导弹
    launchStrayMissiles(enemies) {
        // 检查是否为玩家且有导弹可用
        if (!this.isPlayer || !this.hasOwnProperty('strayMissiles') || this.strayMissiles <= 0) {
            return [];
        }
        
        // 检查冷却时间 - 修复逻辑错误
        if (!this.hasOwnProperty('lastMissileLaunch') || this.lastMissileLaunch < this.missileCooldown) {
            console.log(`🚀 Player ${this.playerIndex} missile on cooldown: ${this.lastMissileLaunch.toFixed(2)}s / ${this.missileCooldown}s`);
            return [];
        }
        
        // 检查StrayMissile类是否可用
        if (typeof StrayMissile === 'undefined') {
            console.error('StrayMissile class not found!');
            return [];
        }
        
        // 消耗导弹数量
        this.strayMissiles--;
        this.lastMissileLaunch = 0; // 重置冷却时间
        
        // 创建3个跟踪导弹
        const missiles = [];
        const launchPositions = [
            { x: this.x - 15, y: this.y - 10 }, // 左侧发射位置
            { x: this.x, y: this.y - 15 },      // 中央发射位置
            { x: this.x + 15, y: this.y - 10 }  // 右侧发射位置
        ];
        
        try {
            for (let i = 0; i < 3; i++) {
                const pos = launchPositions[i];
                const missile = new StrayMissile(pos.x, pos.y, this);
                
                // 🎯 立即搜索目标
                if (enemies && enemies.length > 0) {
                    missile.updateTarget(enemies);
                }
                
                missiles.push(missile);
            }
        } catch (error) {
            console.error('Error creating missiles:', error);
            return [];
        }
        
        // 播放导弹发射音效
        if (window.audioManager && typeof window.audioManager.playSound === 'function') {
            try {
                window.audioManager.playSound('missileLaunch');
            } catch (error) {
                console.warn('Audio error:', error);
            }
        }
        
        console.log(`🚀 Player ${this.playerIndex} launched 3 stray missiles! Remaining: ${this.strayMissiles}`);
        return missiles;
    }
    
    // 更新导弹冷却时间
    updateMissileCooldown(deltaTime) {
        if (this.isPlayer && 
            this.hasOwnProperty('lastMissileLaunch') && 
            this.hasOwnProperty('missileCooldown') && 
            this.lastMissileLaunch < this.missileCooldown) {
            this.lastMissileLaunch += deltaTime;
        }
    }
    
    shoot() {
        if (!this.isPlayer && this.ammo <= 0) return null;
        if (!this.isPlayer) this.ammo--;
        
        this.lastShot = 0;
        
        // 播放射击音效
        if (window.audioManager) {
            if (this.isPlayer) {
                window.audioManager.playSound('playerShoot');
            } else {
                window.audioManager.playSound('shoot');
            }
        }
        
        const bulletX = this.x + Math.cos(this.turretAngle) * 25;
        const bulletY = this.y + Math.sin(this.turretAngle) * 25;
        
        const bullets = [];
        
        // 确定散弹数量和角度
        let bulletCount = 1;
        let angleSpread = 0;
        
        if (this.shotgunEffect === 'mega_shotgun') {
            bulletCount = GameConfig.powerUps.effects.mega_shotgun.bulletCount;
            angleSpread = GameConfig.powerUps.effects.mega_shotgun.angleSpread;
        } else if (this.shotgunEffect === 'shotgun') {
            bulletCount = GameConfig.powerUps.effects.shotgun.bulletCount;
            angleSpread = GameConfig.powerUps.effects.shotgun.angleSpread;
        }
        
        // 生成子弹
        for (let i = 0; i < bulletCount; i++) {
            let angle = this.turretAngle;
            if (bulletCount > 1) {
                const offset = (i - (bulletCount - 1) / 2) * angleSpread;
                angle = this.turretAngle + offset;
            }
            
            // 创建子弹，传递加速状态
            const bullet = new Bullet(bulletX, bulletY, angle, GameConfig.bullet.speed, this, this.bulletSpeedBoost);
            this.applyBulletEffects(bullet);
            bullets.push(bullet);
        }
        
        return bulletCount === 1 ? bullets[0] : bullets;
    }
    
    applyBulletEffects(bullet) {
        if (!this.isPlayer) return;
        
        // 应用主要效果
        switch(this.primaryBulletEffect) {
            case 'explosive':
                bullet.explosive = true;
                break;
            case 'chain':
                bullet.chainBullet = true;
                break;
            case 'thunder':
                bullet.thunderBullet = true;
                break;
        }
    }
    
    takeDamage(damage = 25) {
        if (this.invulnerable && this.invulnerabilityTime > 0) {
            return false;
        }
        
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
        
        // 🎮 玩家受到攻击时的手柄震动反馈
        if (this.isPlayer && window.gamepadManager) {
            // 根据玩家索引确定手柄索引 (Player 1 = Gamepad 0, Player 2 = Gamepad 1)
            const gamepadIndex = this.playerIndex - 1;
            
            if (window.gamepadManager.isGamepadConnected(gamepadIndex)) {
                // 根据伤害程度调整震动强度
                const damageRatio = Math.min(damage / 50, 1.0); // 标准化伤害值
                const vibrationStrength = 0.3 + (damageRatio * 0.5); // 0.3-0.8强度
                const vibrationDuration = 200 + (damageRatio * 300); // 200-500ms持续时间
                
                // 如果玩家死亡，使用更强的震动
                if (!this.alive) {
                    window.gamepadManager.vibrate(gamepadIndex, 800, 0.9, 0.7); // 死亡震动：强烈且持久
                    console.log(`💀 Player ${this.playerIndex} death vibration triggered`);
                } else {
                    window.gamepadManager.vibrate(gamepadIndex, vibrationDuration, vibrationStrength, vibrationStrength * 0.7);
                    console.log(`💥 Player ${this.playerIndex} damage vibration: ${Math.round(vibrationStrength * 100)}% strength, ${vibrationDuration}ms`);
                }
            }
        }
        
        return true;
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        // 简化无敌期闪烁逻辑
        let shouldDraw = true;
        if (this.invulnerable && this.invulnerabilityTime > 0) {
            // 每0.2秒闪烁一次，确保有足够的显示时间
            shouldDraw = Math.floor(this.blinkTimer * 5) % 2 === 0;
        }
        
        if (!shouldDraw) return;
        
        ctx.save();
        
        // 无敌期发光效果
        if (this.invulnerable && this.invulnerabilityTime > 0) {
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 10;
        }
        
        // 坦克身体
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // 坦克履带
        ctx.fillStyle = '#333';
        ctx.fillRect(-this.width/2, -this.height/2 - 3, this.width, 3);
        ctx.fillRect(-this.width/2, this.height/2, this.width, 3);
        
        ctx.restore();
        
        // 炮塔
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.invulnerable && this.invulnerabilityTime > 0) {
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 10;
        }
        
        ctx.rotate(this.turretAngle);
        ctx.fillStyle = this.color;
        ctx.fillRect(0, -4, 25, 8);
        
        // 炮塔中心
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // 速度加成指示
        if (this.speedBoostTime > 0) {
            ctx.strokeStyle = '#44FF44';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 子弹效果指示
        const time = Date.now() * 0.005;
        let yOffset = -45;
        
        // 显示主要效果
        if (this.primaryBulletEffect) {
            let color, radius, text;
            
            switch(this.primaryBulletEffect) {
                case 'chain':
                    color = '#FF6600';
                    radius = 25;
                    text = 'CHAIN';
                    break;
                case 'thunder':
                    color = '#FFFF00';
                    radius = 35 + Math.sin(time) * 3;
                    text = 'THUNDER';
                    break;
                case 'explosive':
                    color = '#FF4400';
                    radius = 28;
                    text = 'BOOM';
                    break;
            }
            
            if (color) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
                ctx.stroke();
                
                // 显示效果名称
                ctx.fillStyle = color;
                ctx.font = '10px Courier New';
                ctx.textAlign = 'center';
                ctx.fillText(text, this.x, this.y + yOffset);
                yOffset -= 10;
                
                // 显示剩余时间（临时效果）
                if (this.bulletEffectTime > 0) {
                    ctx.fillText(`${Math.ceil(this.bulletEffectTime)}s`, this.x, this.y + yOffset);
                    yOffset -= 10;
                }
            }
        }
        
        // 显示散弹效果
        if (this.shotgunEffect) {
            let color, radius, text;
            
            switch(this.shotgunEffect) {
                case 'mega_shotgun':
                    color = '#8A2BE2';
                    radius = 30;
                    text = 'MEGA SHOT';
                    break;
                case 'shotgun':
                    color = '#8A2BE2';
                    radius = 26;
                    text = 'SHOTGUN';
                    break;
            }
            
            if (color) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]); // 虚线表示散弹效果
                ctx.beginPath();
                ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]); // 重置线条样式
                
                // 显示效果名称
                ctx.fillStyle = color;
                ctx.font = '9px Courier New';
                ctx.textAlign = 'center';
                ctx.fillText(text, this.x, this.y + yOffset);
                yOffset -= 10;
                
                // 显示剩余时间（临时效果）
                if (this.shotgunEffectTime > 0) {
                    ctx.fillText(`${Math.ceil(this.shotgunEffectTime)}s`, this.x, this.y + yOffset);
                }
            }
        }
        
        // 无敌期倒计时（仅玩家）
        if (this.isPlayer && this.invulnerable && this.invulnerabilityTime > 0) {
            ctx.fillStyle = '#00FFFF';
            ctx.font = '12px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.ceil(this.invulnerabilityTime)}`, this.x, this.y - 25);
        }
        
        // 调试信息 - 显示坐标
        if (this.isPlayer) {
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`(${Math.round(this.x)},${Math.round(this.y)})`, this.x, this.y + 35);
        }
    }
    
    getBounds() {
        return {
            x: this.x - this.width/2,
            y: this.y - this.height/2,
            width: this.width,
            height: this.height
        };
    }
}

class Obstacle {
    constructor(x, y, width, height, destructible = true) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.destructible = destructible;
        this.destroyed = false;
        this.maxHealth = destructible ? 50 : Infinity;
        this.health = this.maxHealth;
    }
    
    takeDamage(damage = 25) {
        if (!this.destructible || this.destroyed) return false;
        
        this.health -= damage;
        if (this.health <= 0) {
            this.destroyed = true;
            return true;
        }
        return false;
    }
    
    draw(ctx) {
        if (this.destroyed) return;
        
        if (this.destructible) {
            // 可破坏障碍物 - 砖块样式
            const healthRatio = this.health / this.maxHealth;
            ctx.fillStyle = healthRatio > 0.5 ? '#8B4513' : '#654321';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // 砖块纹理
            ctx.strokeStyle = '#5D2F0A';
            ctx.lineWidth = 1;
            for (let i = 0; i < this.width; i += 10) {
                for (let j = 0; j < this.height; j += 10) {
                    ctx.strokeRect(this.x + i, this.y + j, 10, 10);
                }
            }
        } else {
            // 不可破坏障碍物 - 钢铁样式
            ctx.fillStyle = '#708090';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // 金属纹理
            ctx.strokeStyle = '#2F4F4F';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            
            // 金属光泽
            ctx.fillStyle = '#B0C4DE';
            ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 3);
        }
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

class Eagle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.maxHealth = 3;
        this.health = this.maxHealth;
        this.destroyed = false;
    }
    
    takeDamage(damage = 1) {
        if (this.destroyed) return false;
        
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.destroyed = true;
            return true;
        }
        return false;
    }
    
    draw(ctx) {
        const centerX = this.x;
        const centerY = this.y;
        
        if (this.destroyed) {
            // 被摧毁的老鹰 - 显示爆炸残骸
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(centerX - 20, centerY - 20, 40, 40);
            
            ctx.fillStyle = '#FF0000';
            ctx.font = '24px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('💥', centerX, centerY + 8);
            return;
        }
        
        // 老鹰基座 - 稍微调整颜色使其更突出
        ctx.fillStyle = '#654321';
        ctx.fillRect(centerX - 22, centerY - 22, 44, 44);
        
        // 基座边框
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - 22, centerY - 22, 44, 44);
        
        // 使用🦅emoji图标 - 调整大小和位置
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 添加文字阴影效果
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.fillText('🦅', centerX, centerY - 3);
        
        // 清除阴影设置
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // 健康状态指示
        if (this.health < this.maxHealth) {
            ctx.fillStyle = this.health > 1 ? '#FFFF00' : '#FF0000';
            ctx.font = '16px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`❤️${this.health}`, centerX, centerY + 35);
        }
        
        // 护盾效果
        if (typeof game !== 'undefined' && game.eagleShieldActive) {
            const time = Date.now() * 0.01;
            
            // 护盾光环
            ctx.strokeStyle = '#4169E1';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 35 + Math.sin(time) * 3, 0, Math.PI * 2);
            ctx.stroke();
            
            // 内层护盾
            ctx.strokeStyle = '#87CEEB';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 25 + Math.cos(time * 1.5) * 2, 0, Math.PI * 2);
            ctx.stroke();
            
            // 护盾文字
            ctx.fillStyle = '#4169E1';
            ctx.font = '12px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('SHIELD', centerX, centerY + 50);
            
            // 剩余时间
            if (game.eagleShieldTime > 0) {
                ctx.fillText(`${Math.ceil(game.eagleShieldTime)}s`, centerX, centerY + 65);
            }
        }
        
        // 保护提示
        ctx.fillStyle = '#00FF00';
        ctx.font = '12px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PROTECT', centerX, centerY - 35);
    }
    
    getBounds() {
        return {
            x: this.x - this.width/2,
            y: this.y - this.height/2,
            width: this.width,
            height: this.height
        };
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 15;
        this.collected = false;
        this.time = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.life = 30; // 30秒后消失
    }
    
    update(deltaTime) {
        this.time += deltaTime;
        this.life -= deltaTime;
        
        if (this.life <= 0) {
            this.collected = true; // 标记为已收集以便移除
        }
    }
    
    draw(ctx) {
        if (this.collected) return;
        
        const bobY = this.y + Math.sin(this.time * 3 + this.bobOffset) * 3;
        
        ctx.save();
        ctx.translate(this.x, bobY);
        
        // 发光效果
        ctx.shadowColor = this.getGlowColor();
        ctx.shadowBlur = 15;
        
        // 根据类型绘制不同的道具
        switch(this.type) {
            case 'health':
                ctx.fillStyle = '#FF4444';
                ctx.fillRect(-8, -3, 16, 6);
                ctx.fillRect(-3, -8, 6, 16);
                break;
            case 'speed':
                ctx.fillStyle = '#44FF44';
                ctx.beginPath();
                ctx.moveTo(-10, 0);
                ctx.lineTo(10, -8);
                ctx.lineTo(10, 8);
                ctx.closePath();
                ctx.fill();
                break;
            case 'explosive':
                ctx.fillStyle = '#FF8800';
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                // 爆炸符号
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 2;
                for(let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(angle) * 6, Math.sin(angle) * 6);
                    ctx.lineTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
                    ctx.stroke();
                }
                break;
            case 'invincible':
                ctx.fillStyle = '#00FFFF';
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 3;
                ctx.stroke();
                break;
            case 'shotgun':
                ctx.fillStyle = '#8A2BE2';
                ctx.fillRect(-10, -5, 20, 10);
                ctx.fillStyle = '#FF69B4';
                for(let i = 0; i < 3; i++) {
                    ctx.fillRect(-8 + i * 5, -3, 3, 6);
                }
                break;
            case 'life':
                ctx.fillStyle = '#FF1493';
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.bezierCurveTo(-10, -15, -15, -5, 0, 5);
                ctx.bezierCurveTo(15, -5, 10, -15, 0, -10);
                ctx.fill();
                break;
            case 'thunder':
                ctx.fillStyle = '#FFFF00';
                ctx.beginPath();
                ctx.moveTo(-8, -12);
                ctx.lineTo(2, -2);
                ctx.lineTo(-4, -2);
                ctx.lineTo(8, 12);
                ctx.lineTo(-2, 2);
                ctx.lineTo(4, 2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
            case 'eagle_shield':
                ctx.fillStyle = '#4169E1';
                ctx.beginPath();
                ctx.moveTo(0, -12);
                ctx.lineTo(-8, -6);
                ctx.lineTo(-8, 6);
                ctx.lineTo(0, 12);
                ctx.lineTo(8, 6);
                ctx.lineTo(8, -6);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#87CEEB';
                ctx.beginPath();
                ctx.moveTo(0, -8);
                ctx.lineTo(-5, -3);
                ctx.lineTo(-5, 3);
                ctx.lineTo(0, 8);
                ctx.lineTo(5, 3);
                ctx.lineTo(5, -3);
                ctx.closePath();
                ctx.fill();
                break;
            case 'chain_bullet':
                // 连球弹 - 链条样式
                ctx.fillStyle = '#FF6600';
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制链条效果
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                for(let i = 0; i < 4; i++) {
                    const angle = (i * Math.PI) / 2;
                    ctx.beginPath();
                    ctx.arc(Math.cos(angle) * 8, Math.sin(angle) * 8, 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                // 中心连接线
                ctx.beginPath();
                ctx.moveTo(-8, 0);
                ctx.lineTo(8, 0);
                ctx.moveTo(0, -8);
                ctx.lineTo(0, 8);
                ctx.stroke();
                break;
            case 'mega_shotgun':
                // 大散弹 - 更大的散弹图标
                ctx.fillStyle = '#8A2BE2';
                ctx.fillRect(-12, -8, 24, 16);
                ctx.fillStyle = '#FF69B4';
                
                // 绘制更多的弹丸
                for(let i = 0; i < 5; i++) {
                    ctx.fillRect(-10 + i * 4, -5, 3, 10);
                }
                
                // 添加"MEGA"标识
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('MEGA', 0, 2);
                break;
            case 'bullet_speed':
                // 子弹加速 - 箭头和尾迹效果
                ctx.fillStyle = '#00FFFF';
                ctx.beginPath();
                ctx.moveTo(-8, 0);
                ctx.lineTo(8, 0);
                ctx.lineTo(4, -4);
                ctx.moveTo(8, 0);
                ctx.lineTo(4, 4);
                ctx.stroke();
                
                // 速度线条
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 2;
                for(let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(-12 + i * 3, -6 + i * 4);
                    ctx.lineTo(-8 + i * 3, -6 + i * 4);
                    ctx.stroke();
                }
                
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('SPEED', 0, 12);
                break;
            case 'stray_missiles':
                // 🚀 跟踪导弹道具 - 导弹图标
                ctx.fillStyle = '#FF6600';
                ctx.strokeStyle = '#FF3300';
                ctx.lineWidth = 2;
                
                // 绘制导弹主体
                ctx.beginPath();
                ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // 绘制导弹尾翼
                ctx.fillStyle = '#FF3300';
                ctx.beginPath();
                ctx.moveTo(-6, 0);
                ctx.lineTo(-10, -3);
                ctx.lineTo(-10, 3);
                ctx.closePath();
                ctx.fill();
                
                // 绘制导弹头部
                ctx.fillStyle = '#FFAA00';
                ctx.beginPath();
                ctx.ellipse(6, 0, 2, 1, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加数量标识
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('x5', 0, -12);
                break;
        }
        
        ctx.restore();
        
        // 绘制道具名称
        ctx.fillStyle = 'white';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(this.getDisplayName(), this.x, bobY + 25);
    }
    
    getGlowColor() {
        switch(this.type) {
            case 'health': return '#FF4444';
            case 'speed': return '#44FF44';
            case 'explosive': return '#FF8800';
            case 'invincible': return '#00FFFF';
            case 'shotgun': return '#8A2BE2';
            case 'life': return '#FF1493';
            default: return '#FFFFFF';
        }
    }
    
    getDisplayName() {
        switch(this.type) {
            case 'health': return 'HEALTH';
            case 'speed': return 'SPEED';
            case 'explosive': return 'EXPLOSIVE';
            case 'invincible': return 'SHIELD';
            case 'shotgun': return 'SHOTGUN';
            case 'life': return 'LIFE';
            case 'thunder': return 'THUNDER';
            case 'eagle_shield': return 'EAGLE SHIELD';
            case 'chain_bullet': return 'CHAIN BULLET';
            case 'mega_shotgun': return 'MEGA SHOTGUN';
            case 'bullet_speed': return 'BULLET SPEED';
            case 'stray_missiles': return 'MISSILES';
            default: return 'POWER';
        }
    }
    
    getBounds() {
        return {
            x: this.x - this.radius,
            y: this.y - this.radius,
            width: this.radius * 2,
            height: this.radius * 2
        };
    }
}

class Bullet {
    constructor(x, y, angle, speed, owner, accelerated = false) {
        this.x = x;
        this.y = y;
        
        // 使用配置文件中的速度设置
        const bulletSpeed = accelerated ? GameConfig.bullet.acceleratedSpeed : (speed || GameConfig.bullet.speed);
        this.vx = Math.cos(angle) * bulletSpeed;
        this.vy = Math.sin(angle) * bulletSpeed;
        
        this.owner = owner;
        this.radius = GameConfig.bullet.radius;
        this.life = GameConfig.bullet.life;
        this.explosive = false;
        this.chainBullet = false;
        this.hasChained = false;
        this.thunderBullet = false;
        this.hasThundered = false;
        this.explosionRadius = GameConfig.bullet.explosionRadius;
        this.hasExploded = false;
        this.bounceCount = 0;
        this.maxBounces = GameConfig.bullet.maxBounces;
        this.accelerated = accelerated; // 是否为加速子弹
        this.markedForDeletion = false; // 标记删除标志
    }
    
    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.life -= deltaTime;
    }
    
    draw(ctx) {
        // 根据子弹所有者确定基础颜色
        let baseColor = '#FFD700'; // 默认金黄色（玩家子弹）
        
        // 如果是敌人的子弹，使用红色
        if (this.owner && !this.owner.isPlayer) {
            baseColor = '#FF0000'; // 红色（敌人子弹）
        }
        
        if (this.thunderBullet) {
            // 闪电弹特效
            ctx.fillStyle = this.owner && !this.owner.isPlayer ? '#FF4444' : '#FFFF00';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
            ctx.fill();
            
            // 闪电光效
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            const time = Date.now() * 0.01;
            for(let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 + time;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(
                    this.x + Math.cos(angle) * (this.radius + 8),
                    this.y + Math.sin(angle) * (this.radius + 8)
                );
                ctx.stroke();
            }
            
            ctx.fillStyle = this.owner && !this.owner.isPlayer ? '#FF8888' : '#FFFF88';
        } else if (this.chainBullet) {
            // 连球弹特效
            ctx.fillStyle = this.owner && !this.owner.isPlayer ? '#CC0000' : '#FF6600';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 链条光效
            ctx.strokeStyle = this.owner && !this.owner.isPlayer ? '#FF4444' : '#FFD700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = this.owner && !this.owner.isPlayer ? '#FF6666' : '#FFAA00';
        } else if (this.explosive) {
            ctx.fillStyle = this.owner && !this.owner.isPlayer ? '#AA0000' : '#FF4400';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = this.owner && !this.owner.isPlayer ? '#FF4444' : '#FFAA00';
        } else {
            ctx.fillStyle = baseColor;
        }
        
        // 加速子弹特效
        if (this.accelerated) {
            // 加速子弹的尾迹效果
            ctx.strokeStyle = this.owner && !this.owner.isPlayer ? '#FF6666' : '#00FFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
            ctx.lineTo(this.x - this.vx * 0.15, this.y - this.vy * 0.15);
            ctx.stroke();
            
            // 外圈光环
            ctx.strokeStyle = this.owner && !this.owner.isPlayer ? '#FF6666' : '#00FFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    isOutOfBounds(width, height) {
        return this.x < 0 || this.x > width || this.y < 0 || this.y > height || this.life <= 0;
    }
    
    getBounds() {
        return {
            x: this.x - this.radius,
            y: this.y - this.radius,
            width: this.radius * 2,
            height: this.radius * 2
        };
    }
}

// 🚀 跟踪导弹类 - B类辅助武器
class StrayMissile {
    constructor(x, y, owner, target = null) {
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.target = target; // 锁定的目标
        this.speed = 250; // 导弹速度 (提高速度)
        this.turnRate = 5.0; // 转向速度 (提高转向能力)
        this.damage = 40; // 导弹伤害
        this.radius = 5; // 稍微增大半径
        this.life = 10.0; // 导弹生存时间(秒) - 延长生存时间
        this.maxLife = 10.0;
        
        // 导弹运动参数
        this.angle = 0; // 当前飞行角度
        this.vx = 0;
        this.vy = 0;
        
        // 视觉效果
        this.trailPoints = []; // 尾迹点
        this.maxTrailLength = 12; // 增加尾迹长度
        this.glowIntensity = 1.0;
        
        // 目标搜索参数 - 扩大搜索范围
        this.searchRadius = 300; // 目标搜索半径 (扩大)
        this.lockOnRadius = 400; // 锁定半径 (扩大)
        this.hasLocked = false;
        
        // 初始化飞行方向 (向上)
        this.angle = -Math.PI / 2;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        
        console.log(`🚀 StrayMissile created by Player ${owner.playerIndex} - Enhanced tracking`);
    }
    
    update(deltaTime, enemies) {
        // 更新生存时间
        this.life -= deltaTime;
        if (this.life <= 0) return false;
        
        // 目标搜索和锁定
        this.updateTarget(enemies);
        
        // 导弹导航
        this.updateNavigation(deltaTime);
        
        // 更新位置
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // 更新尾迹
        this.updateTrail();
        
        return true;
    }
    
    updateTarget(enemies) {
        // 如果当前目标已死亡或超出范围，重新搜索
        if (!this.target || !this.target.alive || this.getDistanceToTarget() > this.lockOnRadius) {
            this.target = this.findNearestEnemy(enemies);
            this.hasLocked = false;
            if (this.target) {
                console.log(`🎯 Missile acquired new target at distance: ${Math.round(this.getDistanceToTarget())}`);
            }
        }
        
        // 检查是否成功锁定 - 放宽锁定条件
        if (this.target && this.getDistanceToTarget() <= this.lockOnRadius) {
            if (!this.hasLocked) {
                this.hasLocked = true;
                console.log(`🔒 Missile locked onto target!`);
            }
        }
    }
    
    findNearestEnemy(enemies) {
        if (!enemies || enemies.length === 0) return null;
        
        let nearestEnemy = null;
        let nearestDistance = Infinity;
        
        for (const enemy of enemies) {
            if (!enemy || !enemy.alive) continue;
            
            const distance = Math.sqrt(
                Math.pow(enemy.x - this.x, 2) + 
                Math.pow(enemy.y - this.y, 2)
            );
            
            // 扩大搜索范围，优先选择最近的敌人
            if (distance < nearestDistance && distance <= this.lockOnRadius) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }
        
        return nearestEnemy;
    }
    
    getDistanceToTarget() {
        if (!this.target) return Infinity;
        return Math.sqrt(
            Math.pow(this.target.x - this.x, 2) + 
            Math.pow(this.target.y - this.y, 2)
        );
    }
    
    updateNavigation(deltaTime) {
        if (!this.target || !this.hasLocked) {
            // 无目标时保持当前方向飞行
            return;
        }
        
        // 预测目标位置 (简单的线性预测)
        let targetX = this.target.x;
        let targetY = this.target.y;
        
        // 如果目标有速度信息，进行预测
        if (this.target.vx !== undefined && this.target.vy !== undefined) {
            const timeToTarget = this.getDistanceToTarget() / this.speed;
            targetX += this.target.vx * timeToTarget * 0.5; // 预测系数
            targetY += this.target.vy * timeToTarget * 0.5;
        }
        
        // 计算到预测位置的角度
        const targetAngle = Math.atan2(
            targetY - this.y,
            targetX - this.x
        );
        
        // 计算角度差
        let angleDiff = targetAngle - this.angle;
        
        // 标准化角度差到 [-π, π]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // 动态调整转向速度 - 距离越近转向越快
        const distance = this.getDistanceToTarget();
        const dynamicTurnRate = this.turnRate * (1 + Math.max(0, (200 - distance) / 200));
        const maxTurn = dynamicTurnRate * deltaTime;
        
        // 平滑转向
        if (Math.abs(angleDiff) <= maxTurn) {
            this.angle = targetAngle;
        } else {
            this.angle += Math.sign(angleDiff) * maxTurn;
        }
        
        // 更新速度向量
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        
        // 调试信息
        if (Math.random() < 0.01) { // 1%概率输出调试信息
            console.log(`🎯 Missile tracking: distance=${Math.round(distance)}, angle=${Math.round(this.angle * 180 / Math.PI)}°`);
        }
    }
    
    updateTrail() {
        // 添加当前位置到尾迹
        this.trailPoints.push({ x: this.x, y: this.y });
        
        // 限制尾迹长度
        if (this.trailPoints.length > this.maxTrailLength) {
            this.trailPoints.shift();
        }
    }
    
    render(ctx) {
        // 绘制尾迹
        this.renderTrail(ctx);
        
        // 绘制导弹主体
        this.renderMissile(ctx);
        
        // 绘制锁定指示器
        if (this.hasLocked && this.target) {
            this.renderLockIndicator(ctx);
        }
    }
    
    renderTrail(ctx) {
        if (this.trailPoints.length < 2) return;
        
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // 🔥 金黄色火焰尾迹
        for (let i = 1; i < this.trailPoints.length; i++) {
            const point = this.trailPoints[i];
            const prevPoint = this.trailPoints[i - 1];
            const alpha = (i / this.trailPoints.length) * 0.9;
            
            // 金黄色渐变火焰效果
            const gradient = ctx.createLinearGradient(prevPoint.x, prevPoint.y, point.x, point.y);
            gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha * 0.8})`); // 金色
            gradient.addColorStop(0.5, `rgba(255, 165, 0, ${alpha})`); // 橙金色
            gradient.addColorStop(1, `rgba(255, 140, 0, ${alpha * 1.2})`); // 深金色
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 4 * alpha;
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            
            // 内层亮金色核心
            ctx.strokeStyle = `rgba(255, 255, 0, ${alpha * 0.6})`;
            ctx.lineWidth = 2 * alpha;
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    renderMissile(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // 🚀 墨绿色导弹主体
        ctx.fillStyle = '#2F4F2F'; // 深墨绿色
        ctx.fillRect(-10, -3, 20, 6);
        
        // 黑色导弹头部 (尖锐)
        ctx.fillStyle = '#1C1C1C'; // 深黑色
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(6, -3);
        ctx.lineTo(6, 3);
        ctx.closePath();
        ctx.fill();
        
        // 墨绿色导弹尾翼
        ctx.fillStyle = '#556B2F'; // 橄榄绿
        ctx.fillRect(-10, -2, 4, 4);
        ctx.fillRect(-10, -1, 2, 2);
        
        // 黑色细节线条
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -3);
        ctx.lineTo(6, -3);
        ctx.moveTo(-6, 3);
        ctx.lineTo(6, 3);
        ctx.stroke();
        
        // 发光效果 (金黄色光晕)
        const lifeRatio = this.life / this.maxLife;
        ctx.shadowColor = '#FFD700'; // 金色光晕
        ctx.shadowBlur = 6 * lifeRatio;
        
        // 导弹核心 (深绿色)
        ctx.fillStyle = '#228B22'; // 森林绿
        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 1, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    renderLockIndicator(ctx) {
        if (!this.target || !this.hasLocked) return;
        
        ctx.save();
        
        // 🎯 绿色锁定线 (配合导弹颜色)
        ctx.strokeStyle = '#32CD32'; // 石灰绿
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        
        // 绘制锁定线
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.stroke();
        
        // 目标锁定框 (动态脉冲效果)
        const pulseIntensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
        ctx.strokeStyle = `rgba(50, 205, 50, ${pulseIntensity})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        
        // 十字准星
        const crossSize = 25;
        ctx.beginPath();
        // 水平线
        ctx.moveTo(this.target.x - crossSize, this.target.y);
        ctx.lineTo(this.target.x + crossSize, this.target.y);
        // 垂直线
        ctx.moveTo(this.target.x, this.target.y - crossSize);
        ctx.lineTo(this.target.x, this.target.y + crossSize);
        ctx.stroke();
        
        // 外圈锁定环
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        // 锁定文字
        ctx.fillStyle = '#32CD32';
        ctx.font = '12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('LOCKED', this.target.x, this.target.y - 40);
        
        ctx.restore();
    }
    
    isOutOfBounds(width, height) {
        return this.x < -50 || this.x > width + 50 || 
               this.y < -50 || this.y > height + 50 || 
               this.life <= 0;
    }
    
    getBounds() {
        return {
            x: this.x - this.radius,
            y: this.y - this.radius,
            width: this.radius * 2,
            height: this.radius * 2
        };
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.gameState = 'menu';
        this.lastTime = 0;
        
        this.keys = {};
        this.mousePos = { x: 0, y: 0 };
        
        // 获取全局音频管理器
        this.audioManager = window.audioManager;
        
        // 🎮 初始化游戏手柄管理器
        if (typeof GamepadManager !== 'undefined') {
            window.gamepadManager = new GamepadManager();
            console.log('🎮 Xbox controller support enabled');
        } else {
            console.warn('🎮 GamepadManager not found - Xbox controller support disabled');
        }
        
        this.player1 = null;
        this.player2 = null;
        this.enemyTanks = [];
        this.bullets = [];
        this.strayMissiles = []; // 🚀 跟踪导弹数组
        this.obstacles = [];
        this.powerUps = [];
        
        // 道具系统
        this.powerUpSpawnTimer = 0;
        this.powerUpSpawnInterval = 8; // 每8秒生成一个道具
        this.powerUpTypes = ['health', 'speed', 'explosive', 'invincible', 'shotgun', 'life', 'thunder', 'eagle_shield', 'chain_bullet', 'mega_shotgun', 'stray_missiles'];
        this.maxPowerUps = 3; // 最多同时存在3个道具
        
        // 老鹰护盾系统
        this.eagleShieldActive = false;
        this.eagleShieldTime = 0;
        this.eagleShieldDuration = 15; // 15秒护盾时间
        
        // 生命系统
        this.player1Lives = (typeof GameConfig !== 'undefined' && GameConfig.player) ? GameConfig.player.startLives : 3;
        this.player2Lives = (typeof GameConfig !== 'undefined' && GameConfig.player) ? GameConfig.player.startLives : 3;
        this.maxLives = (typeof GameConfig !== 'undefined' && GameConfig.player) ? GameConfig.player.maxLives : 9;
        
        // 战斗统计
        this.battleStats = {
            player1Kills: 0,
            player1Damage: 0,
            player1Score: 0, // 🔧 新增：Player 1个人分数
            player1LastLifeReward: 0, // 🔧 追踪Player 1上次奖励生命时的分数
            player2Kills: 0,
            player2Damage: 0,
            player2Score: 0, // 🔧 新增：Player 2个人分数
            player2LastLifeReward: 0, // 🔧 追踪Player 2上次奖励生命时的分数
            levelStartTime: 0,
            totalScore: 0
        };
        
        // 老鹰系统
        this.eagle = new Eagle(this.width / 2, this.height - 60);
        
        // 敌人系统
        this.enemySpawnTimer = 0;
        this.enemyColors = (typeof GameConfig !== 'undefined' && GameConfig.enemy) ? GameConfig.enemy.colors : ['#FF4444', '#FF8800', '#8800FF', '#FF0088'];
        
        // 关卡系统
        this.currentLevel = 1;
        this.enemiesKilled = 0;
        this.maxLevel = (typeof GameConfig !== 'undefined' && GameConfig.game) ? GameConfig.game.maxLevel : 8;
        
        // 每关的击杀目标 - 从配置文件获取，带防御性检查
        if (typeof GameConfig !== 'undefined' && 
            GameConfig.difficulty && 
            GameConfig.difficulty.levels && 
            Array.isArray(GameConfig.difficulty.levels)) {
            this.levelTargets = GameConfig.difficulty.levels.map(level => level.killTarget);
        } else {
            // 如果配置不可用，使用默认值
            this.levelTargets = [60, 78, 101, 131, 170, 221, 287, 373];
            console.warn('Using default level targets, GameConfig may not be loaded');
        }
        
        // 分数系统
        this.score = { teamScore: 0, enemiesKilled: 0 };
        this.lastLifeReward = 0;
        
        // 应用第一关的难度配置，带防御性检查
        if (typeof GameConfig !== 'undefined' && 
            GameConfig.difficulty && 
            GameConfig.difficulty.levels && 
            GameConfig.difficulty.levels[0]) {
            const config = GameConfig.difficulty.levels[0];
            this.enemySpawnInterval = config.enemySpawnInterval;
            this.maxEnemyTanks = config.maxEnemies;
        } else {
            // 使用默认值
            this.enemySpawnInterval = 2.0;
            this.maxEnemyTanks = 3;
            console.warn('Using default difficulty config, GameConfig may not be loaded');
        }
        
        this.setupEventListeners();
        this.initializeObstacles();
        this.gameLoop();
    }
    
    initializeObstacles() {
        this.obstacles = [];
        
        // 边界墙 (不可摧毁)
        this.obstacles.push(
            new Obstacle(0, 0, this.width, 10, false), // 上边界
            new Obstacle(0, this.height - 10, this.width, 10, false), // 下边界
            new Obstacle(0, 0, 10, this.height, false), // 左边界
            new Obstacle(this.width - 10, 0, 10, this.height, false) // 右边界
        );
        
        // 老鹰保护结构 - 更强的防护
        const eagleX = this.eagle.x;
        const eagleY = this.eagle.y;
        
        // 老鹰周围的完整保护墙 (可破坏，但较厚)
        this.obstacles.push(
            // 左侧保护墙
            new Obstacle(eagleX - 80, eagleY - 40, 30, 80, true),
            new Obstacle(eagleX - 50, eagleY - 40, 20, 30, true), // 左上角
            new Obstacle(eagleX - 50, eagleY + 10, 20, 30, true), // 左下角
            
            // 右侧保护墙
            new Obstacle(eagleX + 50, eagleY - 40, 30, 80, true),
            new Obstacle(eagleX + 30, eagleY - 40, 20, 30, true), // 右上角
            new Obstacle(eagleX + 30, eagleY + 10, 20, 30, true), // 右下角
            
            // 上方保护墙 (留出入口)
            new Obstacle(eagleX - 50, eagleY - 60, 40, 20, true), // 左上墙
            new Obstacle(eagleX + 10, eagleY - 60, 40, 20, true), // 右上墙
            
            // 老鹰正前方的额外保护
            new Obstacle(eagleX - 30, eagleY - 40, 60, 15, true),
            
            // 侧面通道保护
            new Obstacle(eagleX - 100, eagleY - 20, 20, 40, true), // 左侧通道
            new Obstacle(eagleX + 80, eagleY - 20, 20, 40, true)   // 右侧通道
        );
        
        // === 对称的不可穿透钢铁掩体布局 ===
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // 上方区域 - 对称的钢铁堡垒
        this.obstacles.push(
            // 上方中央堡垒
            new Obstacle(centerX - 40, 120, 80, 30, false), // 中央钢铁墙
            new Obstacle(centerX - 60, 100, 30, 30, false), // 左翼
            new Obstacle(centerX + 30, 100, 30, 30, false), // 右翼
            
            // 上方左右对称堡垒
            new Obstacle(150, 80, 40, 40, false),  // 左上钢铁堡垒
            new Obstacle(610, 80, 40, 40, false),  // 右上钢铁堡垒
            new Obstacle(120, 160, 30, 60, false), // 左侧钢铁柱
            new Obstacle(650, 160, 30, 60, false), // 右侧钢铁柱
        );
        
        // 中央区域 - 十字形钢铁防线
        this.obstacles.push(
            // 水平钢铁防线
            new Obstacle(centerX - 100, centerY - 15, 80, 30, false), // 左段
            new Obstacle(centerX + 20, centerY - 15, 80, 30, false),  // 右段
            
            // 垂直钢铁防线
            new Obstacle(centerX - 15, centerY - 80, 30, 60, false), // 上段
            new Obstacle(centerX - 15, centerY + 20, 30, 60, false), // 下段
            
            // 四角钢铁支撑点
            new Obstacle(centerX - 80, centerY - 60, 25, 25, false), // 左上
            new Obstacle(centerX + 55, centerY - 60, 25, 25, false), // 右上
            new Obstacle(centerX - 80, centerY + 35, 25, 25, false), // 左下
            new Obstacle(centerX + 55, centerY + 35, 25, 25, false), // 右下
        );
        
        // 侧翼防护 - 对称的钢铁屏障
        this.obstacles.push(
            // 左侧防护链
            new Obstacle(80, 200, 30, 50, false),  // 左上段
            new Obstacle(80, 280, 30, 50, false),  // 左中段
            new Obstacle(80, 360, 30, 50, false),  // 左下段
            
            // 右侧防护链
            new Obstacle(690, 200, 30, 50, false), // 右上段
            new Obstacle(690, 280, 30, 50, false), // 右中段
            new Obstacle(690, 360, 30, 50, false), // 右下段
        );
        
        // 下方区域 - 老鹰前方的对称钢铁防线
        this.obstacles.push(
            // 前方主防线
            new Obstacle(200, 450, 60, 25, false), // 左前方钢铁墙
            new Obstacle(540, 450, 60, 25, false), // 右前方钢铁墙
            new Obstacle(320, 480, 40, 20, false), // 左中钢铁块
            new Obstacle(440, 480, 40, 20, false), // 右中钢铁块
            
            // 侧翼钢铁支撑
            new Obstacle(160, 420, 25, 40, false), // 左侧支撑
            new Obstacle(615, 420, 25, 40, false), // 右侧支撑
        );
        
        // === 可破坏的战术掩体 (对称布局) ===
        this.obstacles.push(
            // 上方可破坏掩体
            new Obstacle(200, 140, 50, 30, true),  // 左上掩体
            new Obstacle(550, 140, 50, 30, true),  // 右上掩体
            
            // 中上区域掩体
            new Obstacle(280, 200, 40, 40, true),  // 左中掩体
            new Obstacle(480, 200, 40, 40, true),  // 右中掩体
            
            // 中下区域掩体
            new Obstacle(250, 350, 60, 25, true),  // 左下掩体
            new Obstacle(490, 350, 60, 25, true),  // 右下掩体
            
            // 通道掩体
            new Obstacle(180, 300, 30, 30, true),  // 左通道
            new Obstacle(590, 300, 30, 30, true),  // 右通道
        );
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // 生命互借功能
            if (this.gameState === 'playing') {
                if (e.code === 'Digit1') {
                    this.transferLife(1, 2); // Player 1 给 Player 2 生命
                } else if (e.code === 'Digit2') {
                    this.transferLife(2, 1); // Player 2 给 Player 1 生命
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.keys['MouseLeft'] = true;
            } else if (e.button === 2) { // 🚀 右键支持导弹发射
                this.keys['MouseRight'] = true;
                e.preventDefault(); // 阻止右键菜单
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.keys['MouseLeft'] = false;
            } else if (e.button === 2) { // 🚀 右键释放
                this.keys['MouseRight'] = false;
            }
        });
        
        // 🚀 阻止右键菜单
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    start() {
        console.log('Starting game...');
        
        // 切换到战斗音乐
        if (window.audioManager) {
            window.audioManager.playMusic('battle');
        }
        
        // 将玩家出生位置改为老鹰旁边
        const eagleX = this.eagle.x;
        const eagleY = this.eagle.y;
        
        this.player1 = new Tank(eagleX - 60, eagleY - 80, '#0066FF', {
            up: 'KeyW',
            down: 'KeyS',
            left: 'KeyA',
            right: 'KeyD',
            shoot: 'MouseLeft',
            useMouse: true
        }, true, 1, 1); // 🎮 playerIndex = 1
        
        this.player2 = new Tank(eagleX + 60, eagleY - 80, '#00AA00', {
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            shoot: 'Space',
            useMouse: false,
            numpadSupport: true  // 🔢 启用小键盘支持
        }, true, 1, 2); // 🎮 playerIndex = 2
        
        console.log('Players created near eagle:', {
            eaglePos: {x: eagleX, y: eagleY},
            player1: {x: this.player1.x, y: this.player1.y},
            player2: {x: this.player2.x, y: this.player2.y},
            p1Alive: this.player1.alive,
            p2Alive: this.player2.alive
        });
        
        this.currentLevel = 1;
        this.enemiesKilled = 0;
        this.enemyTanks = [];
        this.bullets = [];
        this.powerUps = [];
        this.enemySpawnTimer = 0;
        this.powerUpSpawnTimer = 0;
        
        // 初始化战斗统计
        this.battleStats = {
            player1Kills: 0,
            player1Damage: 0,
            player2Kills: 0,
            player2Damage: 0,
            levelStartTime: Date.now(),
            totalScore: 0
        };
        
        // 应用第一关的难度配置，带防御性检查
        if (typeof GameConfig !== 'undefined' && 
            GameConfig.difficulty && 
            GameConfig.difficulty.levels && 
            GameConfig.difficulty.levels[0]) {
            const config = GameConfig.difficulty.levels[0];
            this.enemySpawnInterval = config.enemySpawnInterval;
            this.maxEnemyTanks = config.maxEnemies;
        } else {
            // 使用默认值
            this.enemySpawnInterval = 2.0;
            this.maxEnemyTanks = 3;
            console.warn('Using default start config, GameConfig may not be loaded');
        }
        
        // 重置老鹰
        this.eagle.health = this.eagle.maxHealth;
        this.eagle.destroyed = false;
        
        // 重置障碍物
        this.initializeObstacles();
        
        this.score = { teamScore: 0, enemiesKilled: 0 };
        this.lastLifeReward = 0;
        
        this.gameState = 'playing';
        document.getElementById('startScreen').style.display = 'none';
        
        console.log('Game started successfully');
        console.log('Game state:', this.gameState);
        console.log('Eagle health:', this.eagle.health);
        console.log('Player lives - P1:', this.player1Lives, 'P2:', this.player2Lives);
        
        // 立即生成一个敌人用于测试
        this.spawnEnemyTank();
        console.log('Test enemy spawned, total enemies:', this.enemyTanks.length);
    }
    
    respawnPlayer(playerNumber) {
        const eagleX = this.eagle.x;
        const eagleY = this.eagle.y;
        
        if (playerNumber === 1 && this.player1Lives > 0) {
            this.player1Lives--;
            this.player1 = new Tank(eagleX - 60, eagleY - 80, '#0066FF', {
                up: 'KeyW',
                down: 'KeyS',
                left: 'KeyA',
                right: 'KeyD',
                shoot: 'MouseLeft',
                useMouse: true
            }, true, 1, 1); // 🎮 playerIndex = 1
            
            // 🎮 玩家重生震动提示
            if (window.gamepadManager && window.gamepadManager.isGamepadConnected(0)) {
                window.gamepadManager.vibrate(0, 150, 0.4, 0.2); // 轻微的重生提示震动
                console.log('🔄 Player 1 respawn vibration triggered');
            }
            
            console.log('Player 1 respawned near eagle. Lives remaining:', this.player1Lives);
        } else if (playerNumber === 2 && this.player2Lives > 0) {
            this.player2Lives--;
            this.player2 = new Tank(eagleX + 60, eagleY - 80, '#00AA00', {
                up: 'ArrowUp',
                down: 'ArrowDown',
                left: 'ArrowLeft',
                right: 'ArrowRight',
                shoot: 'Space',
                useMouse: false,
                numpadSupport: true  // 🔢 启用小键盘支持
            }, true, 1, 2); // 🎮 playerIndex = 2
            
            // 🎮 玩家重生震动提示
            if (window.gamepadManager && window.gamepadManager.isGamepadConnected(1)) {
                window.gamepadManager.vibrate(1, 150, 0.4, 0.2); // 轻微的重生提示震动
                console.log('🔄 Player 2 respawn vibration triggered');
            }
            
            console.log('Player 2 respawned near eagle. Lives remaining:', this.player2Lives);
        }
    }
    
    spawnPowerUp() {
        if (this.powerUps.length >= this.maxPowerUps) return;
        
        // 在屏幕四个角落随机生成道具
        const corners = [
            { x: 50, y: 50 },     // 左上角
            { x: this.width - 50, y: 50 }, // 右上角
            { x: 50, y: this.height - 100 }, // 左下角
            { x: this.width - 50, y: this.height - 100 } // 右下角
        ];
        
        const corner = corners[Math.floor(Math.random() * corners.length)];
        const type = this.powerUpTypes[Math.floor(Math.random() * this.powerUpTypes.length)];
        
        // 确保位置不被障碍物阻挡
        let validPosition = true;
        for (const obstacle of this.obstacles) {
            if (!obstacle.destroyed && 
                corner.x >= obstacle.x - 20 && corner.x <= obstacle.x + obstacle.width + 20 &&
                corner.y >= obstacle.y - 20 && corner.y <= obstacle.y + obstacle.height + 20) {
                validPosition = false;
                break;
            }
        }
        
        if (validPosition) {
            this.powerUps.push(new PowerUp(corner.x, corner.y, type));
            console.log(`Power-up spawned: ${type} at (${corner.x}, ${corner.y})`);
        }
    }
    
    checkPowerUpCollection() {
        const players = [this.player1, this.player2].filter(p => p && p.alive);
        
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (powerUp.collected || powerUp.life <= 0) {
                this.powerUps.splice(i, 1);
                continue;
            }
            
            for (const player of players) {
                if (this.checkCollision(player.getBounds(), powerUp.getBounds())) {
                    this.applyPowerUp(player, powerUp.type);
                    this.powerUps.splice(i, 1);
                    console.log(`Power-up collected: ${powerUp.type}`);
                    break;
                }
            }
        }
    }
    
    applyPowerUp(player, type) {
        // 播放道具拾取音效
        if (window.audioManager) {
            switch(type) {
                case 'health':
                case 'life':
                    window.audioManager.playSound('healthPickup');
                    break;
                case 'explosive':
                case 'shotgun':
                case 'mega_shotgun':
                case 'chain_bullet':
                case 'thunder':
                case 'bullet_speed':
                case 'stray_missiles':
                    window.audioManager.playSound('weaponPickup');
                    break;
                case 'invincible':
                case 'eagle_shield':
                    window.audioManager.playSound('shield');
                    break;
                default:
                    window.audioManager.playSound('powerUp');
                    break;
            }
        }
        
        switch(type) {
            case 'health':
                player.health = Math.min(player.maxHealth, player.health + 50);
                break;
            case 'speed':
                player.addSpeedBoost(10);
                break;
            case 'explosive':
                player.addExplosiveAmmo(15);
                break;
            case 'invincible':
                player.addInvincibility(8);
                break;
            case 'shotgun':
                player.addShotgunAmmo(20);
                break;
            case 'life':
                if (player === this.player1 && this.player1Lives < this.maxLives) {
                    this.player1Lives++;
                } else if (player === this.player2 && this.player2Lives < this.maxLives) {
                    this.player2Lives++;
                }
                break;
            case 'thunder':
                player.addThunderBullet();
                break;
            case 'eagle_shield':
                this.activateEagleShield();
                break;
            case 'chain_bullet':
                player.addChainBullet();
                break;
            case 'mega_shotgun':
                player.addMegaShotgun();
                break;
            case 'bullet_speed':
                player.addBulletSpeedBoost(GameConfig.powerUps.effects.bullet_speed.duration);
                break;
            case 'stray_missiles':
                // 🚀 跟踪导弹道具 - 补充导弹数量
                if (player.isPlayer && player.hasOwnProperty('strayMissiles')) {
                    const config = GameConfig.powerUps.effects.stray_missiles;
                    const oldCount = player.strayMissiles;
                    
                    // 增加导弹数量，但不超过最大容量
                    player.strayMissiles = Math.min(
                        player.strayMissiles + config.amount, 
                        config.maxCapacity
                    );
                    
                    // 更新最大容量
                    player.maxStrayMissiles = config.maxCapacity;
                    
                    console.log(`🚀 Player ${player.playerIndex} collected missile powerup! ${oldCount} → ${player.strayMissiles} missiles`);
                }
                break;
        }
    }
    
    activateEagleShield() {
        this.eagleShieldActive = true;
        this.eagleShieldTime = this.eagleShieldDuration;
        console.log('Eagle Shield activated for', this.eagleShieldDuration, 'seconds!');
    }
    
    transferLife(fromPlayer, toPlayer) {
        const fromLives = fromPlayer === 1 ? this.player1Lives : this.player2Lives;
        const toLives = toPlayer === 1 ? this.player1Lives : this.player2Lives;
        
        // 检查是否可以转移生命
        if (fromLives > 1 && toLives < this.maxLives) {
            // 播放生命转移音效
            if (window.audioManager) {
                window.audioManager.playSound('lifeTransfer');
            }
            
            if (fromPlayer === 1) {
                this.player1Lives--;
                this.player2Lives++;
                console.log(`Player 1 transferred 1 life to Player 2. P1: ${this.player1Lives}, P2: ${this.player2Lives}`);
            } else {
                this.player2Lives--;
                this.player1Lives++;
                console.log(`Player 2 transferred 1 life to Player 1. P1: ${this.player1Lives}, P2: ${this.player2Lives}`);
            }
            
            // 显示转移提示
            this.showLifeTransferMessage(fromPlayer, toPlayer);
        } else {
            console.log(`Life transfer failed. From P${fromPlayer} (${fromLives} lives) to P${toPlayer} (${toLives} lives)`);
        }
    }
    
    showLifeTransferMessage(fromPlayer, toPlayer) {
        // 创建临时消息显示
        const message = document.createElement('div');
        message.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            z-index: 1000;
            pointer-events: none;
        `;
        message.textContent = `Player ${fromPlayer} → Player ${toPlayer} ❤️`;
        
        document.getElementById('gameContainer').appendChild(message);
        
        // 3秒后移除消息
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }
    
    checkLevelComplete() {
        const currentTarget = this.levelTargets[this.currentLevel - 1] || 250;
        
        if (this.enemiesKilled >= currentTarget) {
            // 计算关卡统计
            const levelEndTime = Date.now();
            const levelDuration = (levelEndTime - this.battleStats.levelStartTime) / 1000;
            const minutes = Math.floor(levelDuration / 60);
            const seconds = Math.floor(levelDuration % 60);
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // 计算时间奖励
            const targetTime = 180; // 3分钟目标时间
            const timeBonus = Math.max(0, Math.floor((targetTime - levelDuration) * 100));
            
            // 计算本关得分
            const levelScore = this.score.teamScore - this.battleStats.totalScore;
            
            // 准备战斗结果数据
            const levelData = {
                level: this.currentLevel,
                time: timeString,
                enemiesKilled: this.enemiesKilled,
                scoreGained: levelScore,
                player1Kills: this.battleStats.player1Kills,
                player1Damage: this.battleStats.player1Damage,
                player2Kills: this.battleStats.player2Kills,
                player2Damage: this.battleStats.player2Damage,
                eagleSurvived: !this.eagle.destroyed,
                perfectClear: (this.player1 && this.player1.health === this.player1.maxHealth) && 
                             (this.player2 && this.player2.health === this.player2.maxHealth) && 
                             !this.eagle.destroyed,
                timeBonus: timeBonus
            };
            
            // 添加时间奖励到总分
            this.score.teamScore += timeBonus;
            
            if (this.currentLevel < this.maxLevel) {
                // 暂停游戏并显示结果
                this.gameState = 'levelComplete';
                
                // 显示战斗结果
                if (typeof showBattleResults === 'function') {
                    showBattleResults(levelData);
                }
                
                // 准备下一关
                this.prepareNextLevel();
            } else {
                this.gameWon();
            }
        }
    }
    
    prepareNextLevel() {
        // 这个方法准备下一关，但不立即开始
        // 实际的关卡切换将在用户点击继续按钮后进行
        console.log(`Level ${this.currentLevel} completed, waiting for user to continue...`);
    }
    
    nextLevel() {
        console.log(`=== LEVEL TRANSITION: ${this.currentLevel} -> ${this.currentLevel + 1} ===`);
        
        this.currentLevel++;
        this.enemiesKilled = 0;
        
        // 重置战斗统计（保持个人分数和奖励追踪）
        const prevPlayer1LifeReward = this.battleStats.player1LastLifeReward || 0;
        const prevPlayer2LifeReward = this.battleStats.player2LastLifeReward || 0;
        const prevPlayer1Kills = this.battleStats.player1Kills || 0;
        const prevPlayer2Kills = this.battleStats.player2Kills || 0;
        const prevPlayer1Score = this.battleStats.player1Score || 0;
        const prevPlayer2Score = this.battleStats.player2Score || 0;
        
        this.battleStats = {
            player1Kills: prevPlayer1Kills, // 🔧 保持累积击杀数
            player1Damage: 0,
            player1Score: prevPlayer1Score, // 🔧 保持累积个人分数
            player1LastLifeReward: prevPlayer1LifeReward, // 🔧 保持生命奖励追踪
            player2Kills: prevPlayer2Kills, // 🔧 保持累积击杀数
            player2Damage: 0,
            player2Score: prevPlayer2Score, // 🔧 保持累积个人分数
            player2LastLifeReward: prevPlayer2LifeReward, // 🔧 保持生命奖励追踪
            levelStartTime: Date.now(),
            totalScore: this.score.teamScore
        };
        
        // 播放关卡完成音效
        if (window.audioManager) {
            window.audioManager.playSound('levelComplete');
        }
        
        // 清除所有敌人和子弹
        console.log('Clearing enemies, bullets, and power-ups...');
        this.enemyTanks = [];
        this.bullets = [];
        this.powerUps = [];
        
        // 重置老鹰护盾状态
        console.log('Resetting eagle shield...');
        this.eagleShieldActive = false;
        this.eagleShieldTime = 0;
        
        // 重新生成钢铁障碍物
        console.log('Regenerating obstacles...');
        this.regenerateObstacles();
        
        // 玩家归位到老鹰旁边
        console.log('Resetting player positions...');
        this.resetPlayerPositions();
        
        // 更新难度配置 - 使用GameConfig，带防御性检查
        console.log('Updating difficulty configuration...');
        if (typeof GameConfig !== 'undefined' && 
            GameConfig.difficulty && 
            GameConfig.difficulty.levels && 
            GameConfig.difficulty.levels[this.currentLevel - 1]) {
            const config = GameConfig.difficulty.levels[this.currentLevel - 1];
            this.enemySpawnInterval = config.enemySpawnInterval;
            this.maxEnemyTanks = config.maxEnemies;
            this.powerUpSpawnInterval = config.powerUpFrequency;
            console.log('Config applied:', {
                level: this.currentLevel,
                spawnInterval: this.enemySpawnInterval,
                maxEnemies: this.maxEnemyTanks,
                powerUpFreq: this.powerUpSpawnInterval
            });
        } else {
            // 使用默认递增值
            this.enemySpawnInterval = Math.max(0.5, 2.0 - (this.currentLevel - 1) * 0.2);
            this.maxEnemyTanks = Math.min(12, 3 + (this.currentLevel - 1));
            this.powerUpSpawnInterval = Math.max(6, 10 - (this.currentLevel - 1));
            console.warn(`Using default config for level ${this.currentLevel}, GameConfig may not be loaded`);
        }
        
        console.log(`Level ${this.currentLevel} started! Target: ${this.levelTargets[this.currentLevel - 1] || 'Unknown'} enemies`);
        
        // 显示关卡提示
        const targetEnemies = this.levelTargets[this.currentLevel - 1] || 100;
        this.showLevelMessage(`Level ${this.currentLevel}`, `Eliminate ${targetEnemies} enemies!`);
        
        console.log('=== LEVEL TRANSITION COMPLETE ===');
    }
    
    gameWon() {
        this.gameState = 'victory';
        this.showLevelMessage('VICTORY!', 'All levels completed!');
    }
    
    regenerateObstacles() {
        // 保留边界墙和老鹰保护结构，重新生成其他障碍物
        const eagleX = this.eagle.x;
        const eagleY = this.eagle.y;
        
        this.obstacles = [];
        
        // 边界墙 (不可摧毁)
        this.obstacles.push(
            new Obstacle(0, 0, this.width, 10, false), // 上边界
            new Obstacle(0, this.height - 10, this.width, 10, false), // 下边界
            new Obstacle(0, 0, 10, this.height, false), // 左边界
            new Obstacle(this.width - 10, 0, 10, this.height, false) // 右边界
        );
        
        // 老鹰保护结构 - 保持不变
        this.obstacles.push(
            // 左侧保护墙
            new Obstacle(eagleX - 80, eagleY - 40, 30, 80, true),
            new Obstacle(eagleX - 50, eagleY - 40, 20, 30, true), // 左上角
            new Obstacle(eagleX - 50, eagleY + 10, 20, 30, true), // 左下角
            
            // 右侧保护墙
            new Obstacle(eagleX + 50, eagleY - 40, 30, 80, true),
            new Obstacle(eagleX + 30, eagleY - 40, 20, 30, true), // 右上角
            new Obstacle(eagleX + 30, eagleY + 10, 20, 30, true), // 右下角
            
            // 上方保护墙 (留出入口)
            new Obstacle(eagleX - 50, eagleY - 60, 40, 20, true), // 左上墙
            new Obstacle(eagleX + 10, eagleY - 60, 40, 20, true), // 右上墙
            
            // 老鹰正前方的额外保护
            new Obstacle(eagleX - 30, eagleY - 40, 60, 15, true),
            
            // 侧面通道保护
            new Obstacle(eagleX - 100, eagleY - 20, 20, 40, true), // 左侧通道
            new Obstacle(eagleX + 80, eagleY - 20, 20, 40, true)   // 右侧通道
        );
        
        // 生成新的随机钢铁障碍物布局
        this.generateRandomSteelObstacles();
        
        console.log('Map regenerated with new obstacle layout');
    }
    
    generateRandomSteelObstacles() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // 随机生成对称的钢铁障碍物
        const patterns = [
            this.generatePattern1.bind(this),
            this.generatePattern2.bind(this),
            this.generatePattern3.bind(this),
            this.generatePattern4.bind(this)
        ];
        
        // 随机选择一个布局模式
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        selectedPattern(centerX, centerY);
    }
    
    generatePattern1(centerX, centerY) {
        // 十字形钢铁防线
        this.obstacles.push(
            // 水平钢铁防线
            new Obstacle(centerX - 120, centerY - 15, 80, 30, false),
            new Obstacle(centerX + 40, centerY - 15, 80, 30, false),
            
            // 垂直钢铁防线
            new Obstacle(centerX - 15, centerY - 100, 30, 70, false),
            new Obstacle(centerX - 15, centerY + 30, 30, 70, false),
            
            // 四角钢铁堡垒
            new Obstacle(150, 100, 40, 40, false),
            new Obstacle(610, 100, 40, 40, false),
            new Obstacle(150, 400, 40, 40, false),
            new Obstacle(610, 400, 40, 40, false)
        );
    }
    
    generatePattern2(centerX, centerY) {
        // 菱形钢铁防线
        this.obstacles.push(
            // 上方菱形
            new Obstacle(centerX - 60, centerY - 80, 120, 25, false),
            new Obstacle(centerX - 40, centerY - 55, 80, 25, false),
            
            // 下方菱形
            new Obstacle(centerX - 40, centerY + 30, 80, 25, false),
            new Obstacle(centerX - 60, centerY + 55, 120, 25, false),
            
            // 侧翼钢铁柱
            new Obstacle(100, 200, 30, 100, false),
            new Obstacle(670, 200, 30, 100, false),
            new Obstacle(200, 150, 30, 80, false),
            new Obstacle(570, 150, 30, 80, false)
        );
    }
    
    generatePattern3(centerX, centerY) {
        // 迷宫式钢铁布局
        this.obstacles.push(
            // 上方迷宫
            new Obstacle(200, 80, 30, 80, false),
            new Obstacle(300, 120, 80, 30, false),
            new Obstacle(420, 120, 80, 30, false),
            new Obstacle(570, 80, 30, 80, false),
            
            // 中央迷宫
            new Obstacle(centerX - 80, centerY - 40, 30, 80, false),
            new Obstacle(centerX + 50, centerY - 40, 30, 80, false),
            new Obstacle(centerX - 50, centerY - 15, 100, 30, false),
            
            // 下方迷宫
            new Obstacle(180, 380, 60, 30, false),
            new Obstacle(320, 350, 30, 60, false),
            new Obstacle(450, 350, 30, 60, false),
            new Obstacle(560, 380, 60, 30, false)
        );
    }
    
    generatePattern4(centerX, centerY) {
        // 堡垒式钢铁布局
        this.obstacles.push(
            // 上方堡垒群
            new Obstacle(centerX - 100, 120, 60, 40, false),
            new Obstacle(centerX + 40, 120, 60, 40, false),
            new Obstacle(centerX - 20, 80, 40, 40, false),
            
            // 中央要塞
            new Obstacle(centerX - 60, centerY - 30, 40, 60, false),
            new Obstacle(centerX + 20, centerY - 30, 40, 60, false),
            new Obstacle(centerX - 20, centerY - 50, 40, 40, false),
            
            // 侧翼要塞
            new Obstacle(120, 250, 50, 50, false),
            new Obstacle(630, 250, 50, 50, false),
            
            // 下方防线
            new Obstacle(250, 420, 80, 30, false),
            new Obstacle(470, 420, 80, 30, false)
        );
    }
    
    resetPlayerPositions() {
        const eagleX = this.eagle.x;
        const eagleY = this.eagle.y;
        
        // 重置玩家位置到老鹰旁边
        if (this.player1) {
            this.player1.x = eagleX - 60;
            this.player1.y = eagleY - 80;
            this.player1.health = this.player1.maxHealth; // 恢复满血
            this.player1.invulnerable = true;
            this.player1.invulnerabilityTime = 3.0; // 3秒无敌
            this.player1.blinkTimer = 0;
            // 重置所有道具效果
            this.player1.resetAllEffects();
        }
        
        if (this.player2) {
            this.player2.x = eagleX + 60;
            this.player2.y = eagleY - 80;
            this.player2.health = this.player2.maxHealth; // 恢复满血
            this.player2.invulnerable = true;
            this.player2.invulnerabilityTime = 3.0; // 3秒无敌
            this.player2.blinkTimer = 0;
            // 重置所有道具效果
            this.player2.resetAllEffects();
        }
        
        console.log('Players reset to starting positions with full health, invincibility, and clean effects');
    }
    
    showLevelMessage(title, subtitle) {
        // 安全地获取容器元素
        const container = document.getElementById('gameContainer');
        if (!container) {
            console.warn('gameContainer not found, using document.body');
            container = document.body;
        }
        
        const message = document.createElement('div');
        message.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #FFD700;
            padding: 30px;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            text-align: center;
            z-index: 1000;
            border: 3px solid #FFD700;
        `;
        
        // 安全地设置内容
        try {
            message.innerHTML = `
                <h2 style="margin: 0 0 10px 0; font-size: 24px;">${title}</h2>
                <p style="margin: 0; font-size: 16px;">${subtitle}</p>
            `;
        } catch (e) {
            console.error('Error setting message content:', e);
            message.textContent = `${title} - ${subtitle}`;
        }
        
        // 安全地添加到DOM
        try {
            container.appendChild(message);
        } catch (e) {
            console.error('Error appending message to container:', e);
            return;
        }
        
        // 安全地移除消息
        setTimeout(() => {
            try {
                if (message && message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            } catch (e) {
                console.error('Error removing message:', e);
            }
        }, 4000);
    }
    
    checkLifeRewards() {
        // 🔧 修复：基于个人分数奖励生命，使用配置文件中的标准
        const lifeRewardScore = GameConfig.game.lifeRewardScore; // 20000分奖励1条生命
        
        // 检查Player 1的分数奖励
        const player1RewardLevel = Math.floor(this.battleStats.player1Score / lifeRewardScore);
        const player1LastReward = Math.floor((this.battleStats.player1LastLifeReward || 0) / lifeRewardScore);
        
        if (player1RewardLevel > player1LastReward && this.player1Lives < this.maxLives) {
            this.player1Lives++;
            this.battleStats.player1LastLifeReward = this.battleStats.player1Score;
            console.log(`Player 1 awarded extra life for ${this.battleStats.player1Score} points! Total lives: ${this.player1Lives}`);
        }
        
        // 检查Player 2的分数奖励
        const player2RewardLevel = Math.floor(this.battleStats.player2Score / lifeRewardScore);
        const player2LastReward = Math.floor((this.battleStats.player2LastLifeReward || 0) / lifeRewardScore);
        
        if (player2RewardLevel > player2LastReward && this.player2Lives < this.maxLives) {
            this.player2Lives++;
            this.battleStats.player2LastLifeReward = this.battleStats.player2Score;
            console.log(`Player 2 awarded extra life for ${this.battleStats.player2Score} points! Total lives: ${this.player2Lives}`);
        }
    }
    
    // 🚀 更新跟踪导弹系统
    updateStrayMissiles(deltaTime) {
        if (!this.strayMissiles || !Array.isArray(this.strayMissiles)) {
            return;
        }
        
        // 更新现有导弹
        for (let i = this.strayMissiles.length - 1; i >= 0; i--) {
            const missile = this.strayMissiles[i];
            
            if (!missile || typeof missile.update !== 'function') {
                this.strayMissiles.splice(i, 1);
                continue;
            }
            
            try {
                // 更新导弹状态
                const stillAlive = missile.update(deltaTime, this.enemyTanks || []);
                
                // 检查导弹是否超出边界或生命结束
                if (!stillAlive || missile.isOutOfBounds(this.width, this.height)) {
                    this.strayMissiles.splice(i, 1);
                    continue;
                }
                
                // 检查导弹与敌人的碰撞
                this.checkMissileCollisions(missile, i);
            } catch (error) {
                console.error('Missile update error:', error);
                this.strayMissiles.splice(i, 1);
            }
        }
    }
    
    // 🚀 检查导弹碰撞 - 穿墙版本
    checkMissileCollisions(missile, missileIndex) {
        // 🎯 只检查与敌人坦克的碰撞 - 导弹可穿透障碍物和墙壁
        for (let i = this.enemyTanks.length - 1; i >= 0; i--) {
            const enemy = this.enemyTanks[i];
            if (!enemy.alive) continue;
            
            if (this.checkCollision(missile.getBounds(), enemy.getBounds())) {
                // 导弹击中敌人
                const damage = missile.damage;
                enemy.takeDamage(damage);
                
                // 播放击中音效
                if (window.audioManager) {
                    window.audioManager.playSound('missileHit');
                }
                
                // 如果敌人被摧毁
                if (!enemy.alive) {
                    // 移除敌人
                    this.enemyTanks.splice(i, 1);
                    
                    // 更新分数和统计
                    const killScore = GameConfig.game.scorePerKill || 500;
                    this.score.teamScore += killScore;
                    
                    // 更新个人分数
                    if (missile.owner === this.player1) {
                        this.battleStats.player1Kills++;
                        this.battleStats.player1Score += killScore;
                    } else if (missile.owner === this.player2) {
                        this.battleStats.player2Kills++;
                        this.battleStats.player2Score += killScore;
                    }
                    
                    // 播放敌人摧毁音效
                    if (window.audioManager) {
                        window.audioManager.playSound('enemyDestroy');
                    }
                    
                    console.log(`🚀 Missile penetrated and destroyed enemy! Score: ${this.score.teamScore}`);
                    
                    // 检查关卡完成
                    this.checkLevelComplete();
                }
                
                // 移除导弹
                this.strayMissiles.splice(missileIndex, 1);
                return;
            }
        }
        
        // 🚀 导弹穿墙功能 - 不再检查障碍物碰撞
        // 导弹可以穿透所有障碍物和墙壁，直接攻击敌人
        console.log(`🎯 Missile ${missile.id || 'unknown'} penetrating obstacles...`);
    }
    
    spawnEnemyTank() {
        if (this.enemyTanks.length >= this.maxEnemyTanks) return;
        
        let x, y;
        let attempts = 0;
        const maxAttempts = 50;
        const screenMidline = this.height / 2; // 屏幕中线
        const eagleProtectionZone = {
            x: this.eagle.x - 120,
            y: this.eagle.y - 100,
            width: 240,
            height: 140
        };
        
        do {
            // 只在屏幕上半部分生成敌人
            const side = Math.floor(Math.random() * 3); // 0=上边, 1=左上, 2=右上
            
            switch(side) {
                case 0: // 上边界
                    x = Math.random() * (this.width - 100) + 50;
                    y = 50;
                    break;
                case 1: // 左上区域
                    x = 50;
                    y = Math.random() * (screenMidline - 100) + 50;
                    break;
                case 2: // 右上区域
                    x = this.width - 50;
                    y = Math.random() * (screenMidline - 100) + 50;
                    break;
            }
            
            attempts++;
            
            // 检查是否在老鹰保护区域内
            const inEagleZone = (x >= eagleProtectionZone.x && 
                               x <= eagleProtectionZone.x + eagleProtectionZone.width &&
                               y >= eagleProtectionZone.y && 
                               y <= eagleProtectionZone.y + eagleProtectionZone.height);
            
            // 检查是否与现有障碍物重叠
            let overlapsObstacle = false;
            for (const obstacle of this.obstacles) {
                if (!obstacle.destroyed) {
                    const distance = Math.sqrt(
                        Math.pow(x - (obstacle.x + obstacle.width/2), 2) + 
                        Math.pow(y - (obstacle.y + obstacle.height/2), 2)
                    );
                    if (distance < 40) { // 40像素安全距离
                        overlapsObstacle = true;
                        break;
                    }
                }
            }
            
            // 检查是否与玩家太近
            let tooCloseToPlayers = false;
            const players = [this.player1, this.player2].filter(p => p && p.alive);
            for (const player of players) {
                const distance = Math.sqrt(
                    Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2)
                );
                if (distance < 80) { // 80像素安全距离
                    tooCloseToPlayers = true;
                    break;
                }
            }
            
            // 如果位置合适就跳出循环
            if (!inEagleZone && !overlapsObstacle && !tooCloseToPlayers && y < screenMidline) {
                break;
            }
            
        } while (attempts < maxAttempts);
        
        if (attempts < maxAttempts) {
            const color = this.enemyColors[Math.floor(Math.random() * this.enemyColors.length)];
            const enemyTank = new Tank(x, y, color, {}, false, this.currentLevel);
            this.enemyTanks.push(enemyTank);
            
            console.log(`Enemy spawned at (${Math.round(x)}, ${Math.round(y)}) - Above midline: ${y < screenMidline}, Safe from eagle: ${y < this.eagle.y - 100}`);
        } else {
            console.log('Failed to find safe spawn position for enemy after', maxAttempts, 'attempts');
        }
    }
    
    update(deltaTime) {
        // 🎮 更新游戏手柄状态
        if (window.gamepadManager) {
            window.gamepadManager.update();
            
            // 检查游戏手柄暂停控制
            const gamepad1Input = window.gamepadManager.getPlayerInput(1);
            const gamepad2Input = window.gamepadManager.getPlayerInput(2);
            
            if ((gamepad1Input && gamepad1Input.pause) || (gamepad2Input && gamepad2Input.pause)) {
                // 触发暂停
                if (typeof togglePause === 'function') {
                    togglePause();
                }
            }
            
            // 检查生命转移控制
            if (this.gameState === 'playing') {
                if (gamepad1Input && gamepad1Input.transferLife) {
                    this.transferLife(1, 2); // Player 1 给 Player 2
                }
                if (gamepad2Input && gamepad2Input.transferLife) {
                    this.transferLife(2, 1); // Player 2 给 Player 1
                }
            }
        }
        
        if (this.gameState !== 'playing') return;
        
        this.enemySpawnTimer += deltaTime;
        this.powerUpSpawnTimer += deltaTime;
        
        // 生成敌人
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemyTank();
            this.enemySpawnTimer = 0;
        }
        
        // 生成道具
        if (this.powerUpSpawnTimer >= this.powerUpSpawnInterval) {
            this.spawnPowerUp();
            this.powerUpSpawnTimer = 0;
        }
        
        // 更新老鹰护盾
        if (this.eagleShieldActive && this.eagleShieldTime > 0) {
            this.eagleShieldTime -= deltaTime;
            if (this.eagleShieldTime <= 0) {
                this.eagleShieldActive = false;
                console.log('Eagle Shield deactivated');
            }
        }
        
        const playerTanks = [this.player1, this.player2].filter(tank => tank && tank.alive);
        
        // 更新玩家
        if (this.player1) {
            this.player1.update(deltaTime, this.keys, this.mousePos, playerTanks, this);
            // 检查玩家1死亡
            if (!this.player1.alive && this.player1Lives > 0) {
                setTimeout(() => this.respawnPlayer(1), 2000); // 2秒后重生
                this.player1 = null; // 临时移除
            }
        }
        if (this.player2) {
            this.player2.update(deltaTime, this.keys, this.mousePos, playerTanks, this);
            // 检查玩家2死亡
            if (!this.player2.alive && this.player2Lives > 0) {
                setTimeout(() => this.respawnPlayer(2), 2000); // 2秒后重生
                this.player2 = null; // 临时移除
            }
        }
        
        // 更新敌人
        for (let i = this.enemyTanks.length - 1; i >= 0; i--) {
            const enemy = this.enemyTanks[i];
            if (!enemy.alive) {
                this.enemyTanks.splice(i, 1);
                continue;
            }
            
            enemy.update(deltaTime, {}, null, playerTanks, this);
            
            // 敌人射击
            if (enemy.lastShot >= enemy.shootCooldown) {
                const bullets = enemy.shoot();
                if (bullets) {
                    if (Array.isArray(bullets)) {
                        this.bullets.push(...bullets);
                    } else {
                        this.bullets.push(bullets);
                    }
                }
            }
        }
        
        // 🚀 B类辅助武器 - 跟踪导弹发射
        // Player 1 导弹发射 (鼠标右键 + 手柄B键)
        if (this.player1 && this.player1.alive) {
            let player1ShouldLaunchMissiles = false;
            
            // 🖱️ 鼠标右键检测 (Player 1)
            if (this.keys['MouseRight']) {
                player1ShouldLaunchMissiles = true;
                console.log('🖱️ Player 1 right mouse click detected for missile launch');
            }
            
            // ⌨️ 键盘检测 (Player 1 - 可选择Q键作为备用)
            if (this.keys['KeyQ']) {
                player1ShouldLaunchMissiles = true;
                console.log('⌨️ Player 1 Q key detected for missile launch');
            }
            
            // 🎮 手柄B键直接检测
            if (window.gamepadManager) {
                const gamepad = navigator.getGamepads()[0];
                if (gamepad && gamepad.buttons[1] && gamepad.buttons[1].pressed) {
                    player1ShouldLaunchMissiles = true;
                    console.log('🚀 Player 1 B键直接触发导弹');
                }
            }
            
            if (player1ShouldLaunchMissiles) {
                try {
                    const missiles = this.player1.launchStrayMissiles(this.enemyTanks);
                    if (missiles && missiles.length > 0) {
                        this.strayMissiles.push(...missiles);
                        console.log(`🚀 Player 1 launched ${missiles.length} missiles! Total active: ${this.strayMissiles.length}`);
                        
                        // 🔧 重置按键状态，避免连续发射
                        this.keys['MouseRight'] = false;
                        this.keys['KeyQ'] = false;
                    }
                } catch (error) {
                    console.error('Player 1 missile launch error:', error);
                }
            }
        }
        
        // Player 2 导弹发射 (E键 + 手柄B键)
        if (this.player2 && this.player2.alive) {
            let player2ShouldLaunchMissiles = false;
            
            // ⌨️ 键盘检测 (Player 2 - E键)
            if (this.keys['KeyE']) {
                player2ShouldLaunchMissiles = true;
                console.log('⌨️ Player 2 E key detected for missile launch');
            }
            
            // 🔢 小键盘检测 (Player 2 - 小键盘加号)
            if (this.keys['NumpadAdd']) {
                player2ShouldLaunchMissiles = true;
                console.log('🔢 Player 2 Numpad+ detected for missile launch');
            }
            
            // 🎮 手柄B键直接检测
            if (window.gamepadManager) {
                const gamepad = navigator.getGamepads()[1];
                if (gamepad && gamepad.buttons[1] && gamepad.buttons[1].pressed) {
                    player2ShouldLaunchMissiles = true;
                    console.log('🚀 Player 2 B键直接触发导弹');
                }
            }
            
            if (player2ShouldLaunchMissiles) {
                try {
                    const missiles = this.player2.launchStrayMissiles(this.enemyTanks);
                    if (missiles && missiles.length > 0) {
                        this.strayMissiles.push(...missiles);
                        console.log(`🚀 Player 2 launched ${missiles.length} missiles! Total active: ${this.strayMissiles.length}`);
                        
                        // 🔧 重置按键状态，避免连续发射
                        this.keys['KeyE'] = false;
                        this.keys['NumpadAdd'] = false;
                    }
                } catch (error) {
                    console.error('Player 2 missile launch error:', error);
                }
            }
        }
        
        // 🎮 玩家射击 - 支持键盘和游戏手柄
        // Player 1 射击
        let player1ShouldShoot = false;
        if (this.player1) {
            // 键盘射击
            player1ShouldShoot = this.keys[this.player1.controls.shoot];
            
            // 🎮 游戏手柄射击 (优先级更高)
            if (window.gamepadManager) {
                const gamepadInput = window.gamepadManager.getPlayerInput(1);
                if (gamepadInput && gamepadInput.shoot) {
                    player1ShouldShoot = true;
                }
            }
            
            if (player1ShouldShoot && this.player1.lastShot >= this.player1.shootCooldown) {
                const bullets = this.player1.shoot();
                if (bullets) {
                    if (Array.isArray(bullets)) {
                        this.bullets.push(...bullets);
                    } else {
                        this.bullets.push(bullets);
                    }
                    
                    // 🎮 移除射击震动反馈 - 只保留受攻击时的震动
                    // 射击时不再产生震动效果
                }
            }
        }
        
        // Player 2 射击
        let player2ShouldShoot = false;
        if (this.player2) {
            // 🎮 检查控制设置
            const keyboardEnabled = !window.gameSettings || window.gameSettings.keyboardEnabled !== false;
            const numpadEnabled = !window.gameSettings || window.gameSettings.numpadEnabled !== false;
            
            // 键盘射击 - 支持空格键和小键盘
            if (keyboardEnabled) {
                player2ShouldShoot = this.keys[this.player2.controls.shoot];
                
                // 小键盘射击支持
                if (numpadEnabled) {
                    player2ShouldShoot = player2ShouldShoot || 
                                       this.keys['Numpad0'] ||      // 🔢 小键盘0 = 射击
                                       this.keys['Numpad5'] ||      // 🔢 小键盘5 = 射击 (中心键)
                                       this.keys['NumpadEnter'];    // 🔢 小键盘回车 = 射击
                }
            }
            
            // 🎮 游戏手柄射击 (优先级更高)
            if (window.gamepadManager) {
                const gamepadInput = window.gamepadManager.getPlayerInput(2);
                if (gamepadInput && gamepadInput.shoot) {
                    player2ShouldShoot = true;
                }
            }
            
            if (player2ShouldShoot && this.player2.lastShot >= this.player2.shootCooldown) {
                const bullets = this.player2.shoot();
                if (bullets) {
                    if (Array.isArray(bullets)) {
                        this.bullets.push(...bullets);
                    } else {
                        this.bullets.push(bullets);
                    }
                    
                    // 🎮 移除射击震动反馈 - 只保留受攻击时的震动
                    // 射击时不再产生震动效果
                }
            }
        }
        
        // 清理标记为删除的子弹
        this.bullets = this.bullets.filter(bullet => bullet && !bullet.markedForDeletion);
        
        // 更新子弹
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // 安全检查：确保子弹对象存在且有效
            if (!bullet || typeof bullet.update !== 'function') {
                console.warn(`Invalid bullet at index ${i}, removing...`);
                this.bullets.splice(i, 1);
                continue;
            }
            
            bullet.update(deltaTime);
            
            if (bullet.isOutOfBounds(this.width, this.height)) {
                this.bullets.splice(i, 1);
                continue;
            }
            
            this.checkBulletCollisions(bullet, i);
        }
        
        // 更新道具
        this.powerUps.forEach(powerUp => powerUp.update(deltaTime));
        
        // 检查道具收集
        this.checkPowerUpCollection();
        
        // 🚀 更新跟踪导弹
        this.updateStrayMissiles(deltaTime);
        
        // 检查生命奖励
        this.checkLifeRewards();
        
        // 检查游戏结束条件
        this.checkGameOver();
        
        // 保持坦克在边界内
        this.keepTanksInBounds();
    }
    
    checkBulletCollisions(bullet, bulletIndex) {
        // 如果子弹已经被标记为删除，跳过处理
        if (bullet.markedForDeletion) {
            return;
        }
        
        // 检查与障碍物的碰撞
        for (const obstacle of this.obstacles) {
            if (obstacle.destroyed) continue;
            
            if (this.checkCollision(bullet.getBounds(), obstacle.getBounds())) {
                // 闪电弹可以反弹
                if (bullet.thunderBullet && bullet.bounceCount < bullet.maxBounces) {
                    this.handleThunderBounce(bullet, obstacle);
                    return; // 反弹后继续存在
                }
                
                // 标记子弹为删除，而不是立即删除
                bullet.markedForDeletion = true;
                
                // 如果是可破坏障碍物，造成伤害
                if (obstacle.destructible) {
                    obstacle.takeDamage();
                }
                
                // 爆破弹在障碍物上爆炸
                if (bullet.explosive && !bullet.hasExploded) {
                    this.createExplosion(bullet.x, bullet.y, bullet.owner, bullet.explosionRadius);
                    bullet.hasExploded = true;
                }
                
                return;
            }
        }
        
        // 检查与老鹰的碰撞
        if (!this.eagle.destroyed && this.checkCollision(bullet.getBounds(), this.eagle.getBounds())) {
            // 老鹰护盾激活时，子弹无法伤害老鹰
            if (this.eagleShieldActive) {
                // 闪电弹可以反弹
                if (bullet.thunderBullet && bullet.bounceCount < bullet.maxBounces) {
                    this.handleThunderBounceFromEagle(bullet);
                    return; // 反弹后继续存在
                }
                
                // 标记删除而不是立即删除
                bullet.markedForDeletion = true;
                console.log('Bullet blocked by Eagle Shield!');
                return;
            }
            
            // 标记删除
            bullet.markedForDeletion = true;
            
            // 只有敌人的子弹能伤害老鹰
            if (bullet.owner && !bullet.owner.isPlayer) {
                const eagleDestroyed = this.eagle.takeDamage();
                console.log('Eagle hit! Health:', this.eagle.health);
                
                if (eagleDestroyed) {
                    console.log('Eagle destroyed! Game Over!');
                    this.gameState = 'gameOver';
                    this.showGameOver('Eagle Destroyed! Mission Failed!');
                }
            }
            return;
        }
        
        // 检查与坦克的碰撞
        const allTanks = [
            ...([this.player1, this.player2].filter(tank => tank && tank.alive)),
            ...this.enemyTanks.filter(tank => tank.alive)
        ];
        
        for (const tank of allTanks) {
            if (tank === bullet.owner) continue;
            
            // 队友免疫：玩家子弹不能伤害其他玩家
            if (GameConfig.bullet.friendlyFire === false && 
                bullet.owner && bullet.owner.isPlayer && tank.isPlayer) {
                continue; // 跳过队友伤害检测
            }
            
            if (this.checkCollision(bullet.getBounds(), tank.getBounds())) {
                const damageTaken = tank.takeDamage();
                // 标记删除而不是立即删除
                bullet.markedForDeletion = true;
                
                if (damageTaken && !tank.alive) {
                    if (!tank.isPlayer && (bullet.owner === this.player1 || bullet.owner === this.player2)) {
                        this.enemiesKilled++;
                        const killScore = GameConfig.game.scorePerKill;
                        this.score.teamScore += killScore;
                        this.score.enemiesKilled++;
                        
                        // 🔧 更新战斗统计和个人分数
                        if (bullet.owner === this.player1) {
                            this.battleStats.player1Kills++;
                            this.battleStats.player1Score += killScore; // 添加个人分数
                        } else if (bullet.owner === this.player2) {
                            this.battleStats.player2Kills++;
                            this.battleStats.player2Score += killScore; // 添加个人分数
                        }
                        
                        console.log('Enemy destroyed! Score:', this.score.teamScore);
                        
                        // 播放敌人被摧毁音效
                        if (window.audioManager) {
                            window.audioManager.playSound('enemyDestroy');
                        }
                        
                        // 检查关卡完成
                        this.checkLevelComplete();
                        
                        // 连球弹效果 - 击杀敌人后产生连锁子弹
                        if (bullet.chainBullet && !bullet.hasChained) {
                            this.createChainBullets(tank.x, tank.y, bullet.owner);
                            bullet.hasChained = true;
                        }
                        
                        // 闪电弹效果 - 击中敌人后产生连锁闪电
                        if (bullet.thunderBullet && !bullet.hasThundered) {
                            this.createThunderChain(tank.x, tank.y, bullet.owner, tank);
                            bullet.hasThundered = true;
                        }
                        
                        // 爆破弹效果 - 击中目标后产生范围爆炸
                        if (bullet.explosive && !bullet.hasExploded) {
                            this.createExplosion(tank.x, tank.y, bullet.owner, bullet.explosionRadius);
                            bullet.hasExploded = true;
                        }
                    }
                }
                return;
            }
        }
    }
    
    createChainBullets(x, y, owner) {
        // 连球弹效果：从击杀点向四个方向发射子弹
        const directions = [0, Math.PI/2, Math.PI, 3*Math.PI/2]; // 上下左右四个方向
        
        for (const angle of directions) {
            const chainBullet = new Bullet(x, y, angle, 250, owner);
            chainBullet.chainBullet = true;
            chainBullet.hasChained = true; // 防止无限连锁
            this.bullets.push(chainBullet);
        }
        
        console.log('Chain bullets created at', x, y);
    }
    
    createThunderChain(x, y, owner, hitTank) {
        // 播放闪电音效
        if (window.audioManager) {
            window.audioManager.playSound('thunder');
        }
        
        // 闪电弹效果：对范围内的所有敌人造成连锁闪电伤害
        const thunderRange = 120; // 闪电连锁范围
        const allTanks = [
            ...([this.player1, this.player2].filter(tank => tank && tank.alive)),
            ...this.enemyTanks.filter(tank => tank.alive)
        ];
        
        const affectedTanks = [];
        
        // 找到范围内的所有坦克（除了发射者）
        for (const tank of allTanks) {
            if (tank === owner || tank === hitTank) continue;
            
            const distance = Math.sqrt(
                Math.pow(tank.x - x, 2) + Math.pow(tank.y - y, 2)
            );
            
            if (distance <= thunderRange) {
                affectedTanks.push({tank, distance});
            }
        }
        
        // 按距离排序，最近的先受到伤害
        affectedTanks.sort((a, b) => a.distance - b.distance);
        
        // 对范围内的坦克造成闪电伤害
        let chainCount = 0;
        const maxChains = 3; // 最多连锁3个目标
        
        for (const {tank} of affectedTanks) {
            if (chainCount >= maxChains) break;
            
            // 造成闪电伤害
            const damaged = tank.takeDamage(35); // 闪电伤害35点
            
            if (damaged) {
                // 创建闪电视觉效果
                this.createLightningEffect(x, y, tank.x, tank.y);
                
                // 如果击杀了敌人，增加分数
                if (!tank.alive && !tank.isPlayer) {
                    this.enemiesKilled++;
                    const thunderScore = GameConfig.game.scorePerThunderKill;
                    this.score.teamScore += thunderScore;
                    this.score.enemiesKilled++;
                    
                    // 🔧 添加个人分数追踪
                    if (owner === this.player1) {
                        this.battleStats.player1Score += thunderScore;
                    } else if (owner === this.player2) {
                        this.battleStats.player2Score += thunderScore;
                    }
                }
                
                chainCount++;
                console.log(`Thunder chain hit tank at (${Math.round(tank.x)}, ${Math.round(tank.y)})`);
            }
        }
        
        console.log(`Thunder chain created at (${x}, ${y}), affected ${chainCount} targets`);
    }
    
    createExplosion(x, y, owner, radius) {
        // 播放爆炸音效
        if (window.audioManager) {
            window.audioManager.playSound('explosion');
        }
        
        // 🎮 爆炸震动反馈将通过各个玩家的takeDamage方法处理
        // 这样可以根据受到的伤害程度给予不同强度的震动
        
        // 增强的爆破效果：对范围内的所有敌人造成大量伤害
        const allTanks = [
            ...([this.player1, this.player2].filter(tank => tank && tank.alive)),
            ...this.enemyTanks.filter(tank => tank.alive)
        ];
        
        const affectedTanks = [];
        
        // 找到爆炸范围内的所有坦克（除了发射者）
        for (const tank of allTanks) {
            if (tank === owner) continue;
            
            const distance = Math.sqrt(
                Math.pow(tank.x - x, 2) + Math.pow(tank.y - y, 2)
            );
            
            if (distance <= radius) {
                affectedTanks.push({tank, distance});
            }
        }
        
        // 按距离排序，距离越近伤害越高
        affectedTanks.sort((a, b) => a.distance - b.distance);
        
        let enemiesKilled = 0;
        const maxKills = 3; // 最多一次性消灭3个敌人
        
        for (const {tank, distance} of affectedTanks) {
            // 根据距离计算伤害 (距离越近伤害越高)
            const damageRatio = 1 - (distance / radius);
            const baseDamage = 80; // 基础爆炸伤害
            const damage = Math.floor(baseDamage * (0.5 + damageRatio * 0.5)); // 50%-100%伤害
            
            const damaged = tank.takeDamage(damage);
            
            if (damaged) {
                console.log(`Explosion hit tank at distance ${Math.round(distance)}, damage: ${damage}`);
                
                // 如果击杀了敌人，增加分数
                if (!tank.alive && !tank.isPlayer && enemiesKilled < maxKills) {
                    this.enemiesKilled++;
                    const explosionScore = GameConfig.game.scorePerExplosionKill;
                    this.score.teamScore += explosionScore;
                    this.score.enemiesKilled++;
                    enemiesKilled++;
                    
                    // 🔧 添加个人分数追踪
                    if (owner === this.player1) {
                        this.battleStats.player1Score += explosionScore;
                    } else if (owner === this.player2) {
                        this.battleStats.player2Score += explosionScore;
                    }
                    
                    // 检查关卡完成
                    this.checkLevelComplete();
                }
            }
        }
        
        // 创建爆炸视觉效果
        this.createExplosionEffect(x, y, radius);
        
        console.log(`Explosion at (${x}, ${y}) affected ${affectedTanks.length} targets, killed ${enemiesKilled} enemies`);
    }
    
    createExplosionEffect(x, y, radius) {
        // 创建爆炸视觉效果（这里可以添加粒子效果或临时绘制）
        console.log(`Explosion effect at (${Math.round(x)}, ${Math.round(y)}) with radius ${radius}`);
        
        // TODO: 可以在这里添加爆炸动画或粒子效果
        // 暂时通过控制台输出，实际游戏中可以添加爆炸动画
    }
    
    createLightningEffect(fromX, fromY, toX, toY) {
        // 创建闪电视觉效果（这里可以添加粒子效果或临时绘制）
        // 暂时通过控制台输出，实际游戏中可以添加闪电动画
        console.log(`Lightning from (${Math.round(fromX)}, ${Math.round(fromY)}) to (${Math.round(toX)}, ${Math.round(toY)})`);
    }
    
    handleThunderBounce(bullet, obstacle) {
        bullet.bounceCount++;
        
        // 播放反弹音效
        if (window.audioManager) {
            window.audioManager.playSound('bounce');
        }
        
        // 计算反弹方向
        const obstacleCenter = {
            x: obstacle.x + obstacle.width / 2,
            y: obstacle.y + obstacle.height / 2
        };
        
        // 计算子弹相对于障碍物的位置
        const dx = bullet.x - obstacleCenter.x;
        const dy = bullet.y - obstacleCenter.y;
        
        // 判断撞击面并反弹
        if (Math.abs(dx) > Math.abs(dy)) {
            // 左右面撞击，反转x方向
            bullet.vx = -bullet.vx;
        } else {
            // 上下面撞击，反转y方向
            bullet.vy = -bullet.vy;
        }
        
        // 稍微移动子弹避免卡在障碍物内
        bullet.x += bullet.vx * 0.1;
        bullet.y += bullet.vy * 0.1;
        
        console.log(`Thunder bullet bounced ${bullet.bounceCount}/${bullet.maxBounces} times`);
    }
    
    handleThunderBounceFromEagle(bullet) {
        bullet.bounceCount++;
        
        // 从老鹰护盾反弹，随机方向
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
        
        bullet.vx = Math.cos(angle) * speed;
        bullet.vy = Math.sin(angle) * speed;
        
        // 移动子弹远离老鹰
        bullet.x += bullet.vx * 0.2;
        bullet.y += bullet.vy * 0.2;
        
        console.log(`Thunder bullet bounced from Eagle Shield ${bullet.bounceCount}/${bullet.maxBounces} times`);
    }
    
    checkGameOver() {
        // 检查老鹰是否被摧毁
        if (this.eagle.destroyed) {
            this.gameState = 'gameOver';
            
            // 播放游戏结束音效并停止音乐
            if (window.audioManager) {
                window.audioManager.stopMusic();
                window.audioManager.playSound('gameOver');
            }
            
            this.showGameOver('Eagle Destroyed! Mission Failed!');
            return;
        }
        
        // 检查是否所有玩家都没有生命了
        const hasLivingPlayers = (this.player1 && this.player1.alive) || 
                                (this.player2 && this.player2.alive) ||
                                this.player1Lives > 0 || this.player2Lives > 0;
        
        if (!hasLivingPlayers) {
            this.gameState = 'gameOver';
            
            // 播放游戏结束音效并停止音乐
            if (window.audioManager) {
                window.audioManager.stopMusic();
                window.audioManager.playSound('gameOver');
            }
            
            this.showGameOver('All Players Defeated! Game Over!');
        }
    }
    
    showGameOver(message) {
        // 创建游戏结束界面
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'gameOverScreen';
        gameOverDiv.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            text-align: center;
            font-family: 'Courier New', monospace;
        `;
        
        gameOverDiv.innerHTML = `
            <h1 style="color: #FF0000; margin-bottom: 20px;">${message}</h1>
            <p>Final Score: ${this.score.teamScore}</p>
            <p>Enemies Defeated: ${this.score.enemiesKilled}</p>
            <p>Level Reached: ${this.currentLevel}</p>
            <button onclick="location.reload()" style="
                margin-top: 20px;
                padding: 10px 20px;
                font-size: 16px;
                font-family: 'Courier New', monospace;
                background: #4CAF50;
                color: white;
                border: none;
                cursor: pointer;
                border-radius: 5px;
            ">Play Again</button>
        `;
        
        document.getElementById('gameContainer').appendChild(gameOverDiv);
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    keepTanksInBounds() {
        const allTanks = [
            ...([this.player1, this.player2].filter(tank => tank && tank.alive)),
            ...this.enemyTanks.filter(tank => tank.alive)
        ];
        
        for (const tank of allTanks) {
            if (tank.x < 20) tank.x = 20;
            if (tank.x > this.width - 20) tank.x = this.width - 20;
            if (tank.y < 20) tank.y = 20;
            if (tank.y > this.height - 20) tank.y = this.height - 20;
        }
    }
    
    render() {
        // 清空画布
        this.ctx.fillStyle = '#4a5d23';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 绘制屏幕中线（调试用）
        if (this.gameState === 'playing') {
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.height / 2);
            this.ctx.lineTo(this.width, this.height / 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // 绘制老鹰保护区域（调试用）
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(
                this.eagle.x - 120,
                this.eagle.y - 100,
                240,
                140
            );
        }
        
        // 绘制障碍物
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
        
        // 绘制老鹰
        this.eagle.draw(this.ctx);
        
        // 绘制道具
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
        
        // 绘制玩家
        if (this.player1) this.player1.draw(this.ctx);
        if (this.player2) this.player2.draw(this.ctx);
        
        // 绘制敌人
        this.enemyTanks.forEach(enemy => enemy.draw(this.ctx));
        
        // 绘制子弹
        this.bullets.forEach(bullet => {
            if (bullet && typeof bullet.draw === 'function') {
                bullet.draw(this.ctx);
            }
        });
        
        // 🚀 绘制跟踪导弹
        if (this.strayMissiles && Array.isArray(this.strayMissiles)) {
            this.strayMissiles.forEach(missile => {
                if (missile && typeof missile.render === 'function') {
                    try {
                        missile.render(this.ctx);
                    } catch (error) {
                        console.error('Missile render error:', error);
                    }
                }
            });
        }
        
        // 绘制UI
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Courier New';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Level: ${this.currentLevel}/${this.maxLevel}`, this.width - 10, 25);
        
        const currentTarget = this.levelTargets[this.currentLevel - 1] || 250;
        this.ctx.fillText(`Progress: ${this.enemiesKilled}/${currentTarget}`, this.width - 10, 45);
        this.ctx.fillText(`Score: ${this.score.teamScore}`, this.width - 10, 65);
        this.ctx.fillText(`Active Enemies: ${this.enemyTanks.length}`, this.width - 10, 85);
        this.ctx.fillText(`Power-ups: ${this.powerUps.length}`, this.width - 10, 105);
        
        // 绘制生命数和互借提示
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`P1 Lives: ${this.player1Lives} (Press 1 to give)`, 10, this.height - 80);
        this.ctx.fillText(`P2 Lives: ${this.player2Lives} (Press 2 to give)`, 10, this.height - 60);
        
        // 🚀 显示导弹数量和控制说明
        if (this.player1 && this.player1.hasOwnProperty('strayMissiles')) {
            this.ctx.fillStyle = '#FF6600';
            this.ctx.fillText(`P1 Missiles: ${this.player1.strayMissiles}/${this.player1.maxStrayMissiles} (Right Click/Q/RT)`, 10, this.height - 160);
        }
        if (this.player2 && this.player2.hasOwnProperty('strayMissiles')) {
            this.ctx.fillStyle = '#FF6600';
            this.ctx.fillText(`P2 Missiles: ${this.player2.strayMissiles}/${this.player2.maxStrayMissiles} (E/Numpad+/RT)`, 10, this.height - 140);
        }
        
        // 显示当前激活的子弹特效
        this.ctx.fillStyle = 'white';
        if (this.player1) {
            let p1Effects = [];
            if (this.player1.primaryBulletEffect) p1Effects.push(this.player1.primaryBulletEffect.toUpperCase());
            if (this.player1.shotgunEffect) p1Effects.push(this.player1.shotgunEffect.toUpperCase());
            if (p1Effects.length > 0) {
                this.ctx.fillStyle = '#0066FF';
                this.ctx.fillText(`P1: ${p1Effects.join(' + ')}`, 10, this.height - 40);
            }
        }
        if (this.player2) {
            let p2Effects = [];
            if (this.player2.primaryBulletEffect) p2Effects.push(this.player2.primaryBulletEffect.toUpperCase());
            if (this.player2.shotgunEffect) p2Effects.push(this.player2.shotgunEffect.toUpperCase());
            if (p2Effects.length > 0) {
                this.ctx.fillStyle = '#00AA00';
                this.ctx.fillText(`P2: ${p2Effects.join(' + ')}`, 10, this.height - 20);
            }
        }
        
        // 老鹰状态
        this.ctx.fillStyle = 'white';
        if (!this.eagle.destroyed) {
            this.ctx.fillText(`Eagle Health: ${this.eagle.health}/${this.eagle.maxHealth}`, 10, this.height - 100);
            
            // 显示护盾状态
            if (this.eagleShieldActive) {
                this.ctx.fillStyle = '#4169E1';
                this.ctx.fillText(`Eagle Shield: ${Math.ceil(this.eagleShieldTime)}s`, 10, this.height - 120);
            }
        } else {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillText('EAGLE DESTROYED!', 10, this.height - 100);
        }
        
        // 敌人生成区域提示
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '12px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Enemy Spawn Zone (Above Yellow Line)', this.width / 2, 30);
        
        // 游戏状态
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        if (deltaTime < 0.1) { // 防止大的时间跳跃
            this.update(deltaTime);
        }
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// 初始化游戏
let game;
window.addEventListener('load', () => {
    console.log('Page loaded, initializing game...');
    game = new Game();
    console.log('Game initialized:', game);
});

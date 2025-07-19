// 音频管理系统
class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.masterVolume = 0.7;
        this.soundVolume = 0.8;
        this.musicVolume = 0.4;
        
        // 初始化音频上下文
        this.audioContext = null;
        this.initAudioContext();
        
        // 创建音效
        this.createSounds();
        
        // 当前播放的背景音乐
        this.currentMusic = null;
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    // 创建程序化音效
    createSounds() {
        // 射击音效
        this.sounds.shoot = this.createShootSound();
        this.sounds.playerShoot = this.createPlayerShootSound();
        
        // 爆炸音效
        this.sounds.explosion = this.createExplosionSound();
        this.sounds.enemyDestroy = this.createEnemyDestroySound();
        
        // 道具音效
        this.sounds.powerUp = this.createPowerUpSound();
        this.sounds.healthPickup = this.createHealthPickupSound();
        this.sounds.weaponPickup = this.createWeaponPickupSound();
        
        // 特殊效果音效
        this.sounds.thunder = this.createThunderSound();
        this.sounds.shield = this.createShieldSound();
        this.sounds.bounce = this.createBounceSound();
        
        // 🚀 导弹音效
        this.sounds.missileLaunch = this.createMissileLaunchSound();
        this.sounds.missileHit = this.createMissileHitSound();
        
        // 系统音效
        this.sounds.levelComplete = this.createLevelCompleteSound();
        this.sounds.gameOver = this.createGameOverSound();
        this.sounds.lifeTransfer = this.createLifeTransferSound();
        
        // 背景音乐
        this.music.background = this.createBackgroundMusic();
        this.music.battle = this.createBattleMusic();
    }
    
    // 创建射击音效
    createShootSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }
    
    // 创建玩家射击音效（更清脆）
    createPlayerShootSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.08);
            
            gainNode.gain.setValueAtTime(0.4 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.08);
        };
    }
    
    // 创建爆炸音效
    createExplosionSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.6 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }
    
    // 创建敌人被摧毁音效
    createEnemyDestroySound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            // 多层音效组合
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(300 + i * 200, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);
                    
                    gainNode.gain.setValueAtTime(0.3 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.2);
                }, i * 50);
            }
        };
    }
    
    // 创建道具拾取音效
    createPowerUpSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(0.4 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }
    
    // 创建生命拾取音效
    createHealthPickupSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4
            oscillator.frequency.setValueAtTime(554, this.audioContext.currentTime + 0.1); // C#5
            oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.2); // E5
            oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.3); // A5
            
            gainNode.gain.setValueAtTime(0.5 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.4);
        };
    }
    
    // 创建武器拾取音效
    createWeaponPickupSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };
    }
    
    // 创建闪电音效
    createThunderSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(2000, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.15);
            
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.4 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        };
    }
    
    // 创建护盾音效
    createShieldSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }
    
    // 创建反弹音效
    createBounceSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.2 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }
    
    // 🚀 创建导弹发射音效
    createMissileLaunchSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            // 创建复合音效 - 发射声
            const oscillator1 = this.audioContext.createOscillator();
            const oscillator2 = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 低频轰鸣声
            oscillator1.type = 'sawtooth';
            oscillator1.frequency.setValueAtTime(120, this.audioContext.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.3);
            
            // 高频尖锐声
            oscillator2.type = 'square';
            oscillator2.frequency.setValueAtTime(1200, this.audioContext.currentTime);
            oscillator2.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.4 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator1.start(this.audioContext.currentTime);
            oscillator1.stop(this.audioContext.currentTime + 0.3);
            oscillator2.start(this.audioContext.currentTime);
            oscillator2.stop(this.audioContext.currentTime + 0.2);
        };
    }
    
    // 🚀 创建导弹击中音效
    createMissileHitSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            // 创建爆炸式击中音效
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.15);
            
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(2000, this.audioContext.currentTime);
            filterNode.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.15);
            
            gainNode.gain.setValueAtTime(0.5 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        };
    }
    
    // 创建关卡完成音效
    createLevelCompleteSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    
                    gainNode.gain.setValueAtTime(0.4 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.3);
                }, index * 150);
            });
        };
    }
    
    // 创建游戏结束音效
    createGameOverSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const notes = [523, 494, 440, 392]; // C5, B4, A4, G4 (下降音阶)
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    
                    gainNode.gain.setValueAtTime(0.4 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.5);
                }, index * 200);
            });
        };
    }
    
    // 创建生命转移音效
    createLifeTransferSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3 * this.soundVolume * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }
    
    // 创建背景音乐
    createBackgroundMusic() {
        return () => {
            if (!this.audioContext || !this.musicEnabled) return;
            
            this.stopMusic();
            
            // 创建简单的循环背景音乐
            const playMelody = () => {
                const melody = [
                    {freq: 440, duration: 0.5}, // A4
                    {freq: 523, duration: 0.5}, // C5
                    {freq: 659, duration: 0.5}, // E5
                    {freq: 523, duration: 0.5}, // C5
                    {freq: 440, duration: 0.5}, // A4
                    {freq: 392, duration: 0.5}, // G4
                    {freq: 440, duration: 1.0}, // A4
                    {freq: 0, duration: 0.5}    // 休止符
                ];
                
                let currentTime = this.audioContext.currentTime;
                
                melody.forEach(note => {
                    if (note.freq > 0) {
                        const oscillator = this.audioContext.createOscillator();
                        const gainNode = this.audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(this.audioContext.destination);
                        
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(note.freq, currentTime);
                        
                        gainNode.gain.setValueAtTime(0.1 * this.musicVolume * this.masterVolume, currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + note.duration);
                        
                        oscillator.start(currentTime);
                        oscillator.stop(currentTime + note.duration);
                    }
                    currentTime += note.duration;
                });
                
                // 循环播放
                this.musicTimeout = setTimeout(playMelody, melody.reduce((sum, note) => sum + note.duration, 0) * 1000);
            };
            
            playMelody();
        };
    }
    
    // 创建战斗音乐
    createBattleMusic() {
        return () => {
            if (!this.audioContext || !this.musicEnabled) return;
            
            this.stopMusic();
            
            // 更激烈的战斗音乐
            const playBattleTheme = () => {
                const theme = [
                    {freq: 330, duration: 0.25}, // E4
                    {freq: 392, duration: 0.25}, // G4
                    {freq: 440, duration: 0.25}, // A4
                    {freq: 523, duration: 0.25}, // C5
                    {freq: 440, duration: 0.25}, // A4
                    {freq: 392, duration: 0.25}, // G4
                    {freq: 330, duration: 0.5},  // E4
                    {freq: 0, duration: 0.25}    // 休止符
                ];
                
                let currentTime = this.audioContext.currentTime;
                
                theme.forEach(note => {
                    if (note.freq > 0) {
                        const oscillator = this.audioContext.createOscillator();
                        const gainNode = this.audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(this.audioContext.destination);
                        
                        oscillator.type = 'square';
                        oscillator.frequency.setValueAtTime(note.freq, currentTime);
                        
                        gainNode.gain.setValueAtTime(0.08 * this.musicVolume * this.masterVolume, currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + note.duration);
                        
                        oscillator.start(currentTime);
                        oscillator.stop(currentTime + note.duration);
                    }
                    currentTime += note.duration;
                });
                
                // 循环播放
                this.musicTimeout = setTimeout(playBattleTheme, theme.reduce((sum, note) => sum + note.duration, 0) * 1000);
            };
            
            playBattleTheme();
        };
    }
    
    // 播放音效
    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
    
    // 播放音乐
    playMusic(musicName) {
        if (this.music[musicName]) {
            this.music[musicName]();
            this.currentMusic = musicName;
        }
    }
    
    // 停止音乐
    stopMusic() {
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
            this.musicTimeout = null;
        }
        this.currentMusic = null;
    }
    
    // 设置音量
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }
    
    // 开关音效和音乐
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }
    
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopMusic();
        } else if (this.currentMusic) {
            this.playMusic(this.currentMusic);
        }
        return this.musicEnabled;
    }
    
    // 初始化音频上下文（需要用户交互）
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

// 导出音频管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
} else if (typeof window !== 'undefined') {
    window.AudioManager = AudioManager;
}

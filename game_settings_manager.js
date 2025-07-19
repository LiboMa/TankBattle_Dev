/**
 * 游戏设置管理器
 * 管理所有游戏设置，包括音频、控制和游戏选项
 */

class GameSettingsManager {
    constructor() {
        this.settings = {
            // 音频设置
            audio: {
                musicEnabled: true,
                soundEnabled: true,
                musicVolume: 70,
                soundVolume: 80
            },
            
            // 控制设置
            controls: {
                keyboardEnabled: true,
                gamepadEnabled: true,
                gamepadVibrationEnabled: true,
                numpadEnabled: true
            },
            
            // 游戏设置
            game: {
                difficulty: 'normal',
                autoSave: true
            }
        };
        
        this.defaultSettings = JSON.parse(JSON.stringify(this.settings));
        this.isInitialized = false;
        
        console.log('🎮 GameSettingsManager initialized');
    }
    
    // 初始化设置管理器
    init() {
        if (this.isInitialized) return;
        
        // 加载保存的设置
        this.loadSettings();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 应用设置到游戏
        this.applySettings();
        
        this.isInitialized = true;
        console.log('⚙️ Settings manager initialized with settings:', this.settings);
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 设置按钮
        const settingsBtn = document.getElementById('settingsButton');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        // 关闭按钮
        const closeBtn = document.getElementById('closeSettings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideSettings());
        }
        
        // 遮罩点击关闭
        const overlay = document.getElementById('settingsOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.hideSettings());
        }
        
        // 音频设置
        this.setupAudioControls();
        
        // 控制设置
        this.setupControlControls();
        
        // 游戏设置
        this.setupGameControls();
        
        // 按钮事件
        this.setupButtonControls();
    }
    
    // 设置音频控制
    setupAudioControls() {
        // 音乐开关
        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            musicToggle.addEventListener('change', (e) => {
                this.settings.audio.musicEnabled = e.target.checked;
                this.applyAudioSettings();
                console.log('Music enabled:', e.target.checked);
            });
        }
        
        // 音效开关
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.settings.audio.soundEnabled = e.target.checked;
                this.applyAudioSettings();
                console.log('Sound enabled:', e.target.checked);
            });
        }
        
        // 音乐音量
        const musicVolume = document.getElementById('musicVolume');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        if (musicVolume && musicVolumeValue) {
            musicVolume.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value);
                this.settings.audio.musicVolume = volume;
                musicVolumeValue.textContent = volume + '%';
                this.applyAudioSettings();
            });
        }
        
        // 音效音量
        const soundVolume = document.getElementById('soundVolume');
        const soundVolumeValue = document.getElementById('soundVolumeValue');
        if (soundVolume && soundVolumeValue) {
            soundVolume.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value);
                this.settings.audio.soundVolume = volume;
                soundVolumeValue.textContent = volume + '%';
                this.applyAudioSettings();
            });
        }
    }
    
    // 设置控制选项
    setupControlControls() {
        // 键盘控制开关
        const keyboardToggle = document.getElementById('keyboardControlToggle');
        if (keyboardToggle) {
            keyboardToggle.addEventListener('change', (e) => {
                this.settings.controls.keyboardEnabled = e.target.checked;
                this.applyControlSettings();
                console.log('Keyboard controls enabled:', e.target.checked);
            });
        }
        
        // 手柄控制开关
        const gamepadToggle = document.getElementById('gamepadControlToggle');
        if (gamepadToggle) {
            gamepadToggle.addEventListener('change', (e) => {
                this.settings.controls.gamepadEnabled = e.target.checked;
                this.applyControlSettings();
                console.log('Gamepad controls enabled:', e.target.checked);
            });
        }
        
        // 手柄震动开关
        const vibrationToggle = document.getElementById('gamepadVibrationToggle');
        if (vibrationToggle) {
            vibrationToggle.addEventListener('change', (e) => {
                this.settings.controls.gamepadVibrationEnabled = e.target.checked;
                this.applyControlSettings();
                console.log('Gamepad vibration enabled:', e.target.checked);
            });
        }
        
        // 小键盘支持开关
        const numpadToggle = document.getElementById('numpadToggle');
        if (numpadToggle) {
            numpadToggle.addEventListener('change', (e) => {
                this.settings.controls.numpadEnabled = e.target.checked;
                this.applyControlSettings();
                console.log('Numpad support enabled:', e.target.checked);
            });
        }
    }
    
    // 设置游戏选项
    setupGameControls() {
        // 难度选择
        const difficultySelect = document.getElementById('difficultySelect');
        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                this.settings.game.difficulty = e.target.value;
                this.applyGameSettings();
                console.log('Difficulty set to:', e.target.value);
            });
        }
        
        // 自动保存开关
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', (e) => {
                this.settings.game.autoSave = e.target.checked;
                console.log('Auto save enabled:', e.target.checked);
            });
        }
    }
    
    // 设置按钮控制
    setupButtonControls() {
        // 重置设置按钮
        const resetBtn = document.getElementById('resetSettings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToDefault();
            });
        }
        
        // 保存设置按钮
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
                this.showNotification('Settings saved successfully!', 'success');
            });
        }
    }
    
    // 显示设置面板
    showSettings() {
        const panel = document.getElementById('gameSettings');
        const overlay = document.getElementById('settingsOverlay');
        
        if (panel && overlay) {
            // 更新UI显示当前设置
            this.updateUI();
            
            overlay.style.display = 'block';
            panel.style.display = 'block';
            
            // 添加动画效果
            setTimeout(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
            
            console.log('⚙️ Settings panel opened');
        }
    }
    
    // 隐藏设置面板
    hideSettings() {
        const panel = document.getElementById('gameSettings');
        const overlay = document.getElementById('settingsOverlay');
        
        if (panel && overlay) {
            panel.style.opacity = '0';
            panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            setTimeout(() => {
                overlay.style.display = 'none';
                panel.style.display = 'none';
            }, 300);
            
            console.log('⚙️ Settings panel closed');
        }
    }
    
    // 更新UI显示
    updateUI() {
        // 音频设置
        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) musicToggle.checked = this.settings.audio.musicEnabled;
        
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) soundToggle.checked = this.settings.audio.soundEnabled;
        
        const musicVolume = document.getElementById('musicVolume');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        if (musicVolume && musicVolumeValue) {
            musicVolume.value = this.settings.audio.musicVolume;
            musicVolumeValue.textContent = this.settings.audio.musicVolume + '%';
        }
        
        const soundVolume = document.getElementById('soundVolume');
        const soundVolumeValue = document.getElementById('soundVolumeValue');
        if (soundVolume && soundVolumeValue) {
            soundVolume.value = this.settings.audio.soundVolume;
            soundVolumeValue.textContent = this.settings.audio.soundVolume + '%';
        }
        
        // 控制设置
        const keyboardToggle = document.getElementById('keyboardControlToggle');
        if (keyboardToggle) keyboardToggle.checked = this.settings.controls.keyboardEnabled;
        
        const gamepadToggle = document.getElementById('gamepadControlToggle');
        if (gamepadToggle) gamepadToggle.checked = this.settings.controls.gamepadEnabled;
        
        const vibrationToggle = document.getElementById('gamepadVibrationToggle');
        if (vibrationToggle) vibrationToggle.checked = this.settings.controls.gamepadVibrationEnabled;
        
        const numpadToggle = document.getElementById('numpadToggle');
        if (numpadToggle) numpadToggle.checked = this.settings.controls.numpadEnabled;
        
        // 游戏设置
        const difficultySelect = document.getElementById('difficultySelect');
        if (difficultySelect) difficultySelect.value = this.settings.game.difficulty;
        
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        if (autoSaveToggle) autoSaveToggle.checked = this.settings.game.autoSave;
    }
    
    // 应用所有设置
    applySettings() {
        this.applyAudioSettings();
        this.applyControlSettings();
        this.applyGameSettings();
    }
    
    // 应用音频设置
    applyAudioSettings() {
        if (window.audioManager) {
            // 音乐开关 - 使用现有的属性直接设置
            window.audioManager.musicEnabled = this.settings.audio.musicEnabled;
            if (!this.settings.audio.musicEnabled) {
                window.audioManager.stopMusic();
            } else {
                // 如果音乐被启用且当前没有播放音乐，尝试播放背景音乐
                if (!window.audioManager.currentMusic) {
                    window.audioManager.playMusic('background');
                }
            }
            
            // 音效开关 - 使用现有的属性直接设置
            window.audioManager.soundEnabled = this.settings.audio.soundEnabled;
            
            // 音量设置 - 使用现有的方法
            window.audioManager.setMusicVolume(this.settings.audio.musicVolume / 100);
            window.audioManager.setSoundVolume(this.settings.audio.soundVolume / 100);
            
            console.log('🎵 Audio settings applied:', {
                musicEnabled: this.settings.audio.musicEnabled,
                soundEnabled: this.settings.audio.soundEnabled,
                musicVolume: this.settings.audio.musicVolume,
                soundVolume: this.settings.audio.soundVolume
            });
        } else {
            console.warn('⚠️ AudioManager not available when applying audio settings');
        }
    }
    
    // 应用控制设置
    applyControlSettings() {
        // 设置全局控制标志
        window.gameSettings = window.gameSettings || {};
        window.gameSettings.keyboardEnabled = this.settings.controls.keyboardEnabled;
        window.gameSettings.gamepadEnabled = this.settings.controls.gamepadEnabled;
        window.gameSettings.gamepadVibrationEnabled = this.settings.controls.gamepadVibrationEnabled;
        window.gameSettings.numpadEnabled = this.settings.controls.numpadEnabled;
        
        // 通知游戏手柄管理器
        if (window.gamepadManager) {
            window.gamepadManager.vibrationEnabled = this.settings.controls.gamepadVibrationEnabled;
        }
        
        console.log('🎮 Control settings applied:', {
            keyboardEnabled: this.settings.controls.keyboardEnabled,
            gamepadEnabled: this.settings.controls.gamepadEnabled,
            gamepadVibrationEnabled: this.settings.controls.gamepadVibrationEnabled,
            numpadEnabled: this.settings.controls.numpadEnabled
        });
        console.log('🌐 Global gameSettings:', window.gameSettings);
    }
    
    // 应用游戏设置
    applyGameSettings() {
        // 设置全局游戏配置
        window.gameSettings = window.gameSettings || {};
        window.gameSettings.difficulty = this.settings.game.difficulty;
        window.gameSettings.autoSave = this.settings.game.autoSave;
        
        // 如果游戏正在运行，应用难度设置
        if (window.game && window.game.applyDifficulty) {
            window.game.applyDifficulty(this.settings.game.difficulty);
        }
    }
    
    // 保存设置到本地存储
    saveSettings() {
        try {
            localStorage.setItem('tankBattleSettings', JSON.stringify(this.settings));
            console.log('💾 Settings saved to localStorage');
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
        }
    }
    
    // 从本地存储加载设置
    loadSettings() {
        try {
            const saved = localStorage.getItem('tankBattleSettings');
            if (saved) {
                const loadedSettings = JSON.parse(saved);
                this.settings = { ...this.settings, ...loadedSettings };
                console.log('📂 Settings loaded from localStorage');
            }
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
        }
    }
    
    // 重置为默认设置
    resetToDefault() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
            this.updateUI();
            this.applySettings();
            this.showNotification('Settings reset to default!', 'info');
            console.log('🔄 Settings reset to default');
        }
    }
    
    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `settings-notification ${type}`;
        notification.textContent = message;
        
        // 样式
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'success' ? '#00AA00' : type === 'error' ? '#AA0000' : '#0088AA'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // 动画显示
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // 获取设置值
    getSetting(category, key) {
        return this.settings[category] && this.settings[category][key];
    }
    
    // 设置值
    setSetting(category, key, value) {
        if (!this.settings[category]) {
            this.settings[category] = {};
        }
        this.settings[category][key] = value;
        this.applySettings();
    }
    
    // 获取所有设置
    getAllSettings() {
        return JSON.parse(JSON.stringify(this.settings));
    }
    
    // 导出设置
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `tank_battle_settings_${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Settings exported successfully!', 'success');
    }
    
    // 导入设置
    importSettings(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSettings = JSON.parse(e.target.result);
                this.settings = { ...this.defaultSettings, ...importedSettings };
                this.updateUI();
                this.applySettings();
                this.showNotification('Settings imported successfully!', 'success');
            } catch (error) {
                this.showNotification('Failed to import settings!', 'error');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    }
}

// 导出全局实例
window.GameSettingsManager = GameSettingsManager;

console.log('⚙️ GameSettingsManager loaded - Ready to manage game settings!');

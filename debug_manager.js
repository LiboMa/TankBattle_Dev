/**
 * 🔧 Debug模式管理器
 * 统一管理所有调试输出，可以通过配置开启/关闭
 */

class DebugManager {
    constructor() {
        // Debug模式配置
        this.debugMode = false; // 默认关闭Debug模式
        this.debugCategories = {
            gamepad: false,     // 手柄调试
            missile: false,     // 导弹调试
            bullet: false,      // 子弹调试 (激光弹、连锁弹、雷电弹等)
            collision: false,   // 碰撞调试
            powerup: false,     // 道具调试
            audio: false,       // 音频调试
            performance: false, // 性能调试
            input: false,       // 输入调试
            ai: false,          // AI调试
            general: false      // 通用调试
        };
        
        // 从localStorage读取配置
        this.loadDebugSettings();
        
        console.log('🔧 DebugManager initialized - Debug mode:', this.debugMode);
    }
    
    // 加载Debug设置
    loadDebugSettings() {
        try {
            const saved = localStorage.getItem('tankBattle_debugSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.debugMode = settings.debugMode || false;
                this.debugCategories = { ...this.debugCategories, ...settings.categories };
            }
        } catch (error) {
            console.warn('Failed to load debug settings:', error);
        }
    }
    
    // 保存Debug设置
    saveDebugSettings() {
        try {
            const settings = {
                debugMode: this.debugMode,
                categories: this.debugCategories
            };
            localStorage.setItem('tankBattle_debugSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save debug settings:', error);
        }
    }
    
    // 设置Debug模式
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.saveDebugSettings();
        console.log('🔧 Debug mode:', enabled ? 'ENABLED' : 'DISABLED');
    }
    
    // 设置特定类别的Debug
    setDebugCategory(category, enabled) {
        if (this.debugCategories.hasOwnProperty(category)) {
            this.debugCategories[category] = enabled;
            this.saveDebugSettings();
            console.log(`🔧 Debug category '${category}':`, enabled ? 'ENABLED' : 'DISABLED');
        }
    }
    
    // Debug日志输出
    log(message, category = 'general') {
        if (this.debugMode && this.debugCategories[category]) {
            console.log(`[DEBUG:${category.toUpperCase()}] ${message}`);
        }
    }
    
    // Debug警告输出
    warn(message, category = 'general') {
        if (this.debugMode && this.debugCategories[category]) {
            console.warn(`[DEBUG:${category.toUpperCase()}] ${message}`);
        }
    }
    
    // Debug错误输出
    error(message, category = 'general') {
        if (this.debugMode && this.debugCategories[category]) {
            console.error(`[DEBUG:${category.toUpperCase()}] ${message}`);
        }
    }
    
    // 性能计时开始
    timeStart(label, category = 'performance') {
        if (this.debugMode && this.debugCategories[category]) {
            console.time(`[DEBUG:${category.toUpperCase()}] ${label}`);
        }
    }
    
    // 性能计时结束
    timeEnd(label, category = 'performance') {
        if (this.debugMode && this.debugCategories[category]) {
            console.timeEnd(`[DEBUG:${category.toUpperCase()}] ${label}`);
        }
    }
    
    // 获取Debug控制面板HTML
    getDebugPanel() {
        return `
            <div id="debugPanel" style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; z-index: 10000; display: none;">
                <h4 style="margin: 0 0 10px 0;">🔧 Debug Panel</h4>
                <label style="display: block; margin: 5px 0;">
                    <input type="checkbox" id="debugModeToggle" ${this.debugMode ? 'checked' : ''}> Debug Mode
                </label>
                <hr style="margin: 10px 0;">
                ${Object.keys(this.debugCategories).map(category => `
                    <label style="display: block; margin: 3px 0;">
                        <input type="checkbox" id="debug_${category}" ${this.debugCategories[category] ? 'checked' : ''}> ${category}
                    </label>
                `).join('')}
                <hr style="margin: 10px 0;">
                <button onclick="debugManager.exportLogs()" style="width: 100%; margin: 2px 0; padding: 4px;">Export Logs</button>
                <button onclick="debugManager.clearLogs()" style="width: 100%; margin: 2px 0; padding: 4px;">Clear Logs</button>
            </div>
        `;
    }
    
    // 初始化Debug面板
    initDebugPanel() {
        // 添加Debug面板HTML
        document.body.insertAdjacentHTML('beforeend', this.getDebugPanel());
        
        // 绑定事件
        document.getElementById('debugModeToggle').addEventListener('change', (e) => {
            this.setDebugMode(e.target.checked);
        });
        
        Object.keys(this.debugCategories).forEach(category => {
            document.getElementById(`debug_${category}`).addEventListener('change', (e) => {
                this.setDebugCategory(category, e.target.checked);
            });
        });
        
        // 添加快捷键 Ctrl+Shift+D 切换Debug面板
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                const panel = document.getElementById('debugPanel');
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    // 导出日志
    exportLogs() {
        // 这里可以实现日志导出功能
        console.log('🔧 Debug logs export requested');
    }
    
    // 清空日志
    clearLogs() {
        console.clear();
        this.log('Debug logs cleared', 'general');
    }
}

// 创建全局Debug管理器实例
window.debugManager = new DebugManager();

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebugManager;
}

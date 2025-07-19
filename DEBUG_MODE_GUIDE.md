# 🔧 Debug模式使用指南

## 🚀 快速启用

1. **打开游戏**: `tank_game_fixed.html`
2. **打开Debug面板**: 按 `Ctrl + Shift + D`
3. **启用Debug模式**: 勾选 "Debug Mode"
4. **选择调试类别**: 勾选需要的调试类别

## 📋 调试类别

### 🎮 gamepad
- 手柄连接状态
- 按键检测
- 震动反馈

### 🚀 missile  
- 导弹发射
- 目标锁定
- 轨迹跟踪

### 💥 collision
- 碰撞检测
- 边界检查

### 🎁 powerup
- 道具生成
- 效果激活
- 持续时间

### 🔊 audio
- 音效播放
- 音量控制

### ⚡ performance
- 性能监控
- 帧率统计

### 🎯 input
- 键盘输入
- 鼠标输入
- 手柄输入

### 🤖 ai
- 敌人AI
- 路径寻找

### 📝 general
- 通用游戏逻辑
- 状态变化

## 🎮 快捷键

- `Ctrl + Shift + D`: 切换Debug面板
- Debug面板中可以实时开启/关闭各个类别

## 🔍 查看日志

启用Debug模式后，相关日志会在浏览器控制台中显示，格式为：
```
[DEBUG:CATEGORY] 消息内容
```

例如：
```
[DEBUG:MISSILE] 🚀 Player 1 launched 3 stray missiles! Remaining: 7
[DEBUG:INPUT] 🚀 Player 1 B键直接触发导弹
[DEBUG:GAMEPAD] 🎮 Xbox controller support enabled
```

## 💾 设置保存

Debug设置会自动保存到localStorage，下次打开游戏时会保持之前的设置。

## 🚫 生产模式

默认情况下Debug模式是关闭的，不会影响正常游戏性能。只有在需要调试时才手动开启。

---

**提示**: Debug模式主要用于开发和问题排查，正常游戏时建议保持关闭状态。

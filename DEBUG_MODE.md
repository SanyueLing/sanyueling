# 调试模式说明
## 🔧 当前调试状态

**当前版本已启用调试模式：**
- ✅ 允许使用右键菜单
- ✅ 允许使用F12开发者工具
- ✅ 允许文本选择和复制
- ✅ 启用详细的控制台日志

## 🛠️ 调试功能

### 浏览器开发者工具
现在可以正常使用以下功能：
- **F12** - 打开开发者工具
- **Ctrl+Shift+I** - 打开开发者工具
- **Ctrl+Shift+J** - 打开控制台
- **右键 → 检查** - 检查元素

### 控制台日志
游戏运行时会在控制台输出详细的调试信息：
```
开始加载游戏...
页面加载完成，共 5 页
渲染页面: 0 [...]
页面渲染完成
```

### 文本选择和复制
现在可以选择和复制游戏中的文本内容，方便调试和测试。

## 🔄 切换调试模式

### 启用调试模式（当前状态）
在 `script.js` 中：
```javascript
// 调试模式：不禁用右键和F12
// document.addEventListener('contextmenu', (e) => {
//     e.preventDefault();
// });
```

在 `styles.css` 中：
```css
/* 调试模式：允许选择和右键 */
/* user-select: none; */
```

### 禁用调试模式（生产环境）
在 `script.js` 中：
```javascript
// 禁用右键菜单
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// 禁用F12和开发者工具快捷键
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
    }
});
```

在 `styles.css` 中：
```css
body {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}

* {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}
```

## 🐛 调试技巧

### 1. 检查网络请求
使用开发者工具的 Network 面板检查：
- 设计文件是否正确加载 (`plot/p1.txt` 等)
- 文本文件是否正确加载 (`src/txt/txt1` 等)
- 图片文件是否正确加载 (`src/pic/pic1.png`)

### 2. 查看控制台错误
使用 Console 面板查看：
- JavaScript 错误
- 资源加载失败
- 游戏逻辑错误

### 3. 检查元素样式
使用 Elements 面板检查：
- 页面元素是否正确渲染
- CSS 样式是否正确应用
- DOM 结构是否符合预期

### 4. 调试游戏逻辑
在 Console 中可以直接访问：
```javascript
// 查看游戏状态
window.gameRenderer.gameState

// 查看当前页面
window.gameRenderer.gameState.currentPage

// 查看所有页面
window.gameRenderer.gameState.pages
```

## 📝 调试检查清单

- [ ] 检查所有文件是否正确加载
- [ ] 检查控制台是否有错误信息
- [ ] 检查页面元素是否正确显示
- [ ] 测试滚动功能是否正常
- [ ] 测试谜题功能是否正常
- [ ] 测试进度保存是否正常

## 🚀 性能调试

### 内存使用
使用开发者工具的 Memory 面板检查内存使用情况。

### 性能分析
使用 Performance 面板分析游戏运行性能。

### 网络性能
使用 Network 面板分析资源加载时间。

## 📱 移动端调试

### 响应式测试
使用开发者工具的 Device Toolbar 测试不同屏幕尺寸。

### 触摸事件
检查触摸事件是否正常响应。

## 🔒 安全注意事项

调试模式仅用于开发和测试，部署到生产环境时请：
1. 禁用调试模式
2. 移除详细的控制台日志
3. 重新启用安全限制
4. 压缩和混淆代码

---

**调试模式让开发和测试更加方便！** 🛠️

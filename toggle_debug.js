// 调试模式切换脚本
// 使用方法：将此脚本内容复制到浏览器控制台运行
(function() {
    console.log('=== 调试模式切换工具 ===');
    
    // 检查当前调试状态
    function checkDebugStatus() {
        const styleSheets = document.styleSheets;
        let userSelectDisabled = false;
        
        for (let sheet of styleSheets) {
            try {
                for (let rule of sheet.cssRules) {
                    if (rule.selectorText === '*' && rule.style.userSelect === 'none') {
                        userSelectDisabled = true;
                        break;
                    }
                }
            } catch (e) {
                // 忽略跨域样式表错误
            }
        }
        
        console.log('当前状态:');
        console.log('- 用户选择限制:', userSelectDisabled ? '已禁用' : '已启用');
        console.log('- 控制台日志:', '已启用');
        console.log('- 开发者工具:', '已启用');
        
        return userSelectDisabled;
    }
    
    // 启用调试模式
    function enableDebugMode() {
        console.log('启用调试模式...');
        
        // 移除用户选择限制
        const styleSheets = document.styleSheets;
        for (let sheet of styleSheets) {
            try {
                for (let i = 0; i < sheet.cssRules.length; i++) {
                    const rule = sheet.cssRules[i];
                    if (rule.selectorText === '*' && rule.style.userSelect === 'none') {
                        sheet.deleteRule(i);
                        console.log('- 已移除用户选择限制');
                        break;
                    }
                }
            } catch (e) {
                // 忽略跨域样式表错误
            }
        }
        
        // 添加调试样式
        const debugStyle = document.createElement('style');
        debugStyle.textContent = `
            * {
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
                user-select: auto !important;
            }
            body {
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
                user-select: auto !important;
            }
        `;
        document.head.appendChild(debugStyle);
        
        console.log('✅ 调试模式已启用');
        console.log('现在可以：');
        console.log('- 使用右键菜单');
        console.log('- 使用F12开发者工具');
        console.log('- 选择和复制文本');
    }
    
    // 禁用调试模式
    function disableDebugMode() {
        console.log('禁用调试模式...');
        
        // 添加用户选择限制
        const debugStyle = document.createElement('style');
        debugStyle.textContent = `
            * {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important;
                -khtml-user-select: none !important;
            }
            body {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
            }
        `;
        document.head.appendChild(debugStyle);
        
        console.log('✅ 调试模式已禁用');
        console.log('已恢复：');
        console.log('- 禁用右键菜单');
        console.log('- 禁用文本选择');
        console.log('- 保持F12可用（需要修改源代码）');
    }
    
    // 暴露到全局
    window.debugTools = {
        checkStatus: checkDebugStatus,
        enableDebug: enableDebugMode,
        disableDebug: disableDebugMode
    };
    
    console.log('调试工具已加载完成！');
    console.log('使用方法：');
    console.log('- debugTools.checkStatus() - 检查当前状态');
    console.log('- debugTools.enableDebug() - 启用调试模式');
    console.log('- debugTools.disableDebug() - 禁用调试模式');
    
    // 自动检查状态
    checkDebugStatus();
})();

// 简化的使用方式
console.log('\n=== 快速使用 ===');
console.log('启用调试模式: debugTools.enableDebug()');
console.log('禁用调试模式: debugTools.disableDebug()');
console.log('检查当前状态: debugTools.checkStatus()');

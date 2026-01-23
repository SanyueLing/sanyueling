// 游戏状态管理
class GameState {
    constructor() {
        this.scrollPosition = 0; // 滚动位置
        this.completedPuzzles = new Set();
        this.isPuzzleMode = false;
        this.pages = [];
        this.totalHeight = 0; // 总内容高度
    }

    // 从本地存储加载游戏状态
    load() {
        const saved = localStorage.getItem('mysteryGameProgress');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.scrollPosition = data.scrollPosition || 0;
                this.completedPuzzles = new Set(data.completedPuzzles || []);
                console.log('从本地存储加载进度:', data);
            } catch (error) {
                console.error('解析本地存储数据失败:', error);
                localStorage.removeItem('mysteryGameProgress');
                this.scrollPosition = 0;
                this.completedPuzzles = new Set();
            }
        } else {
            console.log('未找到保存的进度，从顶部开始');
            this.scrollPosition = 0;
        }
    }

    // 保存游戏状态到本地存储
    save() {
        const data = {
            scrollPosition: this.scrollPosition,
            completedPuzzles: Array.from(this.completedPuzzles)
        };
        localStorage.setItem('mysteryGameProgress', JSON.stringify(data));
    }

    // 标记谜题完成
    completePuzzle(pageIndex) {
        this.completedPuzzles.add(pageIndex);
        this.save();
    }

    // 检查谜题是否完成
    isPuzzleCompleted(pageIndex) {
        return this.completedPuzzles.has(pageIndex);
    }

    // 更新滚动位置
    updateScrollPosition(position) {
        this.scrollPosition = position;
        this.save();
    }

        // 检查当前位置是否有未完成的谜题
    checkPuzzleAtPosition(scrollTop, viewportHeight) {
        const scrollContent = document.getElementById('scroll-content');
        if (!scrollContent) return false;
        
        const containerRect = scrollContent.getBoundingClientRect();
        
        // 移动端额外检查：确保容器有实际高度
        if (containerRect.height === 0) return false;
        
        let hasBlockingPuzzle = false;
        let puzzleContainer = null;
        
        // 检查当前视口范围内是否有未完成的谜题
        for (let i = 0; i < this.pages.length; i++) {
            const page = this.pages[i];
            if (page && page.hasPuzzle && !this.isPuzzleCompleted(i)) {
                const pageElement = document.getElementById(`page-${i}`);
                if (pageElement) {
                    // 主要检查：只有当谜题输入框在视口中时才阻止滚动
                    const puzzleInput = pageElement.querySelector('.puzzle-input');
                    if (puzzleInput) {
                        const inputRect = puzzleInput.getBoundingClientRect();
                        puzzleContainer = puzzleInput.closest('.puzzle-input-container');
                        
                        // 移动端优化：增加一些容错范围
                        const tolerance = 10; // 10px的容错范围
                        const adjustedContainerTop = containerRect.top - tolerance;
                        const adjustedContainerBottom = containerRect.bottom + tolerance;
                        
                        // 检查输入框是否在视口中（包括部分可见）
                        const isInputInViewport = inputRect.top < adjustedContainerBottom && inputRect.bottom > adjustedContainerTop;
                        
                        // 检查输入框是否可见（高度大于0且没有被完全隐藏）
                        const isInputVisible = inputRect.height > 0 && inputRect.width > 0 && 
                                             inputRect.top < adjustedContainerBottom && inputRect.bottom > adjustedContainerTop;
                        
                        // 额外检查：输入框是否在可视区域内（不是被其他元素遮挡）
                        const isInputDisplayed = puzzleInput.offsetParent !== null;
                        
                        if (isInputInViewport && isInputVisible && isInputDisplayed) {
                            console.log(`检测到第${i+1}页的谜题输入框在视口中，阻止向下滚动`, {
                                inputTop: inputRect.top,
                                inputBottom: inputRect.bottom,
                                containerTop: containerRect.top,
                                containerBottom: containerRect.bottom,
                                isInputInViewport,
                                isInputVisible,
                                isInputDisplayed,
                                tolerance
                            });
                            hasBlockingPuzzle = true;
                            break; // 找到一个阻断谜题就足够了
                        }
                    }
                    
                    // 备选检查：如果整个页面都在视口中且包含谜题，也阻止滚动
                    const pageRect = pageElement.getBoundingClientRect();
                    const isPageFullyInViewport = pageRect.top >= containerRect.top && pageRect.bottom <= containerRect.bottom;
                    
                    if (isPageFullyInViewport) {
                        console.log(`检测到第${i+1}页完全在视口中且有未完成的谜题，阻止向下滚动`);
                        hasBlockingPuzzle = true;
                        // 获取输入框容器
                        puzzleContainer = pageElement.querySelector('.puzzle-input-container');
                        break;
                    }
                }
            }
        }
        
        // 根据谜题状态优化输入框位置
        if (puzzleContainer) {
            if (hasBlockingPuzzle) {
                puzzleContainer.classList.add('puzzle-locked');
                
                // 确保输入框在视口中可见
                this.ensureInputVisible(puzzleContainer);
                
                console.log('输入框已优化位置');
            } else {
                puzzleContainer.classList.remove('puzzle-locked');
                console.log('输入框已恢复原位置');
            }
        }
        
        // 移动端：根据谜题状态自动锁定/解锁滚动
        if (this.isMobileDevice()) {
            if (hasBlockingPuzzle) {
                this.lockMobileScroll();
            } else {
                this.unlockMobileScroll();
            }
        }
        
        return hasBlockingPuzzle;
    }

    // 检测是否为移动设备
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}

// 页面解析器
class PageParser {
    constructor() {
        this.gameState = new GameState();
    }

    // 解析设计文件
    async parseDesignFile(content, pageIndex) {
        const page = {
            index: pageIndex,
            elements: [],
            hasPuzzle: false,
            puzzleData: null
        };

        // 解析设计文件格式
        const lines = content.split('\n');
        let currentElement = null;
        let inConfig = false;
        let configContent = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('<txt>') && line.endsWith('</txt>')) {
                const match = line.match(/<txt>\{(.+?)\}<\/txt>/);
                if (match) {
                    page.elements.push({
                        type: 'text',
                        variable: match[1]
                    });
                }
            } else if (line.startsWith('<pic>') && line.endsWith('</pic>')) {
                const match = line.match(/<pic>\{(.+?)\}<\/pic>/);
                if (match) {
                    page.elements.push({
                        type: 'image',
                        variable: match[1]
                    });
                }
            } else if (line.startsWith('<inputbox>') && line.endsWith('</inputbox>')) {
                const match = line.match(/<inputbox>\{(.+?)\}<\/inputbox>/);
                if (match) {
                    page.hasPuzzle = true;
                    currentElement = {
                        type: 'puzzle',
                        variable: match[1]
                    };
                    page.elements.push(currentElement);
                }
            } else if (line === '{') {
                inConfig = true;
                configContent = '';
            } else if (line === '}') {
                inConfig = false;
                this.parseConfig(configContent, page);
            } else if (inConfig) {
                configContent += line + '\n';
            }
        }

        return page;
    }

    // 解析配置文件
    parseConfig(configContent, page) {
        const lines = configContent.split('\n');
        const config = {};
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();
            if (line && line.includes('=')) {
                const [key, value] = line.split('=').map(s => s.trim());
                
                if (value === '{') {
                    // 多行嵌套对象，收集直到遇到 }
                    let nestedContent = '';
                    let braceCount = 1;
                    i++; // 跳过当前行
                    
                    while (i < lines.length && braceCount > 0) {
                        const nextLine = lines[i];
                        nestedContent += nextLine + '\n';
                        
                        for (const char of nextLine) {
                            if (char === '{') braceCount++;
                            if (char === '}') braceCount--;
                        }
                        
                        i++;
                    }
                    
                    // 解析收集到的嵌套内容
                    config[key] = this.parseNestedObject('{' + nestedContent);
                    continue; // 跳过i++
                } else if (value.startsWith('{') && value.endsWith('}')) {
                    // 单行嵌套对象
                    config[key] = this.parseNestedObject(value);
                } else {
                    config[key] = value.replace(/['"]/g, '');
                }
            }
            i++;
        }

        // 将配置应用到页面元素
        page.elements.forEach(element => {
            if (config[element.variable]) {
                element.content = config[element.variable];
            }
        });
    }

    // 解析嵌套对象（用于谜题配置）
    parseNestedObject(str) {
        const result = {};
        const content = str.slice(1, -1).trim();
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.includes('=')) {
                const [key, value] = trimmed.split('=').map(s => s.trim());
                // 移除键和值周围的引号
                const cleanKey = key.replace(/^['"]|['"]$/g, '');
                const cleanValue = value.replace(/^['"]|['"]$/g, '');
                result[cleanKey] = cleanValue;
            }
        }

        return result;
    }

    // 加载所有页面
    async loadAllPages() {
        const pages = [];
        for (let i = 1; i <= 8; i++) {
            try {
                const response = await fetch(`plot/p${i}.txt`);
                const content = await response.text();
                const page = await this.parseDesignFile(content, i - 1);
                pages.push(page);
            } catch (error) {
                console.error(`加载页面 ${i} 失败:`, error);
            }
        }
        this.gameState.pages = pages;
        return pages;
    }
}

// 游戏渲染器
class GameRenderer {
    constructor() {
        this.gameState = new GameState();
        this.parser = new PageParser();
        // 确保使用同一个 GameState 实例
        this.parser.gameState = this.gameState;
        this.scrollContent = document.getElementById('scroll-content');
        this.scrollHint = null;
        this.init();
    }

    init() {
        this.gameState.load();
        this.createScrollHint();
        this.loadGame();
        this.bindEvents();
    }

    // 创建滚动提示箭头
    createScrollHint() {
        this.scrollHint = document.createElement('div');
        this.scrollHint.className = 'scroll-hint';
        this.scrollHint.innerHTML = '↓';
        document.body.appendChild(this.scrollHint);
    }

    // 绑定事件
    bindEvents() {
        // 鼠标滚轮事件 - 连续滚动
        this.scrollContent.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const currentScroll = this.scrollContent.scrollTop;
            const maxScroll = this.scrollContent.scrollHeight - this.scrollContent.clientHeight;
            
            // 计算目标滚动位置
            const scrollSpeed = Math.min(Math.abs(e.deltaY), 100); // 限制最大滚动速度
            const newScroll = currentScroll + (e.deltaY > 0 ? scrollSpeed : -scrollSpeed);
            const clampedScroll = Math.max(0, Math.min(newScroll, maxScroll));
            
            // 只检查向下滚动时的谜题限制（检查目标位置）
            if (e.deltaY > 0 && clampedScroll > currentScroll && this.gameState.checkPuzzleAtPosition(clampedScroll, this.scrollContent.clientHeight)) {
                console.log('检测到未完成的谜题，阻止向下滚动');
                return;
            }
            
            // 只有当滚动位置实际改变时才执行
            if (clampedScroll !== currentScroll) {
                this.scrollContent.scrollTo(0, clampedScroll);
                this.gameState.updateScrollPosition(clampedScroll);
                this.updateScrollHint();
            }
        });

        // 键盘事件 - 连续滚动
        document.addEventListener('keydown', (e) => {
            const currentScroll = this.scrollContent.scrollTop;
            const maxScroll = this.scrollContent.scrollHeight - this.scrollContent.clientHeight;
            const scrollStep = 50; // 键盘滚动步长
            
            let newScroll = currentScroll;
            
            if (e.key === 'ArrowDown' || e.key === 'PageDown') {
                e.preventDefault();
                newScroll = currentScroll + scrollStep;
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                e.preventDefault();
                newScroll = currentScroll - scrollStep;
            }
            
            const clampedScroll = Math.max(0, Math.min(newScroll, maxScroll));
            
            // 检查谜题限制（检查目标位置）
            if (clampedScroll > currentScroll && this.gameState.checkPuzzleAtPosition(clampedScroll, this.scrollContent.clientHeight)) {
                return;
            }
            
            this.scrollContent.scrollTo(0, clampedScroll);
            this.gameState.updateScrollPosition(clampedScroll);
            this.updateScrollHint();
        });

        // 滚动事件监听
        this.scrollContent.addEventListener('scroll', () => {
            const scrollTop = this.scrollContent.scrollTop;
            this.gameState.updateScrollPosition(scrollTop);
            this.updateScrollHint();
        });

        // 窗口大小变化监听 - 重新检查谜题状态
        let resizeTimer;
        window.addEventListener('resize', () => {
            console.log('窗口大小变化，重新检查谜题状态');
            
            // 清除之前的定时器
            if (resizeTimer) {
                clearTimeout(resizeTimer);
            }
            
            // 延迟执行，等待浏览器完成布局重排
            resizeTimer = setTimeout(() => {
                this.updateScrollHint();
                
                // 检查当前滚动位置是否有谜题阻断
                const currentScroll = this.scrollContent.scrollTop;
                const maxScroll = this.scrollContent.scrollHeight - this.scrollContent.clientHeight;
                
                console.log('窗口调整后检查谜题状态:', {
                    currentScroll,
                    maxScroll,
                    hasBlockingPuzzle: this.gameState.checkPuzzleAtPosition(currentScroll, this.scrollContent.clientHeight)
                });
                
                if (currentScroll < maxScroll && this.gameState.checkPuzzleAtPosition(currentScroll, this.scrollContent.clientHeight)) {
                    console.log('窗口调整后检测到谜题阻断，强制滚动到安全位置');
                    // 强制滚动到安全位置（如果有谜题阻断）
                    const safeScroll = this.findSafeScrollPosition(currentScroll);
                    if (safeScroll !== currentScroll) {
                        this.scrollContent.scrollTo({
                            top: safeScroll,
                            behavior: 'auto' // 立即滚动，不动画
                        });
                        this.gameState.updateScrollPosition(safeScroll);
                    }
                }
            }, 100); // 100ms延迟确保布局稳定
        });

        // 触摸事件（移动端支持）- 连续滚动
        let touchStartY = 0;
        let touchStartTime = 0;
        this.scrollContent.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        });

        this.scrollContent.addEventListener('touchmove', (e) => {
            // 在触摸移动时实时检查谜题阻断
            const currentScroll = this.scrollContent.scrollTop;
            const maxScroll = this.scrollContent.scrollHeight - this.scrollContent.clientHeight;
            
            // 如果当前滚动位置有谜题阻断，阻止默认滚动行为
            if (currentScroll < maxScroll && this.gameState.checkPuzzleAtPosition(currentScroll, this.scrollContent.clientHeight)) {
                console.log('移动端touchmove：检测到谜题阻断，阻止滚动');
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, { passive: false }); // 明确指定非被动模式以允许preventDefault

        this.scrollContent.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchStartY - touchEndY;
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;
            const currentScroll = this.scrollContent.scrollTop;
            const maxScroll = this.scrollContent.scrollHeight - this.scrollContent.clientHeight;
            
            // 增加触摸距离和时间的判断，避免误触
            if (Math.abs(diff) > 30 && touchDuration < 1000) {
                let newScroll = currentScroll;
                const scrollDistance = Math.min(Math.abs(diff) * 2, 150); // 根据滑动距离动态调整滚动距离
                
                if (diff > 0) {
                    newScroll = currentScroll + scrollDistance; // 向上滑动，向下滚动
                } else {
                    newScroll = currentScroll - scrollDistance; // 向下滑动，向上滚动
                }
                
                const clampedScroll = Math.max(0, Math.min(newScroll, maxScroll));
                
                // 检查谜题限制（检查目标位置）
                if (clampedScroll > currentScroll && this.gameState.checkPuzzleAtPosition(clampedScroll, this.scrollContent.clientHeight)) {
                    console.log('移动端：检测到未完成的谜题，阻止向下滚动', {
                        diff,
                        touchDuration,
                        currentScroll,
                        targetScroll: clampedScroll
                    });
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                // 只有当滚动位置实际改变时才执行
                if (clampedScroll !== currentScroll) {
                    this.scrollContent.scrollTo(0, clampedScroll);
                    this.gameState.updateScrollPosition(clampedScroll);
                }
            }
        });

        // 调试模式：不禁用右键和F12
        // 禁用右键菜单
        // document.addEventListener('contextmenu', (e) => {
        //     e.preventDefault();
        // });

        // 禁用F12和开发者工具快捷键
        // document.addEventListener('keydown', (e) => {
        //     if (e.key === 'F12' || 
        //         (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        //         (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        //         (e.ctrlKey && e.key === 'U')) {
        //         e.preventDefault();
        //     }
        // });
        
        console.log('调试模式：已禁用右键和F12限制');
    }

    // 注意：scrollDown和scrollUp方法已不再使用，已替换为连续滚动

    // 显示/隐藏滚动提示
    updateScrollHint() {
        if (!this.scrollContent) return;
        
        const currentScroll = this.scrollContent.scrollTop;
        const maxScroll = this.scrollContent.scrollHeight - this.scrollContent.clientHeight;
        const canScrollDown = currentScroll < maxScroll - 10; // 还有内容可以滚动
        
        // 检查是否有未完成的谜题阻止滚动
        const hasBlockingPuzzle = this.gameState.checkPuzzleAtPosition(currentScroll, this.scrollContent.clientHeight);
        
        if (canScrollDown && !hasBlockingPuzzle) {
            this.showScrollHint();
        } else {
            this.hideScrollHint();
        }
    }

    // 找到安全的滚动位置（避开谜题区域）
    findSafeScrollPosition(currentScroll) {
        let safeScroll = currentScroll;
        const scrollContent = document.getElementById('scroll-content');
        if (!scrollContent) return safeScroll;
        
        // 从当前位置向上查找安全位置
        for (let testScroll = currentScroll; testScroll >= 0; testScroll -= 10) {
            if (!this.gameState.checkPuzzleAtPosition(testScroll, scrollContent.clientHeight)) {
                safeScroll = testScroll;
                break;
            }
        }
        
        console.log('找到安全滚动位置:', safeScroll, '原位置:', currentScroll);
        return safeScroll;
    }

    // 移动端滚动锁定
    lockMobileScroll() {
        const scrollContent = document.getElementById('scroll-content');
        if (!scrollContent) return;
        
        // 添加CSS类来禁用滚动
        scrollContent.style.overflowY = 'hidden';
        scrollContent.style.touchAction = 'none';
        
        console.log('移动端滚动已锁定');
    }

    // 移动端滚动解锁
    unlockMobileScroll() {
        const scrollContent = document.getElementById('scroll-content');
        if (!scrollContent) return;
        
        // 恢复CSS属性
        scrollContent.style.overflowY = 'auto';
        scrollContent.style.touchAction = 'pan-y';
        
        console.log('移动端滚动已解锁');
    }

    // 确保输入框在视口中可见
    ensureInputVisible(puzzleContainer) {
        if (!puzzleContainer) return;
        
        const scrollContent = document.getElementById('scroll-content');
        if (!scrollContent) return;
        
        const containerRect = scrollContent.getBoundingClientRect();
        const inputRect = puzzleContainer.getBoundingClientRect();
        
        // 检查输入框是否完全在视口中
        const isFullyVisible = inputRect.top >= containerRect.top && 
                              inputRect.bottom <= containerRect.bottom;
        
        if (!isFullyVisible) {
            const currentScroll = scrollContent.scrollTop;
            const maxScroll = scrollContent.scrollHeight - scrollContent.clientHeight;
            let targetScroll = currentScroll;
            
            // 如果输入框在上方超出视口
            if (inputRect.top < containerRect.top) {
                // 滚动使输入框顶部对齐视口顶部，留一些边距
                targetScroll = currentScroll + inputRect.top - containerRect.top - 20;
            }
            // 如果输入框在下方超出视口
            else if (inputRect.bottom > containerRect.bottom) {
                // 滚动使输入框底部对齐视口底部，留一些边距
                targetScroll = currentScroll + inputRect.bottom - containerRect.bottom + 20;
            }
            
            // 确保滚动位置在有效范围内
            targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
            
            // 只有当需要显著滚动时才执行
            if (Math.abs(targetScroll - currentScroll) > 5) {
                console.log('调整输入框位置，从', currentScroll, '到', targetScroll);
                scrollContent.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            }
        }
    }

    showScrollHint() {
        if (this.scrollHint) {
            this.scrollHint.classList.remove('hidden');
        }
    }

    hideScrollHint() {
        if (this.scrollHint) {
            this.scrollHint.classList.add('hidden');
        }
    }

    // 加载游戏
    async loadGame() {
        try {
            console.log('开始加载游戏...');
            await this.parser.loadAllPages();
            this.gameState.pages = this.parser.gameState.pages;
            console.log('页面加载完成，共', this.gameState.pages.length, '页');
            
            if (this.gameState.pages.length > 0) {
                this.renderAllPages(); // 渲染所有页面
                console.log('页面渲染完成');
                
                // 恢复滚动位置
                if (this.gameState.scrollPosition > 0) {
                    this.scrollContent.scrollTo(0, this.gameState.scrollPosition);
                }
            } else {
                console.error('没有加载到任何页面');
                this.showErrorMessage('游戏内容加载失败，请刷新页面重试');
            }
            
            this.hideLoadingScreen();
        } catch (error) {
            console.error('游戏加载失败:', error);
            this.showErrorMessage('游戏加载失败: ' + error.message);
        }
    }
    
    // 显示错误信息
    showErrorMessage(message) {
        this.scrollContent.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #e74c3c;">
                <h2>游戏加载失败</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    padding: 10px 20px;
                    background: #d4af37;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 20px;
                ">刷新页面</button>
            </div>
        `;
        this.hideLoadingScreen();
    }

    // 渲染所有页面（连续滚动）
    renderAllPages() {
        console.log('渲染所有页面，共', this.gameState.pages.length, '页');
        
        this.scrollContent.innerHTML = '';
        
        this.gameState.pages.forEach((page, pageIndex) => {
            if (!page) {
                console.error('页面不存在:', pageIndex);
                return;
            }

            console.log('渲染页面:', page.index, page.elements);
            
            const pageElement = document.createElement('div');
            pageElement.className = 'page';
            pageElement.id = `page-${pageIndex}`;
            
            page.elements.forEach((element, index) => {
                const elementNode = this.createElement(element, pageIndex);
                if (elementNode) {
                    pageElement.appendChild(elementNode);
                    // 添加渐出效果
                    setTimeout(() => {
                        if (elementNode.classList) {
                            elementNode.classList.add('visible');
                        }
                        // 确保元素可见
                        elementNode.style.opacity = '1';
                        elementNode.style.transform = 'translateY(0)';
                    }, index * 200);
                }
            });

            this.scrollContent.appendChild(pageElement);
        });
        
        // 更新滚动提示
        this.updateScrollHint();
    }

    // 创建页面元素
    createElement(element, pageIndex) {
        switch (element.type) {
            case 'text':
                return this.createTextElement(element);
            case 'image':
                return this.createImageElement(element);
            case 'puzzle':
                return this.createPuzzleElement(element, pageIndex);
            default:
                return null;
        }
    }

    // 创建文本元素
    createTextElement(element) {
        const textNode = document.createElement('div');
        textNode.className = 'page-text';
        
        if (element.content) {
            // 读取文本文件内容
            this.loadTextContent(element.content).then(content => {
                textNode.textContent = content;
                // 确保文本加载后也能显示
                textNode.style.opacity = '1';
                textNode.style.transform = 'translateY(0)';
            }).catch(error => {
                console.error('加载文本失败:', error);
                textNode.textContent = '文本加载失败';
                textNode.style.opacity = '1';
                textNode.style.transform = 'translateY(0)';
            });
        } else {
            textNode.textContent = '无文本内容';
        }
        
        return textNode;
    }

    // 创建图片元素
    createImageElement(element) {
        const imgNode = document.createElement('img');
        imgNode.className = 'page-image';
        
        if (element.content) {
            imgNode.src = element.content;
            imgNode.alt = '游戏图片';
        }
        
        return imgNode;
    }

    // 创建谜题元素
    createPuzzleElement(element, pageIndex) {
        const container = document.createElement('div');
        container.className = 'puzzle-input-container';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'puzzle-input';
        input.placeholder = '请输入答案...';
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'puzzle-submit';
        submitBtn.textContent = '提交';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'puzzle-error';
        
        container.appendChild(input);
        container.appendChild(submitBtn);
        container.appendChild(errorDiv);
        
        // 谜题提交事件
        submitBtn.addEventListener('click', () => {
            this.handlePuzzleSubmit(input, errorDiv, element, pageIndex, container);
        });
        
        // 回车提交
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handlePuzzleSubmit(input, errorDiv, element, pageIndex, container);
            }
        });
        
        // 如果谜题已完成，禁用输入
        if (this.gameState.isPuzzleCompleted(pageIndex)) {
            input.disabled = true;
            submitBtn.disabled = true;
            input.value = element.content?.['谜底'] || '';
            container.classList.add('puzzle-success');
        }
        
        return container;
    }

    // 处理谜题提交
    handlePuzzleSubmit(input, errorDiv, element, pageIndex, container) {
        const answer = input.value.trim();
        const correctAnswer = element.content?.['谜底'];
        const errorMessage = element.content?.['错误提示文案'];
        
        if (answer === correctAnswer) {
            // 答案正确 - 直接解锁至浏览态，不显示任何提示
            errorDiv.textContent = '';
            input.disabled = true;
            container.querySelector('.puzzle-submit').disabled = true;
            container.classList.add('puzzle-success');
            
            // 移除固定位置
            container.classList.remove('puzzle-locked');
            
            this.gameState.completePuzzle(pageIndex);
            this.updateScrollHint();
            
            console.log(`第${pageIndex + 1}页谜题解答正确，已解锁`);
            
        } else {
            // 答案错误
            errorDiv.textContent = errorMessage || '答案错误，请重试！';
            input.classList.add('error');
            setTimeout(() => {
                input.classList.remove('error');
            }, 500);
        }
    }

    // 异步加载文本内容
    async loadTextContent(filePath) {
        try {
            const response = await fetch(filePath);
            return await response.text();
        } catch (error) {
            console.error(`加载文本文件失败: ${filePath}`, error);
            return '文本加载失败';
        }
    }

    // 隐藏加载屏幕
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 1000);
        }
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    new GameRenderer();
});

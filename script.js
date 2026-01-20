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
        // 检查当前视口范围内是否有未完成的谜题
        for (let i = 0; i < this.pages.length; i++) {
            const page = this.pages[i];
            if (page.hasPuzzle && !this.isPuzzleCompleted(i)) {
                // 计算页面在文档中的实际位置
                const pageElement = document.getElementById(`page-${i}`);
                if (pageElement) {
                    const pageRect = pageElement.getBoundingClientRect();
                    const scrollContent = document.getElementById('scroll-content');
                    if (!scrollContent) continue;
                    
                    const containerRect = scrollContent.getBoundingClientRect();
                    
                    // 检查谜题页面是否在视口中
                    const isInViewport = pageRect.top < containerRect.bottom && pageRect.bottom > containerRect.top;
                    
                    if (isInViewport) {
                        console.log(`检测到第${i+1}页有未完成的谜题，阻止向下滚动`);
                        return true; // 有未完成的谜题
                    }
                }
            }
        }
        return false;
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
                if (value.startsWith('{')) {
                    // 解析多行嵌套对象
                    let nestedContent = value; // 从当前行的 '{' 开始
                    let braceCount = 1; // 已经有一个 '{'
                    i++; // 移动到下一行
                    
                    // 收集所有行直到找到匹配的 '}'
                    while (i < lines.length && braceCount > 0) {
                        const nextLine = lines[i];
                        nestedContent += '\n' + nextLine;
                        
                        // 计算括号匹配
                        for (const char of nextLine) {
                            if (char === '{') braceCount++;
                            if (char === '}') braceCount--;
                        }
                        
                        i++;
                    }
                    
                    config[key] = this.parseNestedObject(nestedContent);
                    continue; // 跳过 i++ 因为已经处理了多行
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
                result[key.replace(/['"]/g, '')] = value.replace(/['"]/g, '');
            }
        }

        return result;
    }

    // 加载所有页面
    async loadAllPages() {
        const pages = [];
        for (let i = 1; i <= 5; i++) {
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
            
            // 只检查向下滚动时的谜题限制
            if (e.deltaY > 0 && this.gameState.checkPuzzleAtPosition(currentScroll, this.scrollContent.clientHeight)) {
                console.log('检测到未完成的谜题，阻止向下滚动');
                return;
            }
            
            // 执行滚动
            const scrollSpeed = Math.min(Math.abs(e.deltaY), 100); // 限制最大滚动速度
            const newScroll = currentScroll + (e.deltaY > 0 ? scrollSpeed : -scrollSpeed);
            const clampedScroll = Math.max(0, Math.min(newScroll, maxScroll));
            
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
            
            // 检查谜题限制
            if (newScroll > currentScroll && this.gameState.checkPuzzleAtPosition(currentScroll, this.scrollContent.clientHeight)) {
                return;
            }
            
            const clampedScroll = Math.max(0, Math.min(newScroll, maxScroll));
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

        // 触摸事件（移动端支持）- 连续滚动
        let touchStartY = 0;
        this.scrollContent.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });

        this.scrollContent.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchStartY - touchEndY;
            const currentScroll = this.scrollContent.scrollTop;
            const maxScroll = this.scrollContent.scrollHeight - this.scrollContent.clientHeight;
            
            if (Math.abs(diff) > 50) {
                let newScroll = currentScroll;
                if (diff > 0) {
                    newScroll = currentScroll + 100; // 向上滑动，向下滚动
                } else {
                    newScroll = currentScroll - 100; // 向下滑动，向上滚动
                }
                
                // 检查谜题限制
                if (newScroll > currentScroll && this.gameState.checkPuzzleAtPosition(currentScroll, this.scrollContent.clientHeight)) {
                    return;
                }
                
                const clampedScroll = Math.max(0, Math.min(newScroll, maxScroll));
                this.scrollContent.scrollTo(0, clampedScroll);
                this.gameState.updateScrollPosition(clampedScroll);
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
            // pages are already set in the shared gameState instance
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
            // 答案正确，直接解锁至浏览态
            errorDiv.textContent = '';
            input.disabled = true;
            container.querySelector('.puzzle-submit').disabled = true;
            container.classList.add('puzzle-success');
            
            this.gameState.completePuzzle(pageIndex);
            this.updateScrollHint();
            
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

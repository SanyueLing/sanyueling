// 游戏状态管理
class GameState {
    constructor() {
        this.currentPage = 0;
        this.completedPuzzles = new Set();
        this.isScrolling = false;
        this.isPuzzleMode = false;
        this.pages = [];
    }
    // 从本地存储加载游戏状态
    load() {
        const saved = localStorage.getItem('mysteryGameProgress');
        if (saved) {
            const data = JSON.parse(saved);
            this.currentPage = data.currentPage || 0;
            this.completedPuzzles = new Set(data.completedPuzzles || []);
        }
    }

    // 保存游戏状态到本地存储
    save() {
        const data = {
            currentPage: this.currentPage,
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

    // 移动到下一页
    nextPage() {
        if (this.currentPage < this.pages.length - 1) {
            this.currentPage++;
            this.save();
            return true;
        }
        return false;
    }

    // 移动到上一页
    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.save();
            return true;
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

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.includes('=')) {
                const [key, value] = trimmed.split('=').map(s => s.trim());
                if (value.startsWith('{') && value.endsWith('}')) {
                    // 解析嵌套对象
                    config[key] = this.parseNestedObject(value);
                } else {
                    config[key] = value.replace(/['"]/g, '');
                }
            }
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
        // 鼠标滚轮事件
        this.scrollContent.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (this.gameState.isPuzzleMode && !this.gameState.isPuzzleCompleted(this.gameState.currentPage)) {
                return; // 谜题未完成时禁止滚动
            }
            
            if (e.deltaY > 0) {
                this.scrollDown();
            } else {
                this.scrollUp();
            }
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'PageDown') {
                e.preventDefault();
                this.scrollDown();
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                e.preventDefault();
                this.scrollUp();
            }
        });

        // 触摸事件（移动端支持）
        let touchStartY = 0;
        this.scrollContent.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });

        this.scrollContent.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchStartY - touchEndY;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.scrollDown();
                } else {
                    this.scrollUp();
                }
            }
        });

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
    }

    // 向下滚动
    scrollDown() {
        if (this.gameState.isScrolling) return;
        
        if (this.gameState.nextPage()) {
            this.gameState.isScrolling = true;
            this.renderCurrentPage();
            setTimeout(() => {
                this.gameState.isScrolling = false;
            }, 500);
        } else {
            this.hideScrollHint();
        }
    }

    // 向上滚动
    scrollUp() {
        if (this.gameState.isScrolling) return;
        
        if (this.gameState.prevPage()) {
            this.gameState.isScrolling = true;
            this.renderCurrentPage();
            setTimeout(() => {
                this.gameState.isScrolling = false;
            }, 500);
        }
    }

    // 显示/隐藏滚动提示
    updateScrollHint() {
        const currentPage = this.gameState.pages[this.gameState.currentPage];
        const canScrollDown = this.gameState.currentPage < this.gameState.pages.length - 1;
        const puzzleCompleted = !currentPage?.hasPuzzle || this.gameState.isPuzzleCompleted(this.gameState.currentPage);
        
        if (canScrollDown && puzzleCompleted) {
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
            await this.parser.loadAllPages();
            this.gameState.pages = this.parser.gameState.pages;
            this.renderCurrentPage();
            this.hideLoadingScreen();
        } catch (error) {
            console.error('游戏加载失败:', error);
        }
    }

    // 渲染当前页面
    renderCurrentPage() {
        const page = this.gameState.pages[this.gameState.currentPage];
        if (!page) return;

        this.scrollContent.innerHTML = '';
        const pageElement = document.createElement('div');
        pageElement.className = 'page';
        
        page.elements.forEach((element, index) => {
            const elementNode = this.createElement(element, page.index);
            if (elementNode) {
                pageElement.appendChild(elementNode);
                // 添加渐出效果
                setTimeout(() => {
                    elementNode.classList.add('visible');
                }, index * 200);
            }
        });

        this.scrollContent.appendChild(pageElement);
        
        // 设置谜题模式
        this.gameState.isPuzzleMode = page.hasPuzzle;
        
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
            });
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
            // 答案正确
            errorDiv.textContent = '';
            input.disabled = true;
            container.querySelector('.puzzle-submit').disabled = true;
            container.classList.add('puzzle-success');
            
            this.gameState.completePuzzle(pageIndex);
            this.updateScrollHint();
            
            // 显示成功提示
            const successMsg = document.createElement('div');
            successMsg.style.color = '#2ecc71';
            successMsg.style.marginTop = '10px';
            successMsg.textContent = '恭喜！谜题解开！';
            container.appendChild(successMsg);
            
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

// 主应用类
class CoupleApp {
    constructor() {
        this.currentPage = 'home';
        this.isLoggedIn = false;
        this.eventHandlers = new Map();
        
        this.init();
    }

    // 初始化应用
    async init() {
        try {
            console.log('🌍 我们的小星球正在启动...');
            
            // 检查登录状态
            this.checkLoginStatus();
            
            // 初始化组件
            await this.initializeComponents();
            
            // 绑定全局事件
            this.bindGlobalEvents();
            
            // 启动背景动画
            this.startBackgroundAnimations();
            
            // 设置每日情话
            this.setDailyQuote();
            
            console.log('💕 小星球启动完成！');
            
        } catch (error) {
            console.error('启动失败:', error);
            this.showNotification('启动时遇到问题，请刷新页面重试', 'error');
        }
    }

    // 检查登录状态
    checkLoginStatus() {
        const isLoggedIn = Storage.get('isLoggedIn');
        if (isLoggedIn) {
            this.isLoggedIn = true;
            this.showMainPage();
        } else {
            this.showAuthPage();
        }
    }

    // 显示认证页面
    showAuthPage() {
        Utils.dom.$('#authPage').style.display = 'flex';
        Utils.dom.$('#mainPage').style.display = 'none';
        document.body.classList.add('auth-mode');
    }

    // 显示主页面
    showMainPage() {
        Utils.dom.$('#authPage').style.display = 'none';
        Utils.dom.$('#mainPage').style.display = 'block';
        document.body.classList.remove('auth-mode');
        
        // 更新统计数据
        this.updateStats();
        
        // 加载当前页面内容
        this.loadPageContent(this.currentPage);
    }

    // 初始化组件
    async initializeComponents() {
        // 等待所有页面模块加载完成
        await Promise.all([
            this.waitForModule('HomePage'),
            this.waitForModule('CalendarPage'),
            this.waitForModule('WishlistPage'),
            this.waitForModule('DiaryPage'),
            this.waitForModule('CountdownPage')
        ]);
    }

    // 等待模块加载
    waitForModule(moduleName, maxAttempts = 50) {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                if (window[moduleName] || attempts >= maxAttempts) {
                    resolve();
                } else {
                    attempts++;
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    // 绑定全局事件
    bindGlobalEvents() {
        // 导航事件
        this.bindNavigationEvents();
        
        // 键盘快捷键
        this.bindKeyboardShortcuts();
        
        // 模态框事件
        this.bindModalEvents();
        
        // 添加按钮事件
        this.bindAddButtonEvent();
        
        // 页面可见性变化
        this.bindVisibilityChange();
        
        // 网络状态变化
        this.bindNetworkEvents();
    }

    // 绑定导航事件
    bindNavigationEvents() {
        Utils.dom.$$('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                if (page) {
                    this.switchPage(page);
                }
            });
        });
    }

    // 绑定键盘快捷键
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC 关闭模态框
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Ctrl+N 新建内容
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.handleAddAction();
            }
            
            // Ctrl+S 保存（如果有表单在编辑状态）
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.handleSaveAction();
            }
        });
    }

    // 绑定模态框事件
    bindModalEvents() {
        // 点击外部关闭模态框
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }

    // 绑定添加按钮事件
    bindAddButtonEvent() {
        const addBtn = Utils.dom.$('#addBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.handleAddAction();
            });
        }
    }

    // 绑定页面可见性变化
    bindVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.onPageVisible();
            }
        });
    }

    // 绑定网络状态事件
    bindNetworkEvents() {
        window.addEventListener('online', () => {
            this.showNotification('网络连接已恢复', 'success');
        });

        window.addEventListener('offline', () => {
            this.showNotification('网络连接已断开，数据将保存在本地', 'info');
        });
    }

    // 页面切换
    switchPage(pageName) {
        if (pageName === this.currentPage) return;

        // 隐藏所有页面
        Utils.dom.$$('.page-section').forEach(section => {
            section.classList.remove('active');
        });

        // 显示目标页面
        const targetPage = Utils.dom.$(`#${pageName}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
            targetPage.style.animation = 'fadeIn 0.3s ease-out';
        }

        // 更新导航状态
        Utils.dom.$$('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = Utils.dom.$(`[data-page="${pageName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // 更新当前页面
        this.currentPage = pageName;

        // 显示/隐藏添加按钮
        this.toggleAddButton();

        // 加载页面内容
        this.loadPageContent(pageName);

        // 更新URL（不刷新页面）
        if (history.pushState) {
            history.pushState(null, null, `#${pageName}`);
        }
    }

    // 加载页面内容
    async loadPageContent(pageName) {
        try {
            switch (pageName) {
                case 'home':
                    if (window.HomePage) {
                        await window.HomePage.render();
                    }
                    break;
                case 'calendar':
                    if (window.CalendarPage) {
                        await window.CalendarPage.render();
                    }
                    break;
                case 'wishlist':
                    if (window.WishlistPage) {
                        await window.WishlistPage.render();
                    }
                    break;
                case 'diary':
                    if (window.DiaryPage) {
                        await window.DiaryPage.render();
                    }
                    break;
                case 'countdown':
                    if (window.CountdownPage) {
                        await window.CountdownPage.render();
                    }
                    break;
            }
        } catch (error) {
            console.error(`加载页面 ${pageName} 失败:`, error);
        }
    }

    // 切换添加按钮显示状态
    toggleAddButton() {
        const addBtn = Utils.dom.$('#addBtn');
        const showOnPages = ['calendar', 'wishlist', 'diary', 'countdown'];
        
        if (addBtn) {
            if (showOnPages.includes(this.currentPage)) {
                addBtn.style.display = 'flex';
            } else {
                addBtn.style.display = 'none';
            }
        }
    }

    // 处理添加操作
    handleAddAction() {
        const modals = {
            calendar: 'eventModal',
            wishlist: 'wishModal',
            diary: 'diaryModal',
            countdown: 'anniversaryModal'
        };

        const modalId = modals[this.currentPage];
        if (modalId && Components.modal) {
            Components.modal.open(modalId);
        }
    }

    // 处理保存操作
    handleSaveAction() {
        // 查找当前打开的表单
        const activeModal = Utils.dom.$('.modal.active');
        if (activeModal) {
            const form = activeModal.querySelector('form');
            if (form) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                }
            }
        }
    }

    // 关闭所有模态框
    closeAllModals() {
        Utils.dom.$$('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // 启动背景动画
    startBackgroundAnimations() {
        if (window.Animations) {
            Animations.startBackgroundEffects();
        }
    }

    // 设置每日情话
    setDailyQuote() {
        const quoteElement = Utils.dom.$('#dailyQuote');
        if (quoteElement && CoupleConfig.loveQuotes) {
            const today = new Date();
            const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
            const quoteIndex = dayOfYear % CoupleConfig.loveQuotes.length;
            quoteElement.textContent = CoupleConfig.loveQuotes[quoteIndex];
        }
    }

    // 更新统计数据
    updateStats() {
        const startDate = new Date(Storage.get('relationshipStart') || '2023-01-01');
        const today = new Date();
        const daysTogether = Utils.date.daysBetween(startDate, today);
        
        const wishes = Storage.get('wishes') || [];
        const diaries = Storage.get('diaries') || [];
        const events = Storage.get('events') || [];
        
        const completedWishes = wishes.filter(w => w.status === 'completed').length;
        const totalMemories = diaries.length + events.length;
        
        this.animateNumber('daysTogether', daysTogether);
        this.animateNumber('wishesCompleted', completedWishes);
        this.animateNumber('memoriesRecorded', totalMemories);
    }

    // 数字动画
    animateNumber(elementId, targetNumber) {
        const element = Utils.dom.$(`#${elementId}`);
        if (!element) return;

        let currentNumber = 0;
        const increment = targetNumber / 50;
        const timer = setInterval(() => {
            currentNumber += increment;
            if (currentNumber >= targetNumber) {
                currentNumber = targetNumber;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentNumber);
        }, 40);
    }

    // 页面重新可见时的处理
    onPageVisible() {
        this.updateStats();
        this.setDailyQuote();
        
        // 重新启动背景动画
        if (window.Animations) {
            Animations.refreshBackgroundEffects();
        }
    }

    // 显示通知
    showNotification(message, type = 'info', duration = 3000) {
        if (Components.notification) {
            Components.notification.show(message, type, duration);
        } else {
            // 简单的备用通知
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // 确认对话框
    confirm(message, callback) {
        const result = window.confirm(message);
        if (callback) callback(result);
        return result;
    }

    // 错误处理
    handleError(error, context = '') {
        console.error(`错误 ${context}:`, error);
        
        let message = '操作失败，请稍后重试';
        
        if (error.message) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
                message = '网络连接问题，请检查网络后重试';
            } else if (error.message.includes('storage')) {
                message = '存储空间不足，请清理一些数据';
            }
        }
        
        this.showNotification(message, 'error');
    }

    // 登录处理
    handleLogin(coupleCode, securityAnswer) {
        try {
            if (!coupleCode || !securityAnswer) {
                this.showNotification('请填写完整信息', 'error');
                return false;
            }

            // 简单验证（实际应用中应该调用API）
            Storage.set('isLoggedIn', true);
            Storage.set('coupleCode', coupleCode);
            
            this.isLoggedIn = true;
            this.showMainPage();
            this.showNotification('欢迎回到你们的小星球！', 'success');
            
            return true;
        } catch (error) {
            this.handleError(error, '登录');
            return false;
        }
    }

    // 登出处理
    handleLogout() {
        if (this.confirm('确定要离开你们的小星球吗？')) {
            Storage.remove('isLoggedIn');
            Storage.remove('coupleCode');
            this.isLoggedIn = false;
            location.reload();
        }
    }

    // 数据导出
    exportData() {
        try {
            const data = {
                events: Storage.get('events') || [],
                wishes: Storage.get('wishes') || [],
                diaries: Storage.get('diaries') || [],
                anniversaries: Storage.get('anniversaries') || [],
                exportDate: new Date().toISOString(),
                version: CoupleConfig.app.version
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `couple-planet-backup-${Utils.date.format(new Date(), 'YYYY-MM-DD')}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('数据导出成功！', 'success');
        } catch (error) {
            this.handleError(error, '数据导出');
        }
    }

    // 数据导入
    importData(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        
                        // 验证数据格式
                        if (data.events) Storage.set('events', data.events);
                        if (data.wishes) Storage.set('wishes', data.wishes);
                        if (data.diaries) Storage.set('diaries', data.diaries);
                        if (data.anniversaries) Storage.set('anniversaries', data.anniversaries);
                        
                        this.showNotification('数据导入成功！', 'success');
                        this.updateStats();
                        resolve(data);
                    } catch (parseError) {
                        this.showNotification('数据格式错误，导入失败', 'error');
                        reject(parseError);
                    }
                };
                
                reader.onerror = () => {
                    this.showNotification('文件读取失败', 'error');
                    reject(new Error('文件读取失败'));
                };
                
                reader.readAsText(file);
            } catch (error) {
                this.handleError(error, '数据导入');
                reject(error);
            }
        });
    }

    // 清空所有数据
    clearAllData() {
        if (this.confirm('确定要清空所有数据吗？这个操作不可恢复！')) {
            try {
                const keysToKeep = ['isLoggedIn', 'coupleCode'];
                const allKeys = Object.keys(localStorage);
                
                allKeys.forEach(key => {
                    if (!keysToKeep.includes(key)) {
                        localStorage.removeItem(key);
                    }
                });
                
                this.showNotification('数据已清空', 'success');
                this.updateStats();
                
                // 重新加载当前页面内容
                this.loadPageContent(this.currentPage);
            } catch (error) {
                this.handleError(error, '清空数据');
            }
        }
    }

    // 应用销毁
    destroy() {
        // 清理事件监听器
        this.eventHandlers.forEach((handler, element) => {
            element.removeEventListener(handler.event, handler.callback);
        });
        this.eventHandlers.clear();
        
        // 停止动画
        if (window.Animations) {
            Animations.stopAll();
        }
        
        console.log('应用已销毁');
    }
}

// 创建全局应用实例
let app;

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app = new CoupleApp();
    
    // 暴露给全局作用域以便调试
    window.app = app;
});

// 页面卸载前清理
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});

// 处理浏览器后退/前进
window.addEventListener('popstate', (e) => {
    const hash = location.hash.slice(1);
    if (hash && app) {
        app.switchPage(hash);
    }
});

// 全局错误处理
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
    if (app) {
        app.handleError(e.error, '全局');
    }
});

// 未处理的Promise错误
window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise错误:', e.reason);
    if (app) {
        app.handleError(e.reason, 'Promise');
    }
    e.preventDefault(); // 阻止默认的错误处理
});

// 导出给其他模块使用
window.CoupleApp = CoupleApp;
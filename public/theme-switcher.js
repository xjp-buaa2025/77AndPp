// 主题切换器 - 可以通过 <script> 标签引入到现有 HTML 中

// 主题配置
const themes = {
    default: {
        name: '浪漫粉',
        icon: '🌸',
        description: '温馨浪漫的粉色主题'
    },
    mint: {
        name: '薄荷绿',
        icon: '🌿',
        description: '清新自然的绿色主题'
    },
    sky: {
        name: '天空蓝',
        icon: '☁️',
        description: '清爽宁静的蓝色主题'
    },
    sunset: {
        name: '暖阳橙',
        icon: '🌅',
        description: '温暖活力的橙色主题'
    },
    violet: {
        name: '紫罗兰',
        icon: '💜',
        description: '优雅神秘的紫色主题'
    },
    'rose-gold': {
        name: '玫瑰金',
        icon: '🌹',
        description: '奢华典雅的玫瑰金主题'
    },
    dark: {
        name: '深色',
        icon: '🌙',
        description: '护眼的深色主题'
    },
    forest: {
        name: '森林',
        icon: '🌲',
        description: '清新的森林主题'
    }
};

// 当前主题
let currentTheme = localStorage.getItem('preferred-theme') || 'default';

// 初始化主题系统
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 初始化主题系统...');
    
    createThemeSwitcher();
    applyTheme(currentTheme);
    initThemeDetection();
    initSpecialThemes();
    
    console.log('✨ 主题系统初始化完成');
});

// 创建主题切换器界面
function createThemeSwitcher() {
    const switcher = document.createElement('div');
    switcher.className = 'theme-switcher';
    switcher.innerHTML = `
        <div style="text-align: center; margin-bottom: 8px; font-size: 12px; color: var(--theme-text-secondary);">
            主题
        </div>
        <div class="theme-options">
            ${Object.entries(themes).map(([key, theme]) => `
                <div class="theme-option ${key === currentTheme ? 'active' : ''}" 
                     data-theme="${key}" 
                     title="${theme.name} - ${theme.description}">
                    <span style="font-size: 14px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                        ${theme.icon}
                    </span>
                </div>
            `).join('')}
        </div>
        <div style="text-align: center; margin-top: 8px;">
            <button class="auto-theme-btn" style="
                background: none; 
                border: 1px solid var(--theme-accent); 
                border-radius: 15px; 
                padding: 3px 8px; 
                font-size: 10px; 
                color: var(--theme-text-secondary);
                cursor: pointer;
                transition: all 0.3s ease;
            ">
                自动
            </button>
        </div>
    `;
    
    document.body.appendChild(switcher);
    
    // 添加点击事件
    switcher.addEventListener('click', handleThemeSwitch);
    
    // 添加悬浮效果
    const autoBtn = switcher.querySelector('.auto-theme-btn');
    autoBtn.addEventListener('mouseenter', function() {
        this.style.background = 'var(--theme-accent)';
        this.style.color = 'var(--theme-card-bg)';
    });
    
    autoBtn.addEventListener('mouseleave', function() {
        this.style.background = 'none';
        this.style.color = 'var(--theme-text-secondary)';
    });
}

// 处理主题切换
function handleThemeSwitch(e) {
    if (e.target.classList.contains('theme-option')) {
        const selectedTheme = e.target.dataset.theme;
        switchTheme(selectedTheme);
    } else if (e.target.classList.contains('auto-theme-btn') || e.target.parentNode.classList.contains('auto-theme-btn')) {
        enableAutoTheme();
    }
}

// 切换主题
function switchTheme(themeName) {
    if (themes[themeName]) {
        currentTheme = themeName;
        applyTheme(themeName);
        updateThemeSwitcherUI();
        saveThemePreference(themeName);
        showThemeChangeNotification(themes[themeName].name);
        
        // 禁用自动主题
        localStorage.removeItem('auto-theme-enabled');
        clearInterval(window.autoThemeInterval);
    }
}

// 应用主题
function applyTheme(themeName) {
    // 移除所有主题类
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    
    // 设置新主题
    if (themeName !== 'default') {
        document.documentElement.setAttribute('data-theme', themeName);
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    
    // 添加主题变化动画
    document.body.style.transition = 'all 0.5s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 500);
    
    console.log(`🎨 主题已切换到: ${themes[themeName].name}`);
}

// 更新主题切换器界面
function updateThemeSwitcherUI() {
    const options = document.querySelectorAll('.theme-option');
    options.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === currentTheme) {
            option.classList.add('active');
        }
    });
}

// 保存主题偏好
function saveThemePreference(themeName) {
    localStorage.setItem('preferred-theme', themeName);
}

// 显示主题更改通知
function showThemeChangeNotification(themeName) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--theme-card-bg);
        color: var(--theme-text-primary);
        padding: 10px 20px;
        border-radius: 20px;
        box-shadow: 0 5px 15px var(--theme-shadow);
        z-index: 10000;
        font-size: 14px;
        backdrop-filter: blur(10px);
        border: 1px solid var(--theme-accent);
        animation: slideDown 0.3s ease;
    `;
    notification.textContent = `已切换到 ${themeName} 主题`;
    
    // 添加动画样式
    if (!document.getElementById('notification-style')) {
        const style = document.createElement('style');
        style.id = 'notification-style';
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease reverse';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

// 启用自动主题
function enableAutoTheme() {
    localStorage.setItem('auto-theme-enabled', 'true');
    showThemeChangeNotification('自动主题');
    
    // 立即应用时间主题
    applyTimeBasedTheme();
    
    // 每小时检查一次
    window.autoThemeInterval = setInterval(applyTimeBasedTheme, 3600000);
    
    console.log('🕐 自动主题已启用');
}

// 基于时间的主题切换
function applyTimeBasedTheme() {
    const hour = new Date().getHours();
    let autoTheme;
    
    if (hour >= 6 && hour < 9) {
        autoTheme = 'sunset'; // 早晨 - 暖阳橙
    } else if (hour >= 9 && hour < 12) {
        autoTheme = 'sky'; // 上午 - 天空蓝
    } else if (hour >= 12 && hour < 15) {
        autoTheme = 'default'; // 中午 - 默认粉色
    } else if (hour >= 15 && hour < 18) {
        autoTheme = 'mint'; // 下午 - 薄荷绿
    } else if (hour >= 18 && hour < 21) {
        autoTheme = 'violet'; // 傍晚 - 紫罗兰
    } else {
        autoTheme = 'dark'; // 夜晚 - 深色
    }
    
    currentTheme = autoTheme;
    applyTheme(autoTheme);
    updateThemeSwitcherUI();
    
    console.log(`🕐 自动切换到 ${themes[autoTheme].name} 主题 (${hour}:00)`);
}

// 初始化主题检测
function initThemeDetection() {
    // 检查是否启用了自动主题
    if (localStorage.getItem('auto-theme-enabled') === 'true') {
        enableAutoTheme();
    }
    
    // 检测系统主题偏好
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        darkModeQuery.addEventListener('change', (e) => {
            if (localStorage.getItem('auto-theme-enabled') !== 'true') {
                const systemTheme = e.matches ? 'dark' : 'default';
                switchTheme(systemTheme);
            }
        });
        
        // 如果没有保存的主题偏好，使用系统主题
        if (!localStorage.getItem('preferred-theme')) {
            const systemTheme = darkModeQuery.matches ? 'dark' : 'default';
            currentTheme = systemTheme;
            applyTheme(systemTheme);
        }
    }
}

// 特殊主题（节日主题）
function initSpecialThemes() {
    checkHolidayThemes();
}

// 检查节日主题
function checkHolidayThemes() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    let holidayTheme = null;
    
    // 情人节 (2/14)
    if (month === 2 && day === 14) {
        holidayTheme = 'valentine';
        applyValentineTheme();
    }
    // 圣诞节 (12/25)
    else if (month === 12 && day === 25) {
        holidayTheme = 'christmas';
        applyChristmasTheme();
    }
    // 新年 (1/1)
    else if (month === 1 && day === 1) {
        holidayTheme = 'newyear';
        applyNewYearTheme();
    }
    // 中秋节（农历八月十五，这里简化为公历9/15）
    else if (month === 9 && day === 15) {
        holidayTheme = 'autumn';
        applyAutumnTheme();
    }
    
    if (holidayTheme) {
        showHolidayNotification(holidayTheme);
    }
}

// 情人节主题
function applyValentineTheme() {
    document.body.classList.add('valentine-theme');
    
    // 添加爱心飘落效果
    const heartsContainer = document.createElement('div');
    heartsContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
    `;
    
    function createFallingHeart() {
        const heart = document.createElement('div');
        heart.innerHTML = '💕';
        heart.style.cssText = `
            position: absolute;
            font-size: ${Math.random() * 20 + 15}px;
            left: ${Math.random() * 100}%;
            animation: fall ${Math.random() * 3 + 4}s linear forwards;
            opacity: ${Math.random() * 0.5 + 0.3};
        `;
        heartsContainer.appendChild(heart);
        
        setTimeout(() => {
            if (heartsContainer.contains(heart)) {
                heartsContainer.removeChild(heart);
            }
        }, 7000);
    }
    
    document.body.appendChild(heartsContainer);
    setInterval(createFallingHeart, 1000);
    
    // 添加情人节动画样式
    if (!document.getElementById('valentine-style')) {
        const style = document.createElement('style');
        style.id = 'valentine-style';
        style.textContent = `
            @keyframes fall {
                to {
                    transform: translateY(100vh) rotate(360deg);
                }
            }
            
            .valentine-theme {
                --theme-primary: #FFB6C1;
                --theme-secondary: #FFC0CB;
                --theme-accent: #FF69B4;
                --theme-golden: #FF1493;
            }
        `;
        document.head.appendChild(style);
    }
}

// 圣诞节主题
function applyChristmasTheme() {
    document.body.classList.add('christmas-theme');
    
    // 添加雪花效果
    const snowContainer = document.createElement('div');
    snowContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
    `;
    
    function createSnowflake() {
        const snowflake = document.createElement('div');
        snowflake.innerHTML = '❄️';
        snowflake.style.cssText = `
            position: absolute;
            font-size: ${Math.random() * 15 + 10}px;
            left: ${Math.random() * 100}%;
            animation: snowfall ${Math.random() * 3 + 3}s linear forwards;
            opacity: ${Math.random() * 0.8 + 0.2};
        `;
        snowContainer.appendChild(snowflake);
        
        setTimeout(() => {
            if (snowContainer.contains(snowflake)) {
                snowContainer.removeChild(snowflake);
            }
        }, 6000);
    }
    
    document.body.appendChild(snowContainer);
    setInterval(createSnowflake, 300);
    
    // 添加圣诞节样式
    if (!document.getElementById('christmas-style')) {
        const style = document.createElement('style');
        style.id = 'christmas-style';
        style.textContent = `
            @keyframes snowfall {
                to {
                    transform: translateY(100vh);
                }
            }
            
            .christmas-theme {
                --theme-primary: #E8F5E8;
                --theme-secondary: #FFE4E1;
                --theme-accent: #DC143C;
                --theme-golden: #FFD700;
            }
        `;
        document.head.appendChild(style);
    }
}

// 新年主题
function applyNewYearTheme() {
    document.body.classList.add('newyear-theme');
    
    // 添加烟花效果
    setTimeout(() => {
        if (window.EnhancedEffects && window.EnhancedEffects.showAdvancedCelebration) {
            window.EnhancedEffects.showAdvancedCelebration();
        }
    }, 1000);
    
    // 添加新年样式
    if (!document.getElementById('newyear-style')) {
        const style = document.createElement('style');
        style.id = 'newyear-style';
        style.textContent = `
            .newyear-theme {
                --theme-primary: #FFD700;
                --theme-secondary: #FFA500;
                --theme-accent: #FF6347;
                --theme-golden: #FFD700;
            }
        `;
        document.head.appendChild(style);
    }
}

// 中秋主题
function applyAutumnTheme() {
    document.body.classList.add('autumn-theme');
    
    // 添加落叶效果
    const leavesContainer = document.createElement('div');
    leavesContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
    `;
    
    function createFallingLeaf() {
        const leaves = ['🍂', '🍁', '🌾'];
        const leaf = document.createElement('div');
        leaf.innerHTML = leaves[Math.floor(Math.random() * leaves.length)];
        leaf.style.cssText = `
            position: absolute;
            font-size: ${Math.random() * 20 + 15}px;
            left: ${Math.random() * 100}%;
            animation: leaffall ${Math.random() * 4 + 4}s linear forwards;
            opacity: ${Math.random() * 0.7 + 0.3};
        `;
        leavesContainer.appendChild(leaf);
        
        setTimeout(() => {
            if (leavesContainer.contains(leaf)) {
                leavesContainer.removeChild(leaf);
            }
        }, 8000);
    }
    
    document.body.appendChild(leavesContainer);
    setInterval(createFallingLeaf, 800);
    
    // 添加秋天样式
    if (!document.getElementById('autumn-style')) {
        const style = document.createElement('style');
        style.id = 'autumn-style';
        style.textContent = `
            @keyframes leaffall {
                to {
                    transform: translateY(100vh) rotate(360deg);
                }
            }
            
            .autumn-theme {
                --theme-primary: #DEB887;
                --theme-secondary: #F4A460;
                --theme-accent: #CD853F;
                --theme-golden: #DAA520;
            }
        `;
        document.head.appendChild(style);
    }
}

// 显示节日通知
function showHolidayNotification(holidayType) {
    const messages = {
        valentine: '💕 情人节快乐！为你们启用了特别的爱心主题',
        christmas: '🎄 圣诞快乐！雪花为你们的心愿增添魔力',
        newyear: '🎊 新年快乐！愿新的一年所有心愿都成真',
        autumn: '🌾 中秋快乐！月圆之夜，心愿更容易实现'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--theme-card-bg);
        color: var(--theme-text-primary);
        padding: 20px 30px;
        border-radius: 20px;
        box-shadow: 0 10px 30px var(--theme-shadow);
        z-index: 10001;
        text-align: center;
        font-size: 16px;
        backdrop-filter: blur(15px);
        border: 2px solid var(--theme-golden);
        animation: holidayPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    notification.innerHTML = `
        <div style="margin-bottom: 10px; font-size: 24px;">
            ${holidayType === 'valentine' ? '💕' : holidayType === 'christmas' ? '🎄' : holidayType === 'newyear' ? '🎊' : '🌕'}
        </div>
        <div>${messages[holidayType]}</div>
        <button onclick="this.parentNode.remove()" style="
            margin-top: 15px;
            background: var(--theme-golden);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 14px;
        ">知道了</button>
    `;
    
    // 添加节日弹窗动画
    if (!document.getElementById('holiday-style')) {
        const style = document.createElement('style');
        style.id = 'holiday-style';
        style.textContent = `
            @keyframes holidayPop {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 10秒后自动关闭
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 10000);
}

// 导出主题切换函数供外部调用
window.ThemeSwitcher = {
    switchTheme,
    getCurrentTheme: () => currentTheme,
    enableAutoTheme,
    themes
};

console.log('🎨 主题切换器已加载完成');
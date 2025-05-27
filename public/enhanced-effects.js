// 增强交互效果脚本 - 可以通过 <script> 标签引入到现有 HTML 中

// 等待页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 加载增强效果...');
    
    // 初始化所有效果
    initEnhancedStars();
    initFloatingParticles();
    initMeteorShower();
    initRippleEffects();
    initParallaxEffect();
    initSmoothAnimations();
    initAdvancedCelebration();
    initMouseTrail();
    initDynamicColors();
    
    console.log('✨ 所有增强效果已加载完成');
});

// 增强版星空背景
function initEnhancedStars() {
    const starsContainer = document.getElementById('stars');
    if (!starsContainer) return;
    
    // 清除原有星星
    starsContainer.innerHTML = '';
    
    // 创建多层星空
    for (let layer = 0; layer < 3; layer++) {
        const layerDiv = document.createElement('div');
        layerDiv.className = `star-layer-${layer}`;
        layerDiv.style.position = 'absolute';
        layerDiv.style.width = '100%';
        layerDiv.style.height = '100%';
        
        const starCount = 30 - layer * 5;
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            star.style.animationDuration = (2 + Math.random() * 2) + 's';
            
            // 不同层级的星星大小和亮度
            const size = (3 - layer) * 0.8;
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            star.style.opacity = (0.8 - layer * 0.2);
            
            layerDiv.appendChild(star);
        }
        
        starsContainer.appendChild(layerDiv);
    }
}

// 浮动粒子效果
function initFloatingParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'floating-particles';
    document.body.appendChild(particlesContainer);
    
    function createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (4 + Math.random() * 4) + 's';
        particle.style.animationDelay = Math.random() * 2 + 's';
        
        // 随机颜色
        const colors = ['rgba(255, 107, 157, 0.6)', 'rgba(78, 205, 196, 0.6)', 'rgba(247, 215, 148, 0.6)'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        particlesContainer.appendChild(particle);
        
        // 粒子动画结束后移除
        setTimeout(() => {
            if (particlesContainer.contains(particle)) {
                particlesContainer.removeChild(particle);
            }
        }, 8000);
    }
    
    // 定期创建粒子
    setInterval(createParticle, 1500);
}

// 流星雨效果
function initMeteorShower() {
    const meteorsContainer = document.createElement('div');
    meteorsContainer.style.position = 'fixed';
    meteorsContainer.style.top = '0';
    meteorsContainer.style.left = '0';
    meteorsContainer.style.width = '100%';
    meteorsContainer.style.height = '100%';
    meteorsContainer.style.pointerEvents = 'none';
    meteorsContainer.style.zIndex = '-1';
    document.body.appendChild(meteorsContainer);
    
    function createMeteor() {
        const meteor = document.createElement('div');
        meteor.className = 'meteor';
        meteor.style.left = Math.random() * 100 + '%';
        meteor.style.top = Math.random() * 20 + '%';
        meteor.style.width = (50 + Math.random() * 100) + 'px';
        meteor.style.animationDuration = (1 + Math.random() * 2) + 's';
        
        meteorsContainer.appendChild(meteor);
        
        setTimeout(() => {
            if (meteorsContainer.contains(meteor)) {
                meteorsContainer.removeChild(meteor);
            }
        }, 3000);
    }
    
    // 随机生成流星
    setInterval(() => {
        if (Math.random() < 0.3) { // 30% 概率生成流星
            createMeteor();
        }
    }, 2000);
}

// 水波纹点击效果
function initRippleEffects() {
    document.addEventListener('click', function(e) {
        // 只在特定元素上添加水波纹效果
        if (e.target.matches('.btn, .wish-status, .add-wish-btn')) {
            createRipple(e, e.target);
        }
    });
}

function createRipple(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        z-index: 1000;
    `;
    
    // 添加波纹动画样式
    if (!document.getElementById('ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => {
        if (element.contains(ripple)) {
            element.removeChild(ripple);
        }
    }, 600);
}

// 视差滚动效果
function initParallaxEffect() {
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        const stars = document.getElementById('stars');
        if (stars) {
            stars.style.transform = `translateY(${rate}px)`;
        }
        
        // 欢迎页面元素的视差效果
        const welcomeCard = document.querySelector('.welcome-card');
        if (welcomeCard) {
            const cardRate = scrolled * -0.3;
            welcomeCard.style.transform = `translateY(${cardRate}px)`;
        }
    });
}

// 平滑动画增强
function initSmoothAnimations() {
    // 观察器，为进入视窗的元素添加动画
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }
        });
    }, {
        threshold: 0.1
    });
    
    // 添加淡入上升动画样式
    if (!document.getElementById('smooth-animations-style')) {
        const style = document.createElement('style');
        style.id = 'smooth-animations-style';
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .wish-card {
                transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            
            .wish-card:nth-child(odd) {
                animation-delay: 0.1s;
            }
            
            .wish-card:nth-child(even) {
                animation-delay: 0.2s;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 观察所有心愿卡片
    setTimeout(() => {
        const wishCards = document.querySelectorAll('.wish-card');
        wishCards.forEach(card => observer.observe(card));
    }, 1000);
}

// 高级庆祝动画
function initAdvancedCelebration() {
    // 重写原有的 showCelebration 函数
    window.showAdvancedCelebration = function() {
        createConfetti();
        createFloatingHearts();
        createSparkles();
        playSuccessSound();
    };
}

function createConfetti() {
    const colors = ['#ff6b9d', '#4ecdc4', '#f7d794', '#a8e6cf', '#ffd3a5'];
    const confettiContainer = document.createElement('div');
    confettiContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
    `;
    document.body.appendChild(confettiContainer);
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
            animation-delay: ${Math.random() * 2}s;
        `;
        confettiContainer.appendChild(confetti);
    }
    
    // 添加彩纸动画样式
    if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
            @keyframes confetti-fall {
                0% {
                    transform: translateY(-100vh) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(100vh) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        if (document.body.contains(confettiContainer)) {
            document.body.removeChild(confettiContainer);
        }
    }, 5000);
}

function createFloatingHearts() {
    const heartsContainer = document.createElement('div');
    heartsContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 9999;
    `;
    document.body.appendChild(heartsContainer);
    
    for (let i = 0; i < 10; i++) {
        const heart = document.createElement('div');
        heart.innerHTML = '💕';
        heart.style.cssText = `
            position: absolute;
            font-size: ${20 + Math.random() * 20}px;
            left: ${(Math.random() - 0.5) * 200}px;
            top: ${(Math.random() - 0.5) * 200}px;
            animation: float-heart 3s ease-out forwards;
            animation-delay: ${Math.random() * 1}s;
        `;
        heartsContainer.appendChild(heart);
    }
    
    // 添加爱心浮动动画样式
    if (!document.getElementById('hearts-style')) {
        const style = document.createElement('style');
        style.id = 'hearts-style';
        style.textContent = `
            @keyframes float-heart {
                0% {
                    opacity: 1;
                    transform: translateY(0) scale(0);
                }
                50% {
                    opacity: 1;
                    transform: translateY(-50px) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-100px) scale(1.2);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        if (document.body.contains(heartsContainer)) {
            document.body.removeChild(heartsContainer);
        }
    }, 4000);
}

function createSparkles() {
    const sparklesContainer = document.createElement('div');
    sparklesContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
    `;
    document.body.appendChild(sparklesContainer);
    
    for (let i = 0; i < 20; i++) {
        const sparkle = document.createElement('div');
        sparkle.innerHTML = '✨';
        sparkle.style.cssText = `
            position: absolute;
            font-size: ${15 + Math.random() * 10}px;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: sparkle-twinkle 2s ease-in-out infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        sparklesContainer.appendChild(sparkle);
    }
    
    // 添加闪烁动画样式
    if (!document.getElementById('sparkles-style')) {
        const style = document.createElement('style');
        style.id = 'sparkles-style';
        style.textContent = `
            @keyframes sparkle-twinkle {
                0%, 100% {
                    opacity: 0;
                    transform: scale(0) rotate(0deg);
                }
                50% {
                    opacity: 1;
                    transform: scale(1) rotate(180deg);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        if (document.body.contains(sparklesContainer)) {
            document.body.removeChild(sparklesContainer);
        }
    }, 3000);
}

// 播放成功音效（使用 Web Audio API）
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建成功音效
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('音效播放失败，但这不影响功能', error);
    }
}

// 鼠标轨迹效果
function initMouseTrail() {
    const trail = [];
    const trailLength = 20;
    
    document.addEventListener('mousemove', function(e) {
        // 添加新的轨迹点
        trail.push({
            x: e.clientX,
            y: e.clientY,
            time: Date.now()
        });
        
        // 限制轨迹长度
        if (trail.length > trailLength) {
            trail.shift();
        }
        
        // 创建轨迹元素（节流处理）
        if (Math.random() < 0.3) {
            createTrailParticle(e.clientX, e.clientY);
        }
    });
}

function createTrailParticle(x, y) {
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 4px;
        height: 4px;
        background: radial-gradient(circle, rgba(255,107,157,0.8) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9998;
        animation: trail-fade 1s ease-out forwards;
    `;
    
    document.body.appendChild(particle);
    
    // 添加轨迹动画样式
    if (!document.getElementById('trail-style')) {
        const style = document.createElement('style');
        style.id = 'trail-style';
        style.textContent = `
            @keyframes trail-fade {
                0% {
                    opacity: 1;
                    transform: scale(1);
                }
                100% {
                    opacity: 0;
                    transform: scale(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        if (document.body.contains(particle)) {
            document.body.removeChild(particle);
        }
    }, 1000);
}

// 动态配色系统
function initDynamicColors() {
    // 根据时间动态改变主色调
    function updateDynamicColors() {
        const hour = new Date().getHours();
        let primaryColor, secondaryColor, accentColor;
        
        if (hour >= 6 && hour < 12) {
            // 早晨：温暖的橙粉色
            primaryColor = '#FFB5A7';
            secondaryColor = '#F8AD9D';
            accentColor = '#F4976C';
        } else if (hour >= 12 && hour < 18) {
            // 下午：活力的粉蓝色
            primaryColor = '#FFE4E6';
            secondaryColor = '#E8F4F8';
            accentColor = '#4ECDC4';
        } else if (hour >= 18 && hour < 22) {
            // 傍晚：浪漫的紫粉色
            primaryColor = '#F8BBD9';
            secondaryColor = '#E4C1F9';
            accentColor = '#A663CC';
        } else {
            // 夜晚：神秘的深蓝色
            primaryColor = '#B8B8D6';
            secondaryColor = '#8B93ED';
            accentColor = '#6C5CE7';
        }
        
        // 更新 CSS 变量
        document.documentElement.style.setProperty('--primary-pink', primaryColor);
        document.documentElement.style.setProperty('--soft-pink', secondaryColor);
        document.documentElement.style.setProperty('--dynamic-accent', accentColor);
    }
    
    // 初始更新
    updateDynamicColors();
    
    // 每小时更新一次
    setInterval(updateDynamicColors, 3600000);
}

// 增强心愿卡片交互
function enhanceWishCards() {
    // 等待心愿卡片加载
    setTimeout(() => {
        const wishCards = document.querySelectorAll('.wish-card');
        wishCards.forEach((card, index) => {
            // 添加悬浮效果
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-8px) scale(1.02)';
                this.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 20px rgba(255, 107, 157, 0.3)';
                this.style.zIndex = '10';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
                this.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.08)';
                this.style.zIndex = 'auto';
            });
            
            // 添加倾斜效果
            card.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                this.style.transform = `translateY(-8px) scale(1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
        });
    }, 2000);
}

// 季节性主题
function initSeasonalThemes() {
    const month = new Date().getMonth();
    let seasonalClass = '';
    
    if (month >= 2 && month <= 4) {
        seasonalClass = 'spring-theme';
    } else if (month >= 5 && month <= 7) {
        seasonalClass = 'summer-theme';
    } else if (month >= 8 && month <= 10) {
        seasonalClass = 'autumn-theme';
    } else {
        seasonalClass = 'winter-theme';
    }
    
    document.body.classList.add(seasonalClass);
    
    // 添加季节性样式
    if (!document.getElementById('seasonal-style')) {
        const style = document.createElement('style');
        style.id = 'seasonal-style';
        style.textContent = `
            .spring-theme {
                --seasonal-primary: #FFB7C5;
                --seasonal-secondary: #98FB98;
                --seasonal-accent: #FFB6C1;
            }
            
            .summer-theme {
                --seasonal-primary: #FFE135;
                --seasonal-secondary: #87CEEB;
                --seasonal-accent: #FF6347;
            }
            
            .autumn-theme {
                --seasonal-primary: #DEB887;
                --seasonal-secondary: #CD853F;
                --seasonal-accent: #D2691E;
            }
            
            .winter-theme {
                --seasonal-primary: #B0E0E6;
                --seasonal-secondary: #E6E6FA;
                --seasonal-accent: #4682B4;
            }
        `;
        document.head.appendChild(style);
    }
}

// 性能监测
function initPerformanceMonitoring() {
    let animationFrameId;
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 0;
    
    function calculateFPS() {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime >= lastTime + 1000) {
            fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
            frameCount = 0;
            lastTime = currentTime;
            
            // 如果 FPS 过低，禁用一些动画效果
            if (fps < 30) {
                document.body.classList.add('low-performance');
                console.warn('⚠️ 检测到低性能设备，已禁用部分动画效果');
            } else {
                document.body.classList.remove('low-performance');
            }
        }
        
        animationFrameId = requestAnimationFrame(calculateFPS);
    }
    
    // 开始监测
    animationFrameId = requestAnimationFrame(calculateFPS);
    
    // 添加低性能模式样式
    if (!document.getElementById('performance-style')) {
        const style = document.createElement('style');
        style.id = 'performance-style';
        style.textContent = `
            .low-performance * {
                animation-duration: 0.1s !important;
                transition-duration: 0.1s !important;
            }
            
            .low-performance .floating-particles,
            .low-performance .enhanced-stars,
            .low-performance .meteor {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// 无障碍增强
function initAccessibilityEnhancements() {
    // 键盘导航增强
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-navigation');
    });
    
    // 添加无障碍样式
    if (!document.getElementById('accessibility-style')) {
        const style = document.createElement('style');
        style.id = 'accessibility-style';
        style.textContent = `
            .keyboard-navigation *:focus {
                outline: 3px solid #4ECDC4 !important;
                outline-offset: 2px !important;
            }
            
            @media (prefers-reduced-motion: reduce) {
                * {
                    animation-duration: 0.01s !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01s !important;
                }
            }
            
            @media (prefers-contrast: high) {
                .wish-card {
                    border: 2px solid #000 !important;
                }
                
                .btn {
                    border: 2px solid #000 !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// 延迟加载部分效果以提升初始加载性能
setTimeout(() => {
    enhanceWishCards();
    initSeasonalThemes();
    initPerformanceMonitoring();
    initAccessibilityEnhancements();
}, 3000);

// 导出一些函数供外部调用
window.EnhancedEffects = {
    showAdvancedCelebration: window.showAdvancedCelebration,
    createRipple,
    playSuccessSound
};
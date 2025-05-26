// 工具函数库
window.Utils = {
    // 日期处理
    date: {
        // 格式化日期
        format(date, format = 'YYYY-MM-DD') {
            if (!date) return '';
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            
            return format
                .replace('YYYY', year)
                .replace('MM', month)
                .replace('DD', day)
                .replace('HH', hours)
                .replace('mm', minutes);
        },

        // 计算日期差
        daysBetween(date1, date2) {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            const timeDiff = Math.abs(d2.getTime() - d1.getTime());
            return Math.ceil(timeDiff / (1000 * 3600 * 24));
        },

        // 获取相对时间
        getRelativeTime(date) {
            const now = new Date();
            const targetDate = new Date(date);
            const diffInSeconds = Math.floor((now - targetDate) / 1000);

            if (diffInSeconds < 60) return '刚刚';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
            if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;
            if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}个月前`;
            return `${Math.floor(diffInSeconds / 31536000)}年前`;
        },

        // 是否为今天
        isToday(date) {
            const today = new Date();
            const targetDate = new Date(date);
            return today.toDateString() === targetDate.toDateString();
        },

        // 获取月份的天数
        getDaysInMonth(year, month) {
            return new Date(year, month + 1, 0).getDate();
        },

        // 获取月份第一天是星期几
        getFirstDayOfMonth(year, month) {
            return new Date(year, month, 1).getDay();
        }
    },

    // 字符串处理
    string: {
        // 截断文本
        truncate(text, length = 100, suffix = '...') {
            if (!text || text.length <= length) return text;
            return text.substring(0, length) + suffix;
        },

        // 首字母大写
        capitalize(text) {
            if (!text) return '';
            return text.charAt(0).toUpperCase() + text.slice(1);
        },

        // 生成随机字符串
        random(length = 8) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        // 转换为URL友好的字符串
        slugify(text) {
            return text
                .toString()
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');
        }
    },

    // 数组处理
    array: {
        // 数组去重
        unique(arr) {
            return [...new Set(arr)];
        },

        // 随机打乱数组
        shuffle(arr) {
            const newArr = [...arr];
            for (let i = newArr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
            }
            return newArr;
        },

        // 获取随机元素
        randomItem(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        },

        // 数组分组
        groupBy(arr, key) {
            return arr.reduce((groups, item) => {
                const group = item[key];
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        },

        // 数组排序
        sortBy(arr, key, desc = false) {
            return [...arr].sort((a, b) => {
                const aVal = a[key];
                const bVal = b[key];
                if (aVal < bVal) return desc ? 1 : -1;
                if (aVal > bVal) return desc ? -1 : 1;
                return 0;
            });
        }
    },

    // 对象处理
    object: {
        // 深拷贝
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            if (typeof obj === 'object') {
                const clonedObj = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        clonedObj[key] = this.deepClone(obj[key]);
                    }
                }
                return clonedObj;
            }
        },

        // 合并对象
        merge(target, ...sources) {
            if (!sources.length) return target;
            const source = sources.shift();
            
            if (this.isObject(target) && this.isObject(source)) {
                for (const key in source) {
                    if (this.isObject(source[key])) {
                        if (!target[key]) Object.assign(target, { [key]: {} });
                        this.merge(target[key], source[key]);
                    } else {
                        Object.assign(target, { [key]: source[key] });
                    }
                }
            }
            
            return this.merge(target, ...sources);
        },

        // 判断是否为对象
        isObject(item) {
            return item && typeof item === 'object' && !Array.isArray(item);
        },

        // 获取嵌套属性
        get(obj, path, defaultValue = undefined) {
            const keys = path.split('.');
            let result = obj;
            
            for (const key of keys) {
                if (result == null || typeof result !== 'object') {
                    return defaultValue;
                }
                result = result[key];
            }
            
            return result !== undefined ? result : defaultValue;
        }
    },

    // 数字处理
    number: {
        // 格式化数字
        format(num, decimals = 0) {
            return new Intl.NumberFormat('zh-CN', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(num);
        },

        // 生成随机数
        random(min = 0, max = 100) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        // 限制数字范围
        clamp(num, min, max) {
            return Math.min(Math.max(num, min), max);
        },

        // 百分比计算
        percentage(value, total) {
            if (total === 0) return 0;
            return Math.round((value / total) * 100);
        }
    },

    // DOM操作
    dom: {
        // 获取元素
        $(selector) {
            return document.querySelector(selector);
        },

        // 获取所有元素
        $(selector) {
            return Array.from(document.querySelectorAll(selector));
        },

        // 添加类名
        addClass(element, className) {
            if (element) element.classList.add(className);
        },

        // 移除类名
        removeClass(element, className) {
            if (element) element.classList.remove(className);
        },

        // 切换类名
        toggleClass(element, className) {
            if (element) element.classList.toggle(className);
        },

        // 检查是否有类名
        hasClass(element, className) {
            return element ? element.classList.contains(className) : false;
        },

        // 创建元素
        createElement(tag, attributes = {}, children = []) {
            const element = document.createElement(tag);
            
            // 设置属性
            Object.keys(attributes).forEach(key => {
                if (key === 'className') {
                    element.className = attributes[key];
                } else if (key === 'innerHTML') {
                    element.innerHTML = attributes[key];
                } else {
                    element.setAttribute(key, attributes[key]);
                }
            });
            
            // 添加子元素
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else {
                    element.appendChild(child);
                }
            });
            
            return element;
        },

        // 平滑滚动到元素
        scrollTo(element, offset = 0) {
            if (!element) return;
            const top = element.offsetTop - offset;
            window.scrollTo({
                top,
                behavior: 'smooth'
            });
        }
    },

    // 事件处理
    event: {
        // 防抖
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // 节流
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // 一次性事件监听
        once(element, event, callback) {
            const handler = (e) => {
                callback(e);
                element.removeEventListener(event, handler);
            };
            element.addEventListener(event, handler);
        }
    },

    // 验证
    validate: {
        // 邮箱验证
        email(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        // 手机号验证
        phone(phone) {
            const re = /^1[3-9]\d{9}$/;
            return re.test(phone);
        },

        // 非空验证
        required(value) {
            return value !== null && value !== undefined && value.toString().trim() !== '';
        },

        // 长度验证
        length(value, min, max) {
            const len = value ? value.toString().length : 0;
            return len >= min && len <= max;
        },

        // URL验证
        url(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        }
    },

    // 文件处理
    file: {
        // 格式化文件大小
        formatSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // 获取文件扩展名
        getExtension(filename) {
            return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
        },

        // 检查文件类型
        isImage(file) {
            return file.type.startsWith('image/');
        },

        // 读取文件为DataURL
        readAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
    },

    // 颜色处理
    color: {
        // 十六进制转RGB
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        // RGB转十六进制
        rgbToHex(r, g, b) {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        },

        // 生成随机颜色
        random() {
            return '#' + Math.floor(Math.random() * 16777215).toString(16);
        }
    },

    // 性能监控
    performance: {
        // 测量执行时间
        measure(name, fn) {
            const start = performance.now();
            const result = fn();
            const end = performance.now();
            console.log(`${name} 执行时间: ${end - start} ms`);
            return result;
        },

        // 空闲时执行
        idle(callback) {
            if (window.requestIdleCallback) {
                window.requestIdleCallback(callback);
            } else {
                setTimeout(callback, 1);
            }
        }
    },

    // 浏览器检测
    browser: {
        // 检测是否为移动设备
        isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },

        // 检测是否支持触摸
        hasTouch() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },

        // 获取浏览器信息
        getInfo() {
            const ua = navigator.userAgent;
            return {
                chrome: /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor),
                firefox: /Firefox/.test(ua),
                safari: /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor),
                edge: /Edg/.test(ua),
                ie: /Trident/.test(ua)
            };
        },

        // 检测在线状态
        isOnline() {
            return navigator.onLine;
        }
    }
};

// 冻结工具对象
Object.freeze(window.Utils);
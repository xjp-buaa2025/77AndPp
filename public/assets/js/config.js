// 应用配置
window.CoupleConfig = {
    // 应用信息
    app: {
        name: '我们的小星球',
        version: '1.0.0',
        description: '情侣专属的温馨小站'
    },

    // API配置
    api: {
        baseUrl: '/api',
        timeout: 10000,
        endpoints: {
            auth: '/auth',
            diary: '/diary',
            wishlist: '/wishlist',
            calendar: '/calendar',
            countdown: '/countdown',
            stats: '/stats'
        }
    },

    // 本地存储键名
    storage: {
        keys: {
            isLoggedIn: 'isLoggedIn',
            coupleCode: 'coupleCode',
            events: 'events',
            wishes: 'wishes',
            diaries: 'diaries',
            anniversaries: 'anniversaries',
            relationshipStart: 'relationshipStart',
            autoBackup: 'autoBackup',
            userPreferences: 'userPreferences'
        }
    },

    // 情话库
    loveQuotes: [
        "无论今天多忙，我的想念永远准时。",
        "爱你的这颗心，比昨天多一点，比明天少一点。",
        "你是我见过最美的意外，也是最甜的必然。",
        "今天的月亮很美，但不及你眼中的星光。",
        "和你在一起的每一天，都是我想要的明天。",
        "你笑起来真好看，像春天的花一样。",
        "世界那么大，我的心那么小，刚好装下一个你。",
        "遇见你之后，生活不再是生存，而是生活。",
        "愿得一心人，白首不相离。",
        "你是我的今天，也是我所有的明天。",
        "最美的不是下雨天，是曾与你躲过雨的屋檐。",
        "我想和你一起生活，在某个小镇，共享无尽的黄昏。",
        "山野万里，你是我藏在微风中的欢喜。",
        "愿有岁月可回首，且以深情共白头。",
        "陪伴是最长情的告白，相守是最温暖的承诺。"
    ],

    // 心愿分类
    wishCategories: [
        { value: 'travel', label: '🌍 旅行', icon: '🌍' },
        { value: 'food', label: '🍰 美食', icon: '🍰' },
        { value: 'entertainment', label: '🎬 娱乐', icon: '🎬' },
        { value: 'learning', label: '📚 学习', icon: '📚' },
        { value: 'fitness', label: '💪 健身', icon: '💪' },
        { value: 'home', label: '🏠 居家', icon: '🏠' },
        { value: 'creative', label: '🎨 创意', icon: '🎨' },
        { value: 'social', label: '👥 社交', icon: '👥' },
        { value: 'general', label: '✨ 其他', icon: '✨' }
    ],

    // 心情标签
    moodTags: [
        { value: 'happy', label: '😊 开心', icon: '😊', color: '#f59e0b' },
        { value: 'love', label: '💕 甜蜜', icon: '💕', color: '#ec4899' },
        { value: 'grateful', label: '🙏 感激', icon: '🙏', color: '#10b981' },
        { value: 'excited', label: '✨ 兴奋', icon: '✨', color: '#8b5cf6' },
        { value: 'peaceful', label: '🌸 平静', icon: '🌸', color: '#06b6d4' },
        { value: 'romantic', label: '🌹 浪漫', icon: '🌹', color: '#f43f5e' },
        { value: 'nostalgic', label: '🌙 怀念', icon: '🌙', color: '#6b7280' },
        { value: 'playful', label: '🎈 俏皮', icon: '🎈', color: '#f97316' }
    ],

    // 事件颜色
    eventColors: [
        { value: 'pink', label: '粉色 - 纪念日', color: '#FFB3C1' },
        { value: 'blue', label: '蓝色 - 约会', color: '#87CEEB' },
        { value: 'yellow', label: '黄色 - 计划', color: '#F4D03F' },
        { value: 'green', label: '绿色 - 旅行', color: '#98FB98' },
        { value: 'purple', label: '紫色 - 特殊', color: '#DDA0DD' },
        { value: 'orange', label: '橙色 - 活动', color: '#FFB347' }
    ],

    // 动画配置
    animation: {
        duration: {
            fast: 150,
            normal: 300,
            slow: 500
        },
        easing: {
            ease: 'ease',
            easeInOut: 'ease-in-out',
            easeOut: 'ease-out'
        }
    },

    // 通知配置
    notification: {
        duration: 3000,
        position: 'top-right',
        types: {
            success: { color: '#10b981', icon: '✓' },
            error: { color: '#ef4444', icon: '✗' },
            warning: { color: '#f59e0b', icon: '⚠' },
            info: { color: '#3b82f6', icon: 'ℹ' }
        }
    },

    // 分页配置
    pagination: {
        defaultSize: 10,
        sizes: [5, 10, 20, 50]
    },

    // 文件上传配置
    upload: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        imageQuality: 0.8
    },

    // 功能开关
    features: {
        enableNotifications: true,
        enableAnimations: true,
        enableBackgroundEffects: true,
        enableKeyboardShortcuts: true,
        enableAutoSave: true,
        enableOfflineMode: true
    },

    // 键盘快捷键
    shortcuts: {
        closeModal: 'Escape',
        newItem: 'ctrl+n',
        save: 'ctrl+s',
        search: 'ctrl+f'
    },

    // 主题配置
    themes: {
        default: {
            name: '默认主题',
            colors: {
                primary: '#FFB3C1',
                secondary: '#F4D03F',
                background: '#FFF8F0'
            }
        }
    },

    // 调试模式
    debug: window.location.hostname === 'localhost',

    // 错误信息
    messages: {
        errors: {
            network: '网络连接出现问题，请稍后重试',
            unauthorized: '请重新登录你们的小星球',
            forbidden: '没有权限访问这个内容',
            notFound: '内容不存在或已被删除',
            serverError: '服务器遇到了一些问题，请稍后再试',
            validation: '请检查输入的信息是否正确',
            storage: '本地存储空间不足'
        },
        success: {
            save: '保存成功！',
            delete: '删除成功！',
            update: '更新成功！',
            create: '创建成功！'
        },
        confirm: {
            delete: '确定要删除这个内容吗？',
            logout: '确定要离开你们的小星球吗？',
            clear: '确定要清空所有数据吗？这个操作不可恢复！'
        }
    }
};

// 冻结配置对象，防止被意外修改
Object.freeze(window.CoupleConfig);
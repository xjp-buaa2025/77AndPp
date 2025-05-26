// 数据存储管理
window.Storage = {
    // 获取数据
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            
            // 尝试解析JSON
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.warn(`读取存储数据失败 ${key}:`, error);
            return defaultValue;
        }
    },

    // 设置数据
    set(key, value) {
        try {
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
            return true;
        } catch (error) {
            console.error(`保存存储数据失败 ${key}:`, error);
            
            // 如果是配额错误，尝试清理一些数据
            if (error.name === 'QuotaExceededError') {
                this.cleanup();
                // 再次尝试保存
                try {
                    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
                    localStorage.setItem(key, serializedValue);
                    return true;
                } catch (retryError) {
                    console.error('重试保存失败:', retryError);
                }
            }
            
            return false;
        }
    },

    // 移除数据
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`删除存储数据失败 ${key}:`, error);
            return false;
        }
    },

    // 检查键是否存在
    has(key) {
        return localStorage.getItem(key) !== null;
    },

    // 获取所有键
    keys() {
        return Object.keys(localStorage);
    },

    // 清空所有数据
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('清空存储失败:', error);
            return false;
        }
    },

    // 获取存储使用情况
    getUsage() {
        let totalSize = 0;
        const details = {};

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = localStorage[key].length;
                totalSize += size;
                details[key] = size;
            }
        }

        return {
            total: totalSize,
            details,
            percentage: (totalSize / (5 * 1024 * 1024)) * 100 // 假设5MB限制
        };
    },

    // 清理过期数据
    cleanup() {
        try {
            const keys = this.keys();
            const now = Date.now();
            
            keys.forEach(key => {
                // 清理过期的临时数据
                if (key.startsWith('temp_')) {
                    const data = this.get(key);
                    if (data && data.expires && data.expires < now) {
                        this.remove(key);
                    }
                }
                
                // 清理过期的缓存
                if (key.startsWith('cache_')) {
                    const data = this.get(key);
                    if (data && data.timestamp) {
                        const expireTime = 24 * 60 * 60 * 1000; // 24小时
                        if (now - data.timestamp > expireTime) {
                            this.remove(key);
                        }
                    }
                }
            });
            
            console.log('存储清理完成');
        } catch (error) {
            console.error('存储清理失败:', error);
        }
    },

    // 事件管理
    events: Storage.events || {},

    // 监听存储变化
    on(key, callback) {
        if (!this.events[key]) {
            this.events[key] = [];
        }
        this.events[key].push(callback);
    },

    // 取消监听
    off(key, callback) {
        if (this.events[key]) {
            this.events[key] = this.events[key].filter(cb => cb !== callback);
        }
    },

    // 触发事件
    emit(key, newValue, oldValue) {
        if (this.events[key]) {
            this.events[key].forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error('存储事件回调错误:', error);
                }
            });
        }
    },

    // 数据备份
    backup() {
        try {
            const data = {};
            const keys = this.keys();
            
            keys.forEach(key => {
                // 只备份应用数据，跳过系统数据
                if (!key.startsWith('_') && !key.startsWith('temp_')) {
                    data[key] = this.get(key);
                }
            });
            
            return {
                timestamp: new Date().toISOString(),
                version: CoupleConfig?.app?.version || '1.0.0',
                data
            };
        } catch (error) {
            console.error('数据备份失败:', error);
            return null;
        }
    },

    // 数据恢复
    restore(backupData) {
        try {
            if (!backupData || !backupData.data) {
                throw new Error('备份数据格式错误');
            }
            
            // 恢复数据
            Object.keys(backupData.data).forEach(key => {
                this.set(key, backupData.data[key]);
            });
            
            console.log('数据恢复成功');
            return true;
        } catch (error) {
            console.error('数据恢复失败:', error);
            return false;
        }
    },

    // 数据同步（如果有多个标签页）
    sync() {
        // 监听其他标签页的存储变化
        window.addEventListener('storage', (e) => {
            if (e.key && e.newValue !== e.oldValue) {
                this.emit(e.key, e.newValue, e.oldValue);
            }
        });
    },

    // 自动保存管理
    autoSave: {
        timers: {},
        
        // 延迟保存
        debounce(key, value, delay = 1000) {
            if (this.timers[key]) {
                clearTimeout(this.timers[key]);
            }
            
            this.timers[key] = setTimeout(() => {
                Storage.set(key, value);
                delete this.timers[key];
            }, delay);
        },
        
        // 取消保存
        cancel(key) {
            if (this.timers[key]) {
                clearTimeout(this.timers[key]);
                delete this.timers[key];
            }
        },
        
        // 立即保存所有待保存的数据
        flush() {
            Object.keys(this.timers).forEach(key => {
                clearTimeout(this.timers[key]);
                delete this.timers[key];
            });
        }
    }
};

// 应用数据访问器
window.AppData = {
    // 获取事件数据
    getEvents() {
        return Storage.get(CoupleConfig.storage.keys.events, []);
    },

    // 保存事件数据
    setEvents(events) {
        Storage.set(CoupleConfig.storage.keys.events, events);
        Storage.emit('events', events);
    },

    // 添加事件
    addEvent(event) {
        const events = this.getEvents();
        events.push({
            ...event,
            id: Date.now(),
            createdAt: new Date().toISOString()
        });
        this.setEvents(events);
        return events[events.length - 1];
    },

    // 更新事件
    updateEvent(id, updates) {
        const events = this.getEvents();
        const index = events.findIndex(e => e.id === id);
        if (index !== -1) {
            events[index] = { ...events[index], ...updates, updatedAt: new Date().toISOString() };
            this.setEvents(events);
            return events[index];
        }
        return null;
    },

    // 删除事件
    deleteEvent(id) {
        const events = this.getEvents();
        const filtered = events.filter(e => e.id !== id);
        this.setEvents(filtered);
        return filtered.length < events.length;
    },

    // 获取心愿数据
    getWishes() {
        return Storage.get(CoupleConfig.storage.keys.wishes, []);
    },

    // 保存心愿数据
    setWishes(wishes) {
        Storage.set(CoupleConfig.storage.keys.wishes, wishes);
        Storage.emit('wishes', wishes);
    },

    // 添加心愿
    addWish(wish) {
        const wishes = this.getWishes();
        wishes.push({
            ...wish,
            id: Date.now(),
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        this.setWishes(wishes);
        return wishes[wishes.length - 1];
    },

    // 完成心愿
    completeWish(id) {
        const wishes = this.getWishes();
        const index = wishes.findIndex(w => w.id === id);
        if (index !== -1) {
            wishes[index].status = 'completed';
            wishes[index].completedAt = new Date().toISOString();
            this.setWishes(wishes);
            return wishes[index];
        }
        return null;
    },

    // 删除心愿
    deleteWish(id) {
        const wishes = this.getWishes();
        const filtered = wishes.filter(w => w.id !== id);
        this.setWishes(filtered);
        return filtered.length < wishes.length;
    },

    // 获取日记数据
    getDiaries() {
        return Storage.get(CoupleConfig.storage.keys.diaries, []);
    },

    // 保存日记数据
    setDiaries(diaries) {
        Storage.set(CoupleConfig.storage.keys.diaries, diaries);
        Storage.emit('diaries', diaries);
    },

    // 添加日记
    addDiary(diary) {
        const diaries = this.getDiaries();
        diaries.push({
            ...diary,
            id: Date.now(),
            createdAt: new Date().toISOString()
        });
        this.setDiaries(diaries);
        return diaries[diaries.length - 1];
    },

    // 更新日记
    updateDiary(id, updates) {
        const diaries = this.getDiaries();
        const index = diaries.findIndex(d => d.id === id);
        if (index !== -1) {
            diaries[index] = { ...diaries[index], ...updates, updatedAt: new Date().toISOString() };
            this.setDiaries(diaries);
            return diaries[index];
        }
        return null;
    },

    // 删除日记
    deleteDiary(id) {
        const diaries = this.getDiaries();
        const filtered = diaries.filter(d => d.id !== id);
        this.setDiaries(filtered);
        return filtered.length < diaries.length;
    },

    // 获取纪念日数据
    getAnniversaries() {
        return Storage.get(CoupleConfig.storage.keys.anniversaries, []);
    },

    // 保存纪念日数据
    setAnniversaries(anniversaries) {
        Storage.set(CoupleConfig.storage.keys.anniversaries, anniversaries);
        Storage.emit('anniversaries', anniversaries);
    },

    // 添加纪念日
    addAnniversary(anniversary) {
        const anniversaries = this.getAnniversaries();
        anniversaries.push({
            ...anniversary,
            id: Date.now(),
            createdAt: new Date().toISOString()
        });
        this.setAnniversaries(anniversaries);
        return anniversaries[anniversaries.length - 1];
    },

    // 删除纪念日
    deleteAnniversary(id) {
        const anniversaries = this.getAnniversaries();
        const filtered = anniversaries.filter(a => a.id !== id);
        this.setAnniversaries(filtered);
        return filtered.length < anniversaries.length;
    },

    // 获取统计数据
    getStats() {
        const events = this.getEvents();
        const wishes = this.getWishes();
        const diaries = this.getDiaries();
        const anniversaries = this.getAnniversaries();

        const startDate = new Date(Storage.get(CoupleConfig.storage.keys.relationshipStart) || '2023-01-01');
        const today = new Date();
        const daysTogether = Utils.date.daysBetween(startDate, today);

        return {
            daysTogether,
            totalEvents: events.length,
            totalWishes: wishes.length,
            completedWishes: wishes.filter(w => w.status === 'completed').length,
            totalDiaries: diaries.length,
            totalAnniversaries: anniversaries.length,
            totalMemories: events.length + diaries.length
        };
    }
};

// 初始化存储
Storage.sync();

// 定期清理存储
setInterval(() => {
    Storage.cleanup();
}, 60 * 60 * 1000); // 每小时清理一次

// 页面卸载前保存所有待保存的数据
window.addEventListener('beforeunload', () => {
    Storage.autoSave.flush();
});

// 冻结对象
Object.freeze(Storage);
Object.freeze(AppData);
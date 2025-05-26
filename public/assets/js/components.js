// 通用组件库
window.Components = {
    // 模态框组件
    modal: {
        // 打开模态框
        open(modalId) {
            const modal = Utils.dom.$(`#${modalId}`);
            if (modal) {
                modal.classList.add('active');
                
                // 聚焦到第一个输入框
                const firstInput = modal.querySelector('input, textarea, select');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
                
                // 阻止背景滚动
                document.body.style.overflow = 'hidden';
            }
        },

        // 关闭模态框
        close(modalId) {
            const modal = Utils.dom.$(`#${modalId}`);
            if (modal) {
                modal.classList.remove('active');
                
                // 恢复背景滚动
                document.body.style.overflow = '';
                
                // 清除表单数据
                const form = modal.querySelector('form');
                if (form) {
                    form.reset();
                }
            }
        },

        // 关闭所有模态框
        closeAll() {
            Utils.dom.$$('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
            document.body.style.overflow = '';
        },

        // 创建模态框
        create(options) {
            const {
                id,
                title,
                content,
                buttons = [],
                className = '',
                closable = true
            } = options;

            const modalHtml = `
                <div id="${id}" class="modal ${className}">
                    <div class="modal-content">
                        ${closable ? '<button class="close-btn" onclick="Components.modal.close(\'' + id + '\')">&times;</button>' : ''}
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                        ${buttons.length > 0 ? `
                            <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                                ${buttons.map(btn => `
                                    <button class="btn ${btn.type || 'btn-secondary'}" onclick="${btn.onclick || ''}">
                                        ${btn.text}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            // 添加到页面
            const container = Utils.dom.$('#modalContainer') || document.body;
            container.insertAdjacentHTML('beforeend', modalHtml);

            return Utils.dom.$(`#${id}`);
        }
    },

    // 通知组件
    notification: {
        container: null,

        // 初始化通知容器
        init() {
            if (!this.container) {
                this.container = Utils.dom.createElement('div', {
                    id: 'notificationContainer',
                    style: 'position: fixed; top: 20px; right: 20px; z-index: 10000; pointer-events: none;'
                });
                document.body.appendChild(this.container);
            }
        },

        // 显示通知
        show(message, type = 'info', duration = 3000) {
            this.init();

            const id = 'notification-' + Date.now();
            const config = CoupleConfig.notification.types[type] || CoupleConfig.notification.types.info;
            
            const notification = Utils.dom.createElement('div', {
                id: id,
                className: `notification ${type}`,
                style: `
                    background: ${config.color};
                    color: white;
                    padding: 15px 20px;
                    border-radius: 12px;
                    margin-bottom: 10px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    animation: slideInRight 0.3s ease-out;
                    max-width: 300px;
                    font-weight: 500;
                    pointer-events: auto;
                    cursor: pointer;
                    position: relative;
                `
            });

            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">${config.icon}</span>
                    <span>${message}</span>
                </div>
            `;

            // 点击关闭
            notification.addEventListener('click', () => {
                this.hide(id);
            });

            this.container.appendChild(notification);

            // 自动隐藏
            if (duration > 0) {
                setTimeout(() => {
                    this.hide(id);
                }, duration);
            }

            return id;
        },

        // 隐藏通知
        hide(id) {
            const notification = Utils.dom.$(`#${id}`);
            if (notification) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        },

        // 清空所有通知
        clear() {
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    },

    // 确认对话框
    confirm: {
        show(message, options = {}) {
            return new Promise((resolve) => {
                const {
                    title = '确认操作',
                    confirmText = '确定',
                    cancelText = '取消',
                    type = 'warning'
                } = options;

                const modalId = 'confirmModal-' + Date.now();
                
                Components.modal.create({
                    id: modalId,
                    title: title,
                    content: `
                        <div style="text-align: center; padding: 20px 0;">
                            <div style="font-size: 48px; margin-bottom: 20px;">
                                ${type === 'danger' ? '⚠️' : type === 'info' ? 'ℹ️' : '❓'}
                            </div>
                            <p style="font-size: 16px; color: var(--text-dark);">${message}</p>
                        </div>
                    `,
                    buttons: [
                        {
                            text: cancelText,
                            type: 'btn-secondary',
                            onclick: `Components.confirm.handleCancel('${modalId}')`
                        },
                        {
                            text: confirmText,
                            type: type === 'danger' ? 'btn-danger' : 'btn-primary',
                            onclick: `Components.confirm.handleConfirm('${modalId}')`
                        }
                    ],
                    closable: true
                });

                // 存储回调
                this.callbacks = this.callbacks || {};
                this.callbacks[modalId] = resolve;

                Components.modal.open(modalId);
            });
        },

        handleConfirm(modalId) {
            if (this.callbacks[modalId]) {
                this.callbacks[modalId](true);
                delete this.callbacks[modalId];
            }
            Components.modal.close(modalId);
            setTimeout(() => {
                const modal = Utils.dom.$(`#${modalId}`);
                if (modal) modal.remove();
            }, 300);
        },

        handleCancel(modalId) {
            if (this.callbacks[modalId]) {
                this.callbacks[modalId](false);
                delete this.callbacks[modalId];
            }
            Components.modal.close(modalId);
            setTimeout(() => {
                const modal = Utils.dom.$(`#${modalId}`);
                if (modal) modal.remove();
            }, 300);
        }
    },

    // 加载指示器
    loading: {
        show(text = '加载中...', target = document.body) {
            const loadingId = 'loading-' + Date.now();
            
            const loading = Utils.dom.createElement('div', {
                id: loadingId,
                className: 'loading-overlay',
                style: `
                    position: ${target === document.body ? 'fixed' : 'absolute'};
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    backdrop-filter: blur(5px);
                `
            });

            loading.innerHTML = `
                <div class="loading loading-large"></div>
                <div style="margin-top: 15px; color: var(--text-soft); font-weight: 500;">
                    ${text}
                </div>
            `;

            target.style.position = target.style.position || 'relative';
            target.appendChild(loading);

            return loadingId;
        },

        hide(loadingId) {
            const loading = Utils.dom.$(`#${loadingId}`);
            if (loading) {
                loading.style.opacity = '0';
                setTimeout(() => {
                    if (loading.parentNode) {
                        loading.parentNode.removeChild(loading);
                    }
                }, 300);
            }
        }
    },

    // 工具提示
    tooltip: {
        show(element, text, position = 'top') {
            const tooltipId = 'tooltip-' + Date.now();
            
            const tooltip = Utils.dom.createElement('div', {
                id: tooltipId,
                className: 'tooltip-popup',
                style: `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    white-space: nowrap;
                    z-index: 10000;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `
            });

            tooltip.textContent = text;
            document.body.appendChild(tooltip);

            // 计算位置
            const rect = element.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();

            let top, left;
            switch (position) {
                case 'top':
                    top = rect.top - tooltipRect.height - 8;
                    left = rect.left + (rect.width - tooltipRect.width) / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + 8;
                    left = rect.left + (rect.width - tooltipRect.width) / 2;
                    break;
                case 'left':
                    top = rect.top + (rect.height - tooltipRect.height) / 2;
                    left = rect.left - tooltipRect.width - 8;
                    break;
                case 'right':
                    top = rect.top + (rect.height - tooltipRect.height) / 2;
                    left = rect.right + 8;
                    break;
            }

            tooltip.style.top = top + 'px';
            tooltip.style.left = left + 'px';
            
            // 显示动画
            setTimeout(() => {
                tooltip.style.opacity = '1';
            }, 10);

            return tooltipId;
        },

        hide(tooltipId) {
            const tooltip = Utils.dom.$(`#${tooltipId}`);
            if (tooltip) {
                tooltip.style.opacity = '0';
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 300);
            }
        }
    },

    // 表单验证
    form: {
        validate(form, rules) {
            const errors = {};
            let isValid = true;

            Object.keys(rules).forEach(fieldName => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                const rule = rules[fieldName];
                const value = field ? field.value.trim() : '';

                // 必填验证
                if (rule.required && !value) {
                    errors[fieldName] = rule.requiredMessage || '此字段为必填项';
                    isValid = false;
                    this.showFieldError(field, errors[fieldName]);
                    return;
                }

                // 长度验证
                if (rule.minLength && value.length < rule.minLength) {
                    errors[fieldName] = rule.minLengthMessage || `最少需要${rule.minLength}个字符`;
                    isValid = false;
                    this.showFieldError(field, errors[fieldName]);
                    return;
                }

                if (rule.maxLength && value.length > rule.maxLength) {
                    errors[fieldName] = rule.maxLengthMessage || `最多允许${rule.maxLength}个字符`;
                    isValid = false;
                    this.showFieldError(field, errors[fieldName]);
                    return;
                }

                // 自定义验证
                if (rule.validator && !rule.validator(value)) {
                    errors[fieldName] = rule.message || '输入格式不正确';
                    isValid = false;
                    this.showFieldError(field, errors[fieldName]);
                    return;
                }

                // 清除错误状态
                this.clearFieldError(field);
            });

            return { isValid, errors };
        },

        showFieldError(field, message) {
            if (!field) return;

            field.classList.add('form-error');
            
            // 移除旧的错误信息
            const oldError = field.parentNode.querySelector('.field-error');
            if (oldError) {
                oldError.remove();
            }

            // 添加新的错误信息
            const errorElement = Utils.dom.createElement('div', {
                className: 'field-error',
                style: 'color: #ef4444; font-size: 12px; margin-top: 5px;'
            });
            errorElement.textContent = message;
            field.parentNode.appendChild(errorElement);
        },

        clearFieldError(field) {
            if (!field) return;

            field.classList.remove('form-error');
            const errorElement = field.parentNode.querySelector('.field-error');
            if (errorElement) {
                errorElement.remove();
            }
        },

        clearAllErrors(form) {
            const errorFields = form.querySelectorAll('.form-error');
            const errorMessages = form.querySelectorAll('.field-error');
            
            errorFields.forEach(field => field.classList.remove('form-error'));
            errorMessages.forEach(message => message.remove());
        }
    },

    // 进度条
    progress: {
        create(container, options = {}) {
            const {
                value = 0,
                max = 100,
                showText = true,
                className = ''
            } = options;

            const progressId = 'progress-' + Date.now();
            const percentage = Math.round((value / max) * 100);

            const progressHtml = `
                <div id="${progressId}" class="progress ${className}">
                    <div class="progress-bar" style="width: ${percentage}%"></div>
                    ${showText ? `<div class="progress-text">${percentage}%</div>` : ''}
                </div>
            `;

            container.innerHTML = progressHtml;
            return progressId;
        },

        update(progressId, value, max = 100) {
            const progress = Utils.dom.$(`#${progressId}`);
            if (progress) {
                const percentage = Math.round((value / max) * 100);
                const bar = progress.querySelector('.progress-bar');
                const text = progress.querySelector('.progress-text');

                if (bar) {
                    bar.style.width = percentage + '%';
                }
                if (text) {
                    text.textContent = percentage + '%';
                }
            }
        }
    }
};

// 添加必要的CSS样式
const componentStyles = `
    .btn-danger {
        background: #ef4444;
        color: white;
    }
    .btn-danger:hover {
        background: #dc2626;
        transform: translateY(-2px);
    }
    .loading-overlay {
        animation: fadeIn 0.3s ease-out;
    }
    .tooltip-popup::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
    }
`;

// 添加样式到页面
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = componentStyles;
document.head.appendChild(styleSheet);

// 冻结组件对象
Object.freeze(Components);
const moment = require('moment');

// 设置moment的默认语言为中文
moment.locale('zh-cn');

/**
 * 计算在一起的天数
 * @param {string|Date} startDate - 开始日期
 * @returns {number} 天数
 */
function calculateDaysTogether(startDate) {
  try {
    const start = moment(startDate);
    const today = moment();
    
    if (!start.isValid()) {
      console.error('无效的开始日期:', startDate);
      return 0;
    }
    
    return today.diff(start, 'days') + 1;
  } catch (error) {
    console.error('计算天数失败:', error);
    return 0;
  }
}

/**
 * 格式化日期
 * @param {string|Date} date - 日期
 * @param {string} format - 格式字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  try {
    const momentDate = moment(date);
    return momentDate.isValid() ? momentDate.format(format) : '';
  } catch (error) {
    console.error('日期格式化失败:', error);
    return '';
  }
}

/**
 * 获取友好的日期描述
 * @param {string|Date} date - 日期
 * @returns {string} 友好的日期描述
 */
function getFriendlyDate(date) {
  try {
    const momentDate = moment(date);
    if (!momentDate.isValid()) return '';
    
    const now = moment();
    const diffDays = now.diff(momentDate, 'days');
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays === -1) return '明天';
    if (diffDays < 7 && diffDays > 0) return `${diffDays}天前`;
    if (diffDays > -7 && diffDays < 0) return `${Math.abs(diffDays)}天后`;
    
    return momentDate.format('MM月DD日');
  } catch (error) {
    console.error('友好日期生成失败:', error);
    return '';
  }
}

/**
 * 生成随机ID
 * @param {number} length - ID长度
 * @returns {string} 随机ID
 */
function generateId(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成时间戳ID
 * @returns {string} 基于时间戳的ID
 */
function generateTimestampId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * API响应格式化
 * @param {boolean} success - 是否成功
 * @param {any} data - 数据
 * @param {string} message - 消息
 * @param {object} meta - 元数据
 * @returns {object} 格式化的响应
 */
function apiResponse(success, data = null, message = '', meta = {}) {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return response;
}

/**
 * 成功响应
 * @param {any} data - 数据
 * @param {string} message - 消息
 * @param {object} meta - 元数据
 * @returns {object} 成功响应
 */
function successResponse(data = null, message = '操作成功', meta = {}) {
  return apiResponse(true, data, message, meta);
}

/**
 * 错误响应
 * @param {string} message - 错误消息
 * @param {string} code - 错误代码
 * @param {object} details - 错误详情
 * @returns {object} 错误响应
 */
function errorResponse(message = '操作失败', code = 'UNKNOWN_ERROR', details = null) {
  const meta = { code };
  if (details) {
    meta.details = details;
  }
  return apiResponse(false, null, message, meta);
}

/**
 * 错误处理中间件
 * @param {Error} error - 错误对象
 * @param {object} res - Express响应对象
 * @param {string} message - 自定义错误消息
 * @param {number} statusCode - HTTP状态码
 */
function handleError(error, res, message = '服务器内部错误', statusCode = 500) {
  console.error('API错误:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // 根据错误类型设置不同的状态码和消息
  let finalMessage = message;
  let finalStatusCode = statusCode;
  let errorCode = 'INTERNAL_ERROR';
  
  if (error.code === '23505') { // PostgreSQL唯一约束违反
    finalMessage = '数据已存在，请检查后重试';
    finalStatusCode = 409;
    errorCode = 'DUPLICATE_DATA';
  } else if (error.code === '23503') { // PostgreSQL外键约束违反
    finalMessage = '相关数据不存在';
    finalStatusCode = 400;
    errorCode = 'FOREIGN_KEY_VIOLATION';
  } else if (error.message && error.message.includes('connect')) {
    finalMessage = '数据库连接失败，请稍后再试';
    errorCode = 'DATABASE_CONNECTION_ERROR';
  }
  
  return res.status(finalStatusCode).json(
    errorResponse(finalMessage, errorCode, process.env.NODE_ENV === 'development' ? error.message : null)
  );
}

/**
 * 验证必填字段
 * @param {object} data - 要验证的数据
 * @param {array} requiredFields - 必填字段列表
 * @returns {object} 验证结果
 */
function validateRequiredFields(data, requiredFields) {
  const missing = [];
  const empty = [];
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      missing.push(field);
    } else if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
      empty.push(field);
    }
  }
  
  const isValid = missing.length === 0 && empty.length === 0;
  
  return {
    isValid,
    missing,
    empty,
    message: isValid ? '' : `缺少必填字段: ${[...missing, ...empty].join(', ')}`
  };
}

/**
 * 清理和验证字符串
 * @param {string} str - 要清理的字符串
 * @param {number} maxLength - 最大长度
 * @param {boolean} allowEmpty - 是否允许空字符串
 * @returns {string|null} 清理后的字符串或null
 */
function sanitizeString(str, maxLength = 255, allowEmpty = false) {
  if (typeof str !== 'string') {
    return allowEmpty ? '' : null;
  }
  
  const cleaned = str.trim();
  
  if (!allowEmpty && cleaned.length === 0) {
    return null;
  }
  
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength);
  }
  
  return cleaned;
}

/**
 * 验证日期格式
 * @param {string} dateString - 日期字符串
 * @returns {boolean} 是否为有效日期
 */
function isValidDate(dateString) {
  try {
    const date = moment(dateString);
    return date.isValid() && date.year() >= 1900 && date.year() <= 2100;
  } catch (error) {
    return false;
  }
}

/**
 * 生成分页信息
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @param {number} total - 总数量
 * @returns {object} 分页信息
 */
function generatePagination(page = 1, limit = 10, total = 0) {
  const currentPage = Math.max(1, parseInt(page));
  const pageSize = Math.max(1, Math.min(100, parseInt(limit))); // 限制最大每页数量
  const totalPages = Math.ceil(total / pageSize);
  const offset = (currentPage - 1) * pageSize;
  
  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems: total,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    offset
  };
}

/**
 * 设置CORS头
 * @param {object} res - Express响应对象
 * @param {object} options - CORS选项
 */
function setCorsHeaders(res, options = {}) {
  const {
    origin = '*',
    methods = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders = 'Content-Type,Authorization,X-Requested-With',
    credentials = false
  } = options;
  
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
  
  if (credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

/**
 * 获取客户端IP地址
 * @param {object} req - Express请求对象
 * @returns {string} IP地址
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

/**
 * 记录API访问日志
 * @param {object} req - Express请求对象
 * @param {object} res - Express响应对象
 * @param {number} duration - 请求耗时（毫秒）
 */
function logApiAccess(req, res, duration = 0) {
  const logData = {
    method: req.method,
    url: req.url,
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'],
    statusCode: res.statusCode,
    duration: duration + 'ms',
    timestamp: new Date().toISOString(),
    coupleCode: req.coupleCode || 'anonymous'
  };
  
  console.log('API访问:', JSON.stringify(logData));
}

module.exports = {
  calculateDaysTogether,
  formatDate,
  getFriendlyDate,
  generateId,
  generateTimestampId,
  apiResponse,
  successResponse,
  errorResponse,
  handleError,
  validateRequiredFields,
  sanitizeString,
  isValidDate,
  generatePagination,
  setCorsHeaders,
  getClientIP,
  logApiAccess
};
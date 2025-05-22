const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'our-little-planet-secret';

// 认证中间件
const authenticateCouple = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: '未授权访问',
        message: '请先登录你们的小星球',
        code: 'NO_TOKEN'
      });
    }

    // 验证token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: '登录已过期',
          message: '请重新登录你们的小星球',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(403).json({
          error: '无效的访问令牌',
          message: '登录信息有误，请重新登录',
          code: 'INVALID_TOKEN'
        });
      } else {
        throw jwtError;
      }
    }

    // 验证情侣是否存在
    const coupleResult = await pool.query(
      'SELECT id, couple_code, partner1_name, partner2_name, relationship_start_date FROM couples WHERE id = $1',
      [decoded.coupleId]
    );

    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        error: '情侣信息未找到',
        message: '账户可能已被删除，请重新注册',
        code: 'COUPLE_NOT_FOUND'
      });
    }

    // 将情侣信息添加到请求对象
    req.couple = {
      ...decoded,
      info: coupleResult.rows[0]
    };

    next();
  } catch (err) {
    console.error('认证中间件错误:', err);
    res.status(500).json({
      error: '认证服务异常',
      message: '验证登录状态时遇到问题，请稍后再试',
      code: 'AUTH_ERROR'
    });
  }
};

// 可选认证中间件（用于获取用户信息但不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.couple = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const coupleResult = await pool.query(
        'SELECT id, couple_code, partner1_name, partner2_name, relationship_start_date FROM couples WHERE id = $1',
        [decoded.coupleId]
      );

      if (coupleResult.rows.length > 0) {
        req.couple = {
          ...decoded,
          info: coupleResult.rows[0]
        };
      } else {
        req.couple = null;
      }
    } catch (jwtError) {
      req.couple = null;
    }

    next();
  } catch (err) {
    console.error('可选认证中间件错误:', err);
    req.couple = null;
    next();
  }
};

// 检查权限中间件（确保操作者是情侣成员之一）
const checkCouplePermission = (resourceType) => {
  return async (req, res, next) => {
    try {
      const coupleId = req.couple.coupleId;
      const resourceId = req.params.id;

      if (!resourceId) {
        return next(); // 如果没有资源ID，跳过权限检查
      }

      let query;
      switch (resourceType) {
        case 'diary':
          query = 'SELECT couple_id FROM diaries WHERE id = $1';
          break;
        case 'wishlist':
          query = 'SELECT couple_id FROM wishlist WHERE id = $1';
          break;
        case 'calendar':
          query = 'SELECT couple_id FROM calendar_events WHERE id = $1';
          break;
        case 'anniversary':
          query = 'SELECT couple_id FROM anniversaries WHERE id = $1';
          break;
        default:
          return res.status(400).json({
            error: '无效的资源类型',
            message: '系统内部错误',
            code: 'INVALID_RESOURCE_TYPE'
          });
      }

      const result = await pool.query(query, [resourceId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: '资源未找到',
          message: '这个内容可能已经被删除了',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      if (result.rows[0].couple_id !== coupleId) {
        return res.status(403).json({
          error: '权限不足',
          message: '你没有权限访问这个内容',
          code: 'PERMISSION_DENIED'
        });
      }

      next();
    } catch (err) {
      console.error('权限检查中间件错误:', err);
      res.status(500).json({
        error: '权限验证失败',
        message: '验证权限时遇到问题',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

// 生成JWT token
const generateToken = (coupleId, coupleCode, options = {}) => {
  const payload = {
    coupleId,
    coupleCode,
    iat: Math.floor(Date.now() / 1000)
  };

  const defaultOptions = {
    expiresIn: '30d', // 默认30天过期
    issuer: 'our-little-planet'
  };

  return jwt.sign(payload, JWT_SECRET, { ...defaultOptions, ...options });
};

// 刷新token
const refreshToken = async (req, res, next) => {
  try {
    const { coupleId, coupleCode } = req.couple;
    
    // 生成新的token
    const newToken = generateToken(coupleId, coupleCode);
    
    // 将新token添加到响应头
    res.set('X-New-Token', newToken);
    
    next();
  } catch (err) {
    console.error('刷新token错误:', err);
    // 刷新失败不影响主要功能，继续执行
    next();
  }
};

// 检查token是否即将过期（7天内过期时自动刷新）
const checkTokenExpiry = async (req, res, next) => {
  try {
    if (!req.couple) {
      return next();
    }

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.decode(token);
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;

    // 如果token在7天内过期，自动刷新
    if (timeUntilExpiry < 7 * 24 * 60 * 60) {
      const newToken = generateToken(req.couple.coupleId, req.couple.coupleCode);
      res.set('X-New-Token', newToken);
    }

    next();
  } catch (err) {
    console.error('检查token过期时间错误:', err);
    next();
  }
};

// 记录用户活动
const logActivity = (activityType) => {
  return async (req, res, next) => {
    try {
      if (req.couple) {
        // 这里可以记录用户活动到数据库
        // 例如最后活跃时间、操作类型等
        console.log(`[活动日志] 情侣ID: ${req.couple.coupleId}, 活动: ${activityType}, 时间: ${new Date().toISOString()}`);
      }
      next();
    } catch (err) {
      console.error('记录活动错误:', err);
      next(); // 记录失败不影响主要功能
    }
  };
};

module.exports = {
  authenticateCouple,
  optionalAuth,
  checkCouplePermission,
  generateToken,
  refreshToken,
  checkTokenExpiry,
  logActivity
};
const jwt = require('jsonwebtoken');

// JWT密钥，生产环境中应该使用环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'our-little-planet-super-secret-key-2024';

// Token过期时间
const TOKEN_EXPIRY = '30d';

/**
 * 生成JWT Token
 * @param {string} coupleCode - 情侣通行码
 * @param {object} additionalData - 额外的数据
 * @returns {string} JWT Token
 */
function generateToken(coupleCode, additionalData = {}) {
  try {
    const payload = {
      coupleCode,
      type: 'couple_access',
      ...additionalData,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: TOKEN_EXPIRY,
      issuer: 'our-little-planet',
      audience: 'couple-users'
    });
  } catch (error) {
    console.error('生成Token失败:', error);
    throw new Error('Token生成失败');
  }
}

/**
 * 验证JWT Token
 * @param {string} token - JWT Token
 * @returns {object|null} 解码后的Token数据或null
 */
function verifyToken(token) {
  try {
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'our-little-planet',
      audience: 'couple-users'
    });

    // 检查Token类型
    if (decoded.type !== 'couple_access') {
      console.warn('Token类型不正确:', decoded.type);
      return null;
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Token已过期');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Token格式错误');
    } else {
      console.error('Token验证失败:', error);
    }
    return null;
  }
}

/**
 * 从请求头中提取Token
 * @param {object} req - Express请求对象
 * @returns {string|null} Token或null
 */
function extractTokenFromRequest(req) {
  // 尝试从Authorization头获取
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 尝试从Cookie获取（如果使用Cookie存储）
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    if (cookies.auth_token) {
      return cookies.auth_token;
    }
  }

  // 尝试从查询参数获取（不推荐，但作为备用）
  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
}

/**
 * 认证中间件
 * @param {object} req - Express请求对象
 * @param {object} res - Express响应对象
 * @param {function} next - Express next函数
 */
function authenticate(req, res, next) {
  try {
    const token = extractTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '请先登录你们的小星球',
        code: 'NO_TOKEN'
      });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: '登录已过期，请重新进入星球',
        code: 'INVALID_TOKEN'
      });
    }

    // 将解码后的信息添加到请求对象
    req.coupleCode = decoded.coupleCode;
    req.tokenData = decoded;
    req.isAuthenticated = true;

    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    return res.status(500).json({ 
      success: false, 
      message: '认证服务出现问题，请稍后再试',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * 可选认证中间件（不强制要求登录）
 * @param {object} req - Express请求对象
 * @param {object} res - Express响应对象
 * @param {function} next - Express next函数
 */
function optionalAuthenticate(req, res, next) {
  try {
    const token = extractTokenFromRequest(req);
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.coupleCode = decoded.coupleCode;
        req.tokenData = decoded;
        req.isAuthenticated = true;
      }
    }
    
    // 无论是否认证成功都继续
    next();
  } catch (error) {
    console.error('可选认证中间件错误:', error);
    // 认证失败也继续，但不设置认证信息
    next();
  }
}

/**
 * 生成刷新Token
 * @param {string} coupleCode - 情侣通行码
 * @returns {string} 刷新Token
 */
function generateRefreshToken(coupleCode) {
  try {
    const payload = {
      coupleCode,
      type: 'refresh_token',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '90d',
      issuer: 'our-little-planet',
      audience: 'couple-users'
    });
  } catch (error) {
    console.error('生成刷新Token失败:', error);
    throw new Error('刷新Token生成失败');
  }
}

/**
 * 验证并刷新Token
 * @param {string} refreshToken - 刷新Token
 * @returns {object|null} 新的访问Token或null
 */
function refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET, {
      issuer: 'our-little-planet',
      audience: 'couple-users'
    });

    if (decoded.type !== 'refresh_token') {
      return null;
    }

    // 生成新的访问Token
    return generateToken(decoded.coupleCode);
  } catch (error) {
    console.error('刷新Token失败:', error);
    return null;
  }
}

module.exports = { 
  generateToken, 
  verifyToken, 
  authenticate, 
  optionalAuthenticate,
  extractTokenFromRequest,
  generateRefreshToken,
  refreshAccessToken
};
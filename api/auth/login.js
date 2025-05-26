const { pool, initDatabase } = require('../../lib/db');
const { generateToken, generateRefreshToken } = require('../../lib/auth');
const { 
  successResponse, 
  errorResponse, 
  handleError, 
  validateRequiredFields,
  sanitizeString,
  setCorsHeaders,
  logApiAccess,
  calculateDaysTogether
} = require('../../lib/utils');

module.exports = async (req, res) => {
  const startTime = Date.now();
  
  // 设置CORS头
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json(errorResponse('方法不允许', 'METHOD_NOT_ALLOWED'));
  }

  try {
    // 确保数据库已初始化
    await initDatabase();

    // 验证请求数据
    const validation = validateRequiredFields(req.body, ['coupleCode']);
    if (!validation.isValid) {
      return res.status(400).json(errorResponse(validation.message, 'VALIDATION_ERROR'));
    }

    const coupleCode = sanitizeString(req.body.coupleCode, 100);
    
    if (!coupleCode || coupleCode.length < 4) {
      return res.status(400).json(errorResponse(
        '通行码至少需要4个字符哦～', 
        'INVALID_COUPLE_CODE'
      ));
    }

    const client = await pool.connect();
    
    try {
      // 查询情侣信息
      const coupleQuery = `
        SELECT 
          id,
          couple_code,
          start_date,
          partner1_name,
          partner2_name,
          created_at,
          updated_at
        FROM couples 
        WHERE couple_code = $1
      `;
      
      const result = await client.query(coupleQuery, [coupleCode]);

      if (result.rows.length === 0) {
        logApiAccess(req, { statusCode: 404 }, Date.now() - startTime);
        return res.status(404).json(errorResponse(
          '通行码不存在，请检查后重试或创建新的星球', 
          'COUPLE_NOT_FOUND'
        ));
      }

      const couple = result.rows[0];

      // 更新最后登录时间
      await client.query(
        'UPDATE couples SET updated_at = CURRENT_TIMESTAMP WHERE couple_code = $1',
        [coupleCode]
      );

      // 获取心愿统计信息
      const statsQuery = `
        SELECT 
          COUNT(*) as total_wishes,
          COUNT(CASE WHEN completed = true THEN 1 END) as completed_wishes,
          COUNT(CASE WHEN completed = false THEN 1 END) as pending_wishes
        FROM wishes 
        WHERE couple_code = $1
      `;
      
      const statsResult = await client.query(statsQuery, [coupleCode]);
      const stats = statsResult.rows[0];

      // 生成Token
      const accessToken = generateToken(coupleCode, {
        coupleId: couple.id,
        loginTime: new Date().toISOString()
      });
      
      const refreshToken = generateRefreshToken(coupleCode);

      // 计算在一起的天数
      const daysTogether = calculateDaysTogether(couple.start_date);

      // 记录登录日志
      await client.query(
        `INSERT INTO activity_logs (couple_code, action_type, action_description) 
         VALUES ($1, $2, $3)`,
        [coupleCode, 'login', '成功登录小星球']
      );

      const responseData = {
        couple: {
          id: couple.id,
          coupleCode: couple.couple_code,
          startDate: couple.start_date,
          partner1Name: couple.partner1_name,
          partner2Name: couple.partner2_name,
          daysTogether,
          createdAt: couple.created_at
        },
        stats: {
          totalWishes: parseInt(stats.total_wishes),
          completedWishes: parseInt(stats.completed_wishes),
          pendingWishes: parseInt(stats.pending_wishes),
          completionRate: parseInt(stats.total_wishes) > 0 
            ? Math.round((parseInt(stats.completed_wishes) / parseInt(stats.total_wishes)) * 100)
            : 0
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: '30d'
        }
      };

      logApiAccess(req, { statusCode: 200 }, Date.now() - startTime);

      return res.status(200).json(successResponse(
        responseData,
        '欢迎回到你们的小星球！'
      ));

    } finally {
      client.release();
    }

  } catch (error) {
    logApiAccess(req, { statusCode: 500 }, Date.now() - startTime);
    return handleError(error, res, '登录失败，请稍后再试');
  }
};
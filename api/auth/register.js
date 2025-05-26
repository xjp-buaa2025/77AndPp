const { pool, initDatabase } = require('../../lib/db');
const { generateToken, generateRefreshToken } = require('../../lib/auth');
const { 
  successResponse, 
  errorResponse, 
  handleError, 
  validateRequiredFields,
  sanitizeString,
  isValidDate,
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
    const validation = validateRequiredFields(req.body, ['coupleCode', 'startDate']);
    if (!validation.isValid) {
      return res.status(400).json(errorResponse(validation.message, 'VALIDATION_ERROR'));
    }

    const coupleCode = sanitizeString(req.body.coupleCode, 100);
    const startDate = req.body.startDate;
    const partner1Name = sanitizeString(req.body.partner1Name, 50, true);
    const partner2Name = sanitizeString(req.body.partner2Name, 50, true);

    // 验证通行码
    if (!coupleCode || coupleCode.length < 4) {
      return res.status(400).json(errorResponse(
        '通行码至少需要4个字符哦～', 
        'INVALID_COUPLE_CODE'
      ));
    }

    if (coupleCode.length > 50) {
      return res.status(400).json(errorResponse(
        '通行码不能超过50个字符', 
        'COUPLE_CODE_TOO_LONG'
      ));
    }

    // 验证日期
    if (!isValidDate(startDate)) {
      return res.status(400).json(errorResponse(
        '请选择有效的开始日期', 
        'INVALID_START_DATE'
      ));
    }

    // 检查日期不能是未来
    const today = new Date();
    const selectedDate = new Date(startDate);
    if (selectedDate > today) {
      return res.status(400).json(errorResponse(
        '开始日期不能是未来哦～', 
        'FUTURE_START_DATE'
      ));
    }

    // 检查日期不能太久远（比如超过50年前）
    const fiftyYearsAgo = new Date();
    fiftyYearsAgo.setFullYear(fiftyYearsAgo.getFullYear() - 50);
    if (selectedDate < fiftyYearsAgo) {
      return res.status(400).json(errorResponse(
        '这个日期好像太久远了～', 
        'TOO_OLD_START_DATE'
      ));
    }

    const client = await pool.connect();
    
    try {
      // 检查通行码是否已存在
      const existingCouple = await client.query(
        'SELECT id, couple_code FROM couples WHERE couple_code = $1',
        [coupleCode]
      );

      if (existingCouple.rows.length > 0) {
        logApiAccess(req, { statusCode: 409 }, Date.now() - startTime);
        return res.status(409).json(errorResponse(
          '这个通行码已经被使用了，请换一个试试～', 
          'COUPLE_CODE_EXISTS'
        ));
      }

      // 开始事务
      await client.query('BEGIN');

      try {
        // 创建新的情侣记录
        const insertQuery = `
          INSERT INTO couples (
            couple_code, 
            start_date, 
            partner1_name, 
            partner2_name,
            created_at,
            updated_at
          ) 
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
          RETURNING *
        `;
        
        const result = await client.query(insertQuery, [
          coupleCode,
          startDate,
          partner1Name || null,
          partner2Name || null
        ]);

        const newCouple = result.rows[0];

        // 记录创建日志
        await client.query(
          `INSERT INTO activity_logs (couple_code, action_type, action_description) 
           VALUES ($1, $2, $3)`,
          [coupleCode, 'register', '创建了新的小星球']
        );

        // 提交事务
        await client.query('COMMIT');

        // 生成Token
        const accessToken = generateToken(coupleCode, {
          coupleId: newCouple.id,
          registrationTime: new Date().toISOString()
        });
        
        const refreshToken = generateRefreshToken(coupleCode);

        // 计算在一起的天数
        const daysTogether = calculateDaysTogether(newCouple.start_date);

        const responseData = {
          couple: {
            id: newCouple.id,
            coupleCode: newCouple.couple_code,
            startDate: newCouple.start_date,
            partner1Name: newCouple.partner1_name,
            partner2Name: newCouple.partner2_name,
            daysTogether,
            createdAt: newCouple.created_at
          },
          stats: {
            totalWishes: 0,
            completedWishes: 0,
            pendingWishes: 0,
            completionRate: 0
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '30d'
          }
        };

        logApiAccess(req, { statusCode: 201 }, Date.now() - startTime);

        return res.status(201).json(successResponse(
          responseData,
          '星球创建成功！欢迎来到你们的专属世界～'
        ));

      } catch (insertError) {
        // 回滚事务
        await client.query('ROLLBACK');
        throw insertError;
      }

    } finally {
      client.release();
    }

  } catch (error) {
    logApiAccess(req, { statusCode: 500 }, Date.now() - startTime);
    
    // 特殊处理唯一约束错误（可能在并发情况下发生）
    if (error.code === '23505' && error.constraint && error.constraint.includes('couple_code')) {
      return res.status(409).json(errorResponse(
        '这个通行码已经被使用了，请换一个试试～', 
        'COUPLE_CODE_EXISTS'
      ));
    }
    
    return handleError(error, res, '创建星球失败，请稍后再试');
  }
};
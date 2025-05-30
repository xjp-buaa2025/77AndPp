const express = require('express');
const router = express.Router();
const { pool } = require('../lib/db');
const { generateToken, generateRefreshToken } = require('../lib/auth');
const { 
  successResponse, 
  errorResponse, 
  handleError, 
  validateRequiredFields,
  sanitizeString,
  isValidDate,
  calculateDaysTogether
} = require('../lib/utils');

// 登录接口
router.post('/login', async (req, res) => {
  try {
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

      return res.status(200).json(successResponse(
        responseData,
        '欢迎回到你们的小星球！'
      ));

    } finally {
      client.release();
    }

  } catch (error) {
    return handleError(error, res, '登录失败，请稍后再试');
  }
});

// 注册接口
router.post('/register', async (req, res) => {
  try {
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

    const client = await pool.connect();
    
    try {
      // 检查通行码是否已存在
      const existingCouple = await client.query(
        'SELECT id, couple_code FROM couples WHERE couple_code = $1',
        [coupleCode]
      );

      if (existingCouple.rows.length > 0) {
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
    if (error.code === '23505' && error.constraint && error.constraint.includes('couple_code')) {
      return res.status(409).json(errorResponse(
        '这个通行码已经被使用了，请换一个试试～', 
        'COUPLE_CODE_EXISTS'
      ));
    }
    
    return handleError(error, res, '创建星球失败，请稍后再试');
  }
});

module.exports = router;
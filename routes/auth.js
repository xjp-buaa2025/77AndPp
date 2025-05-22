const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'our-little-planet-secret';

// 情侣注册/登录
router.post('/login', async (req, res) => {
  try {
    const { coupleCode, securityAnswer } = req.body;

    if (!coupleCode || !securityAnswer) {
      return res.status(400).json({
        error: '请输入完整信息',
        message: '通行码和安全问题答案都是必需的'
      });
    }

    // 查找情侣记录
    const coupleResult = await pool.query(
      'SELECT * FROM couples WHERE couple_code = $1',
      [coupleCode]
    );

    let couple;

    if (coupleResult.rows.length === 0) {
      // 新情侣注册
      const hashedAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);
      
      const insertResult = await pool.query(
        `INSERT INTO couples (couple_code, security_question, security_answer, relationship_start_date) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          coupleCode,
          '我们第一次旅行是哪天？',
          hashedAnswer,
          new Date()
        ]
      );

      couple = insertResult.rows[0];
      
      // 为新情侣添加欢迎日记
      await pool.query(
        `INSERT INTO diaries (couple_id, title, content, author, mood) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          couple.id,
          '欢迎来到我们的小星球',
          '今天，我们在这个特别的地方开始记录属于我们的故事。愿这里成为我们爱情最温暖的见证。',
          'system',
          'love'
        ]
      );

    } else {
      // 现有情侣登录验证
      couple = coupleResult.rows[0];
      const isValidAnswer = await bcrypt.compare(
        securityAnswer.toLowerCase().trim(),
        couple.security_answer
      );

      if (!isValidAnswer) {
        return res.status(401).json({
          error: '验证失败',
          message: '安全问题答案不正确，再想想你们的小秘密～'
        });
      }
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { 
        coupleId: couple.id,
        coupleCode: couple.couple_code
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 更新最后登录时间
    await pool.query(
      'UPDATE couples SET updated_at = NOW() WHERE id = $1',
      [couple.id]
    );

    res.json({
      success: true,
      message: '欢迎回到你们的小星球！',
      token,
      couple: {
        id: couple.id,
        coupleCode: couple.couple_code,
        partner1Name: couple.partner1_name,
        partner2Name: couple.partner2_name,
        relationshipStartDate: couple.relationship_start_date
      }
    });

  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({
      error: '登录失败',
      message: '小星球遇到了一些问题，请稍后再试'
    });
  }
});

// 更新情侣信息
router.put('/profile', authenticateCouple, async (req, res) => {
  try {
    const { partner1Name, partner2Name, relationshipStartDate } = req.body;
    const coupleId = req.couple.coupleId;

    const result = await pool.query(
      `UPDATE couples 
       SET partner1_name = $1, partner2_name = $2, relationship_start_date = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [partner1Name, partner2Name, relationshipStartDate, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '情侣信息未找到'
      });
    }

    const couple = result.rows[0];
    
    res.json({
      success: true,
      message: '信息更新成功',
      couple: {
        id: couple.id,
        coupleCode: couple.couple_code,
        partner1Name: couple.partner1_name,
        partner2Name: couple.partner2_name,
        relationshipStartDate: couple.relationship_start_date
      }
    });

  } catch (err) {
    console.error('更新信息错误:', err);
    res.status(500).json({
      error: '更新失败',
      message: '更新信息时遇到问题'
    });
  }
});

// 验证令牌的中间件
function authenticateCouple(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: '未授权',
      message: '请先登录你们的小星球'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.couple = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      error: '令牌无效',
      message: '登录已过期，请重新登录'
    });
  }
}

// 验证令牌端点
router.get('/verify', authenticateCouple, (req, res) => {
  res.json({
    success: true,
    message: '令牌有效',
    couple: req.couple
  });
});

// 导出认证中间件供其他路由使用
router.authenticateCouple = authenticateCouple;

module.exports = router;
const express = require('express');
const pool = require('../config/database');
const { authenticateCouple } = require('./auth');

const router = express.Router();

// 获取所有纪念日
router.get('/', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;

    const result = await pool.query(
      'SELECT * FROM anniversaries WHERE couple_id = $1 ORDER BY anniversary_date ASC',
      [coupleId]
    );

    // 计算倒计时
    const anniversariesWithCountdown = result.rows.map(anniversary => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const anniversaryDate = new Date(anniversary.anniversary_date);
      
      // 计算今年的纪念日日期
      let thisYearDate = new Date(currentYear, anniversaryDate.getMonth(), anniversaryDate.getDate());
      
      // 如果今年的日期已过，计算明年的
      if (thisYearDate < today) {
        thisYearDate = new Date(currentYear + 1, anniversaryDate.getMonth(), anniversaryDate.getDate());
      }
      
      // 计算天数差
      const timeDiff = thisYearDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      // 计算已经过了多少年
      const yearsPassed = currentYear - anniversaryDate.getFullYear();
      
      return {
        ...anniversary,
        daysUntilNext: daysDiff,
        yearsPassed: yearsPassed,
        nextDate: thisYearDate.toISOString().split('T')[0],
        isToday: daysDiff === 0
      };
    });

    res.json({
      success: true,
      data: anniversariesWithCountdown
    });

  } catch (err) {
    console.error('获取纪念日错误:', err);
    res.status(500).json({
      error: '获取纪念日失败',
      message: '读取你们的重要日子时遇到了问题'
    });
  }
});

// 创建新纪念日
router.post('/', authenticateCouple, async (req, res) => {
  try {
    const { title, anniversaryDate, description, photoUrl, isRecurring, notificationEnabled } = req.body;
    const coupleId = req.couple.coupleId;

    if (!title || !anniversaryDate) {
      return res.status(400).json({
        error: '信息不完整',
        message: '纪念日标题和日期都是必需的'
      });
    }

    const result = await pool.query(
      `INSERT INTO anniversaries (couple_id, title, anniversary_date, description, photo_url, is_recurring, notification_enabled) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [coupleId, title, anniversaryDate, description, photoUrl, isRecurring !== false, notificationEnabled !== false]
    );

    res.status(201).json({
      success: true,
      message: '重要的日子已经被永远记录！',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('创建纪念日错误:', err);
    res.status(500).json({
      error: '添加失败',
      message: '添加纪念日时遇到了问题'
    });
  }
});

// 更新纪念日
router.put('/:id', authenticateCouple, async (req, res) => {
  try {
    const anniversaryId = req.params.id;
    const coupleId = req.couple.coupleId;
    const { title, anniversaryDate, description, photoUrl, isRecurring, notificationEnabled } = req.body;

    const result = await pool.query(
      `UPDATE anniversaries 
       SET title = $1, anniversary_date = $2, description = $3, photo_url = $4, is_recurring = $5, notification_enabled = $6, updated_at = NOW()
       WHERE id = $7 AND couple_id = $8 RETURNING *`,
      [title, anniversaryDate, description, photoUrl, isRecurring, notificationEnabled, anniversaryId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '纪念日未找到',
        message: '这个纪念日可能已经被删除了'
      });
    }

    res.json({
      success: true,
      message: '纪念日更新成功',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('更新纪念日错误:', err);
    res.status(500).json({
      error: '更新失败',
      message: '更新纪念日时遇到了问题'
    });
  }
});

// 删除纪念日
router.delete('/:id', authenticateCouple, async (req, res) => {
  try {
    const anniversaryId = req.params.id;
    const coupleId = req.couple.coupleId;

    const result = await pool.query(
      'DELETE FROM anniversaries WHERE id = $1 AND couple_id = $2 RETURNING *',
      [anniversaryId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '纪念日未找到',
        message: '这个纪念日可能已经被删除了'
      });
    }

    res.json({
      success: true,
      message: '纪念日已删除',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('删除纪念日错误:', err);
    res.status(500).json({
      error: '删除失败',
      message: '删除纪念日时遇到了问题'
    });
  }
});

// 获取即将到来的纪念日
router.get('/upcoming', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const days = parseInt(req.query.days) || 30; // 默认30天内

    const result = await pool.query(
      'SELECT * FROM anniversaries WHERE couple_id = $1 ORDER BY anniversary_date ASC',
      [coupleId]
    );

    const today = new Date();
    const upcomingAnniversaries = result.rows
      .map(anniversary => {
        const currentYear = today.getFullYear();
        const anniversaryDate = new Date(anniversary.anniversary_date);
        let thisYearDate = new Date(currentYear, anniversaryDate.getMonth(), anniversaryDate.getDate());
        
        if (thisYearDate < today) {
          thisYearDate = new Date(currentYear + 1, anniversaryDate.getMonth(), anniversaryDate.getDate());
        }
        
        const timeDiff = thisYearDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return {
          ...anniversary,
          daysUntilNext: daysDiff,
          nextDate: thisYearDate.toISOString().split('T')[0]
        };
      })
      .filter(anniversary => anniversary.daysUntilNext <= days)
      .sort((a, b) => a.daysUntilNext - b.daysUntilNext);

    res.json({
      success: true,
      data: upcomingAnniversaries,
      message: `找到 ${upcomingAnniversaries.length} 个即将到来的纪念日`
    });

  } catch (err) {
    console.error('获取即将到来纪念日错误:', err);
    res.status(500).json({
      error: '获取失败',
      message: '获取即将到来纪念日时遇到了问题'
    });
  }
});

// 获取今日纪念日
router.get('/today', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;

    const result = await pool.query(
      'SELECT * FROM anniversaries WHERE couple_id = $1',
      [coupleId]
    );

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const todayAnniversaries = result.rows.filter(anniversary => {
      const anniversaryDate = new Date(anniversary.anniversary_date);
      return anniversaryDate.getMonth() === todayMonth && anniversaryDate.getDate() === todayDate;
    });

    res.json({
      success: true,
      data: todayAnniversaries,
      message: todayAnniversaries.length > 0 ? '今天是特别的日子！' : '今天没有特别的纪念日'
    });

  } catch (err) {
    console.error('获取今日纪念日错误:', err);
    res.status(500).json({
      error: '获取失败',
      message: '获取今日纪念日时遇到了问题'
    });
  }
});

module.exports = router;
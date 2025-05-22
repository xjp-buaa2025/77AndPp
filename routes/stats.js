const express = require('express');
const pool = require('../config/database');
const { authenticateCouple } = require('./auth');

const router = express.Router();

// 获取总体统计数据
router.get('/', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;

    // 获取情侣基本信息
    const coupleInfo = await pool.query(
      'SELECT * FROM couples WHERE id = $1',
      [coupleId]
    );

    if (coupleInfo.rows.length === 0) {
      return res.status(404).json({
        error: '情侣信息未找到'
      });
    }

    const couple = coupleInfo.rows[0];

    // 计算在一起的天数
    const relationshipStart = new Date(couple.relationship_start_date || couple.created_at);
    const today = new Date();
    const daysTogether = Math.floor((today - relationshipStart) / (1000 * 60 * 60 * 24));

    // 获取各种统计数据
    const [diaryCount, wishlistStats, eventCount, anniversaryCount, quoteCount] = await Promise.all([
      // 日记总数
      pool.query('SELECT COUNT(*) FROM diaries WHERE couple_id = $1', [coupleId]),
      
      // 心愿清单统计
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
        FROM wishlist WHERE couple_id = $1
      `, [coupleId]),
      
      // 日历事件总数
      pool.query('SELECT COUNT(*) FROM calendar_events WHERE couple_id = $1', [coupleId]),
      
      // 纪念日总数
      pool.query('SELECT COUNT(*) FROM anniversaries WHERE couple_id = $1', [coupleId]),
      
      // 情话总数（包括自定义的）
      pool.query('SELECT COUNT(*) FROM love_quotes WHERE couple_id = $1 OR couple_id IS NULL', [coupleId])
    ]);

    const stats = {
      relationship: {
        daysTogether,
        startDate: couple.relationship_start_date,
        partner1Name: couple.partner1_name,
        partner2Name: couple.partner2_name
      },
      memories: {
        totalDiaries: parseInt(diaryCount.rows[0].count),
        totalEvents: parseInt(eventCount.rows[0].count),
        totalAnniversaries: parseInt(anniversaryCount.rows[0].count)
      },
      wishes: {
        total: parseInt(wishlistStats.rows[0].total),
        completed: parseInt(wishlistStats.rows[0].completed),
        pending: parseInt(wishlistStats.rows[0].pending),
        completionRate: wishlistStats.rows[0].total > 0 
          ? Math.round((wishlistStats.rows[0].completed / wishlistStats.rows[0].total) * 100) 
          : 0
      },
      quotes: {
        available: parseInt(quoteCount.rows[0].count)
      }
    };

    res.json({
      success: true,
      data: stats,
      message: '统计数据获取成功'
    });

  } catch (err) {
    console.error('获取统计数据错误:', err);
    res.status(500).json({
      error: '获取统计失败',
      message: '获取统计数据时遇到了问题'
    });
  }
});

// 获取日记统计
router.get('/diary', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;

    // 按心情统计
    const moodStats = await pool.query(`
      SELECT 
        mood,
        COUNT(*) as count
      FROM diaries 
      WHERE couple_id = $1 
      GROUP BY mood 
      ORDER BY count DESC
    `, [coupleId]);

    // 按作者统计
    const authorStats = await pool.query(`
      SELECT 
        author,
        COUNT(*) as count
      FROM diaries 
      WHERE couple_id = $1 AND author != 'system'
      GROUP BY author 
      ORDER BY count DESC
    `, [coupleId]);

    // 按月份统计（最近12个月）
    const monthlyStats = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM diaries 
      WHERE couple_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `, [coupleId]);

    res.json({
      success: true,
      data: {
        byMood: moodStats.rows,
        byAuthor: authorStats.rows,
        byMonth: monthlyStats.rows
      }
    });

  } catch (err) {
    console.error('获取日记统计错误:', err);
    res.status(500).json({
      error: '获取统计失败',
      message: '获取日记统计时遇到了问题'
    });
  }
});

// 获取心愿清单统计
router.get('/wishlist', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;

    // 按分类统计
    const categoryStats = await pool.query(`
      SELECT 
        category,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM wishlist 
      WHERE couple_id = $1 
      GROUP BY category 
      ORDER BY total DESC
    `, [coupleId]);

    // 按创建者统计
    const creatorStats = await pool.query(`
      SELECT 
        created_by,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM wishlist 
      WHERE couple_id = $1 
      GROUP BY created_by 
      ORDER BY total DESC
    `, [coupleId]);

    // 完成时间统计
    const completionTimeStats = await pool.query(`
      SELECT 
        DATE_TRUNC('month', completed_at) as month,
        COUNT(*) as count
      FROM wishlist 
      WHERE couple_id = $1 AND status = 'completed' AND completed_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', completed_at)
      ORDER BY month DESC
    `, [coupleId]);

    res.json({
      success: true,
      data: {
        byCategory: categoryStats.rows,
        byCreator: creatorStats.rows,
        completionByMonth: completionTimeStats.rows
      }
    });

  } catch (err) {
    console.error('获取心愿统计错误:', err);
    res.status(500).json({
      error: '获取统计失败',
      message: '获取心愿统计时遇到了问题'
    });
  }
});

// 获取日历事件统计
router.get('/calendar', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;

    // 按类型统计
    const typeStats = await pool.query(`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM calendar_events 
      WHERE couple_id = $1 
      GROUP BY event_type 
      ORDER BY count DESC
    `, [coupleId]);

    // 按颜色统计
    const colorStats = await pool.query(`
      SELECT 
        color,
        COUNT(*) as count
      FROM calendar_events 
      WHERE couple_id = $1 
      GROUP BY color 
      ORDER BY count DESC
    `, [coupleId]);

    // 按月份统计
    const monthlyStats = await pool.query(`
      SELECT 
        DATE_TRUNC('month', event_date) as month,
        COUNT(*) as count
      FROM calendar_events 
      WHERE couple_id = $1 AND event_date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', event_date)
      ORDER BY month DESC
    `, [coupleId]);

    res.json({
      success: true,
      data: {
        byType: typeStats.rows,
        byColor: colorStats.rows,
        byMonth: monthlyStats.rows
      }
    });

  } catch (err) {
    console.error('获取日历统计错误:', err);
    res.status(500).json({
      error: '获取统计失败',
      message: '获取日历统计时遇到了问题'
    });
  }
});

// 获取每日情话
router.get('/daily-quote', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    
    // 获取今天的索引（基于日期）
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    // 获取所有可用的情话
    const quotes = await pool.query(`
      SELECT quote_text, author, is_custom 
      FROM love_quotes 
      WHERE couple_id = $1 OR couple_id IS NULL
      ORDER BY id
    `, [coupleId]);

    if (quotes.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          text: "爱你的这颗心，比昨天多一点，比明天少一点。",
          author: "默认",
          isCustom: false
        }
      });
    }

    // 根据日期选择情话
    const quoteIndex = dayOfYear % quotes.rows.length;
    const dailyQuote = quotes.rows[quoteIndex];

    res.json({
      success: true,
      data: {
        text: dailyQuote.quote_text,
        author: dailyQuote.author,
        isCustom: dailyQuote.is_custom
      }
    });

  } catch (err) {
    console.error('获取每日情话错误:', err);
    res.status(500).json({
      error: '获取情话失败',
      message: '获取每日情话时遇到了问题'
    });
  }
});

// 添加自定义情话
router.post('/quotes', authenticateCouple, async (req, res) => {
  try {
    const { quoteText, author } = req.body;
    const coupleId = req.couple.coupleId;

    if (!quoteText) {
      return res.status(400).json({
        error: '情话内容不能为空'
      });
    }

    const result = await pool.query(
      'INSERT INTO love_quotes (couple_id, quote_text, author, is_custom) VALUES ($1, $2, $3, $4) RETURNING *',
      [coupleId, quoteText, author || '匿名', true]
    );

    res.status(201).json({
      success: true,
      message: '专属情话已添加！',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('添加自定义情话错误:', err);
    res.status(500).json({
      error: '添加失败',
      message: '添加自定义情话时遇到了问题'
    });
  }
});

// 获取活动热力图数据
router.get('/heatmap', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const year = req.query.year || new Date().getFullYear();

    // 获取一年内的活动数据
    const activities = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        'diary' as type,
        COUNT(*) as count
      FROM diaries 
      WHERE couple_id = $1 AND EXTRACT(YEAR FROM created_at) = $2
      GROUP BY DATE(created_at)
      
      UNION ALL
      
      SELECT 
        DATE(created_at) as date,
        'wish' as type,
        COUNT(*) as count
      FROM wishlist 
      WHERE couple_id = $1 AND EXTRACT(YEAR FROM created_at) = $2
      GROUP BY DATE(created_at)
      
      UNION ALL
      
      SELECT 
        DATE(event_date) as date,
        'event' as type,
        COUNT(*) as count
      FROM calendar_events 
      WHERE couple_id = $1 AND EXTRACT(YEAR FROM event_date) = $2
      GROUP BY DATE(event_date)
      
      ORDER BY date
    `, [coupleId, year]);

    // 按日期聚合数据
    const heatmapData = {};
    activities.rows.forEach(activity => {
      const date = activity.date.toISOString().split('T')[0];
      if (!heatmapData[date]) {
        heatmapData[date] = 0;
      }
      heatmapData[date] += parseInt(activity.count);
    });

    res.json({
      success: true,
      data: heatmapData,
      year: parseInt(year)
    });

  } catch (err) {
    console.error('获取热力图数据错误:', err);
    res.status(500).json({
      error: '获取数据失败',
      message: '获取热力图数据时遇到了问题'
    });
  }
});

module.exports = router;
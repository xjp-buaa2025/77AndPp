const express = require('express');
const pool = require('../config/database');
const { authenticateCouple } = require('./auth');

const router = express.Router();

// 获取日历事件
router.get('/', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const { start, end, type } = req.query;

    let query = 'SELECT * FROM calendar_events WHERE couple_id = $1';
    let params = [coupleId];
    let paramCount = 1;

    // 日期范围筛选
    if (start) {
      paramCount++;
      query += ` AND event_date >= $${paramCount}`;
      params.push(start);
    }

    if (end) {
      paramCount++;
      query += ` AND event_date <= $${paramCount}`;
      params.push(end);
    }

    // 事件类型筛选
    if (type && type !== 'all') {
      paramCount++;
      query += ` AND event_type = $${paramCount}`;
      params.push(type);
    }

    query += ' ORDER BY event_date ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (err) {
    console.error('获取日历事件错误:', err);
    res.status(500).json({
      error: '获取事件失败',
      message: '读取你们的日程时遇到了问题'
    });
  }
});

// 创建新事件
router.post('/', authenticateCouple, async (req, res) => {
  try {
    const { title, description, eventDate, eventType, color, reminderEnabled, createdBy } = req.body;
    const coupleId = req.couple.coupleId;

    if (!title || !eventDate || !createdBy) {
      return res.status(400).json({
        error: '信息不完整',
        message: '事件标题、日期和创建者都是必需的'
      });
    }

    const result = await pool.query(
      `INSERT INTO calendar_events (couple_id, title, description, event_date, event_type, color, reminder_enabled, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [coupleId, title, description, eventDate, eventType || 'general', color || 'pink', reminderEnabled !== false, createdBy]
    );

    res.status(201).json({
      success: true,
      message: '事件已记录到你们的小星球！',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('创建事件错误:', err);
    res.status(500).json({
      error: '添加失败',
      message: '添加事件时遇到了问题'
    });
  }
});

// 更新事件
router.put('/:id', authenticateCouple, async (req, res) => {
  try {
    const eventId = req.params.id;
    const coupleId = req.couple.coupleId;
    const { title, description, eventDate, eventType, color, reminderEnabled } = req.body;

    const result = await pool.query(
      `UPDATE calendar_events 
       SET title = $1, description = $2, event_date = $3, event_type = $4, color = $5, reminder_enabled = $6, updated_at = NOW()
       WHERE id = $7 AND couple_id = $8 RETURNING *`,
      [title, description, eventDate, eventType, color, reminderEnabled, eventId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '事件未找到',
        message: '这个事件可能已经被删除了'
      });
    }

    res.json({
      success: true,
      message: '事件更新成功',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('更新事件错误:', err);
    res.status(500).json({
      error: '更新失败',
      message: '更新事件时遇到了问题'
    });
  }
});

// 删除事件
router.delete('/:id', authenticateCouple, async (req, res) => {
  try {
    const eventId = req.params.id;
    const coupleId = req.couple.coupleId;

    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 AND couple_id = $2 RETURNING *',
      [eventId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '事件未找到',
        message: '这个事件可能已经被删除了'
      });
    }

    res.json({
      success: true,
      message: '事件已删除',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('删除事件错误:', err);
    res.status(500).json({
      error: '删除失败',
      message: '删除事件时遇到了问题'
    });
  }
});

// 获取今日事件
router.get('/today', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    
    const result = await pool.query(
      `SELECT * FROM calendar_events 
       WHERE couple_id = $1 AND DATE(event_date) = CURRENT_DATE
       ORDER BY event_date ASC`,
      [coupleId]
    );

    res.json({
      success: true,
      data: result.rows,
      message: result.rows.length > 0 ? `今天有 ${result.rows.length} 个安排` : '今天没有特别安排'
    });

  } catch (err) {
    console.error('获取今日事件错误:', err);
    res.status(500).json({
      error: '获取失败',
      message: '获取今日事件时遇到了问题'
    });
  }
});

// 获取即将到来的事件
router.get('/upcoming', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const days = parseInt(req.query.days) || 7; // 默认7天内

    const result = await pool.query(
      `SELECT * FROM calendar_events 
       WHERE couple_id = $1 AND event_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
       ORDER BY event_date ASC`,
      [coupleId]
    );

    res.json({
      success: true,
      data: result.rows,
      message: `找到 ${result.rows.length} 个即将到来的事件`
    });

  } catch (err) {
    console.error('获取即将到来事件错误:', err);
    res.status(500).json({
      error: '获取失败',
      message: '获取即将到来事件时遇到了问题'
    });
  }
});

// 按月份获取事件
router.get('/month/:year/:month', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    const result = await pool.query(
      `SELECT * FROM calendar_events 
       WHERE couple_id = $1 
       AND EXTRACT(YEAR FROM event_date) = $2 
       AND EXTRACT(MONTH FROM event_date) = $3
       ORDER BY event_date ASC`,
      [coupleId, year, month]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      month: `${year}年${month}月`
    });

  } catch (err) {
    console.error('按月份获取事件错误:', err);
    res.status(500).json({
      error: '获取失败',
      message: '获取月份事件时遇到了问题'
    });
  }
});

// 搜索事件
router.get('/search/:keyword', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const keyword = req.params.keyword;

    const result = await pool.query(
      `SELECT * FROM calendar_events 
       WHERE couple_id = $1 AND (title ILIKE $2 OR description ILIKE $2)
       ORDER BY event_date DESC`,
      [coupleId, `%${keyword}%`]
    );

    res.json({
      success: true,
      data: result.rows,
      message: `找到 ${result.rows.length} 个包含"${keyword}"的事件`
    });

  } catch (err) {
    console.error('搜索事件错误:', err);
    res.status(500).json({
      error: '搜索失败',
      message: '搜索事件时遇到了问题'
    });
  }
});

module.exports = router;
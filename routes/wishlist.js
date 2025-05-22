const express = require('express');
const pool = require('../config/database');
const { authenticateCouple } = require('./auth');

const router = express.Router();

// 获取心愿清单
router.get('/', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const status = req.query.status; // pending, completed, all

    let query = 'SELECT * FROM wishlist WHERE couple_id = $1';
    let params = [coupleId];

    if (status && status !== 'all') {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      summary: {
        total: result.rows.length,
        completed: result.rows.filter(w => w.status === 'completed').length,
        pending: result.rows.filter(w => w.status === 'pending').length
      }
    });

  } catch (err) {
    console.error('获取心愿清单错误:', err);
    res.status(500).json({
      error: '获取心愿失败',
      message: '读取你们的心愿时遇到了问题'
    });
  }
});

// 创建新心愿
router.post('/', authenticateCouple, async (req, res) => {
  try {
    const { title, description, category, targetDate, createdBy } = req.body;
    const coupleId = req.couple.coupleId;

    if (!title || !createdBy) {
      return res.status(400).json({
        error: '信息不完整',
        message: '心愿标题和创建者都是必需的'
      });
    }

    const result = await pool.query(
      `INSERT INTO wishlist (couple_id, title, description, category, target_date, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [coupleId, title, description, category || 'general', targetDate, createdBy]
    );

    res.status(201).json({
      success: true,
      message: '心愿已添加到你们的清单！',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('创建心愿错误:', err);
    res.status(500).json({
      error: '添加失败',
      message: '添加心愿时遇到了问题'
    });
  }
});

// 完成心愿
router.patch('/:id/complete', authenticateCouple, async (req, res) => {
  try {
    const wishId = req.params.id;
    const coupleId = req.couple.coupleId;

    const result = await pool.query(
      `UPDATE wishlist 
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND couple_id = $2 RETURNING *`,
      [wishId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '心愿未找到',
        message: '这个心愿可能已经被删除了'
      });
    }

    res.json({
      success: true,
      message: '愿望达成啦！🎉',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('完成心愿错误:', err);
    res.status(500).json({
      error: '完成失败',
      message: '完成心愿时遇到了问题'
    });
  }
});

// 重新激活心愿
router.patch('/:id/reactivate', authenticateCouple, async (req, res) => {
  try {
    const wishId = req.params.id;
    const coupleId = req.couple.coupleId;

    const result = await pool.query(
      `UPDATE wishlist 
       SET status = 'pending', completed_at = NULL, updated_at = NOW()
       WHERE id = $1 AND couple_id = $2 RETURNING *`,
      [wishId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '心愿未找到',
        message: '这个心愿可能已经被删除了'
      });
    }

    res.json({
      success: true,
      message: '心愿重新激活',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('重新激活心愿错误:', err);
    res.status(500).json({
      error: '激活失败',
      message: '重新激活心愿时遇到了问题'
    });
  }
});

// 更新心愿
router.put('/:id', authenticateCouple, async (req, res) => {
  try {
    const wishId = req.params.id;
    const coupleId = req.couple.coupleId;
    const { title, description, category, targetDate } = req.body;

    const result = await pool.query(
      `UPDATE wishlist 
       SET title = $1, description = $2, category = $3, target_date = $4, updated_at = NOW()
       WHERE id = $5 AND couple_id = $6 RETURNING *`,
      [title, description, category, targetDate, wishId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '心愿未找到',
        message: '这个心愿可能已经被删除了'
      });
    }

    res.json({
      success: true,
      message: '心愿更新成功',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('更新心愿错误:', err);
    res.status(500).json({
      error: '更新失败',
      message: '更新心愿时遇到了问题'
    });
  }
});

// 删除心愿
router.delete('/:id', authenticateCouple, async (req, res) => {
  try {
    const wishId = req.params.id;
    const coupleId = req.couple.coupleId;

    const result = await pool.query(
      'DELETE FROM wishlist WHERE id = $1 AND couple_id = $2 RETURNING *',
      [wishId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '心愿未找到',
        message: '这个心愿可能已经被删除了'
      });
    }

    res.json({
      success: true,
      message: '心愿已删除',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('删除心愿错误:', err);
    res.status(500).json({
      error: '删除失败',
      message: '删除心愿时遇到了问题'
    });
  }
});

// 按分类获取心愿
router.get('/category/:category', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const category = req.params.category;

    const result = await pool.query(
      'SELECT * FROM wishlist WHERE couple_id = $1 AND category = $2 ORDER BY created_at DESC',
      [coupleId, category]
    );

    res.json({
      success: true,
      data: result.rows,
      message: `找到 ${result.rows.length} 个 ${category} 类别的心愿`
    });

  } catch (err) {
    console.error('按分类获取心愿错误:', err);
    res.status(500).json({
      error: '获取失败',
      message: '获取分类心愿时遇到了问题'
    });
  }
});

// 获取即将到期的心愿
router.get('/upcoming', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const days = parseInt(req.query.days) || 30; // 默认30天内

    const result = await pool.query(
      `SELECT * FROM wishlist 
       WHERE couple_id = $1 AND status = 'pending' 
       AND target_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
       ORDER BY target_date ASC`,
      [coupleId]
    );

    res.json({
      success: true,
      data: result.rows,
      message: `找到 ${result.rows.length} 个即将到期的心愿`
    });

  } catch (err) {
    console.error('获取即将到期心愿错误:', err);
    res.status(500).json({
      error: '获取失败',
      message: '获取即将到期心愿时遇到了问题'
    });
  }
});

module.exports = router;
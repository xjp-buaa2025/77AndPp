const express = require('express');
const pool = require('../config/database');
const { authenticateCouple } = require('../middleware/auth');
const { validateDiary, validatePagination, validateSearch, validateId } = require('../middleware/validation');

const router = express.Router();

// 获取所有日记
router.get('/', authenticateCouple, validatePagination, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM diaries 
       WHERE couple_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [coupleId, limit, offset]
    );

    // 获取总数
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM diaries WHERE couple_id = $1',
      [coupleId]
    );

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        hasMore: page < totalPages
      }
    });

  } catch (err) {
    console.error('获取日记错误:', err);
    res.status(500).json({
      error: '获取日记失败',
      message: '读取你们的回忆时遇到了问题'
    });
  }
});

// 创建新日记
router.post('/', authenticateCouple, validateDiary, async (req, res) => {
  try {
    const { title, content, mood, author, coverImage } = req.body;
    const coupleId = req.couple.coupleId;

    if (!title || !content || !author) {
      return res.status(400).json({
        error: '信息不完整',
        message: '标题、内容和作者都是必需的'
      });
    }

    const result = await pool.query(
      `INSERT INTO diaries (couple_id, title, content, mood, author, cover_image) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [coupleId, title, content, mood || 'happy', author, coverImage]
    );

    res.status(201).json({
      success: true,
      message: '今天的美好已经被永远记录！',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('创建日记错误:', err);
    res.status(500).json({
      error: '记录失败',
      message: '保存日记时遇到了问题'
    });
  }
});

// 获取单个日记详情
router.get('/:id', authenticateCouple, validateId, async (req, res) => {
  try {
    const diaryId = req.params.id;
    const coupleId = req.couple.coupleId;

    const result = await pool.query(
      'SELECT * FROM diaries WHERE id = $1 AND couple_id = $2',
      [diaryId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '日记未找到',
        message: '这篇日记可能已经被删除了'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    console.error('获取日记详情错误:', err);
    res.status(500).json({
      error: '获取日记失败',
      message: '读取日记详情时遇到了问题'
    });
  }
});

// 更新日记
router.put('/:id', authenticateCouple, async (req, res) => {
  try {
    const diaryId = req.params.id;
    const coupleId = req.couple.coupleId;
    const { title, content, mood, coverImage } = req.body;

    const result = await pool.query(
      `UPDATE diaries 
       SET title = $1, content = $2, mood = $3, cover_image = $4, updated_at = NOW()
       WHERE id = $5 AND couple_id = $6 RETURNING *`,
      [title, content, mood, coverImage, diaryId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '日记未找到',
        message: '这篇日记可能已经被删除了'
      });
    }

    res.json({
      success: true,
      message: '日记更新成功',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('更新日记错误:', err);
    res.status(500).json({
      error: '更新失败',
      message: '更新日记时遇到了问题'
    });
  }
});

// 删除日记
router.delete('/:id', authenticateCouple, async (req, res) => {
  try {
    const diaryId = req.params.id;
    const coupleId = req.couple.coupleId;

    const result = await pool.query(
      'DELETE FROM diaries WHERE id = $1 AND couple_id = $2 RETURNING *',
      [diaryId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '日记未找到',
        message: '这篇日记可能已经被删除了'
      });
    }

    res.json({
      success: true,
      message: '日记已删除',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('删除日记错误:', err);
    res.status(500).json({
      error: '删除失败',
      message: '删除日记时遇到了问题'
    });
  }
});

// 按心情筛选日记
router.get('/mood/:mood', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const mood = req.params.mood;

    const result = await pool.query(
      `SELECT * FROM diaries 
       WHERE couple_id = $1 AND mood = $2 
       ORDER BY created_at DESC`,
      [coupleId, mood]
    );

    res.json({
      success: true,
      data: result.rows,
      message: `找到 ${result.rows.length} 篇 ${mood} 的回忆`
    });

  } catch (err) {
    console.error('按心情筛选日记错误:', err);
    res.status(500).json({
      error: '筛选失败',
      message: '筛选日记时遇到了问题'
    });
  }
});

// 搜索日记
router.get('/search/:keyword', authenticateCouple, async (req, res) => {
  try {
    const coupleId = req.couple.coupleId;
    const keyword = req.params.keyword;

    const result = await pool.query(
      `SELECT * FROM diaries 
       WHERE couple_id = $1 AND (title ILIKE $2 OR content ILIKE $2)
       ORDER BY created_at DESC`,
      [coupleId, `%${keyword}%`]
    );

    res.json({
      success: true,
      data: result.rows,
      message: `找到 ${result.rows.length} 篇包含"${keyword}"的回忆`
    });

  } catch (err) {
    console.error('搜索日记错误:', err);
    res.status(500).json({
      error: '搜索失败',
      message: '搜索日记时遇到了问题'
    });
  }
});

module.exports = router;
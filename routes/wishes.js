const express = require('express');
const router = express.Router();
const { pool } = require('../lib/db');
const { authenticate } = require('../lib/auth');
const { 
  successResponse, 
  errorResponse, 
  handleError, 
  validateRequiredFields,
  sanitizeString,
  isValidDate,
  formatDate,
  getFriendlyDate,
  generatePagination
} = require('../lib/utils');

// 获取心愿列表
router.get('/', authenticate, async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // 解析查询参数
      const {
        page = 1,
        limit = 20,
        status = 'all', // all, completed, pending
        type = 'all',   // all, 旅行, 美食, 电影, 礼物, 约会, 其他
        sort = 'created_desc', // created_desc, created_asc, title_asc, title_desc, target_date_asc, target_date_desc
        search = ''
      } = req.query;

      // 构建查询条件
      let whereConditions = ['couple_code = $1'];
      let queryParams = [req.coupleCode];
      let paramIndex = 2;

      // 状态过滤
      if (status === 'completed') {
        whereConditions.push('completed = true');
      } else if (status === 'pending') {
        whereConditions.push('completed = false');
      }

      // 类型过滤
      if (type !== 'all') {
        whereConditions.push(`wish_type = $${paramIndex}`);
        queryParams.push(type);
        paramIndex++;
      }

      // 搜索过滤
      if (search && search.trim()) {
        whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        queryParams.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // 构建排序
      let orderBy = 'created_at DESC';
      switch (sort) {
        case 'created_asc':
          orderBy = 'created_at ASC';
          break;
        case 'title_asc':
          orderBy = 'title ASC';
          break;
        case 'title_desc':
          orderBy = 'title DESC';
          break;
        case 'target_date_asc':
          orderBy = 'target_date ASC NULLS LAST';
          break;
        case 'target_date_desc':
          orderBy = 'target_date DESC NULLS LAST';
          break;
        default:
          orderBy = 'completed ASC, created_at DESC'; // 未完成的在前面
      }

      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM wishes 
        WHERE ${whereConditions.join(' AND ')}
      `;
      
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // 分页信息
      const pagination = generatePagination(page, limit, total);

      // 获取心愿列表
      const wishesQuery = `
        SELECT 
          id,
          title,
          description,
          wish_type,
          target_date,
          completed,
          completed_at,
          created_by,
          created_at,
          updated_at
        FROM wishes 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(pagination.pageSize, pagination.offset);
      
      const wishesResult = await client.query(wishesQuery, queryParams);

      // 格式化心愿数据
      const wishes = wishesResult.rows.map(wish => ({
        id: wish.id,
        title: wish.title,
        description: wish.description,
        type: wish.wish_type,
        targetDate: wish.target_date,
        targetDateFormatted: wish.target_date ? formatDate(wish.target_date, 'MM月DD日') : null,
        targetDateFriendly: wish.target_date ? getFriendlyDate(wish.target_date) : null,
        completed: wish.completed,
        completedAt: wish.completed_at,
        completedAtFormatted: wish.completed_at ? formatDate(wish.completed_at, 'MM月DD日') : null,
        completedAtFriendly: wish.completed_at ? getFriendlyDate(wish.completed_at) : null,
        createdBy: wish.created_by,
        createdAt: wish.created_at,
        createdAtFormatted: formatDate(wish.created_at, 'MM月DD日'),
        createdAtFriendly: getFriendlyDate(wish.created_at),
        updatedAt: wish.updated_at,
        // 添加一些计算字段
        isOverdue: wish.target_date && !wish.completed && new Date(wish.target_date) < new Date(),
        daysUntilTarget: wish.target_date && !wish.completed 
          ? Math.ceil((new Date(wish.target_date) - new Date()) / (1000 * 60 * 60 * 24))
          : null
      }));

      const responseData = {
        wishes,
        pagination: {
          ...pagination,
          totalItems: total
        },
        filters: {
          status,
          type,
          search,
          sort
        }
      };

      return res.status(200).json(successResponse(
        responseData,
        '获取心愿列表成功'
      ));

    } finally {
      client.release();
    }

  } catch (error) {
    return handleError(error, res, '获取心愿列表失败');
  }
});

// 创建新心愿
router.post('/create', authenticate, async (req, res) => {
  try {
    // 验证请求数据
    const validation = validateRequiredFields(req.body, ['title']);
    if (!validation.isValid) {
      return res.status(400).json(errorResponse(validation.message, 'VALIDATION_ERROR'));
    }

    const title = sanitizeString(req.body.title, 200);
    const description = sanitizeString(req.body.description, 1000, true);
    const wishType = sanitizeString(req.body.wishType, 50) || '其他';
    const targetDate = req.body.targetDate;
    const createdBy = sanitizeString(req.body.createdBy, 100, true);

    // 验证标题
    if (!title || title.length === 0) {
      return res.status(400).json(errorResponse(
        '请填写愿望标题哦～', 
        'EMPTY_TITLE'
      ));
    }

    // 验证心愿类型
    const validTypes = ['旅行', '美食', '电影', '礼物', '约会', '其他'];
    if (!validTypes.includes(wishType)) {
      return res.status(400).json(errorResponse(
        '无效的心愿类型', 
        'INVALID_WISH_TYPE'
      ));
    }

    // 验证目标日期（如果提供）
    if (targetDate && !isValidDate(targetDate)) {
      return res.status(400).json(errorResponse(
        '请选择有效的目标日期', 
        'INVALID_TARGET_DATE'
      ));
    }

    const client = await pool.connect();
    
    try {
      // 开始事务
      await client.query('BEGIN');

      try {
        // 创建新心愿
        const insertQuery = `
          INSERT INTO wishes (
            couple_code, 
            title, 
            description, 
            wish_type, 
            target_date,
            created_by,
            created_at,
            updated_at
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
          RETURNING *
        `;
        
        const result = await client.query(insertQuery, [
          req.coupleCode,
          title,
          description || null,
          wishType,
          targetDate || null,
          createdBy || null
        ]);

        const newWish = result.rows[0];

        // 记录活动日志
        await client.query(
          `INSERT INTO activity_logs (couple_code, action_type, action_description) 
           VALUES ($1, $2, $3)`,
          [req.coupleCode, 'create_wish', `创建了新心愿：${title}`]
        );

        // 提交事务
        await client.query('COMMIT');

        // 格式化返回数据
        const responseData = {
          id: newWish.id,
          title: newWish.title,
          description: newWish.description,
          type: newWish.wish_type,
          targetDate: newWish.target_date,
          targetDateFormatted: newWish.target_date ? formatDate(newWish.target_date, 'MM月DD日') : null,
          targetDateFriendly: newWish.target_date ? getFriendlyDate(newWish.target_date) : null,
          completed: newWish.completed,
          completedAt: newWish.completed_at,
          createdBy: newWish.created_by,
          createdAt: newWish.created_at,
          createdAtFormatted: formatDate(newWish.created_at, 'MM月DD日'),
          createdAtFriendly: getFriendlyDate(newWish.created_at),
          updatedAt: newWish.updated_at,
          // 计算字段
          daysUntilTarget: newWish.target_date 
            ? Math.ceil((new Date(newWish.target_date) - new Date()) / (1000 * 60 * 60 * 24))
            : null
        };

        return res.status(201).json(successResponse(
          responseData,
          '愿望已锁定！两个心一起想的事，完成起来也更快乐～'
        ));

      } catch (insertError) {
        await client.query('ROLLBACK');
        throw insertError;
      }

    } finally {
      client.release();
    }

  } catch (error) {
    return handleError(error, res, '创建心愿失败');
  }
});

// 更新心愿
router.put('/update/:wishId', authenticate, async (req, res) => {
  try {
    const wishId = req.params.wishId;
    
    if (!wishId || isNaN(parseInt(wishId))) {
      return res.status(400).json(errorResponse(
        '无效的心愿ID', 
        'INVALID_WISH_ID'
      ));
    }

    const client = await pool.connect();
    
    try {
      // 检查心愿是否存在且属于当前情侣
      const checkQuery = `
        SELECT 
          id, title, completed, wish_type, target_date, created_at
        FROM wishes 
        WHERE id = $1 AND couple_code = $2
      `;
      
      const checkResult = await client.query(checkQuery, [wishId, req.coupleCode]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json(errorResponse(
          '心愿不存在或不属于你们', 
          'WISH_NOT_FOUND'
        ));
      }

      // 准备更新字段
      const updates = {};
      const updateFields = [];
      const queryParams = [wishId, req.coupleCode];
      let paramIndex = 3;

      // 处理完成状态更新
      if ('completed' in req.body) {
        const completed = Boolean(req.body.completed);
        updates.completed = completed;
        updateFields.push(`completed = ${paramIndex}`);
        queryParams.push(completed);
        paramIndex++;
        
        // 如果标记为完成，设置完成时间；如果取消完成，清除完成时间
        if (completed) {
          updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
        } else {
          updateFields.push(`completed_at = NULL`);
        }
      }

      // 处理其他字段更新
      if ('title' in req.body) {
        const title = sanitizeString(req.body.title, 200);
        if (!title || title.length === 0) {
          return res.status(400).json(errorResponse(
            '愿望标题不能为空', 
            'EMPTY_TITLE'
          ));
        }
        updates.title = title;
        updateFields.push(`title = ${paramIndex}`);
        queryParams.push(title);
        paramIndex++;
      }

      if ('description' in req.body) {
        const description = sanitizeString(req.body.description, 1000, true);
        updates.description = description;
        updateFields.push(`description = ${paramIndex}`);
        queryParams.push(description || null);
        paramIndex++;
      }

      if ('wishType' in req.body) {
        const wishType = sanitizeString(req.body.wishType, 50) || '其他';
        const validTypes = ['旅行', '美食', '电影', '礼物', '约会', '其他'];
        if (!validTypes.includes(wishType)) {
          return res.status(400).json(errorResponse(
            '无效的心愿类型', 
            'INVALID_WISH_TYPE'
          ));
        }
        updates.wishType = wishType;
        updateFields.push(`wish_type = ${paramIndex}`);
        queryParams.push(wishType);
        paramIndex++;
      }

      if ('targetDate' in req.body) {
        const targetDate = req.body.targetDate;
        if (targetDate && !isValidDate(targetDate)) {
          return res.status(400).json(errorResponse(
            '请选择有效的目标日期', 
            'INVALID_TARGET_DATE'
          ));
        }
        updates.targetDate = targetDate;
        updateFields.push(`target_date = ${paramIndex}`);
        queryParams.push(targetDate || null);
        paramIndex++;
      }

      // 如果没有任何更新字段
      if (updateFields.length === 0) {
        return res.status(400).json(errorResponse(
          '没有提供要更新的字段', 
          'NO_UPDATE_FIELDS'
        ));
      }

      // 开始事务
      await client.query('BEGIN');

      try {
        // 添加更新时间
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        // 执行更新
        const updateQuery = `
          UPDATE wishes 
          SET ${updateFields.join(', ')}
          WHERE id = $1 AND couple_code = $2
          RETURNING *
        `;
        
        const updateResult = await client.query(updateQuery, queryParams);
        const updatedWish = updateResult.rows[0];

        // 记录活动日志
        let actionDescription = '';
        if ('completed' in req.body) {
          if (req.body.completed) {
            actionDescription = `完成了心愿：${updatedWish.title}`;
          } else {
            actionDescription = `重新激活了心愿：${updatedWish.title}`;
          }
        } else {
          actionDescription = `更新了心愿：${updatedWish.title}`;
        }

        await client.query(
          `INSERT INTO activity_logs (couple_code, action_type, action_description) 
           VALUES ($1, $2, $3)`,
          [req.coupleCode, 'update_wish', actionDescription]
        );

        // 提交事务
        await client.query('COMMIT');

        // 格式化返回数据
        const responseData = {
          id: updatedWish.id,
          title: updatedWish.title,
          description: updatedWish.description,
          type: updatedWish.wish_type,
          targetDate: updatedWish.target_date,
          targetDateFormatted: updatedWish.target_date ? formatDate(updatedWish.target_date, 'MM月DD日') : null,
          targetDateFriendly: updatedWish.target_date ? getFriendlyDate(updatedWish.target_date) : null,
          completed: updatedWish.completed,
          completedAt: updatedWish.completed_at,
          completedAtFormatted: updatedWish.completed_at ? formatDate(updatedWish.completed_at, 'MM月DD日') : null,
          completedAtFriendly: updatedWish.completed_at ? getFriendlyDate(updatedWish.completed_at) : null,
          createdBy: updatedWish.created_by,
          createdAt: updatedWish.created_at,
          createdAtFormatted: formatDate(updatedWish.created_at, 'MM月DD日'),
          createdAtFriendly: getFriendlyDate(updatedWish.created_at),
          updatedAt: updatedWish.updated_at,
          // 计算字段
          isOverdue: updatedWish.target_date && !updatedWish.completed && new Date(updatedWish.target_date) < new Date(),
          daysUntilTarget: updatedWish.target_date && !updatedWish.completed 
            ? Math.ceil((new Date(updatedWish.target_date) - new Date()) / (1000 * 60 * 60 * 24))
            : null,
          // 更新信息
          wasStatusChanged: 'completed' in req.body,
          wasCompleted: 'completed' in req.body && req.body.completed
        };

        // 根据更新类型返回不同的消息
        let message = '心愿更新成功';
        if ('completed' in req.body) {
          if (req.body.completed) {
            message = '愿望达成啦！🎉';
          } else {
            message = '心愿重新激活，继续加油！';
          }
        }

        return res.status(200).json(successResponse(
          responseData,
          message
        ));

      } catch (updateError) {
        await client.query('ROLLBACK');
        throw updateError;
      }

    } finally {
      client.release();
    }

  } catch (error) {
    return handleError(error, res, '更新心愿失败');
  }
});

// 删除心愿
router.delete('/delete/:wishId', authenticate, async (req, res) => {
  try {
    const wishId = req.params.wishId;
    
    if (!wishId || isNaN(parseInt(wishId))) {
      return res.status(400).json(errorResponse(
        '无效的心愿ID', 
        'INVALID_WISH_ID'
      ));
    }

    const client = await pool.connect();
    
    try {
      // 开始事务
      await client.query('BEGIN');

      try {
        // 先查询心愿信息，用于日志记录
        const selectQuery = `
          SELECT id, title, completed, wish_type 
          FROM wishes 
          WHERE id = $1 AND couple_code = $2
        `;
        
        const selectResult = await client.query(selectQuery, [wishId, req.coupleCode]);

        if (selectResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json(errorResponse(
            '心愿不存在或不属于你们', 
            'WISH_NOT_FOUND'
          ));
        }

        const wishToDelete = selectResult.rows[0];

        // 删除心愿
        const deleteQuery = `
          DELETE FROM wishes 
          WHERE id = $1 AND couple_code = $2
          RETURNING id
        `;
        
        await client.query(deleteQuery, [wishId, req.coupleCode]);

        // 记录活动日志
        await client.query(
          `INSERT INTO activity_logs (couple_code, action_type, action_description) 
           VALUES ($1, $2, $3)`,
          [req.coupleCode, 'delete_wish', `删除了心愿：${wishToDelete.title}`]
        );

        // 提交事务
        await client.query('COMMIT');

        const responseData = {
          deletedWishId: parseInt(wishId),
          deletedWishTitle: wishToDelete.title,
          deletedAt: new Date().toISOString()
        };

        return res.status(200).json(successResponse(
          responseData,
          '心愿已删除'
        ));

      } catch (deleteError) {
        await client.query('ROLLBACK');
        throw deleteError;
      }

    } finally {
      client.release();
    }

  } catch (error) {
    return handleError(error, res, '删除心愿失败');
  }
});

module.exports = router;
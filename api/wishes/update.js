const { pool } = require('../../lib/db');
const { authenticate } = require('../../lib/auth');
const { 
  successResponse, 
  errorResponse, 
  handleError, 
  sanitizeString,
  isValidDate,
  setCorsHeaders,
  logApiAccess,
  formatDate,
  getFriendlyDate
} = require('../../lib/utils');

module.exports = async (req, res) => {
  const startTime = Date.now();
  
  // 设置CORS头
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json(errorResponse('方法不允许', 'METHOD_NOT_ALLOWED'));
  }

  try {
    authenticate(req, res, async () => {
      const wishId = req.query.wishId || req.body.wishId;
      
      if (!wishId) {
        return res.status(400).json(errorResponse(
          '缺少心愿ID', 
          'MISSING_WISH_ID'
        ));
      }

      if (isNaN(parseInt(wishId))) {
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
          logApiAccess(req, { statusCode: 404 }, Date.now() - startTime);
          return res.status(404).json(errorResponse(
            '心愿不存在或不属于你们', 
            'WISH_NOT_FOUND'
          ));
        }

        const existingWish = checkResult.rows[0];
        
        // 准备更新字段
        const updates = {};
        const updateFields = [];
        const queryParams = [wishId, req.coupleCode];
        let paramIndex = 3;

        // 处理完成状态更新
        if ('completed' in req.body) {
          const completed = Boolean(req.body.completed);
          updates.completed = completed;
          updateFields.push(`completed = $${paramIndex}`);
          queryParams.push(completed);
          paramIndex++;
          
          // 如果标记为完成，设置完成时间；如果取消完成，清除完成时间
          if (completed) {
            updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
          } else {
            updateFields.push(`completed_at = NULL`);
          }
        }

        // 处理标题更新
        if ('title' in req.body) {
          const title = sanitizeString(req.body.title, 200);
          if (!title || title.length === 0) {
            return res.status(400).json(errorResponse(
              '愿望标题不能为空', 
              'EMPTY_TITLE'
            ));
          }
          updates.title = title;
          updateFields.push(`title = $${paramIndex}`);
          queryParams.push(title);
          paramIndex++;
        }

        // 处理描述更新
        if ('description' in req.body) {
          const description = sanitizeString(req.body.description, 1000, true);
          updates.description = description;
          updateFields.push(`description = $${paramIndex}`);
          queryParams.push(description || null);
          paramIndex++;
        }

        // 处理类型更新
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
          updateFields.push(`wish_type = $${paramIndex}`);
          queryParams.push(wishType);
          paramIndex++;
        }

        // 处理目标日期更新
        if ('targetDate' in req.body) {
          const targetDate = req.body.targetDate;
          if (targetDate && !isValidDate(targetDate)) {
            return res.status(400).json(errorResponse(
              '请选择有效的目标日期', 
              'INVALID_TARGET_DATE'
            ));
          }
          updates.targetDate = targetDate;
          updateFields.push(`target_date = $${paramIndex}`);
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
          } else if ('title' in req.body) {
            actionDescription = `更新了心愿：${updatedWish.title}`;
          } else {
            actionDescription = `修改了心愿：${updatedWish.title}`;
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

          logApiAccess(req, { statusCode: 200 }, Date.now() - startTime);

          return res.status(200).json(successResponse(
            responseData,
            message
          ));

        } catch (updateError) {
          // 回滚事务
          await client.query('ROLLBACK');
          throw updateError;
        }

      } finally {
        client.release();
      }
    });

  } catch (error) {
    logApiAccess(req, { statusCode: 500 }, Date.now() - startTime);
    return handleError(error, res, '更新心愿失败');
  }
};
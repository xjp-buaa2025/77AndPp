const { pool } = require('../../lib/db');
const { authenticate } = require('../../lib/auth');
const { 
  successResponse, 
  errorResponse, 
  handleError, 
  validateRequiredFields,
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

  if (req.method !== 'POST') {
    return res.status(405).json(errorResponse('方法不允许', 'METHOD_NOT_ALLOWED'));
  }

  try {
    authenticate(req, res, async () => {
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

      if (title.length > 200) {
        return res.status(400).json(errorResponse(
          '愿望标题不能超过200个字符', 
          'TITLE_TOO_LONG'
        ));
      }

      // 验证描述长度
      if (description && description.length > 1000) {
        return res.status(400).json(errorResponse(
          '愿望描述不能超过1000个字符', 
          'DESCRIPTION_TOO_LONG'
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

      // 如果有目标日期，检查不能是过去的日期
      if (targetDate) {
        const today = new Date();
        const selectedDate = new Date(targetDate);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (selectedDate < yesterday) {
          return res.status(400).json(errorResponse(
            '目标日期不能是过去哦，选个未来的美好日子吧～', 
            'PAST_TARGET_DATE'
          ));
        }
      }

      const client = await pool.connect();
      
      try {
        // 检查该情侣是否存在
        const coupleCheck = await client.query(
          'SELECT id FROM couples WHERE couple_code = $1',
          [req.coupleCode]
        );

        if (coupleCheck.rows.length === 0) {
          return res.status(404).json(errorResponse(
            '情侣信息不存在', 
            'COUPLE_NOT_FOUND'
          ));
        }

        // 检查是否有重复的心愿标题（可选的业务逻辑）
        const duplicateCheck = await client.query(
          'SELECT id FROM wishes WHERE couple_code = $1 AND title = $2 AND completed = false',
          [req.coupleCode, title]
        );

        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json(errorResponse(
            '你们已经有相同的心愿了，要不要去看看～', 
            'DUPLICATE_WISH'
          ));
        }

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

          logApiAccess(req, { statusCode: 201 }, Date.now() - startTime);

          return res.status(201).json(successResponse(
            responseData,
            '愿望已锁定！两个心一起想的事，完成起来也更快乐～'
          ));

        } catch (insertError) {
          // 回滚事务
          await client.query('ROLLBACK');
          throw insertError;
        }

      } finally {
        client.release();
      }
    });

  } catch (error) {
    logApiAccess(req, { statusCode: 500 }, Date.now() - startTime);
    return handleError(error, res, '创建心愿失败');
  }
};
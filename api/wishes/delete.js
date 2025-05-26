const { pool } = require('../../lib/db');
const { authenticate } = require('../../lib/auth');
const { 
  successResponse, 
  errorResponse, 
  handleError, 
  setCorsHeaders,
  logApiAccess
} = require('../../lib/utils');

module.exports = async (req, res) => {
  const startTime = Date.now();
  
  // 设置CORS头
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
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
            logApiAccess(req, { statusCode: 404 }, Date.now() - startTime);
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
          
          const deleteResult = await client.query(deleteQuery, [wishId, req.coupleCode]);

          if (deleteResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json(errorResponse(
              '心愿不存在', 
              'WISH_NOT_FOUND'
            ));
          }

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

          logApiAccess(req, { statusCode: 200 }, Date.now() - startTime);

          return res.status(200).json(successResponse(
            responseData,
            '心愿已删除'
          ));

        } catch (deleteError) {
          // 回滚事务
          await client.query('ROLLBACK');
          throw deleteError;
        }

      } finally {
        client.release();
      }
    });

  } catch (error) {
    logApiAccess(req, { statusCode: 500 }, Date.now() - startTime);
    return handleError(error, res, '删除心愿失败');
  }
};
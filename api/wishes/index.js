const { pool } = require('../../lib/db');
const { authenticate } = require('../../lib/auth');
const { 
  successResponse, 
  errorResponse, 
  handleError, 
  setCorsHeaders,
  logApiAccess,
  formatDate,
  getFriendlyDate,
  generatePagination
} = require('../../lib/utils');

module.exports = async (req, res) => {
  const startTime = Date.now();
  
  // 设置CORS头
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse('方法不允许', 'METHOD_NOT_ALLOWED'));
  }

  try {
    authenticate(req, res, async () => {
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

        // 获取类型统计
        const typeStatsQuery = `
          SELECT 
            wish_type,
            COUNT(*) as count,
            COUNT(CASE WHEN completed = true THEN 1 END) as completed_count
          FROM wishes 
          WHERE couple_code = $1
          GROUP BY wish_type
          ORDER BY count DESC
        `;
        
        const typeStatsResult = await client.query(typeStatsQuery, [req.coupleCode]);
        
        const typeStats = typeStatsResult.rows.map(stat => ({
          type: stat.wish_type,
          total: parseInt(stat.count),
          completed: parseInt(stat.completed_count),
          completionRate: parseInt(stat.count) > 0 
            ? Math.round((parseInt(stat.completed_count) / parseInt(stat.count)) * 100)
            : 0
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
          },
          statistics: {
            total,
            typeBreakdown: typeStats
          }
        };

        logApiAccess(req, { statusCode: 200 }, Date.now() - startTime);

        return res.status(200).json(successResponse(
          responseData,
          '获取心愿列表成功'
        ));

      } finally {
        client.release();
      }
    });

  } catch (error) {
    logApiAccess(req, { statusCode: 500 }, Date.now() - startTime);
    return handleError(error, res, '获取心愿列表失败');
  }
};
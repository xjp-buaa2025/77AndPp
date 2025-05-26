const { pool, initDatabase } = require('../../lib/db');
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

  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse('方法不允许', 'METHOD_NOT_ALLOWED'));
  }

  try {
    // 确保数据库已初始化
    await initDatabase();
    
    const client = await pool.connect();
    
    try {
      // 获取查询参数
      const { category = 'all', limit = 1 } = req.query;
      
      // 验证limit参数
      const quotesLimit = Math.min(Math.max(1, parseInt(limit) || 1), 10); // 最多返回10条

      // 构建查询条件
      let whereCondition = 'is_active = true';
      const queryParams = [];
      
      if (category !== 'all') {
        whereCondition += ' AND category = $1';
        queryParams.push(category);
      }

      // 查询随机情话
      const quotesQuery = `
        SELECT 
          id,
          content,
          category,
          created_at
        FROM love_quotes 
        WHERE ${whereCondition}
        ORDER BY RANDOM() 
        LIMIT ${quotesLimit}
      `;
      
      const result = await client.query(quotesQuery, queryParams);

      if (result.rows.length === 0) {
        // 如果数据库中没有情话，返回默认的
        const defaultQuotes = [
          { id: 0, content: '无论今天多忙，我的想念永远准时。', category: 'default' },
          { id: 0, content: '爱你的这颗心，比昨天多一点，比明天少一点。', category: 'default' },
          { id: 0, content: '在所有的好运里，我最想要的是你。', category: 'default' }
        ];
        
        const randomIndex = Math.floor(Math.random() * defaultQuotes.length);
        const selectedQuote = defaultQuotes[randomIndex];
        
        logApiAccess(req, { statusCode: 200 }, Date.now() - startTime);
        
        return res.status(200).json(successResponse(
          quotesLimit === 1 ? selectedQuote : [selectedQuote],
          '获取情话成功（使用默认内容）'
        ));
      }

      // 格式化返回数据
      const quotes = result.rows.map(quote => ({
        id: quote.id,
        content: quote.content,
        category: quote.category,
        createdAt: quote.created_at
      }));

      // 获取所有可用的分类
      const categoriesQuery = `
        SELECT DISTINCT category, COUNT(*) as count
        FROM love_quotes 
        WHERE is_active = true
        GROUP BY category
        ORDER BY category
      `;
      
      const categoriesResult = await client.query(categoriesQuery);
      const availableCategories = categoriesResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count)
      }));

      const responseData = {
        quotes: quotesLimit === 1 ? quotes[0] : quotes,
        meta: {
          totalAvailable: result.rowCount,
          requestedLimit: quotesLimit,
          category: category,
          availableCategories
        }
      };

      logApiAccess(req, { statusCode: 200 }, Date.now() - startTime);

      return res.status(200).json(successResponse(
        responseData,
        '获取情话成功'
      ));

    } finally {
      client.release();
    }

  } catch (error) {
    logApiAccess(req, { statusCode: 500 }, Date.now() - startTime);
    return handleError(error, res, '获取情话失败');
  }
};
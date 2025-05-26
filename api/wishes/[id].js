const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const wishId = parseInt(id);

  if (!wishId || isNaN(wishId)) {
    return res.status(400).json({
      success: false,
      message: '无效的心愿ID'
    });
  }

  try {
    console.log(`📝 收到 ${req.method} 请求，心愿ID: ${wishId}`);

    if (req.method === 'PUT') {
      return await updateWish(req, res, wishId);
    } else if (req.method === 'DELETE') {
      return await deleteWish(req, res, wishId);
    } else {
      return res.status(405).json({
        success: false,
        message: '方法不被允许'
      });
    }
  } catch (error) {
    console.error('❌ API错误:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误'
    });
  }
}

// 更新心愿
async function updateWish(req, res, wishId) {
  try {
    const updates = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        let dbField = key;
        if (key === 'targetDate') dbField = 'target_date';
        if (key === 'completedAt') dbField = 'completed_at';
        if (key === 'updatedAt') dbField = 'updated_at';
        if (key === 'type') {
          updateFields.push(`type = $${paramCount}`);
          updateFields.push(`wish_type = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
          return;
        }

        updateFields.push(`${dbField} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(wishId);

    const client = await pool.connect();
    
    const query = `
      UPDATE wishes 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '心愿未找到'
      });
    }

    const wish = result.rows[0];
    const formattedWish = {
      id: wish.id,
      title: wish.title,
      type: wish.type || wish.wish_type,
      description: wish.description,
      targetDate: wish.target_date,
      completed: wish.completed,
      completedAt: wish.completed_at,
      createdAt: wish.created_at,
      updatedAt: wish.updated_at
    };

    return res.json({
      success: true,
      data: formattedWish
    });
  } catch (error) {
    console.error('更新心愿错误:', error);
    throw error;
  }
}

// 删除心愿
async function deleteWish(req, res, wishId) {
  try {
    const client = await pool.connect();
    
    const result = await client.query(
      'DELETE FROM wishes WHERE id = $1 RETURNING id',
      [wishId]
    );
    
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '心愿未找到'
      });
    }

    return res.json({
      success: true,
      message: '心愿删除成功'
    });
  } catch (error) {
    console.error('删除心愿错误:', error);
    throw error;
  }
}
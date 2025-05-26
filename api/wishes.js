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

// 初始化数据库表
async function initDatabase() {
  try {
    const client = await pool.connect();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS wishes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        wish_type VARCHAR(50),
        target_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        type VARCHAR(50) NOT NULL
      )
    `;
    
    await client.query(createTableQuery);
    client.release();
    console.log('✅ 数据库表初始化成功');
  } catch (error) {
    console.error('❌ 数据库初始化错误:', error);
  }
}

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log(`📝 收到 ${req.method} 请求`);

    // 确保数据库表存在
    await initDatabase();

    if (req.method === 'GET') {
      return await getWishes(req, res);
    } else if (req.method === 'POST') {
      return await createWish(req, res);
    } else if (req.method === 'PUT') {
      return await updateWish(req, res);
    } else if (req.method === 'DELETE') {
      return await deleteWish(req, res);
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

// 获取所有心愿
async function getWishes(req, res) {
  try {
    const client = await pool.connect();
    
    const result = await client.query(
      'SELECT * FROM wishes ORDER BY completed ASC, created_at DESC'
    );
    
    client.release();
    
    const wishes = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      type: row.type || row.wish_type,
      description: row.description,
      targetDate: row.target_date,
      completed: row.completed,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return res.json({
      success: true,
      data: { wishes }
    });
  } catch (error) {
    console.error('获取心愿列表错误:', error);
    throw error;
  }
}

// 创建新心愿
async function createWish(req, res) {
  try {
    const { title, type, description, targetDate } = req.body;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: '标题和类型是必填项'
      });
    }

    const client = await pool.connect();

    const insertQuery = `
      INSERT INTO wishes (title, description, wish_type, target_date, type) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    
    const values = [
      title, 
      description || null,
      type,
      targetDate || null,
      type
    ];

    const result = await client.query(insertQuery, values);
    client.release();

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

    return res.status(201).json({
      success: true,
      data: formattedWish
    });
  } catch (error) {
    console.error('创建心愿错误:', error);
    throw error;
  }
}

// 更新心愿
async function updateWish(req, res) {
  try {
    const { id } = req.query;
    const wishId = parseInt(id);
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
async function deleteWish(req, res) {
  try {
    const { id } = req.query;
    const wishId = parseInt(id);

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
const { Pool } = require('pg');

// 创建数据库连接池
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_rzq9Uln8hdDQ@ep-misty-wind-a5wyvdm8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
      ssl: {
        rejectUnauthorized: false
      },
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export default async function handler(req, res) {
  console.log(`🌐 API调用: ${req.method} ${req.url}`);
  
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dbPool = getPool();
    
    // 解析 URL 路径
    const { query } = req;
    const pathSegments = req.url.split('/').filter(Boolean);
    
    // 如果是 /api/wishes/123 这样的路径
    if (pathSegments.length >= 3 && pathSegments[2]) {
      const wishId = parseInt(pathSegments[2]);
      if (req.method === 'PUT') {
        return await updateWish(req, res, dbPool, wishId);
      } else if (req.method === 'DELETE') {
        return await deleteWish(req, res, dbPool, wishId);
      }
    }
    
    // 基本的 /api/wishes 路径
    if (req.method === 'GET') {
      return await getWishes(req, res, dbPool);
    } else if (req.method === 'POST') {
      return await createWish(req, res, dbPool);
    }
    
    return res.status(405).json({
      success: false,
      message: `方法 ${req.method} 不被允许`
    });
    
  } catch (error) {
    console.error('❌ API错误:', error);
    
    // 确保返回 JSON 格式的错误
    return res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// 初始化数据库表
async function ensureTable(pool) {
  try {
    const client = await pool.connect();
    
    // 检查表是否存在
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'wishes'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      const createTableQuery = `
        CREATE TABLE wishes (
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
      console.log('✅ 数据库表创建成功');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ 数据库表检查/创建失败:', error);
    throw error;
  }
}

// 获取所有心愿
async function getWishes(req, res, pool) {
  try {
    await ensureTable(pool);
    
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM wishes ORDER BY completed ASC, created_at DESC'
    );
    client.release();
    
    const wishes = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      type: row.type || row.wish_type || '其他',
      description: row.description,
      targetDate: row.target_date,
      completed: row.completed,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    console.log(`✅ 成功获取 ${wishes.length} 个心愿`);
    
    return res.status(200).json({
      success: true,
      data: { wishes }
    });
  } catch (error) {
    console.error('❌ 获取心愿列表错误:', error);
    throw error;
  }
}

// 创建新心愿
async function createWish(req, res, pool) {
  try {
    const { title, type, description, targetDate } = req.body;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: '标题和类型是必填项'
      });
    }

    await ensureTable(pool);
    
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

    console.log(`✅ 成功创建心愿: ${title}`);

    return res.status(201).json({
      success: true,
      data: formattedWish
    });
  } catch (error) {
    console.error('❌ 创建心愿错误:', error);
    throw error;
  }
}

// 更新心愿
async function updateWish(req, res, pool, wishId) {
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
          updateFields.push(`type = ${paramCount}`);
          updateFields.push(`wish_type = ${paramCount}`);
          values.push(updates[key]);
          paramCount++;
          return;
        }

        updateFields.push(`${dbField} = ${paramCount}`);
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
      WHERE id = ${paramCount}
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

    console.log(`✅ 成功更新心愿: ${wishId}`);

    return res.status(200).json({
      success: true,
      data: formattedWish
    });
  } catch (error) {
    console.error('❌ 更新心愿错误:', error);
    throw error;
  }
}

// 删除心愿
async function deleteWish(req, res, pool, wishId) {
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

    console.log(`✅ 成功删除心愿: ${wishId}`);

    return res.status(200).json({
      success: true,
      message: '心愿删除成功'
    });
  } catch (error) {
    console.error('❌ 删除心愿错误:', error);
    throw error;
  }
}
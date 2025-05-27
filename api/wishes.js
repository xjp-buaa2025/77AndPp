const { Pool } = require('pg');

// 创建数据库连接池
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://neondb_owner:npg_rzq9Uln8hdDQ@ep-misty-wind-a5wyvdm8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export default async function handler(req, res) {
  console.log(`🌐 API调用: ${req.method} ${req.url}`);
  console.log('📋 请求体:', req.body);

  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dbPool = getPool();

    // 解析 URL 路径
    const urlParts = req.url.split('/').filter(Boolean);
    console.log('🔍 URL部分:', urlParts);

    // 如果是 /api/wishes/123 这样的路径
    if (urlParts.length >= 3 && !isNaN(parseInt(urlParts[2]))) {
      const wishId = parseInt(urlParts[2]);
      console.log(`🎯 操作心愿ID: ${wishId}`);

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
      message: `方法 ${req.method} 不被允许`,
    });
  } catch (error) {
    console.error('❌ API错误:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误',
      error:
        process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

// 初始化数据库表
async function ensureTable(pool) {
  let client;
  try {
    client = await pool.connect();

    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ourwish'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📋 创建新的 ourwish 表...');
      await client.query(`
        CREATE TABLE ourwish (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          wish_type VARCHAR(50) NOT NULL,
          description TEXT,
          target_date DATE,
          is_completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ ourwish表创建成功');

      await client.query(`
        INSERT INTO ourwish (title, wish_type, description, is_completed) VALUES
        ('一起去看樱花', '旅行', '春天的时候找个周末去看樱花', false),
        ('尝试做寿司', '美食', '在家一起学做寿司', false),
        ('看完这部电影', '电影', '朋友推荐的那部电影', true)
      `);
      console.log('✅ 示例数据插入成功');
    }
  } catch (error) {
    console.error('❌ 数据库表检查/创建失败:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// 获取所有心愿
async function getWishes(req, res, pool) {
  let client;
  try {
    await ensureTable(pool);
    client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM ourwish ORDER BY is_completed ASC, created_at DESC'
    );

    const wishes = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.wish_type,
      description: row.description,
      targetDate: row.target_date,
      completed: row.is_completed,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log(`✅ 成功获取 ${wishes.length} 个心愿`);
    return res.status(200).json({
      success: true,
      data: { wishes },
    });
  } catch (error) {
    console.error('❌ 获取心愿列表错误:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// 创建新心愿
async function createWish(req, res, pool) {
  let client;
  try {
    const { title, type, description, targetDate } = req.body;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: '标题和类型是必填项',
      });
    }

    await ensureTable(pool);
    client = await pool.connect();

    const insertQuery = `
      INSERT INTO ourwish (title, wish_type, description, target_date) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;

    const values = [
      title,
      type,
      description || null,
      targetDate || null,
    ];

    const result = await client.query(insertQuery, values);
    const wish = result.rows[0];

    const formattedWish = {
      id: wish.id,
      title: wish.title,
      type: wish.wish_type,
      description: wish.description,
      targetDate: wish.target_date,
      completed: wish.is_completed,
      completedAt: wish.completed_at,
      createdAt: wish.created_at,
      updatedAt: wish.updated_at,
    };

    console.log(`✅ 成功创建心愿: ${title}`);
    return res.status(201).json({
      success: true,
      data: formattedWish,
    });
  } catch (error) {
    console.error('❌ 创建心愿错误:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// 更新心愿
async function updateWish(req, res, pool, wishId) {
  let client;
  try {
    console.log(`🔄 更新心愿 ${wishId}:`, req.body);
    const updates = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        let dbField = key;
        let value = updates[key];

        if (key === 'targetDate') dbField = 'target_date';
        if (key === 'completed') dbField = 'is_completed';
        if (key === 'completedAt') dbField = 'completed_at';
        if (key === 'updatedAt') dbField = 'updated_at';
        if (key === 'type') dbField = 'wish_type';

        if (key === 'completed') {
          value = Boolean(value);
        }
        if (key === 'completedAt' && (value === '' || value === 'null')) {
          value = null;
        }

        updateFields.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(wishId);

    client = await pool.connect();
    const query = `
      UPDATE ourwish 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    console.log('🔍 执行更新SQL:', query);
    console.log('🔍 参数值:', values);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '心愿未找到',
      });
    }

    const wish = result.rows[0];
    const formattedWish = {
      id: wish.id,
      title: wish.title,
      type: wish.wish_type,
      description: wish.description,
      targetDate: wish.target_date,
      completed: wish.is_completed,
      completedAt: wish.completed_at,
      createdAt: wish.created_at,
      updatedAt: wish.updated_at,
    };

    console.log(`✅ 成功更新心愿: ${wishId}`);
    return res.status(200).json({
      success: true,
      data: formattedWish,
    });
  } catch (error) {
    console.error('❌ 更新心愿错误:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// 删除心愿
async function deleteWish(req, res, pool, wishId) {
  let client;
  try {
    console.log(`🗑️ 删除心愿: ${wishId}`);

    client = await pool.connect();
    const result = await client.query(
      'DELETE FROM ourwish WHERE id = $1 RETURNING id',
      [wishId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '心愿未找到',
      });
    }

    console.log(`✅ 成功删除心愿: ${wishId}`);
    return res.status(200).json({
      success: true,
      message: '心愿删除成功',
    });
  } catch (error) {
    console.error('❌ 删除心愿错误:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

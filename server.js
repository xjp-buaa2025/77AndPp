const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 数据库连接配置
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_rzq9Uln8hdDQ@ep-misty-wind-a5wyvdm8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // 静态文件目录

// 创建心愿表（如果不存在）
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wishes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        target_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('数据库表初始化成功');
  } catch (error) {
    console.error('数据库初始化错误:', error);
  }
}

// 获取所有心愿
app.get('/api/wishes', async (req, res) => {
  try {
    // 如果数据库未连接，返回空数组
    if (!isDatabaseConnected) {
      return res.json({
        success: true,
        data: { wishes: [] }
      });
    }

    const result = await pool.query(
      'SELECT * FROM wishes ORDER BY completed ASC, created_at DESC'
    );
    
    const wishes = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      type: row.type || row.wish_type, // 兼容两种字段名
      description: row.description,
      targetDate: row.target_date,
      completed: row.completed,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      success: true,
      data: { wishes }
    });
  } catch (error) {
    console.error('获取心愿列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取心愿列表失败'
    });
  }
});

// 创建新心愿
app.post('/api/wishes', async (req, res) => {
  let client;
  try {
    console.log('📝 收到创建心愿请求:', req.body);
    
    const { title, type, description, targetDate } = req.body;

    if (!title || !type) {
      console.log('❌ 缺少必填字段:', { title: !!title, type: !!type });
      return res.status(400).json({
        success: false,
        message: '标题和类型是必填项'
      });
    }

    // 如果数据库未连接，返回错误
    if (!isDatabaseConnected) {
      console.log('❌ 数据库未连接，无法保存');
      return res.status(503).json({
        success: false,
        message: '数据库连接失败，请稍后重试'
      });
    }

    // 获取数据库连接
    client = await pool.connect();
    console.log('✅ 获取数据库连接成功');

    // 简化的插入查询
    const insertQuery = `
      INSERT INTO wishes (title, description, wish_type, target_date, type) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    
    const values = [
      title, 
      description || null,
      type, // wish_type 字段
      targetDate || null,
      type  // type 字段
    ];
    
    console.log('🔍 执行SQL:', insertQuery);
    console.log('🔍 参数值:', values);

    const result = await client.query(insertQuery, values);
    console.log('✅ 插入成功, 返回行数:', result.rows.length);

    if (result.rows.length === 0) {
      throw new Error('插入操作未返回数据');
    }

    const wish = result.rows[0];
    console.log('📄 插入的数据:', wish);
    
    const formattedWish = {
      id: wish.id,
      title: wish.title,
      type: wish.type || wish.wish_type, // 兼容两种字段名
      description: wish.description,
      targetDate: wish.target_date,
      completed: wish.completed,
      completedAt: wish.completed_at,
      createdAt: wish.created_at,
      updatedAt: wish.updated_at
    };

    console.log('✅ 心愿创建成功:', formattedWish);

    res.status(201).json({
      success: true,
      data: formattedWish
    });
  } catch (error) {
    console.error('❌ 创建心愿详细错误:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    
    res.status(500).json({
      success: false,
      message: `创建心愿失败: ${error.message}`
    });
  } finally {
    if (client) {
      client.release();
      console.log('🔄 数据库连接已释放');
    }
  }
});

// 更新心愿
app.put('/api/wishes/:id', async (req, res) => {
  try {
    const wishId = parseInt(req.params.id);
    const updates = req.body;

    // 构建动态更新查询
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        // 转换字段名到数据库格式
        let dbField = key;
        if (key === 'targetDate') dbField = 'target_date';
        if (key === 'completedAt') dbField = 'completed_at';
        if (key === 'updatedAt') dbField = 'updated_at';
        if (key === 'type') {
          // 同时更新 type 和 wish_type 字段
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

    // 总是更新 updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(wishId);

    const query = `
      UPDATE wishes 
      SET ${updateFields.join(', ')}
      WHERE id = ${paramCount} AND couple_code = 'DEFAULT_COUPLE'
      RETURNING *
    `;

    const result = await pool.query(query, values);

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

    res.json({
      success: true,
      data: formattedWish
    });
  } catch (error) {
    console.error('更新心愿错误:', error);
    res.status(500).json({
      success: false,
      message: '更新心愿失败'
    });
  }
});

// 删除心愿
app.delete('/api/wishes/:id', async (req, res) => {
  try {
    const wishId = parseInt(req.params.id);

    const result = await pool.query(
      'DELETE FROM wishes WHERE id = $1 RETURNING id',
      [wishId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '心愿未找到'
      });
    }

    res.json({
      success: true,
      message: '心愿删除成功'
    });
  } catch (error) {
    console.error('删除心愿错误:', error);
    res.status(500).json({
      success: false,
      message: '删除心愿失败'
    });
  }
});

// 提供静态HTML文件
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口未找到'
  });
});

// 启动服务器
async function startServer() {
  try {
    console.log('🚀 正在启动服务器...');
    
    // 首先测试数据库连接
    try {
      const client = await pool.connect();
      console.log('✅ 数据库连接成功');
      const result = await client.query('SELECT NOW()');
      console.log('📅 数据库时间:', result.rows[0].now);
      client.release();
      isDatabaseConnected = true;
      
      // 初始化数据库表
      await initDatabase();
      
    } catch (dbError) {
      console.error('❌ 数据库连接失败:', dbError.message);
      console.log('⚠️ 服务器将以离线模式启动');
      isDatabaseConnected = false;
    }
    
    app.listen(PORT, () => {
      console.log('🎉 服务器启动成功！');
      console.log(`📍 本地访问: http://localhost:${PORT}`);
      console.log(`📍 API接口: http://localhost:${PORT}/api/wishes`);
      console.log(`💾 数据库状态: ${isDatabaseConnected ? '✅ 已连接' : '❌ 离线模式'}`);
      console.log('🔍 调试模式已开启，请查看控制台日志');
    });
  } catch (error) {
    console.error('❌ 启动服务器失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await pool.end();
  process.exit(0);
});

// 启动应用
startServer();
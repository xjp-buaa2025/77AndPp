const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 数据库连接配置 - 建议使用环境变量
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_rzq9Uln8hdDQ@ep-misty-wind-a5wyvdm8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// 全局数据库连接状态
let isDatabaseConnected = false;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 创建 ourwish 表（如果不存在）
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ourwish (
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
    console.log('✅ ourwish 表初始化成功');
  } catch (error) {
    console.error('❌ 数据库初始化错误:', error);
  }
}

// 获取所有心愿 - 使用 ourwish 表
app.get('/api/wishes', async (req, res) => {
  try {
    console.log('📋 获取心愿列表请求');
    
    if (!isDatabaseConnected) {
      console.log('⚠️ 数据库未连接，返回空列表');
      return res.json({
        success: true,
        data: { wishes: [] }
      });
    }

    const result = await pool.query(
      'SELECT * FROM ourwish ORDER BY is_completed ASC, created_at DESC'
    );
    
    console.log(`📊 从 ourwish 表获取到 ${result.rows.length} 条记录`);
    
    // 统一字段映射：数据库字段 -> 前端字段
    const wishes = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      type: row.wish_type,              // wish_type -> type
      description: row.description,
      targetDate: row.target_date,      // target_date -> targetDate
      completed: row.is_completed,      // is_completed -> completed
      completedAt: row.completed_at,    // completed_at -> completedAt
      createdAt: row.created_at,        // created_at -> createdAt
      updatedAt: row.updated_at         // updated_at -> updatedAt
    }));

    res.json({
      success: true,
      data: { wishes }
    });
  } catch (error) {
    console.error('❌ 获取心愿列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取心愿列表失败'
    });
  }
});

// 创建新心愿 - 使用 ourwish 表
app.post('/api/wishes', async (req, res) => {
  let client;
  try {
    console.log('📝 收到创建心愿请求:', req.body);
    
    const { title, type, description, targetDate } = req.body;

    // 验证必填字段
    if (!title || !type) {
      console.log('❌ 缺少必填字段:', { title: !!title, type: !!type });
      return res.status(400).json({
        success: false,
        message: '标题和类型是必填项'
      });
    }

    if (!isDatabaseConnected) {
      console.log('❌ 数据库未连接，无法保存');
      return res.status(503).json({
        success: false,
        message: '数据库连接失败，请稍后重试'
      });
    }

    client = await pool.connect();
    console.log('✅ 获取数据库连接成功');

    // 插入到 ourwish 表
    const insertQuery = `
      INSERT INTO ourwish (title, wish_type, description, target_date) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;
    
    const values = [
      title, 
      type,                            // 前端 type -> 数据库 wish_type
      description || null,
      targetDate || null               // 前端 targetDate -> 数据库 target_date
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
    
    // 统一字段映射：数据库字段 -> 前端字段
    const formattedWish = {
      id: wish.id,
      title: wish.title,
      type: wish.wish_type,
      description: wish.description,
      targetDate: wish.target_date,
      completed: wish.is_completed,
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

// 更新心愿 - 使用 ourwish 表
app.put('/api/wishes/:id', async (req, res) => {
  try {
    const wishId = parseInt(req.params.id);
    const updates = req.body;
    
    console.log(`🔄 更新心愿 ${wishId}:`, updates);

    if (!isDatabaseConnected) {
      return res.status(503).json({
        success: false,
        message: '数据库连接失败，请稍后重试'
      });
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    console.log('更新数据:', updates);
    // 处理字段映射和数据类型转换
// 处理字段映射和数据类型转换
Object.keys(updates).forEach(key => {
  if (updates[key] !== undefined && key !== 'updatedAt') {  // 忽略 updatedAt 字段
    let dbField = key;
    let value = updates[key];
    
    // 前端字段 -> 数据库字段映射
    if (key === 'targetDate') dbField = 'target_date';
    if (key === 'completed') dbField = 'is_completed';
    if (key === 'completedAt') dbField = 'completed_at';
    if (key === 'type') dbField = 'wish_type';

    // 数据类型处理
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

console.log('最终更新字段:', updateFields);

    // 总是更新 updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(wishId);

    // 更新 ourwish 表
    const query = `
      UPDATE ourwish 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    console.log('🔍 执行更新SQL:', query);
    console.log('🔍 参数值:', values);

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '心愿未找到'
      });
    }

    const wish = result.rows[0];
    console.log('📄 更新后的数据:', wish);
    
    // 统一字段映射：数据库字段 -> 前端字段
    const formattedWish = {
      id: wish.id,
      title: wish.title,
      type: wish.wish_type,
      description: wish.description,
      targetDate: wish.target_date,
      completed: wish.is_completed,
      completedAt: wish.completed_at,
      createdAt: wish.created_at,
      updatedAt: wish.updated_at
    };

    console.log('✅ 心愿更新成功:', formattedWish);

    res.json({
      success: true,
      data: formattedWish
    });
  } catch (error) {
    console.error('❌ 更新心愿错误:', error);
    res.status(500).json({
      success: false,
      message: '更新心愿失败'
    });
  }
});

// 删除心愿 - 使用 ourwish 表
app.delete('/api/wishes/:id', async (req, res) => {
  try {
    const wishId = parseInt(req.params.id);
    console.log(`🗑️ 删除心愿请求: ${wishId}`);

    if (!isDatabaseConnected) {
      return res.status(503).json({
        success: false,
        message: '数据库连接失败，请稍后重试'
      });
    }

    // 从 ourwish 表删除
    const result = await pool.query(
      'DELETE FROM ourwish WHERE id = $1 RETURNING id',
      [wishId]
    );

    if (result.rows.length === 0) {
      console.log(`❌ 心愿 ${wishId} 未找到`);
      return res.status(404).json({
        success: false,
        message: '心愿未找到'
      });
    }

    console.log(`✅ 心愿 ${wishId} 删除成功`);

    res.json({
      success: true,
      message: '心愿删除成功'
    });
  } catch (error) {
    console.error('❌ 删除心愿错误:', error);
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
  console.error('❌ 服务器错误:', err);
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
    console.log('🚀 正在启动心愿管理服务器...');
    console.log('📊 使用数据库表: ourwish');
    
    // 测试数据库连接
    try {
      const client = await pool.connect();
      console.log('✅ 数据库连接成功');
      
      // 测试 ourwish 表是否存在
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'ourwish'
        );
      `);
      
      console.log('📋 ourwish 表存在:', tableCheck.rows[0].exists);
      
      const result = await client.query('SELECT NOW()');
      console.log('📅 数据库时间:', result.rows[0].now);
      client.release();
      isDatabaseConnected = true;
      
      // 初始化数据库表
      await initDatabase();
      
      // 显示现有数据
      const countResult = await pool.query('SELECT COUNT(*) as count FROM ourwish');
      console.log(`📊 ourwish 表中现有 ${countResult.rows[0].count} 条心愿记录`);
      
    } catch (dbError) {
      console.error('❌ 数据库连接失败:', dbError.message);
      console.log('⚠️ 服务器将以离线模式启动');
      isDatabaseConnected = false;
    }
    
    // 在非生产环境启动服务器
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log('🎉 心愿管理服务器启动成功！');
        console.log(`📍 本地访问: http://localhost:${PORT}`);
        console.log(`📍 API接口: http://localhost:${PORT}/api/wishes`);
        console.log(`💾 数据库状态: ${isDatabaseConnected ? '✅ 已连接到 ourwish 表' : '❌ 离线模式'}`);
        console.log('🔍 调试模式已开启，请查看控制台日志');
      });
    } else {
      console.log('🎉 Vercel 无服务器函数已就绪！');
      console.log(`💾 数据库状态: ${isDatabaseConnected ? '✅ 已连接到 ourwish 表' : '❌ 离线模式'}`);
    }
  } catch (error) {
    console.error('❌ 启动服务器失败:', error);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// 启动应用
startServer();

// 导出 app 供 Vercel 使用
module.exports = app;
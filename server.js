const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase, healthCheck } = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 服务前端文件
app.use(express.static(path.join(__dirname, 'public')));

// API路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/couple', require('./routes/couple'));
app.use('/api/wishes', require('./routes/wishes'));
app.use('/api/quotes', require('./routes/quotes'));

// 健康检查端点
app.get('/api/health', async (req, res) => {
  try {
    const dbHealthy = await healthCheck();
    res.json({
      success: true,
      message: '服务运行正常',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      server: 'running'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务检查失败',
      error: error.message
    });
  }
});

// 404处理
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API接口不存在',
    path: req.originalUrl
  });
});

// 所有其他请求返回前端页面
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
async function startServer() {
  try {
    console.log('🌟 正在启动我们的小星球服务器...');
    
    // 初始化数据库
    console.log('📦 正在初始化数据库...');
    await initDatabase();
    console.log('✅ 数据库初始化完成');
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log('🚀 服务器启动成功！');
      console.log(`🌍 本地访问地址: http://localhost:${PORT}`);
      console.log(`🔗 API健康检查: http://localhost:${PORT}/api/health`);
      console.log('💕 愿每一对情侣都拥有属于自己的小星球！');
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🌙 正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🌙 正在关闭服务器...');
  process.exit(0);
});

// 启动服务器
startServer();
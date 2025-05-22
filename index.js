const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: false, // 允许内联样式和脚本
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://couple-planet.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: { 
    error: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 路由配置
app.use('/api/auth', require('./routes/auth'));
app.use('/api/diary', require('./routes/diary'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/countdown', require('./routes/countdown'));
app.use('/api/stats', require('./routes/stats'));

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '我们的小星球运行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 根路由 - 返回前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API 404处理
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API接口不存在',
    message: '这个接口在我们的小星球上找不到哦',
    path: req.path
  });
});

// 前端路由处理（SPA支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 根据错误类型返回不同响应
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: '数据验证失败',
      message: err.message,
      code: 'VALIDATION_ERROR'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token验证失败',
      message: '请重新登录',
      code: 'TOKEN_ERROR'
    });
  }

  if (err.code === '23505') { // PostgreSQL唯一约束违反
    return res.status(409).json({
      error: '数据冲突',
      message: '数据已存在',
      code: 'DUPLICATE_DATA'
    });
  }

  res.status(500).json({ 
    error: '服务器内部错误',
    message: '小星球遇到了一些问题，请稍后再试',
    code: 'INTERNAL_ERROR'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🌍 我们的小星球已在端口 ${PORT} 上启动`);
  console.log(`🚀 访问地址: http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`🌟 环境: ${process.env.NODE_ENV || 'development'}`);
});

// 优雅关闭
const gracefulShutdown = (signal) => {
  console.log(`\n👋 收到 ${signal} 信号，小星球正在关闭...`);
  
  // 关闭HTTP服务器
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

module.exports = app;
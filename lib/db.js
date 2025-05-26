const { Pool } = require('pg');

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_EsBK01MphWwx@ep-delicate-frost-a4aw4hgd-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 数据库初始化函数
async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('正在初始化数据库...');

    // 先删除现有表（如果存在问题）
    console.log('检查并重建数据库表...');
    
    // 删除依赖表
    await client.query('DROP TABLE IF EXISTS activity_logs CASCADE');
    await client.query('DROP TABLE IF EXISTS wishes CASCADE');
    await client.query('DROP TABLE IF EXISTS couples CASCADE');
    await client.query('DROP TABLE IF EXISTS love_quotes CASCADE');

    // 创建情侣表
    await client.query(`
      CREATE TABLE couples (
        id SERIAL PRIMARY KEY,
        couple_code VARCHAR(100) UNIQUE NOT NULL,
        start_date DATE NOT NULL,
        partner1_name VARCHAR(100),
        partner2_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ 创建 couples 表');

    // 创建心愿表
    await client.query(`
      CREATE TABLE wishes (
        id SERIAL PRIMARY KEY,
        couple_code VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        wish_type VARCHAR(50) DEFAULT '其他',
        target_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (couple_code) REFERENCES couples(couple_code) ON DELETE CASCADE
      )
    `);
    console.log('✅ 创建 wishes 表');

    // 创建情话表
    await client.query(`
      CREATE TABLE love_quotes (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'romantic',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ 创建 love_quotes 表');

    // 创建日志表
    await client.query(`
      CREATE TABLE activity_logs (
        id SERIAL PRIMARY KEY,
        couple_code VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        action_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (couple_code) REFERENCES couples(couple_code) ON DELETE CASCADE
      )
    `);
    console.log('✅ 创建 activity_logs 表');

    // 检查情话表是否为空，如果是则插入默认数据
    const quoteCount = await client.query('SELECT COUNT(*) FROM love_quotes');
    if (parseInt(quoteCount.rows[0].count) === 0) {
      console.log('插入默认情话数据...');
      await client.query(`
        INSERT INTO love_quotes (content, category) VALUES 
        ('无论今天多忙，我的想念永远准时。', 'daily'),
        ('爱你的这颗心，比昨天多一点，比明天少一点。', 'romantic'),
        ('在所有的好运里，我最想要的是你。', 'sweet'),
        ('想和你分享的不是故事，而是心情。', 'intimate'),
        ('你是我的星球，绕着你转是我的轨道。', 'cosmic'),
        ('每一个和你在一起的日子，都是我喜欢的样子。', 'daily'),
        ('世界很大，我们很小，但我们的爱刚刚好。', 'philosophy'),
        ('陪你看日出日落，陪你等春夏秋冬。', 'time'),
        ('你是我心中的小确幸，每天都让我微笑。', 'happiness'),
        ('和你在一起的时候，连时间都变得温柔了。', 'time'),
        ('你的笑容是我见过最美的风景。', 'beauty'),
        ('想要和你一起慢慢变老，慢慢聊天。', 'future'),
        ('在你眼里，我看到了整个宇宙。', 'cosmic'),
        ('爱情不是寻找共同点，而是学会尊重不同点。', 'wisdom'),
        ('你是我生命中最美好的意外。', 'destiny'),
        ('愿我们永远都是对方的小朋友。', 'playful'),
        ('有你在的地方，就是我想要的远方。', 'home'),
        ('你是我的今天，也是我所有的明天。', 'future'),
        ('我们的爱情，像星星一样，简单而永恒。', 'cosmic'),
        ('感谢你让我的世界变得五彩斑斓。', 'gratitude')
      `);
      console.log('✅ 插入默认情话数据');
    }

    // 创建索引以提高查询性能
    await client.query('CREATE INDEX IF NOT EXISTS idx_wishes_couple_code ON wishes(couple_code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_wishes_completed ON wishes(completed)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_couples_code ON couples(couple_code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_couple_code ON activity_logs(couple_code)');
    console.log('✅ 创建索引');

    console.log('数据库初始化成功！');
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 健康检查函数
async function healthCheck() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('数据库连接检查失败:', error);
    return false;
  }
}

// 检查表是否存在
async function checkTablesExist() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('couples', 'wishes', 'love_quotes', 'activity_logs')
    `);
    
    const existingTables = result.rows.map(row => row.table_name);
    const requiredTables = ['couples', 'wishes', 'love_quotes', 'activity_logs'];
    
    console.log('现有表:', existingTables);
    console.log('必需表:', requiredTables);
    
    return requiredTables.every(table => existingTables.includes(table));
  } finally {
    client.release();
  }
}

// 优雅关闭连接池
process.on('SIGINT', async () => {
  console.log('正在关闭数据库连接池...');
  await pool.end();
  process.exit(0);
});

module.exports = { 
  pool, 
  initDatabase, 
  healthCheck,
  checkTablesExist
};
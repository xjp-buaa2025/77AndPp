const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_EsBK01MphWwx@ep-delicate-frost-a4aw4hgd-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲超时
  connectionTimeoutMillis: 2000, // 连接超时
});

// 测试数据库连接
pool.on('connect', () => {
  console.log('💾 数据库连接成功');
});

pool.on('error', (err) => {
  console.error('💥 数据库连接错误:', err);
});

// 创建数据表
const createTables = async () => {
  try {
    // 情侣用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS couples (
        id SERIAL PRIMARY KEY,
        couple_code VARCHAR(255) UNIQUE NOT NULL,
        security_question VARCHAR(500) NOT NULL,
        security_answer VARCHAR(255) NOT NULL,
        partner1_name VARCHAR(100),
        partner2_name VARCHAR(100),
        relationship_start_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 日记表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS diaries (
        id SERIAL PRIMARY KEY,
        couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        mood VARCHAR(50) DEFAULT 'happy',
        author VARCHAR(50) NOT NULL,
        cover_image VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 心愿清单表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id SERIAL PRIMARY KEY,
        couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        target_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
        completed_at TIMESTAMP,
        created_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 日历事件表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date TIMESTAMP NOT NULL,
        event_type VARCHAR(50) DEFAULT 'general',
        color VARCHAR(20) DEFAULT 'pink',
        reminder_enabled BOOLEAN DEFAULT true,
        created_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 纪念日表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anniversaries (
        id SERIAL PRIMARY KEY,
        couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        anniversary_date DATE NOT NULL,
        description TEXT,
        photo_url VARCHAR(500),
        is_recurring BOOLEAN DEFAULT true,
        notification_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 情话库表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS love_quotes (
        id SERIAL PRIMARY KEY,
        couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
        quote_text TEXT NOT NULL,
        author VARCHAR(50),
        is_custom BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('📋 数据表创建成功');
    
    // 插入默认情话
    await insertDefaultQuotes();
    
  } catch (err) {
    console.error('❌ 创建数据表失败:', err);
  }
};

// 插入默认情话
const insertDefaultQuotes = async () => {
  try {
    const defaultQuotes = [
      '无论今天多忙，我的想念永远准时。',
      '爱你的这颗心，比昨天多一点，比明天少一点。',
      '你是我见过最美的意外，也是最甜的必然。',
      '今天的月亮很美，但不及你眼中的星光。',
      '和你在一起的每一天，都是我想要的明天。',
      '你笑起来真好看，像春天的花一样。',
      '世界那么大，我的心那么小，刚好装下一个你。',
      '遇见你之后，生活不再是生存，而是生活。',
      '愿得一心人，白首不相离。',
      '你是我的今天，也是我所有的明天。'
    ];

    for (const quote of defaultQuotes) {
      await pool.query(
        'INSERT INTO love_quotes (quote_text, is_custom) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [quote, false]
      );
    }

    console.log('💕 默认情话插入成功');
  } catch (err) {
    console.error('❌ 插入默认情话失败:', err);
  }
};

// 初始化数据库
createTables();

module.exports = pool;
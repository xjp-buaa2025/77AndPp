const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_rzq9Uln8hdDQ@ep-misty-wind-a5wyvdm8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createOurWishTable() {
  console.log('🎯 开始创建全新的 ourwish 表...');
  
  let client;
  try {
    client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 1. 删除如果已存在的 ourwish 表
    console.log('1️⃣ 清理可能存在的 ourwish 表...');
    await client.query('DROP TABLE IF EXISTS ourwish CASCADE');
    console.log('✅ 旧 ourwish 表已清理');
    
    // 2. 创建全新的 ourwish 表
    console.log('2️⃣ 创建新的 ourwish 表...');
    const createTableSQL = `
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
    `;
    
    await client.query(createTableSQL);
    console.log('✅ ourwish 表创建成功');
    
    // 3. 验证表结构
    console.log('3️⃣ 验证新表结构...');
    const columnsResult = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'ourwish' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 ourwish 表结构:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `默认: ${col.column_default}` : ''}`);
    });
    
    // 4. 插入测试数据
    console.log('4️⃣ 插入测试数据...');
    const testData = [
      {
        title: '一起去看樱花',
        wish_type: '旅行',
        description: '春天的时候找个周末去看樱花',
        is_completed: false
      },
      {
        title: '尝试做寿司',
        wish_type: '美食',
        description: '在家一起学做寿司',
        is_completed: false
      },
      {
        title: '看完这部电影',
        wish_type: '电影',
        description: '朋友推荐的那部电影',
        is_completed: true
      },
      {
        title: '学会一首新歌',
        wish_type: '学习',
        description: '一起学唱那首喜欢的歌',
        is_completed: false
      }
    ];
    
    for (const wish of testData) {
      await client.query(`
        INSERT INTO ourwish (title, wish_type, description, is_completed, completed_at) 
        VALUES ($1, $2, $3, $4, $5)
      `, [
        wish.title, 
        wish.wish_type, 
        wish.description, 
        wish.is_completed,
        wish.is_completed ? new Date() : null
      ]);
    }
    
    console.log(`✅ 已插入 ${testData.length} 条测试数据`);
    
    // 5. 最终验证
    console.log('5️⃣ 最终验证...');
    const finalResult = await client.query('SELECT COUNT(*) as count FROM ourwish');
    const totalRecords = finalResult.rows[0].count;
    console.log(`📊 ourwish 表中现有 ${totalRecords} 条记录`);
    
    // 显示所有示例数据
    const sampleResult = await client.query('SELECT id, title, wish_type, is_completed FROM ourwish ORDER BY id');
    console.log('📋 所有数据:');
    sampleResult.rows.forEach(row => {
      const status = row.is_completed ? '✅ 已完成' : '⭕ 待完成';
      console.log(`   - ID:${row.id} "${row.title}" [${row.wish_type}] ${status}`);
    });
    
    console.log('🎉 ourwish 表创建完成！');
    
  } catch (error) {
    console.error('❌ 创建表失败:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('🔄 数据库连接已关闭');
  }
}

console.log('🌟 创建全新的 ourwish 表');
console.log('   - 表名: ourwish');
console.log('   - 字段: id, title, wish_type, description, target_date, is_completed, completed_at, created_at, updated_at');
console.log('   - 会自动插入测试数据');
console.log('');

// 运行创建
createOurWishTable();
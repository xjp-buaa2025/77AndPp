const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_rzq9Uln8hdDQ@ep-misty-wind-a5wyvdm8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function removeCoupleCodeColumn() {
  console.log('🔧 开始删除 couple_code 列...');
  
  try {
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 检查当前表结构
    console.log('1️⃣ 检查当前表结构...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'wishes' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 当前表结构:');
    let hasCoupleCode = false;
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      if (col.column_name === 'couple_code') {
        hasCoupleCode = true;
      }
    });
    
    if (!hasCoupleCode) {
      console.log('✅ couple_code 列不存在，无需删除');
      client.release();
      return;
    }
    
    // 查看现有数据
    console.log('2️⃣ 检查现有数据...');
    const dataResult = await client.query('SELECT COUNT(*) as count FROM wishes');
    console.log(`📊 表中现有 ${dataResult.rows[0].count} 条数据`);
    
    // 删除 couple_code 列
    console.log('3️⃣ 删除 couple_code 列...');
    await client.query('ALTER TABLE wishes DROP COLUMN IF EXISTS couple_code');
    console.log('✅ couple_code 列删除成功');
    
    // 同时删除其他可能不需要的列
    console.log('4️⃣ 检查并删除其他可能不需要的列...');
    
    // 删除 created_by 列（如果存在）
    try {
      await client.query('ALTER TABLE wishes DROP COLUMN IF EXISTS created_by');
      console.log('✅ created_by 列删除成功');
    } catch (error) {
      console.log('ℹ️ created_by 列不存在或已删除');
    }
    
    // 检查更新后的表结构
    console.log('5️⃣ 检查更新后的表结构...');
    const newColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'wishes' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 更新后的表结构:');
    newColumnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // 验证数据是否完整
    const finalDataResult = await client.query('SELECT COUNT(*) as count FROM wishes');
    console.log(`📊 删除列后剩余 ${finalDataResult.rows[0].count} 条数据`);
    
    if (finalDataResult.rows[0].count === dataResult.rows[0].count) {
      console.log('✅ 数据完整性验证通过');
    } else {
      console.log('⚠️ 数据数量有变化，请检查');
    }
    
    client.release();
    console.log('🎉 couple_code 列删除完成！');
    
  } catch (error) {
    console.error('❌ 删除列失败:', error);
  } finally {
    await pool.end();
    console.log('🔄 数据库连接池已关闭');
  }
}

// 运行删除操作
removeCoupleCodeColumn();
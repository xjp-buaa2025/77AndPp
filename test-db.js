const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_rzq9Uln8hdDQ@ep-misty-wind-a5wyvdm8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkAndFixDatabase() {
  console.log('🔍 检查数据库表结构...');
  
  try {
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 检查wishes表是否存在
    console.log('1️⃣ 检查wishes表是否存在...');
    const tableExists = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'wishes'
    `);
    
    if (tableExists.rows.length === 0) {
      console.log('❌ wishes表不存在，开始创建...');
      await createWishesTable(client);
    } else {
      console.log('✅ wishes表存在，检查结构...');
      await checkTableStructure(client);
    }
    
    client.release();
    console.log('🎉 数据库检查完成！');
    
  } catch (error) {
    console.error('❌ 数据库操作失败:', error);
  } finally {
    await pool.end();
  }
}

async function checkTableStructure(client) {
  // 获取当前表结构
  const columnsResult = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'wishes' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  
  console.log('📋 当前表结构:');
  const existingColumns = [];
  columnsResult.rows.forEach(col => {
    console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    existingColumns.push(col.column_name);
  });
  
  // 检查需要的列
  const requiredColumns = {
    'id': 'SERIAL PRIMARY KEY',
    'title': 'VARCHAR(255) NOT NULL',
    'type': 'VARCHAR(50) NOT NULL',
    'description': 'TEXT',
    'target_date': 'DATE',
    'completed': 'BOOLEAN DEFAULT FALSE',
    'completed_at': 'TIMESTAMP',
    'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
  };
  
  console.log('2️⃣ 检查缺失的列...');
  const missingColumns = [];
  
  for (const [columnName, columnDef] of Object.entries(requiredColumns)) {
    if (!existingColumns.includes(columnName)) {
      missingColumns.push({ name: columnName, definition: columnDef });
      console.log(`   ❌ 缺失列: ${columnName}`);
    }
  }
  
  if (missingColumns.length > 0) {
    console.log('3️⃣ 添加缺失的列...');
    for (const column of missingColumns) {
      try {
        let alterQuery;
        if (column.name === 'id' && column.definition.includes('SERIAL PRIMARY KEY')) {
          // 如果缺失id列，需要重建表
          console.log('⚠️ 缺失主键列，需要重建表...');
          await recreateTable(client);
          return;
        } else {
          // 提取列定义（去掉DEFAULT部分用于ALTER TABLE）
          let colType = column.definition.split(' DEFAULT')[0];
          alterQuery = `ALTER TABLE wishes ADD COLUMN ${column.name} ${colType}`;
          
          await client.query(alterQuery);
          console.log(`   ✅ 已添加列: ${column.name}`);
          
          // 如果有默认值，单独设置
          if (column.definition.includes('DEFAULT')) {
            const defaultValue = column.definition.split('DEFAULT ')[1];
            await client.query(`ALTER TABLE wishes ALTER COLUMN ${column.name} SET DEFAULT ${defaultValue}`);
            console.log(`   ✅ 已设置默认值: ${column.name} = ${defaultValue}`);
          }
        }
      } catch (error) {
        console.error(`   ❌ 添加列 ${column.name} 失败:`, error.message);
      }
    }
  } else {
    console.log('✅ 所有必需的列都存在');
  }
}

async function recreateTable(client) {
  console.log('🔄 重建wishes表...');
  
  // 备份现有数据
  const backupResult = await client.query('SELECT * FROM wishes');
  console.log(`📦 备份了 ${backupResult.rows.length} 条数据`);
  
  // 删除旧表
  await client.query('DROP TABLE IF EXISTS wishes');
  console.log('🗑️ 已删除旧表');
  
  // 创建新表
  await createWishesTable(client);
  
  // 如果有备份数据，尝试恢复
  if (backupResult.rows.length > 0) {
    console.log('🔄 尝试恢复数据...');
    for (const row of backupResult.rows) {
      try {
        await client.query(`
          INSERT INTO wishes (title, type, description, target_date, completed, completed_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          row.title || '未知标题',
          row.type || '其他',
          row.description,
          row.target_date,
          row.completed || false,
          row.completed_at,
          row.created_at || new Date(),
          row.updated_at || new Date()
        ]);
      } catch (error) {
        console.error('恢复数据失败:', error.message);
      }
    }
    console.log('✅ 数据恢复完成');
  }
}

async function createWishesTable(client) {
  const createTableQuery = `
    CREATE TABLE wishes (
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
  `;
  
  await client.query(createTableQuery);
  console.log('✅ wishes表创建成功');
}

// 运行检查和修复
checkAndFixDatabase();
/**
 * 情侣码设置工具
 * 运行此脚本可以直接在数据库中创建情侣账号
 */

require('dotenv').config();
const { pool, initDatabase } = require('../lib/db');
const { generateToken } = require('../lib/auth');

// 配置您的情侣信息
const COUPLE_CONFIG = {
  // 请修改以下信息为您的情侣信息
  coupleCode: '123Mtr123@',        // 您的专属通行码
  startDate: '2025-01-11',            // 你们在一起的开始日期 (YYYY-MM-DD)
  partner1Name: '小明',               // 伴侣1姓名 (可选)
  partner2Name: '小红',               // 伴侣2姓名 (可选)
  
  // 预设的心愿列表 (可选)
  defaultWishes: [
    {
      title: '一起看日出',
      description: '在海边看一次完整的日出',
      wishType: '约会',
      targetDate: '2024-12-31'
    },
    {
      title: '学会做一道菜',
      description: '一起学做对方爱吃的菜',
      wishType: '美食',
      targetDate: null
    },
    {
      title: '去旅行',
      description: '计划一次两人的旅行',
      wishType: '旅行',
      targetDate: '2024-06-01'
    }
  ]
};

/**
 * 创建情侣账号
 */
async function createCouple() {
  const client = await pool.connect();
  
  try {
    console.log('🌟 正在创建情侣账号...');
    
    // 开始事务
    await client.query('BEGIN');
    
    try {
      // 检查通行码是否已存在
      const existingCouple = await client.query(
        'SELECT id FROM couples WHERE couple_code = $1',
        [COUPLE_CONFIG.coupleCode]
      );

      if (existingCouple.rows.length > 0) {
        console.log('⚠️  通行码已存在，正在更新信息...');
        
        // 更新现有记录
        await client.query(
          `UPDATE couples 
           SET start_date = $2, partner1_name = $3, partner2_name = $4, updated_at = CURRENT_TIMESTAMP
           WHERE couple_code = $1`,
          [
            COUPLE_CONFIG.coupleCode,
            COUPLE_CONFIG.startDate,
            COUPLE_CONFIG.partner1Name,
            COUPLE_CONFIG.partner2Name
          ]
        );
        
        console.log('✅ 情侣信息已更新');
      } else {
        // 创建新记录
        await client.query(
          `INSERT INTO couples (couple_code, start_date, partner1_name, partner2_name, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            COUPLE_CONFIG.coupleCode,
            COUPLE_CONFIG.startDate,
            COUPLE_CONFIG.partner1Name,
            COUPLE_CONFIG.partner2Name
          ]
        );
        
        console.log('✅ 情侣账号创建成功');
      }

      // 记录日志
      await client.query(
        `INSERT INTO activity_logs (couple_code, action_type, action_description) 
         VALUES ($1, $2, $3)`,
        [COUPLE_CONFIG.coupleCode, 'setup', '通过配置脚本创建/更新了账号']
      );

      // 添加默认心愿
      if (COUPLE_CONFIG.defaultWishes && COUPLE_CONFIG.defaultWishes.length > 0) {
        console.log('🌟 正在添加默认心愿...');
        
        for (const wish of COUPLE_CONFIG.defaultWishes) {
          // 检查心愿是否已存在
          const existingWish = await client.query(
            'SELECT id FROM wishes WHERE couple_code = $1 AND title = $2',
            [COUPLE_CONFIG.coupleCode, wish.title]
          );
          
          if (existingWish.rows.length === 0) {
            await client.query(
              `INSERT INTO wishes (couple_code, title, description, wish_type, target_date, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [
                COUPLE_CONFIG.coupleCode,
                wish.title,
                wish.description,
                wish.wishType,
                wish.targetDate
              ]
            );
            
            console.log(`  ✅ 添加心愿: ${wish.title}`);
          } else {
            console.log(`  ⚠️  心愿已存在: ${wish.title}`);
          }
        }
      }

      // 提交事务
      await client.query('COMMIT');
      
      // 生成访问令牌
      const accessToken = generateToken(COUPLE_CONFIG.coupleCode);
      
      console.log('\n🎉 设置完成！');
      console.log('=====================================');
      console.log(`通行码: ${COUPLE_CONFIG.coupleCode}`);
      console.log(`开始日期: ${COUPLE_CONFIG.startDate}`);
      console.log(`伴侣1: ${COUPLE_CONFIG.partner1Name || '未设置'}`);
      console.log(`伴侣2: ${COUPLE_CONFIG.partner2Name || '未设置'}`);
      console.log(`访问令牌: ${accessToken}`);
      console.log('=====================================');
      console.log('💕 现在您可以使用通行码登录了！');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } finally {
    client.release();
  }
}

/**
 * 查看现有情侣信息
 */
async function viewCouple() {
  const client = await pool.connect();
  
  try {
    const coupleResult = await client.query(
      `SELECT 
        couple_code, start_date, partner1_name, partner2_name, created_at, updated_at
       FROM couples 
       WHERE couple_code = $1`,
      [COUPLE_CONFIG.coupleCode]
    );
    
    if (coupleResult.rows.length === 0) {
      console.log('❌ 找不到指定的情侣账号');
      return;
    }
    
    const couple = coupleResult.rows[0];
    
    // 获取心愿统计
    const wishStats = await client.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN completed = true THEN 1 END) as completed
       FROM wishes 
       WHERE couple_code = $1`,
      [COUPLE_CONFIG.coupleCode]
    );
    
    const stats = wishStats.rows[0];
    
    console.log('\n📊 情侣账号信息');
    console.log('=====================================');
    console.log(`通行码: ${couple.couple_code}`);
    console.log(`开始日期: ${couple.start_date}`);
    console.log(`伴侣1: ${couple.partner1_name || '未设置'}`);
    console.log(`伴侣2: ${couple.partner2_name || '未设置'}`);
    console.log(`创建时间: ${couple.created_at}`);
    console.log(`更新时间: ${couple.updated_at}`);
    console.log(`心愿总数: ${stats.total}`);
    console.log(`已完成心愿: ${stats.completed}`);
    console.log('=====================================');
    
  } finally {
    client.release();
  }
}

/**
 * 删除情侣账号
 */
async function deleteCouple() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  正在删除情侣账号...');
    
    // 开始事务
    await client.query('BEGIN');
    
    try {
      // 删除心愿
      const wishResult = await client.query(
        'DELETE FROM wishes WHERE couple_code = $1',
        [COUPLE_CONFIG.coupleCode]
      );
      
      // 删除活动日志
      const logResult = await client.query(
        'DELETE FROM activity_logs WHERE couple_code = $1',
        [COUPLE_CONFIG.coupleCode]
      );
      
      // 删除情侣账号
      const coupleResult = await client.query(
        'DELETE FROM couples WHERE couple_code = $1',
        [COUPLE_CONFIG.coupleCode]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ 删除完成:`);
      console.log(`  - 情侣账号: ${coupleResult.rowCount} 个`);
      console.log(`  - 心愿: ${wishResult.rowCount} 个`);
      console.log(`  - 活动日志: ${logResult.rowCount} 条`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } finally {
    client.release();
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 初始化数据库
    await initDatabase();
    
    // 解析命令行参数
    const command = process.argv[2];
    
    switch (command) {
      case 'create':
        await createCouple();
        break;
      case 'view':
        await viewCouple();
        break;
      case 'delete':
        await deleteCouple();
        break;
      default:
        console.log('📖 使用说明:');
        console.log('=====================================');
        console.log('node config/couple-setup.js create  - 创建/更新情侣账号');
        console.log('node config/couple-setup.js view    - 查看情侣账号信息');
        console.log('node config/couple-setup.js delete  - 删除情侣账号');
        console.log('=====================================');
        console.log('💡 提示: 请先修改文件顶部的 COUPLE_CONFIG 配置');
    }
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { createCouple, viewCouple, deleteCouple, COUPLE_CONFIG };
const express = require('express');
const router = express.Router();
const { pool } = require('../lib/db');
const { authenticate } = require('../lib/auth');
const { 
  successResponse, 
  errorResponse, 
  handleError,
  calculateDaysTogether,
  formatDate,
  getFriendlyDate
} = require('../lib/utils');

// 获取情侣详细信息
router.get('/profile', authenticate, async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // 获取情侣基本信息
      const coupleQuery = `
        SELECT 
          id,
          couple_code,
          start_date,
          partner1_name,
          partner2_name,
          created_at,
          updated_at
        FROM couples 
        WHERE couple_code = $1
      `;
      
      const coupleResult = await client.query(coupleQuery, [req.coupleCode]);

      if (coupleResult.rows.length === 0) {
        return res.status(404).json(errorResponse('情侣信息不存在', 'COUPLE_NOT_FOUND'));
      }

      const couple = coupleResult.rows[0];

      // 获取心愿统计信息
      const wishStatsQuery = `
        SELECT 
          COUNT(*) as total_wishes,
          COUNT(CASE WHEN completed = true THEN 1 END) as completed_wishes,
          COUNT(CASE WHEN completed = false THEN 1 END) as pending_wishes,
          COUNT(CASE WHEN completed = true AND completed_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as completed_this_month,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as created_this_week
        FROM wishes 
        WHERE couple_code = $1
      `;
      
      const wishStatsResult = await client.query(wishStatsQuery, [req.coupleCode]);
      const wishStats = wishStatsResult.rows[0];

      // 获取最近的心愿
      const recentWishesQuery = `
        SELECT 
          id,
          title,
          wish_type,
          completed,
          created_at,
          completed_at
        FROM wishes 
        WHERE couple_code = $1 
        ORDER BY 
          CASE WHEN completed = false THEN 0 ELSE 1 END,
          created_at DESC 
        LIMIT 5
      `;
      
      const recentWishesResult = await client.query(recentWishesQuery, [req.coupleCode]);

      // 获取活动日志统计
      const activityQuery = `
        SELECT 
          COUNT(*) as total_activities,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as activities_this_week
        FROM activity_logs 
        WHERE couple_code = $1
      `;
      
      const activityResult = await client.query(activityQuery, [req.coupleCode]);
      const activityStats = activityResult.rows[0];

      // 计算在一起的天数和其他统计信息
      const daysTogether = calculateDaysTogether(couple.start_date);
      const completionRate = parseInt(wishStats.total_wishes) > 0 
        ? Math.round((parseInt(wishStats.completed_wishes) / parseInt(wishStats.total_wishes)) * 100)
        : 0;

      // 计算里程碑
      const milestones = calculateMilestones(daysTogether, couple.start_date);

      const responseData = {
        couple: {
          id: couple.id,
          coupleCode: couple.couple_code,
          startDate: couple.start_date,
          startDateFormatted: formatDate(couple.start_date, 'YYYY年MM月DD日'),
          partner1Name: couple.partner1_name,
          partner2Name: couple.partner2_name,
          daysTogether,
          createdAt: couple.created_at,
          updatedAt: couple.updated_at,
          memberSince: getFriendlyDate(couple.created_at)
        },
        statistics: {
          wishes: {
            total: parseInt(wishStats.total_wishes),
            completed: parseInt(wishStats.completed_wishes),
            pending: parseInt(wishStats.pending_wishes),
            completedThisMonth: parseInt(wishStats.completed_this_month),
            createdThisWeek: parseInt(wishStats.created_this_week),
            completionRate
          },
          activities: {
            total: parseInt(activityStats.total_activities),
            thisWeek: parseInt(activityStats.activities_this_week)
          },
          relationship: {
            daysTogether,
            weeksTogether: Math.floor(daysTogether / 7),
            monthsTogether: Math.floor(daysTogether / 30),
            yearsTogether: Math.floor(daysTogether / 365)
          }
        },
        recentWishes: recentWishesResult.rows.map(wish => ({
          id: wish.id,
          title: wish.title,
          type: wish.wish_type,
          completed: wish.completed,
          createdAt: wish.created_at,
          completedAt: wish.completed_at,
          createdAtFriendly: getFriendlyDate(wish.created_at),
          completedAtFriendly: wish.completed_at ? getFriendlyDate(wish.completed_at) : null
        })),
        milestones
      };

      return res.status(200).json(successResponse(
        responseData,
        '获取信息成功'
      ));

    } finally {
      client.release();
    }

  } catch (error) {
    return handleError(error, res, '获取信息失败');
  }
});

/**
 * 计算关系里程碑
 */
function calculateMilestones(daysTogether, startDate) {
  const milestones = {
    achieved: [],
    upcoming: []
  };

  const milestoneList = [
    { days: 100, name: '100天纪念日', emoji: '💕' },
    { days: 200, name: '200天纪念日', emoji: '🌸' },
    { days: 365, name: '一周年纪念日', emoji: '🎂' },
    { days: 500, name: '500天纪念日', emoji: '🌟' },
    { days: 730, name: '两周年纪念日', emoji: '🎊' },
    { days: 1000, name: '1000天纪念日', emoji: '💎' },
    { days: 1095, name: '三周年纪念日', emoji: '🏆' },
    { days: 1460, name: '四周年纪念日', emoji: '🌈' },
    { days: 1825, name: '五周年纪念日', emoji: '👑' }
  ];

  for (const milestone of milestoneList) {
    if (daysTogether >= milestone.days) {
      milestones.achieved.push({
        ...milestone,
        achievedDate: new Date(new Date(startDate).getTime() + milestone.days * 24 * 60 * 60 * 1000)
      });
    } else {
      milestones.upcoming.push({
        ...milestone,
        daysLeft: milestone.days - daysTogether,
        targetDate: new Date(new Date(startDate).getTime() + milestone.days * 24 * 60 * 60 * 1000)
      });
      break; // 只显示下一个即将到来的里程碑
    }
  }

  return milestones;
}

module.exports = router;
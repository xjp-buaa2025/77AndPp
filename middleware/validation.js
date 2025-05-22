const validator = require('validator');

// 通用验证函数
const isValidString = (str, minLength = 1, maxLength = 255) => {
  return typeof str === 'string' && 
         str.trim().length >= minLength && 
         str.trim().length <= maxLength;
};

const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date instanceof Date;
};

const isValidEmail = (email) => {
  return validator.isEmail(email);
};

const isValidURL = (url) => {
  if (!url) return true; // URL是可选的
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
};

// 登录/注册验证
const validateAuth = (req, res, next) => {
  const { coupleCode, securityAnswer } = req.body;

  const errors = [];

  // 验证通行码
  if (!coupleCode) {
    errors.push({
      field: 'coupleCode',
      message: '请输入你们的专属通行码'
    });
  } else if (!isValidString(coupleCode, 6, 50)) {
    errors.push({
      field: 'coupleCode',
      message: '通行码长度应在6-50个字符之间'
    });
  }

  // 验证安全问题答案
  if (!securityAnswer) {
    errors.push({
      field: 'securityAnswer',
      message: '请回答安全问题'
    });
  } else if (!isValidString(securityAnswer, 1, 100)) {
    errors.push({
      field: 'securityAnswer',
      message: '安全问题答案不能为空且不超过100个字符'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: '信息填写不完整',
      message: '请检查并完善你们的信息',
      errors
    });
  }

  // 清理数据
  req.body.coupleCode = coupleCode.trim();
  req.body.securityAnswer = securityAnswer.trim();

  next();
};

// 个人信息验证
const validateProfile = (req, res, next) => {
  const { partner1Name, partner2Name, relationshipStartDate } = req.body;

  const errors = [];

  // 验证伴侣姓名
  if (partner1Name && !isValidString(partner1Name, 1, 50)) {
    errors.push({
      field: 'partner1Name',
      message: '伴侣1姓名长度应在1-50个字符之间'
    });
  }

  if (partner2Name && !isValidString(partner2Name, 1, 50)) {
    errors.push({
      field: 'partner2Name',
      message: '伴侣2姓名长度应在1-50个字符之间'
    });
  }

  // 验证恋爱开始日期
  if (relationshipStartDate && !isValidDate(relationshipStartDate)) {
    errors.push({
      field: 'relationshipStartDate',
      message: '请输入有效的日期格式'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: '信息格式有误',
      message: '请检查并修正信息格式',
      errors
    });
  }

  // 清理数据
  if (partner1Name) req.body.partner1Name = partner1Name.trim();
  if (partner2Name) req.body.partner2Name = partner2Name.trim();

  next();
};

// 日记验证
const validateDiary = (req, res, next) => {
  const { title, content, mood, author, coverImage } = req.body;

  const errors = [];

  // 验证标题
  if (!title) {
    errors.push({
      field: 'title',
      message: '请给今天的回忆起个温暖的标题'
    });
  } else if (!isValidString(title, 1, 200)) {
    errors.push({
      field: 'title',
      message: '标题长度应在1-200个字符之间'
    });
  }

  // 验证内容
  if (!content) {
    errors.push({
      field: 'content',
      message: '请写下今天想要记录的美好'
    });
  } else if (!isValidString(content, 1, 5000)) {
    errors.push({
      field: 'content',
      message: '内容长度应在1-5000个字符之间'
    });
  }

  // 验证心情
  const validMoods = ['happy', 'love', 'grateful', 'excited', 'peaceful', 'sad', 'angry', 'surprised'];
  if (mood && !validMoods.includes(mood)) {
    errors.push({
      field: 'mood',
      message: '请选择有效的心情标签'
    });
  }

  // 验证作者
  if (!author) {
    errors.push({
      field: 'author',
      message: '请标明这篇日记的作者'
    });
  } else if (!isValidString(author, 1, 50)) {
    errors.push({
      field: 'author',
      message: '作者名称长度应在1-50个字符之间'
    });
  }

  // 验证封面图片URL
  if (coverImage && !isValidURL(coverImage)) {
    errors.push({
      field: 'coverImage',
      message: '请提供有效的图片链接'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: '日记信息不完整',
      message: '请完善日记信息',
      errors
    });
  }

  // 清理数据
  req.body.title = title.trim();
  req.body.content = content.trim();
  req.body.author = author.trim();
  if (coverImage) req.body.coverImage = coverImage.trim();

  next();
};

// 心愿清单验证
const validateWishlist = (req, res, next) => {
  const { title, description, category, targetDate, createdBy } = req.body;

  const errors = [];

  // 验证标题
  if (!title) {
    errors.push({
      field: 'title',
      message: '请给这个心愿起个名字'
    });
  } else if (!isValidString(title, 1, 200)) {
    errors.push({
      field: 'title',
      message: '心愿标题长度应在1-200个字符之间'
    });
  }

  // 验证描述
  if (description && !isValidString(description, 0, 1000)) {
    errors.push({
      field: 'description',
      message: '心愿描述不能超过1000个字符'
    });
  }

  // 验证分类
  const validCategories = ['travel', 'food', 'entertainment', 'learning', 'fitness', 'general'];
  if (category && !validCategories.includes(category)) {
    errors.push({
      field: 'category',
      message: '请选择有效的心愿分类'
    });
  }

  // 验证目标日期
  if (targetDate && !isValidDate(targetDate)) {
    errors.push({
      field: 'targetDate',
      message: '请输入有效的目标日期'
    });
  }

  // 验证创建者
  if (!createdBy) {
    errors.push({
      field: 'createdBy',
      message: '请标明这个心愿的创建者'
    });
  } else if (!isValidString(createdBy, 1, 50)) {
    errors.push({
      field: 'createdBy',
      message: '创建者名称长度应在1-50个字符之间'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: '心愿信息不完整',
      message: '请完善心愿信息',
      errors
    });
  }

  // 清理数据
  req.body.title = title.trim();
  if (description) req.body.description = description.trim();
  req.body.createdBy = createdBy.trim();

  next();
};

// 日历事件验证
const validateCalendarEvent = (req, res, next) => {
  const { title, description, eventDate, eventType, color, createdBy } = req.body;

  const errors = [];

  // 验证标题
  if (!title) {
    errors.push({
      field: 'title',
      message: '请给这个特别的日子起个名字'
    });
  } else if (!isValidString(title, 1, 200)) {
    errors.push({
      field: 'title',
      message: '事件标题长度应在1-200个字符之间'
    });
  }

  // 验证描述
  if (description && !isValidString(description, 0, 1000)) {
    errors.push({
      field: 'description',
      message: '事件描述不能超过1000个字符'
    });
  }

  // 验证事件日期
  if (!eventDate) {
    errors.push({
      field: 'eventDate',
      message: '请选择事件日期和时间'
    });
  } else if (!isValidDate(eventDate)) {
    errors.push({
      field: 'eventDate',
      message: '请输入有效的日期时间格式'
    });
  }

  // 验证事件类型
  const validEventTypes = ['date', 'anniversary', 'travel', 'plan', 'general'];
  if (eventType && !validEventTypes.includes(eventType)) {
    errors.push({
      field: 'eventType',
      message: '请选择有效的事件类型'
    });
  }

  // 验证颜色
  const validColors = ['pink', 'blue', 'yellow', 'green', 'purple', 'orange'];
  if (color && !validColors.includes(color)) {
    errors.push({
      field: 'color',
      message: '请选择有效的颜色标记'
    });
  }

  // 验证创建者
  if (!createdBy) {
    errors.push({
      field: 'createdBy',
      message: '请标明这个事件的创建者'
    });
  } else if (!isValidString(createdBy, 1, 50)) {
    errors.push({
      field: 'createdBy',
      message: '创建者名称长度应在1-50个字符之间'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: '事件信息不完整',
      message: '请完善事件信息',
      errors
    });
  }

  // 清理数据
  req.body.title = title.trim();
  if (description) req.body.description = description.trim();
  req.body.createdBy = createdBy.trim();

  next();
};

// 纪念日验证
const validateAnniversary = (req, res, next) => {
  const { title, anniversaryDate, description, photoUrl } = req.body;

  const errors = [];

  // 验证标题
  if (!title) {
    errors.push({
      field: 'title',
      message: '请给这个重要的日子起个名字'
    });
  } else if (!isValidString(title, 1, 200)) {
    errors.push({
      field: 'title',
      message: '纪念日标题长度应在1-200个字符之间'
    });
  }

  // 验证纪念日日期
  if (!anniversaryDate) {
    errors.push({
      field: 'anniversaryDate',
      message: '请选择纪念日日期'
    });
  } else if (!isValidDate(anniversaryDate)) {
    errors.push({
      field: 'anniversaryDate',
      message: '请输入有效的日期格式'
    });
  }

  // 验证描述
  if (description && !isValidString(description, 0, 1000)) {
    errors.push({
      field: 'description',
      message: '纪念日描述不能超过1000个字符'
    });
  }

  // 验证照片URL
  if (photoUrl && !isValidURL(photoUrl)) {
    errors.push({
      field: 'photoUrl',
      message: '请提供有效的照片链接'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: '纪念日信息不完整',
      message: '请完善纪念日信息',
      errors
    });
  }

  // 清理数据
  req.body.title = title.trim();
  if (description) req.body.description = description.trim();
  if (photoUrl) req.body.photoUrl = photoUrl.trim();

  next();
};

// 情话验证
const validateQuote = (req, res, next) => {
  const { quoteText, author } = req.body;

  const errors = [];

  // 验证情话内容
  if (!quoteText) {
    errors.push({
      field: 'quoteText',
      message: '请输入你们的专属情话'
    });
  } else if (!isValidString(quoteText, 1, 500)) {
    errors.push({
      field: 'quoteText',
      message: '情话长度应在1-500个字符之间'
    });
  }

  // 验证作者（可选）
  if (author && !isValidString(author, 1, 50)) {
    errors.push({
      field: 'author',
      message: '作者名称长度应在1-50个字符之间'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: '情话信息不完整',
      message: '请完善情话信息',
      errors
    });
  }

  // 清理数据
  req.body.quoteText = quoteText.trim();
  if (author) req.body.author = author.trim();

  next();
};

// 分页参数验证
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: '分页参数错误',
        message: '页码必须是大于0的整数'
      });
    }
    req.query.page = pageNum;
  }

  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: '分页参数错误',
        message: '每页数量必须是1-100之间的整数'
      });
    }
    req.query.limit = limitNum;
  }

  next();
};

// 搜索关键词验证
const validateSearch = (req, res, next) => {
  const { keyword } = req.params;

  if (!keyword) {
    return res.status(400).json({
      error: '搜索关键词为空',
      message: '请输入要搜索的内容'
    });
  }

  if (!isValidString(keyword, 1, 100)) {
    return res.status(400).json({
      error: '搜索关键词无效',
      message: '搜索关键词长度应在1-100个字符之间'
    });
  }

  // 清理关键词
  req.params.keyword = keyword.trim();

  next();
};

// 通用ID验证
const validateId = (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      error: 'ID参数缺失',
      message: '请提供有效的ID参数'
    });
  }

  const idNum = parseInt(id);
  if (isNaN(idNum) || idNum < 1) {
    return res.status(400).json({
      error: 'ID参数无效',
      message: 'ID必须是大于0的整数'
    });
  }

  req.params.id = idNum;
  next();
};

module.exports = {
  validateAuth,
  validateProfile,
  validateDiary,
  validateWishlist,
  validateCalendarEvent,
  validateAnniversary,
  validateQuote,
  validatePagination,
  validateSearch,
  validateId,
  // 导出验证工具函数
  isValidString,
  isValidDate,
  isValidEmail,
  isValidURL
};
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 确保上传目录存在
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 本地存储配置
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    
    // 根据文件类型确定存储路径
    if (file.fieldname === 'avatar') {
      uploadPath = path.join(__dirname, '../public/uploads/avatars');
    } else if (file.fieldname === 'diary_cover') {
      uploadPath = path.join(__dirname, '../public/uploads/diary');
    } else if (file.fieldname === 'anniversary_photo') {
      uploadPath = path.join(__dirname, '../public/uploads/anniversaries');
    } else {
      uploadPath = path.join(__dirname, '../public/uploads/general');
    }
    
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名: 时间戳_UUID_原文件名
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    const fileName = `${timestamp}_${uniqueId}_${baseName}${extension}`;
    cb(null, fileName);
  }
});

// 内存存储配置（用于云存储）
const memoryStorage = multer.memoryStorage();

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持上传 JPEG、PNG、GIF、WebP 格式的图片'), false);
  }
};

// 文件大小限制和错误处理
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 5 // 最多5个文件
};

// 头像上传中间件
const uploadAvatar = multer({
  storage: process.env.NODE_ENV === 'production' ? memoryStorage : localStorage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 头像限制2MB
    files: 1
  }
}).single('avatar');

// 日记封面上传中间件
const uploadDiaryCover = multer({
  storage: process.env.NODE_ENV === 'production' ? memoryStorage : localStorage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024, // 日记封面限制3MB
    files: 1
  }
}).single('diary_cover');

// 纪念日照片上传中间件
const uploadAnniversaryPhoto = multer({
  storage: process.env.NODE_ENV === 'production' ? memoryStorage : localStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 纪念日照片限制5MB
    files: 1
  }
}).single('anniversary_photo');

// 多文件上传中间件
const uploadMultiple = multer({
  storage: process.env.NODE_ENV === 'production' ? memoryStorage : localStorage,
  fileFilter,
  limits
}).array('images', 5);

// Cloudinary配置 (如果使用云存储)
let cloudinary;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// 上传到Cloudinary的函数
const uploadToCloudinary = async (buffer, options = {}) => {
  if (!cloudinary) {
    throw new Error('Cloudinary未配置');
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'image',
      folder: 'couple-planet',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

// 处理上传错误的中间件
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message;
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = '文件太大了，请选择小一点的图片';
        break;
      case 'LIMIT_FILE_COUNT':
        message = '上传文件数量超过限制';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = '意外的文件字段';
        break;
      default:
        message = '文件上传失败';
    }

    return res.status(400).json({
      error: '上传失败',
      message,
      code: err.code
    });
  }

  if (err.message.includes('只支持上传')) {
    return res.status(400).json({
      error: '文件格式不支持',
      message: err.message
    });
  }

  next(err);
};

// 图片处理中间件（调整大小、压缩等）
const processImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // 如果是生产环境且配置了Cloudinary，上传到云端
    if (process.env.NODE_ENV === 'production' && cloudinary) {
      let folder;
      
      // 根据文件字段确定存储文件夹
      switch (req.file.fieldname) {
        case 'avatar':
          folder = 'couple-planet/avatars';
          break;
        case 'diary_cover':
          folder = 'couple-planet/diary';
          break;
        case 'anniversary_photo':
          folder = 'couple-planet/anniversaries';
          break;
        default:
          folder = 'couple-planet/general';
      }

      const result = await uploadToCloudinary(req.file.buffer, {
        folder,
        public_id: `${req.couple?.coupleId || 'guest'}_${Date.now()}`,
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      });

      // 将云端URL添加到请求对象
      req.file.cloudinaryUrl = result.secure_url;
      req.file.publicId = result.public_id;
    }

    next();
  } catch (error) {
    console.error('图片处理错误:', error);
    res.status(500).json({
      error: '图片处理失败',
      message: '处理上传的图片时遇到问题'
    });
  }
};

// 删除本地文件的工具函数
const deleteLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('删除本地文件失败:', error);
  }
};

// 删除Cloudinary文件的工具函数
const deleteCloudinaryFile = async (publicId) => {
  try {
    if (cloudinary && publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error('删除Cloudinary文件失败:', error);
  }
};

// 清理临时文件的中间件
const cleanupTempFiles = (req, res, next) => {
  // 在响应结束后清理临时文件
  res.on('finish', () => {
    if (req.file && req.file.path && process.env.NODE_ENV !== 'production') {
      // 本地开发环境下，如果上传到了云端，删除本地临时文件
      if (req.file.cloudinaryUrl) {
        deleteLocalFile(req.file.path);
      }
    }

    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (file.path && file.cloudinaryUrl && process.env.NODE_ENV !== 'production') {
          deleteLocalFile(file.path);
        }
      });
    }
  });

  next();
};

// 文件URL生成器
const generateFileUrl = (req, filename) => {
  if (process.env.NODE_ENV === 'production') {
    // 生产环境返回完整URL
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
  } else {
    // 开发环境返回相对路径
    return `/uploads/${filename}`;
  }
};

// 验证文件是否属于当前情侣
const validateFileOwnership = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const coupleId = req.couple?.coupleId;

    if (!coupleId) {
      return res.status(401).json({
        error: '未授权',
        message: '请先登录'
      });
    }

    // 这里可以添加数据库查询来验证文件所有权
    // 例如查询文件记录是否属于当前情侣

    next();
  } catch (error) {
    console.error('文件所有权验证错误:', error);
    res.status(500).json({
      error: '验证失败',
      message: '验证文件权限时遇到问题'
    });
  }
};

// 获取文件信息的中间件
const getFileInfo = (req, res, next) => {
  if (req.file) {
    req.fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: req.file.cloudinaryUrl || generateFileUrl(req, req.file.filename),
      uploadedAt: new Date().toISOString()
    };
  }

  if (req.files && Array.isArray(req.files)) {
    req.filesInfo = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: file.cloudinaryUrl || generateFileUrl(req, file.filename),
      uploadedAt: new Date().toISOString()
    }));
  }

  next();
};

// 记录上传日志
const logUpload = (req, res, next) => {
  if (req.file || req.files) {
    const coupleId = req.couple?.coupleId || 'anonymous';
    const fileCount = req.files ? req.files.length : 1;
    const totalSize = req.files 
      ? req.files.reduce((sum, file) => sum + file.size, 0)
      : req.file?.size || 0;

    console.log(`[文件上传] 情侣ID: ${coupleId}, 文件数: ${fileCount}, 总大小: ${(totalSize / 1024 / 1024).toFixed(2)}MB, 时间: ${new Date().toISOString()}`);
  }

  next();
};

module.exports = {
  uploadAvatar,
  uploadDiaryCover,
  uploadAnniversaryPhoto,
  uploadMultiple,
  handleUploadError,
  processImage,
  cleanupTempFiles,
  validateFileOwnership,
  getFileInfo,
  logUpload,
  // 工具函数
  deleteLocalFile,
  deleteCloudinaryFile,
  generateFileUrl,
  uploadToCloudinary
};
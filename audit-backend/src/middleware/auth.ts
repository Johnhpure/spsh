import { Request, Response, NextFunction } from 'express';

// 认证中间件
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;

  // 从环境变量获取有效的 API 密钥列表
  const validApiKeys = process.env.API_KEYS?.split(',') || [];

  // 验证 API 密钥
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  next();
};

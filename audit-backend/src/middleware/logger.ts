import { Request, Response, NextFunction } from 'express';
import { logger, logApiRequest, logApiResponse } from '../utils/logger';

/**
 * 日志中间件
 * 记录所有 API 请求和响应
 */
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // 记录请求
  logApiRequest(req.method, req.path, req.query, req.body, req.ip);

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // 记录响应
    logApiResponse(req.method, req.path, res.statusCode, duration);
  });

  next();
};

export { logger };

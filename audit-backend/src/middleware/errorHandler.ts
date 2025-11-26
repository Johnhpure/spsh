import { Request, Response, NextFunction } from 'express';
import { logger, sanitizeSensitiveData } from '../utils/logger';

/**
 * 错误处理中间件
 * 捕获所有错误，记录错误堆栈，返回统一格式的错误响应
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 记录错误日志（包含完整堆栈信息和上下文）
  logger.error({
    type: 'api_error',
    message: err.message,
    stack: err.stack,
    name: err.name,
    statusCode: err.statusCode || err.status || 500,
    method: req.method,
    path: req.path,
    body: sanitizeSensitiveData(req.body),
    query: sanitizeSensitiveData(req.query),
    params: sanitizeSensitiveData(req.params),
    headers: sanitizeSensitiveData(req.headers),
    ip: req.ip,
  });

  // 确定状态码
  const statusCode = err.statusCode || err.status || 500;

  // 返回统一格式的错误响应
  res.status(statusCode).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: req.path,
    // 仅在开发环境返回堆栈信息
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

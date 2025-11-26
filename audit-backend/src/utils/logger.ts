import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * 敏感信息脱敏函数
 * 隐藏密码、API密钥等敏感信息
 */
export function sanitizeSensitiveData(data: any): any {
  if (!data) return data;

  // 如果是字符串，直接返回
  if (typeof data === 'string') {
    return data;
  }

  // 如果是数组，递归处理每个元素
  if (Array.isArray(data)) {
    return data.map(item => sanitizeSensitiveData(item));
  }

  // 如果不是对象，直接返回
  if (typeof data !== 'object') {
    return data;
  }

  // 创建新对象以避免修改原始数据
  const sanitized = { ...data };

  // 需要脱敏的字段列表
  const sensitiveFields = [
    'password',
    'passwd',
    'pwd',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'apikey',
    'authorization',
    'auth',
    'x-api-key',
  ];

  // 遍历对象的所有键
  for (const key in sanitized) {
    if (sanitized.hasOwnProperty(key)) {
      const lowerKey = key.toLowerCase();
      
      // 检查是否是敏感字段
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        // 脱敏处理：只显示前2个和后2个字符
        const value = sanitized[key];
        if (typeof value === 'string' && value.length > 4) {
          sanitized[key] = `${value.substring(0, 2)}****${value.substring(value.length - 2)}`;
        } else if (typeof value === 'string') {
          sanitized[key] = '****';
        }
      } else if (typeof sanitized[key] === 'object') {
        // 递归处理嵌套对象
        sanitized[key] = sanitizeSensitiveData(sanitized[key]);
      }
    }
  }

  return sanitized;
}

/**
 * 创建 Winston logger 实例
 */
const createLogger = () => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const logDir = process.env.LOG_DIR || './logs';

  // 定义日志格式
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // 控制台输出格式（带颜色）
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      return msg;
    })
  );

  // 创建传输器数组
  const transports: winston.transport[] = [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ];

  // 如果指定了日志目录，添加文件传输（按日期轮转）
  if (logDir) {
    // 错误日志文件（只记录 error 级别）
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d', // 保留14天
        zippedArchive: true,
      })
    );

    // 综合日志文件（记录所有级别）
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d', // 保留14天
        zippedArchive: true,
      })
    );
  }

  // 创建 logger 实例
  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    // 处理未捕获的异常和拒绝
    exceptionHandlers: [
      new winston.transports.Console({
        format: consoleFormat,
      }),
    ],
    rejectionHandlers: [
      new winston.transports.Console({
        format: consoleFormat,
      }),
    ],
  });

  return logger;
};

// 创建并导出 logger 实例
export const logger = createLogger();

/**
 * 记录数据库操作日志
 */
export function logDatabaseOperation(operation: string, sql: string, params?: any[], error?: Error) {
  const sanitizedParams = params ? sanitizeSensitiveData(params) : undefined;
  
  if (error) {
    logger.error({
      type: 'database_error',
      operation,
      sql: sanitizeSensitiveData(sql),
      params: sanitizedParams,
      error: error.message,
      stack: error.stack,
    });
  } else {
    logger.debug({
      type: 'database_operation',
      operation,
      sql: sanitizeSensitiveData(sql),
      params: sanitizedParams,
    });
  }
}

/**
 * 记录 API 请求日志
 */
export function logApiRequest(method: string, path: string, query?: any, body?: any, ip?: string) {
  logger.info({
    type: 'api_request',
    method,
    path,
    query: sanitizeSensitiveData(query),
    body: sanitizeSensitiveData(body),
    ip,
  });
}

/**
 * 记录 API 响应日志
 */
export function logApiResponse(method: string, path: string, statusCode: number, duration: number) {
  logger.info({
    type: 'api_response',
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
  });
}

/**
 * 记录错误日志
 */
export function logError(error: Error, context?: any) {
  logger.error({
    type: 'error',
    message: error.message,
    stack: error.stack,
    context: sanitizeSensitiveData(context),
  });
}

export default logger;

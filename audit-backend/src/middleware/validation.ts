import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { stripHtmlTags } from '../utils/sanitize';

/**
 * 选择性清理输入数据
 * 只清理可能包含用户生成内容的文本字段，不清理URL、日期等结构化数据
 */
function sanitizeRequestData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // 需要清理的字段列表（用户生成的文本内容）
  const fieldsToSanitize = [
    'productTitle',
    'rejectionReason',
    'apiError',
    'textRequest',
    'textResponse',
    'imageRequest',
    'imageResponse',
    'scopeRequest',
    'scopeResponse',
    'keyword',
  ];

  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      
      // 如果是需要清理的字段且是字符串，则移除HTML标签
      if (fieldsToSanitize.includes(key) && typeof value === 'string') {
        sanitized[key] = stripHtmlTags(value);
      } else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        sanitized[key] = sanitizeRequestData(value);
      } else {
        // 其他字段保持原样
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

// 验证中间件工厂函数
export const validate = (schema: {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 在验证之前清理输入数据（只清理用户生成的文本内容）
    if (req.body) {
      req.body = sanitizeRequestData(req.body);
    }
    if (req.query) {
      req.query = sanitizeRequestData(req.query);
    }
    if (req.params) {
      req.params = sanitizeRequestData(req.params);
    }

    const errors: any[] = [];

    // 验证请求体
    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push({
          location: 'body',
          details: error.details.map((detail) => ({
            message: detail.message,
            path: detail.path,
          })),
        });
      }
    }

    // 验证查询参数
    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push({
          location: 'query',
          details: error.details.map((detail) => ({
            message: detail.message,
            path: detail.path,
          })),
        });
      }
    }

    // 验证路径参数
    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push({
          location: 'params',
          details: error.details.map((detail) => ({
            message: detail.message,
            path: detail.path,
          })),
        });
      }
    }

    // 如果有验证错误，返回 400
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors,
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    next();
  };
};

import { Router } from 'express';
import Joi from 'joi';
import { auditRecordController } from '../controllers/auditRecordController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * Joi验证schema：验证所有必需字段
 */
const createRecordSchema = {
  body: Joi.object({
    productId: Joi.string().required().messages({
      'any.required': 'productId is required',
      'string.empty': 'productId cannot be empty',
    }),
    productTitle: Joi.string().required().messages({
      'any.required': 'productTitle is required',
      'string.empty': 'productTitle cannot be empty',
    }),
    productImage: Joi.string().uri().required().messages({
      'any.required': 'productImage is required',
      'string.empty': 'productImage cannot be empty',
      'string.uri': 'productImage must be a valid URI',
    }),
    submitTime: Joi.date().iso().required().messages({
      'any.required': 'submitTime is required',
      'date.base': 'submitTime must be a valid date',
      'date.format': 'submitTime must be in ISO 8601 format',
    }),
    aiProcessingTime: Joi.number().integer().min(0).required().messages({
      'any.required': 'aiProcessingTime is required',
      'number.base': 'aiProcessingTime must be a number',
      'number.integer': 'aiProcessingTime must be an integer',
      'number.min': 'aiProcessingTime must be at least 0',
    }),
    rejectionReason: Joi.string().required().messages({
      'any.required': 'rejectionReason is required',
      'string.empty': 'rejectionReason cannot be empty',
    }),
    auditStage: Joi.string().valid('text', 'image', 'business_scope').required().messages({
      'any.required': 'auditStage is required',
      'any.only': 'auditStage must be one of: text, image, business_scope',
    }),
    apiError: Joi.string().optional().allow(''),
    textRequest: Joi.string().optional().allow(''),
    textResponse: Joi.string().optional().allow(''),
    imageRequest: Joi.string().optional().allow(''),
    imageResponse: Joi.string().optional().allow(''),
    scopeRequest: Joi.string().optional().allow(''),
    scopeResponse: Joi.string().optional().allow(''),
    userId: Joi.string().optional().allow(''),
    username: Joi.string().optional().allow(''),
  }),
};

/**
 * 查询参数验证schema
 */
const getRecordsSchema = {
  query: Joi.object({
    productId: Joi.string().optional(),
    stage: Joi.string().valid('text', 'image', 'business_scope').optional().messages({
      'any.only': 'stage must be one of: text, image, business_scope',
    }),
    startDate: Joi.date().iso().optional().messages({
      'date.base': 'startDate must be a valid date',
      'date.format': 'startDate must be in ISO 8601 format',
    }),
    endDate: Joi.date().iso().optional().messages({
      'date.base': 'endDate must be a valid date',
      'date.format': 'endDate must be in ISO 8601 format',
    }),
    keyword: Joi.string().optional(),
    page: Joi.number().integer().min(1).optional().default(1).messages({
      'number.base': 'page must be a number',
      'number.integer': 'page must be an integer',
      'number.min': 'page must be at least 1',
    }),
    limit: Joi.number().integer().min(1).max(100).optional().default(20).messages({
      'number.base': 'limit must be a number',
      'number.integer': 'limit must be an integer',
      'number.min': 'limit must be at least 1',
      'number.max': 'limit must be at most 100',
    }),
  }),
};

/**
 * 统计查询参数验证schema
 */
const getStatisticsSchema = {
  query: Joi.object({
    startDate: Joi.date().iso().optional().messages({
      'date.base': 'startDate must be a valid date',
      'date.format': 'startDate must be in ISO 8601 format',
    }),
    endDate: Joi.date().iso().optional().messages({
      'date.base': 'endDate must be a valid date',
      'date.format': 'endDate must be in ISO 8601 format',
    }),
  }),
};

/**
 * POST /api/audit-records
 * 创建审核记录
 * 应用auth、validation中间件
 */
router.post(
  '/',
  authenticateToken,
  validate(createRecordSchema),
  auditRecordController.createRecord.bind(auditRecordController)
);

/**
 * GET /api/audit-records/statistics
 * 获取统计数据
 * 应用auth、validation中间件
 * 注意：此路由必须在 GET / 之前定义，以避免被通用路由捕获
 */
router.get(
  '/statistics',
  authenticateToken,
  validate(getStatisticsSchema),
  auditRecordController.getStatistics.bind(auditRecordController)
);

/**
 * GET /api/audit-records/export
 * 导出审核记录为CSV
 * 应用auth中间件
 * 注意：此路由必须在 GET / 之前定义，以避免被通用路由捕获
 */
router.get(
  '/export',
  authenticateToken,
  auditRecordController.exportRecords.bind(auditRecordController)
);

/**
 * GET /api/audit-records/:id
 * 获取单条审核记录详情
 * 应用auth中间件
 */
router.get(
  '/:id',
  authenticateToken,
  auditRecordController.getRecordById.bind(auditRecordController)
);

/**
 * GET /api/audit-records
 * 查询审核记录
 * 应用auth、validation中间件
 */
router.get(
  '/',
  authenticateToken,
  validate(getRecordsSchema),
  auditRecordController.getRecords.bind(auditRecordController)
);

export default router;

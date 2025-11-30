import { Router } from 'express';
import Joi from 'joi';
import { systemSettingController } from '../controllers/systemSettingController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

const updateSettingsSchema = {
    body: Joi.object({
        aliyunAccessKeyId: Joi.string().optional().allow(''),
        aliyunAccessKeySecret: Joi.string().optional().allow(''),
        deepSeekApiKey: Joi.string().optional().allow(''),
    }),
};

/**
 * GET /api/settings
 * 获取系统设置
 */
router.get(
    '/',
    authenticateToken,
    systemSettingController.getSettings.bind(systemSettingController)
);

/**
 * PUT /api/settings
 * 更新系统设置
 */
router.put(
    '/',
    authenticateToken,
    validate(updateSettingsSchema),
    systemSettingController.updateSettings.bind(systemSettingController)
);

export default router;

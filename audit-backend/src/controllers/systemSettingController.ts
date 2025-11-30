import { Request, Response, NextFunction } from 'express';
import { systemSettingService } from '../services/systemSettingService';
import { SystemSettings } from '../models/systemSetting';

class SystemSettingController {
    /**
     * 获取系统设置
     */
    async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const settings = await systemSettingService.getSettings();
            res.status(200).json({
                success: true,
                data: settings,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 更新系统设置
     */
    async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const settings: SystemSettings = {
                aliyunAccessKeyId: req.body.aliyunAccessKeyId,
                aliyunAccessKeySecret: req.body.aliyunAccessKeySecret,
                deepSeekApiKey: req.body.deepSeekApiKey,
            };

            await systemSettingService.updateSettings(settings);

            res.status(200).json({
                success: true,
                message: 'Settings updated successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}

export const systemSettingController = new SystemSettingController();

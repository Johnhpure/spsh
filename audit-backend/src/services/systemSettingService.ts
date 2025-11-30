import { databaseManager } from '../utils/database';
import { SystemSetting, SETTING_KEYS, SystemSettings } from '../models/systemSetting';
import { RowDataPacket } from 'mysql2';

class SystemSettingService {
    /**
     * 获取所有系统设置
     */
    async getSettings(): Promise<SystemSettings> {
        const sql = 'SELECT * FROM system_settings';
        const rows = await databaseManager.query<(SystemSetting & RowDataPacket)[]>(sql);

        const settings: SystemSettings = {};

        rows.forEach(row => {
            if (row.setting_key === SETTING_KEYS.ALIYUN_ACCESS_KEY_ID) {
                settings.aliyunAccessKeyId = row.setting_value;
            } else if (row.setting_key === SETTING_KEYS.ALIYUN_ACCESS_KEY_SECRET) {
                settings.aliyunAccessKeySecret = row.setting_value;
            } else if (row.setting_key === SETTING_KEYS.DEEPSEEK_API_KEY) {
                settings.deepSeekApiKey = row.setting_value;
            }
        });

        return settings;
    }

    /**
     * 更新系统设置
     * 使用 INSERT ON DUPLICATE KEY UPDATE 实现 upsert
     */
    async updateSettings(settings: SystemSettings): Promise<void> {
        const updates: { key: string; value: string; description: string }[] = [];

        if (settings.aliyunAccessKeyId !== undefined) {
            updates.push({
                key: SETTING_KEYS.ALIYUN_ACCESS_KEY_ID,
                value: settings.aliyunAccessKeyId,
                description: 'Aliyun AccessKey ID'
            });
        }

        if (settings.aliyunAccessKeySecret !== undefined) {
            updates.push({
                key: SETTING_KEYS.ALIYUN_ACCESS_KEY_SECRET,
                value: settings.aliyunAccessKeySecret,
                description: 'Aliyun AccessKey Secret'
            });
        }

        if (settings.deepSeekApiKey !== undefined) {
            updates.push({
                key: SETTING_KEYS.DEEPSEEK_API_KEY,
                value: settings.deepSeekApiKey,
                description: 'DeepSeek API Key'
            });
        }

        if (updates.length === 0) {
            return;
        }

        // 批量执行更新
        for (const update of updates) {
            const sql = `
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description)
      `;
            await databaseManager.query(sql, [update.key, update.value, update.description]);
        }
    }
}

export const systemSettingService = new SystemSettingService();

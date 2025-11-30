/**
 * 系统设置接口
 */
export interface SystemSetting {
    key: string;
    value: string;
    description?: string;
    updatedAt?: Date;
}

/**
 * 设置键名常量
 */
export const SETTING_KEYS = {
    ALIYUN_ACCESS_KEY_ID: 'aliyun_access_key_id',
    ALIYUN_ACCESS_KEY_SECRET: 'aliyun_access_key_secret',
    DEEPSEEK_API_KEY: 'deepseek_api_key',
};

/**
 * 完整的设置对象（用于API响应）
 */
export interface SystemSettings {
    aliyunAccessKeyId?: string;
    aliyunAccessKeySecret?: string;
    deepSeekApiKey?: string;
}

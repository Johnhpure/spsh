import { databaseManager } from './utils/database';
import { systemSettingService } from './services/systemSettingService';
import dotenv from 'dotenv';

dotenv.config();

async function verifySettingsService() {
    try {
        console.log('Connecting to database...');
        await databaseManager.connect({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'audit_system',
            connectionLimit: 10,
        });

        console.log('1. Initial Settings Fetch');
        const initialSettings = await systemSettingService.getSettings();
        console.log('Initial Settings:', initialSettings);

        console.log('2. Update Settings');
        const newSettings = {
            aliyunAccessKeyId: 'TEST_ALIYUN_ID_' + Date.now(),
            aliyunAccessKeySecret: 'TEST_ALIYUN_SECRET',
            deepSeekApiKey: 'TEST_DEEPSEEK_KEY'
        };
        await systemSettingService.updateSettings(newSettings);
        console.log('Settings updated.');

        console.log('3. Verify Update');
        const updatedSettings = await systemSettingService.getSettings();
        console.log('Updated Settings:', updatedSettings);

        if (
            updatedSettings.aliyunAccessKeyId === newSettings.aliyunAccessKeyId &&
            updatedSettings.aliyunAccessKeySecret === newSettings.aliyunAccessKeySecret &&
            updatedSettings.deepSeekApiKey === newSettings.deepSeekApiKey
        ) {
            console.log('SUCCESS: Settings were correctly updated and retrieved!');
        } else {
            console.error('FAILURE: Settings mismatch!');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await databaseManager.disconnect();
    }
}

verifySettingsService();

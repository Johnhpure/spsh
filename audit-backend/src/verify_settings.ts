import dotenv from 'dotenv';
import axios from 'axios';
import { databaseManager } from './utils/database';

dotenv.config();

const API_URL = 'http://localhost:3000/api';
let AUTH_TOKEN = '';

async function login() {
    try {
        // Assuming there is an admin user, or we can use the setup-admin endpoint if needed
        // For this test, I'll try to login with a known user or create one if possible.
        // Since I don't have the password for 'admin', I might need to insert a temporary user or just test the service layer directly if API auth is blocking.
        // However, to test the API properly, I need a token.

        // Let's try to use the service layer directly for verification to avoid auth issues in this script, 
        // OR we can mock the auth middleware if we were running unit tests.
        // But since this is a live integration test, I need a token.

        // Alternative: I can test the Service layer directly, which proves the DB interaction works.
        // Testing the API endpoints requires a running server and a valid token.

        console.log('Skipping API login, testing Service layer directly...');
        return;
    } catch (error) {
        console.error('Login failed:', error);
    }
}

import { systemSettingService } from './services/systemSettingService';

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

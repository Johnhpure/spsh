import dotenv from 'dotenv';
import { databaseManager } from './utils/database';

dotenv.config();

async function createSettingsTable() {
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

        console.log('Creating system_settings table...');

        await databaseManager.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value TEXT,
        description VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        console.log('Table system_settings created successfully.');

    } catch (error) {
        console.error('Failed to create table:', error);
    } finally {
        await databaseManager.disconnect();
    }
}

createSettingsTable();

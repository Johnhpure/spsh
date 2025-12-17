
import dotenv from 'dotenv';
import { databaseManager } from './utils/database';

dotenv.config();

async function createShopsTable() {
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

        console.log('Creating shop_profiles table if not exists...');

        await databaseManager.query(`
      CREATE TABLE IF NOT EXISTS shop_profiles (
        shop_id VARCHAR(255) NOT NULL PRIMARY KEY,
        business_scope TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

        console.log('shop_profiles table created/verified.');

    } catch (error) {
        console.error('Failed to create table:', error);
    } finally {
        await databaseManager.disconnect();
    }
}

createShopsTable();

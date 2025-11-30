import dotenv from 'dotenv';
import { databaseManager } from './utils/database';

dotenv.config();

async function updateSchema() {
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

        console.log('Checking and updating schema...');

        // Add user_id column
        try {
            await databaseManager.query(`
        ALTER TABLE audit_records 
        ADD COLUMN user_id VARCHAR(255) NULL AFTER scope_response
      `);
            console.log('Added user_id column.');
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('user_id column already exists.');
            } else {
                console.error('Error adding user_id column:', e);
            }
        }

        // Add username column
        try {
            await databaseManager.query(`
        ALTER TABLE audit_records 
        ADD COLUMN username VARCHAR(255) NULL AFTER user_id
      `);
            console.log('Added username column.');
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('username column already exists.');
            } else {
                console.error('Error adding username column:', e);
            }
        }

        console.log('Schema update completed.');
    } catch (error) {
        console.error('Schema update failed:', error);
    } finally {
        await databaseManager.disconnect();
    }
}

updateSchema();

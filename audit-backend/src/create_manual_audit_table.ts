import 'dotenv/config';
import { databaseManager } from './utils/database';

async function createManualAuditTable() {
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

        console.log('Creating manual_audit_products table...');

        await databaseManager.query(`
      CREATE TABLE IF NOT EXISTS manual_audit_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        product_title VARCHAR(500) NOT NULL,
        product_image VARCHAR(1000),
        images TEXT,
        category_name VARCHAR(255),
        category_image VARCHAR(1000),
        description TEXT,
        price DECIMAL(10, 2),
        shop_id VARCHAR(50),
        shop_name VARCHAR(255),
        audit_reason VARCHAR(500),
        rejection_reason VARCHAR(500),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_product_id (product_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

        console.log('Table manual_audit_products created successfully.');

    } catch (error) {
        console.error('Failed to create table:', error);
    } finally {
        await databaseManager.disconnect();
    }
}

createManualAuditTable();

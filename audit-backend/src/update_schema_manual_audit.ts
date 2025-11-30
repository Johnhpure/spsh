import 'dotenv/config';
import { databaseManager } from './utils/database';

async function updateSchemaManualAudit() {
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

        console.log('Updating schema for manual audit...');

        const columnsToAdd = [
            "ADD COLUMN manual_status ENUM('pending', 'approved', 'rejected') DEFAULT NULL COMMENT '人工审核状态'",
            "ADD COLUMN price DECIMAL(10, 2) DEFAULT NULL COMMENT '商品价格'",
            "ADD COLUMN shop_name VARCHAR(255) DEFAULT NULL COMMENT '店铺名称'",
            "ADD COLUMN shop_id VARCHAR(50) DEFAULT NULL COMMENT '店铺ID'",
            "ADD COLUMN category_name VARCHAR(255) DEFAULT NULL COMMENT '分类名称'",
            "ADD COLUMN category_image VARCHAR(1000) DEFAULT NULL COMMENT '分类图片'",
            "ADD COLUMN images TEXT DEFAULT NULL COMMENT '商品图集'",
            "ADD COLUMN audit_reason VARCHAR(500) DEFAULT NULL COMMENT 'AI审核原因'" // rejection_reason already exists
        ];

        for (const columnDef of columnsToAdd) {
            try {
                await databaseManager.query(`ALTER TABLE audit_records ${columnDef}`);
                console.log(`Executed: ${columnDef}`);
            } catch (e: any) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column already exists: ${columnDef.split(' ')[2]}`);
                } else {
                    console.error(`Error adding column: ${columnDef}`, e);
                }
            }
        }

        // Add index for manual_status
        try {
            await databaseManager.query('ALTER TABLE audit_records ADD INDEX idx_manual_status (manual_status)');
            console.log('Added index for manual_status');
        } catch (e: any) {
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log('Index idx_manual_status already exists');
            } else {
                console.error('Error adding index:', e);
            }
        }

        console.log('Schema update completed.');

    } catch (error) {
        console.error('Schema update failed:', error);
    } finally {
        await databaseManager.disconnect();
    }
}

updateSchemaManualAudit();

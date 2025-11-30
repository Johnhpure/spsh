import { auditRecordService } from './services/auditRecordService';
import { databaseManager } from './utils/database';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
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

        const productId = '69786';
        console.log(`Attempting to create record for product ID: ${productId}`);

        // Check if it exists first
        const existing = await auditRecordService.findAll({ productId });
        if (existing.records.length > 0) {
            console.log('Record already exists (unexpected):', existing.records[0]);
        }

        const record = await auditRecordService.create({
            productId: productId,
            productTitle: 'Test Product 69786',
            productImage: 'http://example.com/image.jpg',
            submitTime: new Date(),
            aiProcessingTime: 100,
            rejectionReason: 'Test Reason',
            auditStage: 'text',
            manualStatus: 'pending',
            price: 99.99,
            shopName: 'Test Shop',
            shopId: 'shop-123',
            categoryName: 'Test Category',
            categoryImage: 'http://example.com/cat.jpg',
            images: 'img1,img2',
            auditReason: 'Detailed Audit Reason',
            categoryAuditStatus: 'approved',
            categoryAuditReason: 'Category OK'
        });

        console.log('Record created object:', record);

        console.log('Verifying in database...');
        const saved = await auditRecordService.findById(record.id!);

        if (saved) {
            console.log('SUCCESS: Record found in DB.');
            console.log(saved);
        } else {
            console.error('FAILURE: Record not found in DB after creation.');
        }

        await databaseManager.disconnect();
    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();

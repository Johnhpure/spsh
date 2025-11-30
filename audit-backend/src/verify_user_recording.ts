import dotenv from 'dotenv';
import { databaseManager } from './utils/database';
import { auditRecordService } from './services/auditRecordService';
import { AuditRecord } from './models/auditRecord';

dotenv.config();

async function verifyUserRecording() {
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

        console.log('Creating test record...');
        const testRecord: AuditRecord = {
            productId: 'TEST-USER-RECORD-' + Date.now(),
            productTitle: 'Test Product for User Recording',
            productImage: 'http://example.com/image.jpg',
            submitTime: new Date(),
            aiProcessingTime: 100,
            rejectionReason: 'Test Reason',
            auditStage: 'text',
            userId: 'test-user-id-123',
            username: 'test-user-name',
        };

        const created = await auditRecordService.create(testRecord);
        console.log('Record created with ID:', created.id);

        console.log('Verifying record in database...');
        const retrieved = await auditRecordService.findById(created.id!);

        if (!retrieved) {
            throw new Error('Failed to retrieve record');
        }

        console.log('Retrieved record:', {
            id: retrieved.id,
            userId: retrieved.userId,
            username: retrieved.username
        });

        if (retrieved.userId === testRecord.userId && retrieved.username === testRecord.username) {
            console.log('SUCCESS: User ID and Username were correctly recorded!');
        } else {
            console.error('FAILURE: User ID or Username mismatch!');
            console.error('Expected:', { userId: testRecord.userId, username: testRecord.username });
            console.error('Actual:', { userId: retrieved.userId, username: retrieved.username });
        }

        // Cleanup
        console.log('Cleaning up...');
        await databaseManager.query('DELETE FROM audit_records WHERE id = ?', [created.id]);

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await databaseManager.disconnect();
    }
}

verifyUserRecording();

import { Request, Response } from 'express';
import { manualAuditService } from '../services/manualAuditService';
import { logger } from '../utils/logger';

export class ManualAuditController {
    async addProduct(req: Request, res: Response) {
        try {
            await manualAuditService.addProduct(req.body);
            res.json({ success: true });
        } catch (error) {
            logger.error('Failed to add manual audit product', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getList(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const result = await manualAuditService.getPendingProducts(page, limit);
            res.json({ success: true, data: result });
        } catch (error) {
            logger.error('Failed to get manual audit list', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async audit(req: Request, res: Response) {
        try {
            const { id, status, reason } = req.body;
            if (!id || !['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ success: false, error: 'Invalid parameters' });
            }
            await manualAuditService.auditProduct(id, status, reason);
            return res.json({ success: true });
        } catch (error) {
            logger.error('Failed to audit product', error);
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}

export const manualAuditController = new ManualAuditController();

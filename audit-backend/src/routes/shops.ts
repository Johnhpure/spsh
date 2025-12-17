import express from 'express';
import { databaseManager } from '../utils/database';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/shops/:shopId/scope - 获取店铺经营范围
router.get('/:shopId/scope', async (req, res) => {
    const { shopId } = req.params;

    if (!shopId) {
        return res.status(400).json({ success: false, error: 'Missing shopId' });
    }

    try {
        const rows = await databaseManager.query<any[]>(
            'SELECT business_scope FROM shop_profiles WHERE shop_id = ?',
            [shopId]
        );

        if (rows && rows.length > 0) {
            return res.json({ success: true, businessScope: rows[0].business_scope });
        } else {
            return res.json({ success: false, error: 'Shop scope not found' }); // Not 404 to avoid console noise in frontend
        }
    } catch (error) {
        logger.error('Failed to get shop scope', { shopId, error });
        return res.status(500).json({ success: false, error: 'Database error' });
    }
});

// POST /api/shops/scope - 保存/更新店铺经营范围
router.post('/scope', async (req, res) => {
    const { shopId, businessScope } = req.body;

    if (!shopId || !businessScope) {
        return res.status(400).json({ success: false, error: 'Missing shopId or businessScope' });
    }

    try {
        // 使用 ON DUPLICATE KEY UPDATE 实现“存在即更新，不存在即插入”
        await databaseManager.query(
            `INSERT INTO shop_profiles (shop_id, business_scope) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE business_scope = VALUES(business_scope)`,
            [shopId, businessScope]
        );

        logger.info(`Saved business scope for shop ${shopId}`);
        return res.json({ success: true });
    } catch (error) {
        logger.error('Failed to save shop scope', { shopId, error });
        return res.status(500).json({ success: false, error: 'Database error' });
    }
});

export default router;

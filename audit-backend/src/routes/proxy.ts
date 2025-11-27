import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.get('/external-audit-list', async (req, res) => {
    try {
        const response = await axios.get('https://admin.pinhaopin.com/gateway/mall/getAuditRejectedList', {
            params: {
                pageNo: 1,
                pageSize: 100
            },
            headers: {
                // Add any necessary headers here, e.g. User-Agent
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Failed to fetch external data' });
    }
});

export default router;

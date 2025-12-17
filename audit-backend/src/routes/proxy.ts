import { Router } from 'express';
import axios from 'axios';
import { auditRecordService } from '../services/auditRecordService';

const router = Router();

router.get('/external-audit-list', async (_req, res) => {
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

router.post('/pinhaopin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const response = await axios.post(`https://admin.pinhaopin.com/gateway/session/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {}, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (response.data.code === 200 || response.data.code === 'OK' || response.data.success === true) {
            // Capture cookies
            const cookies = response.headers['set-cookie'];

            res.json({
                success: true,
                code: 200,
                data: {
                    // Return cookies to client so they can send them back in subsequent requests
                    cookies: cookies,
                    originalData: response.data.data
                }
            });
        } else {
            res.json(response.data);
        }
    } catch (error: any) {
        console.error('Proxy Login Error:', error.message);
        res.status(500).json({ error: 'Login failed', details: error.response?.data || error.message });
    }
});

// Approve Product
router.post('/pinhaopin/auditProduct', async (req, res) => {
    try {
        const { id, status } = req.body;
        const cookie = req.headers['x-pinhaopin-cookie'];

        if (!cookie) {
            res.status(401).json({ error: 'No external cookie provided' });
            return;
        }

        const response = await axios.post('https://admin.pinhaopin.com/gateway/mall/auditProduct', {
            id,
            status
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie as string,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Sync local status if external call succeeded
        if (response.data.code === 200 || response.data.code === 'OK' || response.data.success === true) {
            try {
                await auditRecordService.updateManualStatusByProductId(String(id), 'approved');
            } catch (syncError) {
                console.error('Failed to sync local status for product', id, syncError);
                // Don't fail the request if sync fails, but log it
            }
        }

        res.json(response.data);
    } catch (error: any) {
        console.error('Proxy Audit Error:', error.message);
        res.status(500).json({ error: 'Audit failed', details: error.response?.data || error.message });
    }
});

// Reject Product (Batch)
router.post('/pinhaopin/batchAuditProduct', async (req, res) => {
    try {
        const { productIds, status, auditReason } = req.body;
        const cookie = req.headers['x-pinhaopin-cookie'];

        if (!cookie) {
            res.status(401).json({ error: 'No external cookie provided' });
            return;
        }

        const response = await axios.post('https://admin.pinhaopin.com/gateway/mall/batchAuditProduct', {
            productIds,
            status,
            auditReason
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie as string,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Sync local status if external call succeeded
        if (response.data.code === 200 || response.data.code === 'OK' || response.data.success === true) {
            try {
                for (const pid of productIds) {
                    await auditRecordService.updateManualStatusByProductId(String(pid), 'rejected', auditReason);
                }
            } catch (syncError) {
                console.error('Failed to sync local status for products', productIds, syncError);
            }
        }

        res.json(response.data);
    } catch (error: any) {
        console.error('Proxy Batch Audit Error:', error.message);
        res.status(500).json({ error: 'Batch audit failed', details: error.response?.data || error.message });
    }
});

export default router;

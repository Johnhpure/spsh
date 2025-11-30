import { Router } from 'express';
import { manualAuditController } from '../controllers/manualAuditController';

const router = Router();

router.post('/add', manualAuditController.addProduct);
router.get('/list', manualAuditController.getList);
router.post('/audit', manualAuditController.audit);

export default router;

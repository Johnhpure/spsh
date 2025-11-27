import { Router } from 'express';
import { login, register } from '../controllers/authController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/login', login);
// Only admin can register new users via API, or use a setup script
router.post('/register', authenticateToken, requireAdmin, register);

// Initial setup route (disable in production or protect)
// For simplicity in this task, we allow creating the first admin if no users exist
import databaseManager from '../utils/database';
import { UserRow } from '../models/user';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

router.post('/setup-admin', async (req, res) => {
    try {
        const users = await databaseManager.query<UserRow[]>('SELECT count(*) as count FROM users');
        if ((users[0] as any).count > 0) {
            return res.status(403).json({ success: false, error: 'Admin already exists' });
        }

        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();

        await databaseManager.query(
            'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
            [id, username, hashedPassword, 'admin']
        );

        res.json({ success: true, message: 'Admin created' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Setup failed' });
    }
});

export default router;

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import databaseManager from '../utils/database';
import { UserRow } from '../models/user';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await databaseManager.query<UserRow[]>(
            'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { password, role } = req.body;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await databaseManager.query(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, id]
            );
        }

        if (role) {
            await databaseManager.query(
                'UPDATE users SET role = ? WHERE id = ?',
                [role, id]
            );
        }

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await databaseManager.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
};

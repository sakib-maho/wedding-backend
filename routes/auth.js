import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { verifyAdminToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * POST /api/session
 * Login endpoint
 */
router.post('/session', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: ['Email and password are required']
            });
        }

        const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
        
        if (!user) {
            return res.status(401).json({
                error: ['Invalid email or password']
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                error: ['Invalid email or password']
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            data: { token }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * GET /api/user
 * Get user details (admin only)
 */
router.get('/user', verifyAdminToken, async (req, res) => {
    try {
        const userId = req.userId;
        
        const user = await db.get(
            `SELECT id, email, access_key, can_reply, can_edit, can_delete, 
                    is_confetti_animation, tenor_key, created_at 
             FROM users WHERE id = $1`,
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                error: ['User not found']
            });
        }

        // Get user name from config or use email
        const name = user.email.split('@')[0];

        return res.status(200).json({
            data: {
                id: user.id,
                email: user.email,
                name: name,
                access_key: user.access_key,
                can_reply: Boolean(user.can_reply),
                can_edit: Boolean(user.can_edit),
                can_delete: Boolean(user.can_delete),
                is_confetti_animation: Boolean(user.is_confetti_animation),
                is_filter: false,
                tenor_key: user.tenor_key || null,
                tz: 'UTC',
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * PATCH /api/user
 * Update user settings (admin only)
 */
router.patch('/user', verifyAdminToken, async (req, res) => {
    try {
        const userId = req.userId;
        const updates = req.body;

        const allowedFields = [
            'name', 'can_reply', 'can_edit', 'can_delete', 
            'is_confetti_animation', 'tenor_key', 'tz',
            'old_password', 'new_password'
        ];

        // Handle password change
        if (updates.old_password && updates.new_password) {
            const user = await db.get('SELECT password_hash FROM users WHERE id = $1', [userId]);
            const isValidPassword = await bcrypt.compare(updates.old_password, user.password_hash);
            
            if (!isValidPassword) {
                return res.status(400).json({
                    error: ['Invalid old password']
                });
            }

            const hashedPassword = await bcrypt.hash(updates.new_password, 10);
            await db.run('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, userId]);
            
            return res.status(200).json({
                data: { status: true }
            });
        }

        // Handle other field updates
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key) && key !== 'old_password' && key !== 'new_password') {
                updateFields.push(`${key} = $${paramIndex}`);
                updateValues.push(value);
                paramIndex++;
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: ['No valid fields to update']
            });
        }

        updateValues.push(userId);
        await db.run(
            `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
            updateValues
        );

        return res.status(200).json({
            data: { status: true }
        });
    } catch (error) {
        console.error('Update user error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * PUT /api/key
 * Regenerate access key (admin only)
 */
router.put('/key', verifyAdminToken, async (req, res) => {
    try {
        const userId = req.userId;
        const newAccessKey = uuidv4().replace(/-/g, '');

        await db.run('UPDATE users SET access_key = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newAccessKey, userId]);

        return res.status(200).json({
            data: { status: true }
        });
    } catch (error) {
        console.error('Regenerate key error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

export default router;


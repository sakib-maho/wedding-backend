import express from 'express';
import { db } from '../db.js';
import { verifyAccessKey } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/v2/config
 * Get public configuration (requires access key)
 */
router.get('/v2/config', verifyAccessKey, async (req, res) => {
    try {
        const accessKey = req.accessKey;

        // Get config from config table
        const config = await db.get('SELECT * FROM config WHERE access_key = $1', [accessKey]);
        
        if (!config) {
            // Fallback to user config
            const user = await db.get('SELECT * FROM users WHERE access_key = $1', [accessKey]);
            if (!user) {
                return res.status(404).json({
                    error: ['Config not found']
                });
            }

            return res.status(200).json({
                data: {
                    can_reply: Boolean(user.can_reply),
                    can_edit: Boolean(user.can_edit),
                    can_delete: Boolean(user.can_delete),
                    is_confetti_animation: Boolean(user.is_confetti_animation),
                    tenor_key: user.tenor_key || null
                }
            });
        }

        return res.status(200).json({
            data: {
                can_reply: Boolean(config.can_reply),
                can_edit: Boolean(config.can_edit),
                can_delete: Boolean(config.can_delete),
                is_confetti_animation: Boolean(config.is_confetti_animation),
                tenor_key: config.tenor_key || null
            }
        });
    } catch (error) {
        console.error('Get config error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

export default router;


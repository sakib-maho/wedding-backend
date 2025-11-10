import express from 'express';
import { db } from '../db.js';
import { verifyAdminToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/stats
 * Get statistics (admin only)
 */
router.get('/stats', verifyAdminToken, async (req, res) => {
    try {
        // Get total comments (top-level only)
        const totalComments = await db.get(
            'SELECT COUNT(*) as count FROM comments WHERE parent_uuid IS NULL'
        );

        // Get present count
        const presentCount = await db.get(
            'SELECT COUNT(*) as count FROM comments WHERE parent_uuid IS NULL AND presence = true'
        );

        // Get absent count
        const absentCount = await db.get(
            'SELECT COUNT(*) as count FROM comments WHERE parent_uuid IS NULL AND presence = false'
        );

        // Get total likes
        const totalLikes = await db.get('SELECT COUNT(*) as count FROM likes');

        return res.status(200).json({
            data: {
                comments: parseInt(totalComments?.count || 0),
                present: parseInt(presentCount?.count || 0),
                absent: parseInt(absentCount?.count || 0),
                likes: parseInt(totalLikes?.count || 0)
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * GET /api/download
 * Download comments as CSV (admin only)
 */
router.get('/download', verifyAdminToken, async (req, res) => {
    try {
        const comments = await db.all(
            `SELECT name, presence, comment, created_at 
             FROM comments 
             WHERE parent_uuid IS NULL 
             ORDER BY created_at DESC`
        );

        // Generate CSV
        const csvHeader = 'Name,Presence,Comment,Created At\n';
        const csvRows = comments.map(c => {
            const name = `"${(c.name || '').replace(/"/g, '""')}"`;
            const presence = c.presence ? 'Yes' : 'No';
            const comment = `"${(c.comment || '').replace(/"/g, '""')}"`;
            const createdAt = c.created_at || '';
            return `${name},${presence},${comment},${createdAt}`;
        }).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="comments.csv"');
        return res.send(csv);
    } catch (error) {
        console.error('Download error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

export default router;


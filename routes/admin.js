import express from 'express';
import { db } from '../db.js';
import { verifyAdminToken } from '../middleware/auth.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * GET /admin
 * Serve admin dashboard HTML
 */
router.get('/admin', (req, res) => {
    const adminPath = join(__dirname, '../public/admin.html');
    console.log('Admin route hit, serving from:', adminPath);
    res.sendFile(adminPath, (err) => {
        if (err) {
            console.error('Error serving admin.html:', err);
            res.status(500).json({ error: ['Failed to load admin dashboard'] });
        }
    });
});

/**
 * GET /api/admin/comments
 * Get all comments with full details (admin only)
 */
router.get('/admin/comments', verifyAdminToken, async (req, res) => {
    try {
        const per = parseInt(req.query.per) || 100;
        const next = parseInt(req.query.next) || 0;

        // Get all comments (including replies)
        const allComments = await db.all(
            `SELECT uuid, own, name, presence, comment, gif_url, ip, user_agent, 
                    is_admin, created_at, updated_at, parent_uuid
             FROM comments 
             ORDER BY created_at DESC 
             LIMIT $1 OFFSET $2`,
            [per, next]
        );

        // Get like counts for all comments
        const commentsWithLikes = await Promise.all(
            allComments.map(async (comment) => {
                const likeCount = await db.get(
                    'SELECT COUNT(*) as count FROM likes WHERE comment_uuid = $1',
                    [comment.uuid]
                );

                return {
                    uuid: comment.uuid,
                    own: comment.own,
                    name: comment.name,
                    presence: Boolean(comment.presence),
                    comment: comment.comment,
                    gif_url: comment.gif_url,
                    ip: comment.ip,
                    user_agent: comment.user_agent,
                    is_admin: Boolean(comment.is_admin),
                    is_parent: comment.parent_uuid === null,
                    parent_uuid: comment.parent_uuid,
                    like_count: parseInt(likeCount?.count || 0),
                    created_at: comment.created_at,
                    updated_at: comment.updated_at
                };
            })
        );

        // Build nested structure
        const topLevel = commentsWithLikes.filter(c => c.is_parent);
        const replies = commentsWithLikes.filter(c => !c.is_parent);

        const nestedComments = topLevel.map(comment => {
            const commentReplies = replies.filter(r => r.parent_uuid === comment.uuid);
            return {
                ...comment,
                comments: commentReplies
            };
        });

        return res.status(200).json({
            data: {
                count: nestedComments.length,
                lists: nestedComments
            }
        });
    } catch (error) {
        console.error('Get admin comments error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get('/admin/users', verifyAdminToken, async (req, res) => {
    try {
        const users = await db.all(
            `SELECT id, email, access_key, can_reply, can_edit, can_delete, 
                    is_confetti_animation, created_at, updated_at
             FROM users 
             ORDER BY created_at DESC`
        );

        const usersData = users.map(user => ({
            id: user.id,
            email: user.email,
            access_key: user.access_key,
            can_reply: Boolean(user.can_reply),
            can_edit: Boolean(user.can_edit),
            can_delete: Boolean(user.can_delete),
            is_confetti_animation: Boolean(user.is_confetti_animation),
            created_at: user.created_at,
            updated_at: user.updated_at
        }));

        return res.status(200).json({
            data: usersData
        });
    } catch (error) {
        console.error('Get admin users error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * GET /api/admin/database-stats
 * Get detailed database statistics (admin only)
 */
router.get('/admin/database-stats', verifyAdminToken, async (req, res) => {
    try {
        // Total comments
        const totalComments = await db.get('SELECT COUNT(*) as count FROM comments');
        
        // Top-level comments
        const topLevelComments = await db.get('SELECT COUNT(*) as count FROM comments WHERE parent_uuid IS NULL');
        
        // Replies
        const replies = await db.get('SELECT COUNT(*) as count FROM comments WHERE parent_uuid IS NOT NULL');
        
        // Comments with presence
        const present = await db.get('SELECT COUNT(*) as count FROM comments WHERE presence = true AND parent_uuid IS NULL');
        const absent = await db.get('SELECT COUNT(*) as count FROM comments WHERE presence = false AND parent_uuid IS NULL');
        
        // Total likes
        const totalLikes = await db.get('SELECT COUNT(*) as count FROM likes');
        
        // Total users
        const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
        
        // Comments by date (last 7 days)
        const recentComments = await db.all(
            `SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM comments 
             WHERE created_at >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );

        return res.status(200).json({
            data: {
                total_comments: parseInt(totalComments?.count || 0),
                top_level_comments: parseInt(topLevelComments?.count || 0),
                replies: parseInt(replies?.count || 0),
                present: parseInt(present?.count || 0),
                absent: parseInt(absent?.count || 0),
                total_likes: parseInt(totalLikes?.count || 0),
                total_users: parseInt(totalUsers?.count || 0),
                recent_comments: recentComments.map(r => ({
                    date: r.date,
                    count: parseInt(r.count)
                }))
            }
        });
    } catch (error) {
        console.error('Get database stats error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

export default router;


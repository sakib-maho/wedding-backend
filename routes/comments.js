import express from 'express';
import { db } from '../db.js';
import { verifyAuth, verifyAdminToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/v2/comment
 * Get comments with pagination
 */
router.get('/v2/comment', verifyAuth, async (req, res) => {
    try {
        const per = parseInt(req.query.per) || 10;
        const next = parseInt(req.query.next) || 0;
        const lang = req.query.lang || 'en';

        // Get total count of top-level comments
        const totalCount = await db.get(
            'SELECT COUNT(*) as count FROM comments WHERE parent_uuid IS NULL'
        );

        // Get top-level comments with pagination
        const topLevelComments = await db.all(
            `SELECT uuid, own, name, presence, comment, gif_url, ip, user_agent, 
                    is_admin, created_at, updated_at, parent_uuid
             FROM comments 
             WHERE parent_uuid IS NULL 
             ORDER BY created_at DESC 
             LIMIT $1 OFFSET $2`,
            [per, next]
        );

        // Recursive function to get all replies (including nested replies)
        const getRepliesRecursive = async (parentUuid) => {
            const replies = await db.all(
                `SELECT uuid, own, name, presence, comment, gif_url, ip, user_agent, 
                        is_admin, created_at, updated_at, parent_uuid
                 FROM comments 
                 WHERE parent_uuid = $1 
                 ORDER BY created_at ASC`,
                [parentUuid]
            );

            // Get like count for each reply and recursively get nested replies
            const repliesWithNested = await Promise.all(
                replies.map(async (reply) => {
                    const likeCount = await db.get(
                        'SELECT COUNT(*) as count FROM likes WHERE comment_uuid = $1',
                        [reply.uuid]
                    );

                    // Recursively get nested replies
                    const nestedReplies = await getRepliesRecursive(reply.uuid);

                    return {
                        uuid: reply.uuid,
                        own: reply.own,
                        name: reply.name,
                        presence: Boolean(reply.presence),
                        comment: reply.comment,
                        gif_url: reply.gif_url,
                        ip: reply.ip,
                        user_agent: reply.user_agent,
                        is_admin: Boolean(reply.is_admin),
                        is_parent: false,
                        parent_uuid: reply.parent_uuid,
                        like_count: parseInt(likeCount?.count || 0),
                        created_at: reply.created_at,
                        updated_at: reply.updated_at,
                        comments: nestedReplies
                    };
                })
            );

            return repliesWithNested;
        };

        // Get replies for each comment
        const commentsWithReplies = await Promise.all(
            topLevelComments.map(async (comment) => {
                // Get like count for this comment
                const likeCount = await db.get(
                    'SELECT COUNT(*) as count FROM likes WHERE comment_uuid = $1',
                    [comment.uuid]
                );

                // Get all replies recursively
                const replies = await getRepliesRecursive(comment.uuid);

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
                    updated_at: comment.updated_at,
                    comments: replies
                };
            })
        );

        return res.status(200).json({
            data: {
                count: parseInt(totalCount?.count || 0),
                lists: commentsWithReplies
            }
        });
    } catch (error) {
        console.error('Get comments error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * POST /api/comment
 * Create a new comment
 */
router.post('/comment', verifyAuth, async (req, res) => {
    try {
        const { id, name, presence, comment, gif_id } = req.body;
        const accessKey = req.accessKey || req.headers['x-access-key'];
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';

        if (!name || presence === undefined) {
            return res.status(400).json({
                error: ['Name and presence are required']
            });
        }

        const uuid = uuidv4();
        const now = new Date().toISOString();

        // Check if this is a reply (if id is provided and exists)
        let parentUuid = null;
        if (id) {
            const parentComment = await db.get('SELECT uuid FROM comments WHERE uuid = $1', [id]);
            if (parentComment) {
                parentUuid = id;
            }
        }

        await db.run(
            `INSERT INTO comments (uuid, own, name, presence, comment, gif_url, ip, user_agent, is_admin, parent_uuid, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                uuid,
                accessKey || 'anonymous',
                name,
                presence ? true : false,
                comment || null,
                gif_id ? `https://media.tenor.com/${gif_id}` : null,
                ip,
                userAgent,
                false,
                parentUuid,
                now,
                now
            ]
        );

        // Fetch the created comment to return full object
        const createdComment = await db.get(
            `SELECT uuid, own, name, presence, comment, gif_url, ip, user_agent, 
                    is_admin, created_at, updated_at, parent_uuid
             FROM comments WHERE uuid = $1`,
            [uuid]
        );

        // Get like count
        const likeCount = await db.get(
            'SELECT COUNT(*) as count FROM likes WHERE comment_uuid = $1',
            [uuid]
        );

        return res.status(201).json({
            data: {
                uuid: createdComment.uuid,
                own: createdComment.own,
                name: createdComment.name,
                presence: Boolean(createdComment.presence),
                comment: createdComment.comment,
                gif_url: createdComment.gif_url,
                ip: createdComment.ip,
                user_agent: createdComment.user_agent,
                is_admin: Boolean(createdComment.is_admin),
                is_parent: createdComment.parent_uuid === null,
                parent_uuid: createdComment.parent_uuid,
                like_count: parseInt(likeCount?.count || 0),
                created_at: createdComment.created_at,
                updated_at: createdComment.updated_at,
                comments: []
            }
        });
    } catch (error) {
        console.error('Create comment error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * PUT /api/comment/:uuid
 * Update a comment
 */
router.put('/comment/:uuid', verifyAuth, async (req, res) => {
    try {
        const { uuid } = req.params;
        const { name, presence, comment } = req.body;
        const accessKey = req.accessKey || req.headers['x-access-key'];

        // Check if comment exists and user owns it
        const existingComment = await db.get(
            'SELECT own FROM comments WHERE uuid = $1',
            [uuid]
        );

        if (!existingComment) {
            return res.status(404).json({
                error: ['Comment not found']
            });
        }

        // Check ownership or admin
        const isAdmin = req.userId !== undefined;
        if (existingComment.own !== accessKey && !isAdmin) {
            return res.status(403).json({
                error: ['Forbidden: You do not have permission to edit this comment']
            });
        }

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex}`);
            values.push(name);
            paramIndex++;
        }
        if (presence !== undefined) {
            updates.push(`presence = $${paramIndex}`);
            values.push(presence ? true : false);
            paramIndex++;
        }
        if (comment !== undefined) {
            updates.push(`comment = $${paramIndex}`);
            values.push(comment);
            paramIndex++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: ['No fields to update']
            });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(uuid);

        await db.run(
            `UPDATE comments SET ${updates.join(', ')} WHERE uuid = $${paramIndex}`,
            values
        );

        return res.status(200).json({
            data: { uuid }
        });
    } catch (error) {
        console.error('Update comment error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * DELETE /api/comment/:uuid
 * Delete a comment
 */
router.delete('/comment/:uuid', verifyAuth, async (req, res) => {
    try {
        const { uuid } = req.params;
        const accessKey = req.accessKey || req.headers['x-access-key'];

        // Check if comment exists
        const existingComment = await db.get(
            'SELECT own FROM comments WHERE uuid = $1',
            [uuid]
        );

        if (!existingComment) {
            return res.status(404).json({
                error: ['Comment not found']
            });
        }

        // Check ownership or admin
        const isAdmin = req.userId !== undefined;
        if (existingComment.own !== accessKey && !isAdmin) {
            return res.status(403).json({
                error: ['Forbidden: You do not have permission to delete this comment']
            });
        }

        // Delete comment (cascade will delete replies and likes)
        await db.run('DELETE FROM comments WHERE uuid = $1', [uuid]);

        return res.status(200).json({
            data: { status: true }
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * POST /api/comment/:uuid
 * Like a comment
 */
router.post('/comment/:uuid', verifyAuth, async (req, res) => {
    try {
        const { uuid } = req.params;
        const accessKey = req.accessKey || req.headers['x-access-key'];
        const ip = req.ip || req.connection.remoteAddress;
        const userIdentifier = accessKey || ip;

        // Check if comment exists
        const comment = await db.get('SELECT uuid FROM comments WHERE uuid = $1', [uuid]);
        if (!comment) {
            return res.status(404).json({
                error: ['Comment not found']
            });
        }

        // Check if already liked
        const existingLike = await db.get(
            'SELECT id FROM likes WHERE comment_uuid = $1 AND own = $2',
            [uuid, userIdentifier]
        );

        if (existingLike) {
            return res.status(400).json({
                error: ['Comment already liked']
            });
        }

        // Add like
        await db.run(
            'INSERT INTO likes (comment_uuid, own, created_at) VALUES ($1, $2, $3)',
            [uuid, userIdentifier, new Date().toISOString()]
        );

        // Get updated like count
        const likeCount = await db.get(
            'SELECT COUNT(*) as count FROM likes WHERE comment_uuid = $1',
            [uuid]
        );

        return res.status(200).json({
            data: { 
                status: true,
                like_count: parseInt(likeCount?.count || 0)
            }
        });
    } catch (error) {
        console.error('Like comment error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * PATCH /api/comment/:uuid
 * Unlike a comment
 */
router.patch('/comment/:uuid', verifyAuth, async (req, res) => {
    try {
        const { uuid } = req.params;
        const accessKey = req.accessKey || req.headers['x-access-key'];
        const ip = req.ip || req.connection.remoteAddress;
        const userIdentifier = accessKey || ip;

        // Check if like exists
        const existingLike = await db.get(
            'SELECT id FROM likes WHERE comment_uuid = $1 AND own = $2',
            [uuid, userIdentifier]
        );

        if (!existingLike) {
            return res.status(404).json({
                error: ['Like not found']
            });
        }

        // Remove like
        await db.run(
            'DELETE FROM likes WHERE comment_uuid = $1 AND own = $2',
            [uuid, userIdentifier]
        );

        // Get updated like count
        const likeCount = await db.get(
            'SELECT COUNT(*) as count FROM likes WHERE comment_uuid = $1',
            [uuid]
        );

        return res.status(200).json({
            data: { 
                status: true,
                like_count: parseInt(likeCount?.count || 0)
            }
        });
    } catch (error) {
        console.error('Unlike comment error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

export default router;


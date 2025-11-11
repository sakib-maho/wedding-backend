import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from '../db.js';
import { verifyAdminToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * GET /invitation
 * Serve invitation landing page
 */
router.get("/invitation", (req, res) => {
    const invitationPath = join(__dirname, "../public/invitation.html");
    res.sendFile(invitationPath, (err) => {
        if (err) {
            console.error("Error serving invitation.html:", err);
            res.status(500).json({ error: ["Failed to load invitation page"] });
        }
    });
});

/**
 * Generate a unique token for invitation
 */
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * POST /api/invitations
 * Create a new invitation (admin only)
 */
router.post('/', verifyAdminToken, async (req, res) => {
    try {
        const { name, prefix, title } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                error: ['Name is required']
            });
        }

        const token = generateToken();
        const invitationPrefix = (prefix && prefix.trim()) || 'To';
        const invitationTitle = (title && title.trim()) || 'Mr./Mrs./Brother/Sister';

        // Use run for INSERT, then get the created record
        await db.run(
            `INSERT INTO invitations (token, name, prefix, title) 
             VALUES ($1, $2, $3, $4)`,
            [token, name.trim(), invitationPrefix, invitationTitle]
        );

        const result = await db.get(
            `SELECT id, token, name, prefix, title, is_used, created_at 
             FROM invitations 
             WHERE token = $1`,
            [token]
        );

        return res.status(201).json({
            data: result
        });
    } catch (error) {
        console.error('Create invitation error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * GET /api/invitations
 * Get all invitations (admin only)
 */
router.get('/', verifyAdminToken, async (req, res) => {
    try {
        const result = await db.all(
            `SELECT id, token, name, prefix, title, is_used, used_at, created_at 
             FROM invitations 
             ORDER BY created_at DESC`
        );

        return res.status(200).json({
            data: result
        });
    } catch (error) {
        console.error('Get invitations error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * GET /api/invitations/:token
 * Get invitation by token (public)
 */
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const result = await db.get(
            `SELECT id, token, name, title, is_used, used_at, created_at 
             FROM invitations 
             WHERE token = $1`,
            [token]
        );

        if (!result) {
            return res.status(404).json({
                error: ['Invitation not found']
            });
        }

        return res.status(200).json({
            data: result
        });
    } catch (error) {
        console.error('Get invitation error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * DELETE /api/invitations/:id
 * Delete an invitation (admin only)
 */
router.delete('/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if invitation exists first
        const existing = await db.get(
            `SELECT id FROM invitations WHERE id = $1`,
            [id]
        );

        if (!existing) {
            return res.status(404).json({
                error: ['Invitation not found']
            });
        }

        await db.run(
            `DELETE FROM invitations WHERE id = $1`,
            [id]
        );

        return res.status(200).json({
            data: { status: true }
        });
    } catch (error) {
        console.error('Delete invitation error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

/**
 * PATCH /api/invitations/:token/use
 * Mark invitation as used (public, when user clicks join)
 */
router.patch('/:token/use', async (req, res) => {
    try {
        const { token } = req.params;

        // Check if invitation exists and is not used
        const existing = await db.get(
            `SELECT id, token, name FROM invitations 
             WHERE token = $1 AND is_used = false`,
            [token]
        );

        if (!existing) {
            return res.status(404).json({
                error: ['Invitation not found or already used']
            });
        }

        // Update to mark as used
        await db.run(
            `UPDATE invitations 
             SET is_used = true, used_at = CURRENT_TIMESTAMP 
             WHERE token = $1 AND is_used = false`,
            [token]
        );

        return res.status(200).json({
            data: { status: true, invitation: existing }
        });
    } catch (error) {
        console.error('Use invitation error:', error);
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
});

export default router;

import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Middleware to verify JWT token (admin authentication)
 */
export const verifyAdminToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: ['Unauthorized: Invalid token format']
            });
        }

        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await db.get('SELECT id, email FROM users WHERE id = $1', [decoded.userId]);
            
            if (!user) {
                return res.status(401).json({
                    error: ['Unauthorized: User not found']
                });
            }

            req.user = user;
            req.userId = decoded.userId;
            next();
        } catch (err) {
            return res.status(401).json({
                error: ['Unauthorized: Invalid or expired token']
            });
        }
    } catch (error) {
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
};

/**
 * Middleware to verify access key (guest authentication)
 */
export const verifyAccessKey = async (req, res, next) => {
    try {
        const accessKey = req.headers['x-access-key'] || req.query.key;
        
        if (!accessKey) {
            return res.status(401).json({
                error: ['Unauthorized: Access key required']
            });
        }

        // Check if access key exists in config or users table
        const config = await db.get('SELECT * FROM config WHERE access_key = $1', [accessKey]);
        const user = await db.get('SELECT id, email, access_key FROM users WHERE access_key = $1', [accessKey]);
        
        if (!config && !user) {
            return res.status(401).json({
                error: ['Unauthorized: Invalid access key']
            });
        }

        req.accessKey = accessKey;
        next();
    } catch (error) {
        return res.status(500).json({
            error: ['Internal server error']
        });
    }
};

/**
 * Optional middleware - verify either admin token or access key
 */
export const verifyAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const accessKey = req.headers['x-access-key'] || req.query.key;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        return verifyAdminToken(req, res, next);
    } else if (accessKey) {
        return verifyAccessKey(req, res, next);
    } else {
        return res.status(401).json({
            error: ['Unauthorized: Token or access key required']
        });
    }
};


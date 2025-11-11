import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';
import authRoutes from './routes/auth.js';
import configRoutes from './routes/config.js';
import commentRoutes from './routes/comments.js';
import statsRoutes from './routes/stats.js';
import adminRoutes from './routes/admin.js';
import invitationRoutes from './routes/invitations.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration - DO NOT MODIFY without testing
// This configuration ensures all frontend requests work correctly
// If you need to restrict origins, update the 'origin' field
app.use(cors({
    origin: '*',  // Allow all origins (change to specific domains for production)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-key'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,  // Let CORS middleware handle preflight
    optionsSuccessStatus: 204  // Return 204 for OPTIONS requests
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CORS test endpoint - helps verify CORS is working correctly
app.get('/api/cors-test', (req, res) => {
    res.json({
        cors: 'configured',
        origin: req.headers.origin || 'none',
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Invitation page route (before static files)
app.get('/invitation', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'invitation.html'));
});

// Admin dashboard route (before static files)
app.use('/', adminRoutes);

// Serve static files (admin dashboard)
app.use(express.static('public'));

// API Routes
app.use('/api', authRoutes);
app.use('/api', configRoutes);
app.use('/api', commentRoutes);
app.use('/api', statsRoutes);
app.use('/api', adminRoutes);
app.use('/api/invitations', invitationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: ['Not found']
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: ['Internal server error']
    });
});

// Initialize database and start server
async function startServer() {
    try {
        await db.init();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`👨‍💼 Admin Dashboard: http://localhost:${PORT}/admin`);
            console.log(`\n📝 Default admin credentials:`);
            console.log(`   Email: ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'}`);
            console.log(`   Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'}`);
            console.log(`\n⚠️  Remember to change the default credentials after first login!`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await db.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    await db.close();
    process.exit(0);
});

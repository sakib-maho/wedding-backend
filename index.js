import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';
import authRoutes from './routes/auth.js';
import configRoutes from './routes/config.js';
import commentRoutes from './routes/comments.js';
import statsRoutes from './routes/stats.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', authRoutes);
app.use('/api', configRoutes);
app.use('/api', commentRoutes);
app.use('/api', statsRoutes);

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


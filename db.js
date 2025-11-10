import pg from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Database {
    constructor() {
        this.pool = null;
    }

    async init() {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'wedding_db',
            user: process.env.DB_USER || 'wedding_user',
            password: process.env.DB_PASSWORD || 'password',
        };

        this.pool = new Pool(dbConfig);

        // Test connection
        try {
            await this.pool.query('SELECT NOW()');
            console.log('✅ Connected to PostgreSQL database');
        } catch (err) {
            console.error('❌ Database connection error:', err);
            throw err;
        }

        // Setup tables
        await this.setupTables();

        // Check if admin user exists, if not create default admin
        const adminExists = await this.get('SELECT id FROM users WHERE email = $1', [
            process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'
        ]);
        if (!adminExists) {
            await this.createDefaultAdmin();
        }

        // Check if config exists, if not create default config
        const configExists = await this.get('SELECT id FROM config LIMIT 1');
        if (!configExists) {
            await this.createDefaultConfig();
        }

        console.log('✅ Database tables initialized');
    }

    async setupTables() {
        const schemaPath = join(__dirname, 'database/schema.sql');
        const schema = readFileSync(schemaPath, 'utf8');
        
        // Execute schema (PostgreSQL handles IF NOT EXISTS)
        await this.pool.query(schema);
    }

    async createDefaultAdmin() {
        const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
        const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const accessKey = uuidv4().replace(/-/g, '');

        await this.run(
            `INSERT INTO users (email, password_hash, access_key, can_reply, can_edit, can_delete, is_confetti_animation) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [email, hashedPassword, accessKey, true, true, true, true]
        );

        console.log(`✅ Default admin created: ${email} / ${password}`);
        console.log(`✅ Access key: ${accessKey}`);
    }

    async createDefaultConfig() {
        const accessKey = uuidv4().replace(/-/g, '');
        await this.run(
            `INSERT INTO config (access_key, can_reply, can_edit, can_delete, is_confetti_animation) 
             VALUES ($1, $2, $3, $4, $5)`,
            [accessKey, true, true, true, true]
        );
        console.log(`✅ Default config created with access key: ${accessKey}`);
    }

    async run(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return { 
            lastID: result.rows[0]?.id || null, 
            changes: result.rowCount || 0 
        };
    }

    async get(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return result.rows[0] || null;
    }

    async all(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return result.rows;
    }

    async close() {
        await this.pool.end();
        console.log('Database connection closed');
    }
}

export const db = new Database();


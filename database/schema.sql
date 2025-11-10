-- PostgreSQL Schema for Wedding Invitation Website
-- Based on the frontend DTO structures

-- Users table for admin authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tenor_key VARCHAR(255),
    can_reply BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT true,
    can_delete BOOLEAN DEFAULT true,
    is_confetti_animation BOOLEAN DEFAULT true,
    access_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table (self-referencing for replies)
CREATE TABLE IF NOT EXISTS comments (
    uuid VARCHAR(255) PRIMARY KEY,
    own VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    presence BOOLEAN DEFAULT false,
    comment TEXT,
    parent_uuid VARCHAR(255),
    gif_url TEXT,
    ip VARCHAR(45),
    user_agent TEXT,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_uuid) REFERENCES comments(uuid) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_parent_uuid ON comments(parent_uuid);
CREATE INDEX IF NOT EXISTS idx_comments_own ON comments(own);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    comment_uuid VARCHAR(255) NOT NULL,
    own VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_uuid, own),
    FOREIGN KEY (comment_uuid) REFERENCES comments(uuid) ON DELETE CASCADE
);

-- Indexes for likes
CREATE INDEX IF NOT EXISTS idx_likes_comment_uuid ON likes(comment_uuid);
CREATE INDEX IF NOT EXISTS idx_likes_own ON likes(own);

-- Config table
CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    access_key VARCHAR(255) UNIQUE NOT NULL,
    tenor_key VARCHAR(255),
    can_reply BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT true,
    can_delete BOOLEAN DEFAULT true,
    is_confetti_animation BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table for admin authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tenor_key VARCHAR(255),
    can_reply BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT true,
    can_delete BOOLEAN DEFAULT true,
    is_confetti_animation BOOLEAN DEFAULT true,
    access_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table (self-referencing for replies)
CREATE TABLE IF NOT EXISTS comments (
    uuid VARCHAR(255) PRIMARY KEY,
    own VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    presence BOOLEAN DEFAULT false,
    comment TEXT,
    parent_uuid VARCHAR(255),
    gif_url TEXT,
    ip VARCHAR(45),
    user_agent TEXT,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_uuid) REFERENCES comments(uuid) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_parent_uuid ON comments(parent_uuid);
CREATE INDEX IF NOT EXISTS idx_comments_own ON comments(own);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    comment_uuid VARCHAR(255) NOT NULL,
    own VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_uuid, own),
    FOREIGN KEY (comment_uuid) REFERENCES comments(uuid) ON DELETE CASCADE
);

-- Indexes for likes
CREATE INDEX IF NOT EXISTS idx_likes_comment_uuid ON likes(comment_uuid);
CREATE INDEX IF NOT EXISTS idx_likes_own ON likes(own);

-- Config table
CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    access_key VARCHAR(255) UNIQUE NOT NULL,
    tenor_key VARCHAR(255),
    can_reply BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT true,
    can_delete BOOLEAN DEFAULT true,
    is_confetti_animation BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


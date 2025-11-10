# Wedding Invitation Backend API

Backend API server for wedding invitation website using Node.js, Express, and PostgreSQL.

## 🚀 Features

- RESTful API for comments and replies
- JWT authentication for admin
- Access key authentication for guests
- PostgreSQL database
- Docker support for easy deployment
- AWS EC2 deployment ready

## 📁 Project Structure

```
wedding-backend/
├── index.js              # Main server file
├── db.js                 # PostgreSQL database connection
├── package.json          # Dependencies
├── Dockerfile            # Docker container definition
├── docker-compose.yml    # Docker Compose configuration
├── middleware/
│   └── auth.js          # Authentication middleware
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── config.js        # Config routes
│   ├── comments.js      # Comment routes
│   └── stats.js         # Statistics routes
└── database/
    └── schema.sql       # PostgreSQL schema
```

## 🛠️ Setup

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your settings
   ```

3. **Start PostgreSQL (using Docker):**
   ```bash
   docker-compose up -d postgres
   ```

4. **Start backend:**
   ```bash
   npm start
   ```

### Docker Deployment

1. **Configure environment:**
   ```bash
   cp env.example .env
   nano .env  # Update passwords and secrets
   ```

2. **Start services:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/session` - Login (returns JWT token)
- `GET /api/user` - Get user details (requires admin token)
- `PATCH /api/user` - Update user settings (requires admin token)
- `PUT /api/key` - Regenerate access key (requires admin token)

### Public (requires access key)
- `GET /api/v2/config` - Get public configuration
- `GET /api/v2/comment` - List comments with pagination
- `POST /api/comment` - Create comment
- `PUT /api/comment/:uuid` - Update comment
- `DELETE /api/comment/:uuid` - Delete comment
- `POST /api/comment/:uuid` - Like comment
- `PATCH /api/comment/:uuid` - Unlike comment

### Admin Only
- `GET /api/stats` - Get statistics
- `GET /api/download` - Download comments as CSV

## 🔐 Default Credentials

After first run:
- **Email:** `admin@example.com` (or as set in `.env`)
- **Password:** `admin123` (or as set in `.env`)

⚠️ **Important:** Change these credentials immediately after first login!

## 🌐 Frontend Integration

The frontend connects to this backend via the `data-url` attribute:

```html
<body data-key="YOUR_ACCESS_KEY" data-url="http://your-backend-url:3001/" ...>
```

## 📦 Deployment

See `DEPLOY.md` for AWS EC2 deployment instructions.

## 📄 License

MIT


# Deployment Guide for AWS EC2 with Docker

## Prerequisites

1. AWS EC2 instance running Ubuntu
2. SSH access configured (using your `education.pem` key)
3. Docker and Docker Compose installed on EC2

## Step 1: Install Docker on EC2

SSH into your EC2 instance:
```bash
ssh -i ~/.ssh/education.pem ubuntu@ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com
```

Install Docker:
```bash
# Update system
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes to take effect
exit
```

## Step 2: Upload Files to EC2

From your local machine, upload the backend directory:
```bash
cd /Users/sakib/Weeding
scp -i ~/.ssh/education.pem -r wedding-backend ubuntu@ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com:~/
```

## Step 3: Configure Environment

SSH back into EC2:
```bash
ssh -i ~/.ssh/education.pem ubuntu@ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com
cd ~/wedding-backend
```

Create `.env` file:
```bash
cp env.example .env
nano .env
```

Update these values:
- `DB_PASSWORD`: Strong password for database (use: `openssl rand -base64 32`)
- `JWT_SECRET`: Strong random string (use: `openssl rand -base64 32`)
- `ADMIN_EMAIL`: Your admin email
- `ADMIN_PASSWORD`: Strong admin password

## Step 4: Start Services

```bash
cd ~/wedding-backend
docker-compose up -d
```

Check logs:
```bash
docker-compose logs -f
```

## Step 5: Get Access Key

```bash
docker-compose exec postgres psql -U wedding_user -d wedding_db -c "SELECT access_key FROM users LIMIT 1;"
```

## Step 6: Configure Security Group

In AWS Console:
1. Go to EC2 → Security Groups
2. Edit inbound rules for your instance
3. Add rule:
   - Type: Custom TCP
   - Port: 3001
   - Source: 0.0.0.0/0 (or your IP for security)

## Step 7: Update Frontend

Update `undangan/index.html` and `undangan/dashboard.html`:
```html
<body data-key="YOUR_ACCESS_KEY" data-url="http://ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com:3001/" ...>
```

## Useful Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Stop services
docker-compose down

# Start services
docker-compose up -d

# Restart services
docker-compose restart

# View running containers
docker-compose ps

# Access database
docker-compose exec postgres psql -U wedding_user -d wedding_db

# Backup database
docker-compose exec postgres pg_dump -U wedding_user wedding_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U wedding_user wedding_db < backup.sql
```

## GitHub Repository Setup

To create a separate GitHub repository for the backend:

```bash
cd /Users/sakib/Weeding/wedding-backend
git init
git add .
git commit -m "Initial commit: Wedding invitation backend API"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/wedding-backend.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.


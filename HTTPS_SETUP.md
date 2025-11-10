# HTTPS Setup Guide for EC2 Backend

## Problem
GitHub Pages serves content over HTTPS, but the EC2 backend is HTTP. Browsers block HTTP requests from HTTPS pages (Mixed Content Policy), causing "Network error" messages.

## Solution: Nginx Reverse Proxy with Let's Encrypt SSL

### Option 1: Using a Domain Name (Recommended)

#### Prerequisites
- Domain name pointing to your EC2 instance (e.g., `api.yourdomain.com`)
- EC2 instance with public IP

#### Step 1: Install Nginx on EC2

```bash
ssh -i ~/.ssh/education.pem ubuntu@ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com

# Update system
sudo apt update
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Step 2: Install Certbot (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### Step 3: Configure Nginx

Create Nginx config file:
```bash
sudo nano /etc/nginx/sites-available/wedding-backend
```

Add this configuration (replace `api.yourdomain.com` with your domain):
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/wedding-backend /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

#### Step 4: Get SSL Certificate

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Follow the prompts. Certbot will automatically configure HTTPS.

#### Step 5: Update Frontend

Update `undangan/index.html`:
```html
<body data-url="https://api.yourdomain.com/" ...>
```

### Option 2: Cloudflare Tunnel (No Domain Needed - Free)

If you don't have a domain, use Cloudflare Tunnel:

#### Step 1: Install Cloudflared

```bash
ssh -i ~/.ssh/education.pem ubuntu@ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com

# Download Cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

#### Step 2: Authenticate

```bash
cloudflared tunnel login
```

#### Step 3: Create Tunnel

```bash
cloudflared tunnel create wedding-backend
```

#### Step 4: Configure Tunnel

Create config file:
```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add:
```yaml
tunnel: <tunnel-id-from-step-3>
credentials-file: /home/ubuntu/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: wedding-backend-<random>.trycloudflare.com
    service: http://localhost:3001
  - service: http_status:404
```

#### Step 5: Run Tunnel

```bash
cloudflared tunnel run wedding-backend
```

You'll get a URL like: `https://wedding-backend-xxxxx.trycloudflare.com`

#### Step 6: Update Frontend

Update `undangan/index.html`:
```html
<body data-url="https://wedding-backend-xxxxx.trycloudflare.com/" ...>
```

### Option 3: Quick Fix (Temporary - Not Recommended)

If you need a quick temporary fix, you can modify the frontend to handle mixed content, but this is NOT recommended for production:

Update `undangan/index.html` to add a meta tag (this may not work in all browsers):
```html
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```

## Recommended: Use Option 1 (Domain + Nginx + Let's Encrypt)

This is the most professional and secure solution. You can get a free domain from:
- Freenom (free domains)
- Namecheap (cheap domains ~$1/year)
- Or use a subdomain of an existing domain

## After Setup

1. Update frontend `data-url` to use HTTPS
2. Push changes to GitHub
3. Test the site - network errors should be gone!


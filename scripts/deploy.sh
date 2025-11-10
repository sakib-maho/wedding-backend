#!/bin/bash

# Deployment script for wedding-backend
# Ensures CORS is configured correctly and backend is running

set -e

EC2_HOST="${EC2_HOST:-ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com}"
SSH_KEY="${SSH_KEY:-~/.ssh/education.pem}"

echo "🚀 Deploying wedding-backend to EC2..."
echo ""

# Step 1: Copy updated files
echo "📦 Copying files to EC2..."
scp -i "$SSH_KEY" index.js ubuntu@"$EC2_HOST":~/wedding-backend/ 2>&1 | grep -v "Warning: Permanently added" || true

# Step 2: Restart backend
echo "🔄 Restarting backend service..."
ssh -i "$SSH_KEY" ubuntu@"$EC2_HOST" "cd ~/wedding-backend && sudo docker compose restart backend" 2>&1 | grep -v "Warning: Permanently added" || true

# Step 3: Wait for service to be ready
echo "⏳ Waiting for backend to start..."
sleep 5

# Step 4: Check health
echo "🏥 Checking backend health..."
HEALTH=$(ssh -i "$SSH_KEY" ubuntu@"$EC2_HOST" "curl -s http://localhost:3001/health" 2>&1 | grep -v "Warning: Permanently added" || echo "")
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed. Check logs:"
    echo "   ssh -i $SSH_KEY ubuntu@$EC2_HOST 'cd ~/wedding-backend && sudo docker compose logs backend --tail 20'"
    exit 1
fi

# Step 5: Get tunnel URL
echo ""
echo "🔗 Getting Cloudflare tunnel URL..."
TUNNEL_URL=$(ssh -i "$SSH_KEY" ubuntu@"$EC2_HOST" \
    "sudo journalctl -u cloudflared-tunnel.service -n 50 --no-pager 2>/dev/null | \
    grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1" 2>&1 | grep -v "Warning: Permanently added" || echo "")

if [ -z "$TUNNEL_URL" ]; then
    echo "⚠️  Could not determine tunnel URL. Check tunnel status:"
    echo "   ssh -i $SSH_KEY ubuntu@$EC2_HOST 'sudo systemctl status cloudflared-tunnel.service'"
else
    echo "✅ Tunnel URL: $TUNNEL_URL"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Update frontend URLs:"
    echo "      cd ../undangan"
    echo "      ./scripts/update-tunnel-url.sh"
    echo "   2. Or manually update index.html and dashboard.html with:"
    echo "      data-url=\"$TUNNEL_URL/\""
fi

echo ""
echo "✅ Deployment complete!"


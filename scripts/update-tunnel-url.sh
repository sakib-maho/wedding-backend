#!/bin/bash

# Script to automatically update the frontend with the current Cloudflare tunnel URL
# This should be run after EC2 restart or when tunnel URL changes

set -e

FRONTEND_REPO_PATH="${FRONTEND_REPO_PATH:-/Users/sakib/Weeding/undangan}"
EC2_HOST="${EC2_HOST:-ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com}"
SSH_KEY="${SSH_KEY:-~/.ssh/education.pem}"

echo "🔍 Fetching current Cloudflare tunnel URL from EC2..."

# Get the tunnel URL from EC2 logs
TUNNEL_URL=$(ssh -i "$SSH_KEY" ubuntu@"$EC2_HOST" \
    "sudo journalctl -u cloudflared-tunnel.service -n 50 --no-pager 2>/dev/null | \
    grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1" || echo "")

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Could not find tunnel URL. Trying alternative method..."
    # Alternative: check if tunnel is running and get URL from process
    TUNNEL_URL=$(ssh -i "$SSH_KEY" ubuntu@"$EC2_HOST" \
        "ps aux | grep cloudflared | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | head -1" || echo "")
fi

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Error: Could not determine tunnel URL"
    echo "Please check Cloudflare tunnel status manually:"
    echo "  ssh -i $SSH_KEY ubuntu@$EC2_HOST 'sudo systemctl status cloudflared-tunnel.service'"
    exit 1
fi

# Ensure URL ends with /
if [[ ! "$TUNNEL_URL" =~ /$ ]]; then
    TUNNEL_URL="${TUNNEL_URL}/"
fi

echo "✅ Found tunnel URL: $TUNNEL_URL"
echo "📝 Updating frontend files..."

# Update index.html
if [ -f "$FRONTEND_REPO_PATH/index.html" ]; then
    # Use sed to update the data-url attribute
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|data-url=\"https://[a-z0-9-]*\.trycloudflare\.com/\"|data-url=\"$TUNNEL_URL\"|g" \
            "$FRONTEND_REPO_PATH/index.html"
    else
        # Linux
        sed -i "s|data-url=\"https://[a-z0-9-]*\.trycloudflare\.com/\"|data-url=\"$TUNNEL_URL\"|g" \
            "$FRONTEND_REPO_PATH/index.html"
    fi
    echo "✅ Updated index.html"
else
    echo "⚠️  index.html not found at $FRONTEND_REPO_PATH/index.html"
fi

# Update dashboard.html
if [ -f "$FRONTEND_REPO_PATH/dashboard.html" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|data-url=\"https://[a-z0-9-]*\.trycloudflare\.com/\"|data-url=\"$TUNNEL_URL\"|g" \
            "$FRONTEND_REPO_PATH/dashboard.html"
    else
        sed -i "s|data-url=\"https://[a-z0-9-]*\.trycloudflare\.com/\"|data-url=\"$TUNNEL_URL\"|g" \
            "$FRONTEND_REPO_PATH/dashboard.html"
    fi
    echo "✅ Updated dashboard.html"
else
    echo "⚠️  dashboard.html not found at $FRONTEND_REPO_PATH/dashboard.html"
fi

echo ""
echo "✅ Tunnel URL update complete!"
echo "📋 Next steps:"
echo "   1. Review the changes: git diff $FRONTEND_REPO_PATH/index.html $FRONTEND_REPO_PATH/dashboard.html"
echo "   2. Commit and push if needed"
echo "   3. Rebuild frontend: cd $FRONTEND_REPO_PATH && npm run build"


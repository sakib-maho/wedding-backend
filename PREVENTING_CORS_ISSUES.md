# Wedding Backend - Preventing CORS Issues

## ✅ What's Been Done

1. **CORS Configuration Hardcoded**: The CORS middleware is now properly configured in `index.js` with all necessary settings
2. **Automatic Update Script**: Created `scripts/update-tunnel-url.sh` to automatically update frontend URLs when tunnel changes
3. **Deployment Script**: Created `scripts/deploy.sh` to ensure CORS is correct after deployment
4. **CORS Test Endpoint**: Added `/api/cors-test` endpoint to verify CORS is working
5. **Documentation**: Created `CORS_GUIDE.md` with troubleshooting steps

## 🔒 CORS Configuration

The backend now has a robust CORS configuration that:
- ✅ Allows all necessary HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)
- ✅ Includes all required headers (Content-Type, Authorization, x-access-key)
- ✅ Properly handles preflight requests (OPTIONS)
- ✅ Supports credentials
- ✅ Returns correct status codes (204 for OPTIONS)

**Location**: `wedding-backend/index.js` lines 17-25

## 🚨 Preventing Future Issues

### 1. After EC2 Restart (Tunnel URL Changes)

Run the update script:
```bash
cd wedding-backend
./scripts/update-tunnel-url.sh
```

This will:
- Fetch the new Cloudflare tunnel URL from EC2
- Update `index.html` and `dashboard.html` automatically
- Show you what changed

### 2. After Backend Code Changes

Use the deployment script:
```bash
cd wedding-backend
./scripts/deploy.sh
```

This will:
- Copy updated files to EC2
- Restart the backend service
- Verify backend health
- Show you the current tunnel URL

### 3. Testing CORS

After any changes, test CORS:
```bash
# Get your tunnel URL first
TUNNEL_URL=$(ssh -i ~/.ssh/education.pem ubuntu@ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com \
    "sudo journalctl -u cloudflared-tunnel.service -n 50 --no-pager | \
    grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1")

# Test CORS
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v "$TUNNEL_URL/api/v2/comment" 2>&1 | grep -i "access-control"
```

Should see:
```
< access-control-allow-origin: *
< access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE
< access-control-allow-headers: Content-Type
```

### 4. Monitoring

Check backend logs for CORS issues:
```bash
ssh -i ~/.ssh/education.pem ubuntu@ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com
cd ~/wedding-backend
sudo docker compose logs backend --tail 50 | grep -i -E "(cors|error|failed)"
```

## 📋 Checklist Before Deployment

- [ ] CORS configuration in `index.js` is correct (lines 17-25)
- [ ] All routes are registered AFTER CORS middleware
- [ ] Backend health endpoint works: `/health`
- [ ] CORS test endpoint works: `/api/cors-test`
- [ ] Cloudflare tunnel is running
- [ ] Frontend URLs are updated if tunnel changed

## 🔧 Troubleshooting

### Issue: CORS error in browser console

1. **Check backend is running:**
   ```bash
   curl https://your-tunnel-url.trycloudflare.com/health
   ```

2. **Verify CORS configuration:**
   ```bash
   curl -X OPTIONS -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -v https://your-tunnel-url.trycloudflare.com/api/cors-test
   ```

3. **Check backend logs:**
   ```bash
   ssh -i ~/.ssh/education.pem ubuntu@ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com
   cd ~/wedding-backend
   sudo docker compose logs backend --tail 50
   ```

### Issue: Tunnel URL changed

Run the update script:
```bash
cd wedding-backend
./scripts/update-tunnel-url.sh
```

### Issue: Backend not responding

1. Check Docker containers:
   ```bash
   ssh -i ~/.ssh/education.pem ubuntu@ec2-35-72-159-128.ap-northeast-1.compute.amazonaws.com
   cd ~/wedding-backend
   sudo docker compose ps
   ```

2. Restart backend:
   ```bash
   sudo docker compose restart backend
   ```

3. Check logs:
   ```bash
   sudo docker compose logs backend --tail 50
   ```

## 📚 Additional Resources

- See `CORS_GUIDE.md` for detailed CORS documentation
- See `DEPLOY.md` for deployment instructions
- See `HTTPS_SETUP.md` for setting up a persistent domain

## ⚠️ Important Notes

1. **CORS configuration is persistent**: Once deployed, it won't change unless you modify `index.js`
2. **Tunnel URL changes**: After EC2 restart, run `update-tunnel-url.sh` to update frontend
3. **Test after changes**: Always test CORS after any backend modifications
4. **Production**: Consider restricting `origin` to specific domains instead of `*`


# CORS Configuration Guide

## Current CORS Setup

The backend is configured with comprehensive CORS settings in `index.js`:

```javascript
app.use(cors({
    origin: '*',  // Allows all origins (can be restricted to specific domains)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-key'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
```

## Preventing CORS Issues

### 1. CORS Configuration is Persistent

The CORS configuration is now hardcoded in `index.js` and will persist across deployments. The settings include:
- ✅ All HTTP methods needed by the frontend
- ✅ All required headers
- ✅ Proper preflight handling
- ✅ Credentials support

### 2. Automatic Tunnel URL Update

When EC2 restarts, the Cloudflare tunnel URL changes. Use the provided script to automatically update:

```bash
cd wedding-backend
./scripts/update-tunnel-url.sh
```

Or manually:
```bash
# Get new tunnel URL
ssh -i ~/.ssh/education.pem ubuntu@ec2-35-77-63-110.ap-northeast-1.compute.amazonaws.com \
    "sudo journalctl -u cloudflared-tunnel.service -n 50 --no-pager | \
    grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1"

# Update index.html and dashboard.html with the new URL
```

### 3. Testing CORS Configuration

Test CORS after any changes:

```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v https://your-tunnel-url.trycloudflare.com/api/v2/comment

# Should return:
# < access-control-allow-origin: *
# < access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE
# < access-control-allow-headers: Content-Type
```

### 4. Common CORS Issues and Solutions

#### Issue: "No 'Access-Control-Allow-Origin' header"
**Solution**: CORS middleware is already configured. If this happens:
1. Check that `cors` middleware is before routes in `index.js`
2. Verify backend is running: `curl https://your-tunnel-url/health`
3. Check Cloudflare tunnel is active: `sudo systemctl status cloudflared-tunnel.service`

#### Issue: "Preflight request failed"
**Solution**: The `optionsSuccessStatus: 204` handles this. Verify:
1. OPTIONS requests return 204 status
2. All required headers are in `allowedHeaders`

#### Issue: Tunnel URL changed after restart
**Solution**: Use the update script or manually update `index.html` and `dashboard.html`

### 5. Deployment Checklist

Before deploying backend changes:
- [ ] CORS configuration is correct in `index.js`
- [ ] All routes are registered after CORS middleware
- [ ] Health endpoint works: `/health`
- [ ] Cloudflare tunnel is running
- [ ] Frontend URLs are updated if tunnel changed

### 6. Monitoring

Check backend logs for CORS-related errors:
```bash
ssh -i ~/.ssh/education.pem ubuntu@ec2-35-77-63-110.ap-northeast-1.compute.amazonaws.com
cd ~/wedding-backend
sudo docker compose logs backend | grep -i cors
```

### 7. Future Improvements

For production, consider:
1. **Restrict origin** to specific domains instead of `*`:
   ```javascript
   origin: ['https://yourdomain.com', 'https://www.yourdomain.com']
   ```

2. **Use persistent Cloudflare tunnel** with custom domain (see `HTTPS_SETUP.md`)

3. **Add CORS validation endpoint**:
   ```javascript
   app.get('/api/cors-test', (req, res) => {
       res.json({ 
           cors: 'configured', 
           origin: req.headers.origin,
           timestamp: new Date().toISOString()
       });
   });
   ```

## Quick Reference

**Update tunnel URL after EC2 restart:**
```bash
cd wedding-backend
./scripts/update-tunnel-url.sh
```

**Test CORS:**
```bash
curl -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v https://your-tunnel-url.trycloudflare.com/api/v2/comment
```

**Check backend health:**
```bash
curl https://your-tunnel-url.trycloudflare.com/health
```


# Production Image Upload Fix - Native Installation

## Issue
Images upload locally but not in production at tkgerp.com (native Node.js installation, not Docker).

## Root Causes
1. Upload directories don't exist on production server
2. Node.js process lacks write permissions
3. Nginx not configured to serve `/images/` path

## Solution Steps

### 1. SSH to Production Server
```bash
ssh user@tkgerp.com
```

### 2. Create Upload Directories
```bash
cd /path/to/your/backend  # Navigate to backend root
mkdir -p public/images/categories
mkdir -p public/uploads
```

### 3. Set Proper Permissions
```bash
# Option A: If running as specific user (e.g., 'nodejs' or 'www-data')
sudo chown -R nodejs:nodejs public/images
sudo chown -R nodejs:nodejs public/uploads
sudo chmod -R 755 public/images
sudo chmod -R 755 public/uploads

# Option B: If you know the exact user running Node.js
# Check which user runs node: ps aux | grep node
sudo chown -R $(whoami):$(whoami) public/images public/uploads
sudo chmod -R 755 public/images public/uploads
```

### 4. Update Nginx Configuration
The nginx-tkgerp.conf already has the `/images/` location block. Verify it's loaded:

```bash
# Test nginx config
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
# or
sudo service nginx reload
```

### 5. Verify Backend Static File Serving
Check that backend/server.js has these lines (should already exist):
```javascript
app.use("/images", express.static(imagesDir));
app.use("/uploads", express.static(uploadsDir));
```

### 6. Restart Backend Service
```bash
# If using PM2
pm2 restart backend

# If using systemd
sudo systemctl restart your-backend-service

# If running manually
# Stop existing node process and restart
```

### 7. Test Upload
1. Log into the application
2. Go to Categories page
3. Try uploading an image
4. Check if image appears and persists

### 8. Verify Files Created
```bash
# Check if images are being saved
ls -la /path/to/backend/public/images/categories/

# Check permissions
ls -ld /path/to/backend/public/images/categories/
```

## Troubleshooting

### Image Upload Returns Error
Check backend logs:
```bash
# If using PM2
pm2 logs backend

# If using systemd
sudo journalctl -u your-backend-service -f
```

### Images Upload but Don't Display
- Verify nginx is serving /images/ path
- Check browser console for 404 errors
- Verify image URL format: `http://tkgerp.com/images/categories/category-xxxxx.jpg`

### Permission Denied Errors
```bash
# Find which user runs Node.js
ps aux | grep node

# Set ownership to that user
sudo chown -R <nodejs-user>:<nodejs-user> /path/to/backend/public
```

### Nginx 404 for Images
```bash
# Verify nginx config is loaded
sudo nginx -t

# Check nginx access logs
sudo tail -f /var/log/nginx/pusti-frontend-access.log

# Reload nginx
sudo systemctl reload nginx
```

## Quick Verification Commands

```bash
# 1. Check directories exist
ls -la /path/to/backend/public/images/categories/

# 2. Check Node.js process user
ps aux | grep "node.*server.js"

# 3. Test file creation permission
cd /path/to/backend/public/images/categories/
touch test-write.txt && rm test-write.txt || echo "No write permission!"

# 4. Check nginx is running
sudo systemctl status nginx

# 5. Test image URL directly
curl -I http://localhost:5000/images/categories/test.jpg
```

## Expected Nginx Location Block
This is already in nginx-tkgerp.conf:
```nginx
# Static images from backend
location /images/ {
    proxy_pass http://127.0.0.1:5000/images/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Cache static files
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

## Database Changes
**No database changes needed** - Category model already has optional `image_url` field.

## Files Modified (Already Done)
✅ nginx-tkgerp.conf - Added `/images/` location block
✅ backend/Dockerfile - Created directories (for Docker only)
✅ docker-compose.yml - Added volumes (for Docker only)

## Production Checklist
- [ ] SSH to tkgerp.com server
- [ ] Create `public/images/categories` directory
- [ ] Set proper permissions (755 for directories, readable by Node.js user)
- [ ] Verify nginx-tkgerp.conf is loaded
- [ ] Reload nginx configuration
- [ ] Restart backend Node.js service
- [ ] Test image upload
- [ ] Verify image displays in browser
- [ ] Check uploaded files persist after backend restart

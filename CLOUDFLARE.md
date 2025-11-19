# Cloudflare Deployment Guide

When deploying behind Cloudflare or any reverse proxy with a public IP, you need to configure CORS and cookies properly to avoid 401 Unauthorized errors.

## The Problem

When your application is behind Cloudflare:
- Cloudflare proxies requests and may change headers
- The backend receives requests from Cloudflare's IPs, not the client
- Cross-origin requests require proper CORS configuration
- Cookies need special handling when accessed via HTTPS but backend runs on HTTP

## Solution

### 1. Configure Environment Variables

Create a `.env` file in the root directory with your domain:

```bash
# Required for production
SESSION_SECRET=your-super-secret-random-string-here

# CORS - Add your Cloudflare domain(s)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Set to true if accessing via HTTPS (typical for Cloudflare)
SECURE_COOKIES=true
```

**Important:** 
- For wildcard subdomains, use: `https://*.yourdomain.com`
- For development/testing only: `ALLOWED_ORIGINS=*` (NOT recommended for production)
- Multiple domains: separate with commas, no spaces

### 2. Update docker-compose.yml

Make sure your docker-compose.yml passes these environment variables:

```yaml
services:
  backend:
    environment:
      - NODE_ENV=production
      - SESSION_SECRET=${SESSION_SECRET}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - SECURE_COOKIES=${SECURE_COOKIES}
```

### 3. Rebuild and Deploy

```bash
# Stop current containers
docker-compose down

# Rebuild with new configuration
docker-compose build

# Start with environment variables
docker-compose up -d
```

## Cloudflare Configuration

### SSL/TLS Settings

In your Cloudflare dashboard → SSL/TLS:

1. **SSL/TLS encryption mode:** Set to "Flexible" or "Full"
   - **Flexible**: HTTPS between browser ↔ Cloudflare, HTTP between Cloudflare ↔ your server
   - **Full**: HTTPS everywhere (requires SSL certificate on your server)
   
2. **Always Use HTTPS:** Enable this to redirect HTTP to HTTPS

### Firewall Rules (Optional but Recommended)

Create a rule to only allow Cloudflare IPs to access your backend:

1. Go to **Security** → **WAF** → **Firewall rules**
2. Create rule:
   - **Field:** `IP Source Address`
   - **Operator:** `is in`
   - **Value:** `Cloudflare IP ranges` (auto-populated)
   - **Action:** `Allow`

## Testing

### Test CORS

```bash
# From your browser console on https://yourdomain.com
fetch('https://yourdomain.com/api/check-status', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
```

Should return: `{ isConnected: false }` or `{ isConnected: true }`

### Test Cookie Persistence

```bash
# Check if cookies are being set
# In browser DevTools → Application → Cookies
# Look for "connect.sid" cookie
```

The cookie should have:
- `Secure`: ✅ (if SECURE_COOKIES=true)
- `HttpOnly`: ✅
- `SameSite`: `None` or `Lax`

## Common Issues

### 401 Unauthorized After Login

**Cause:** Cookies not being sent/saved due to CORS or SameSite issues

**Solution:**
1. Verify `ALLOWED_ORIGINS` includes your exact domain with protocol
2. Set `SECURE_COOKIES=true` if using HTTPS
3. Check browser console for CORS errors
4. Clear browser cookies and try again

### CORS Preflight Failures

**Cause:** OPTIONS requests being blocked

**Solution:**
- The backend now automatically handles OPTIONS requests
- Verify no Cloudflare firewall rules are blocking OPTIONS methods

### Session Not Persisting

**Cause:** Session cookies not being saved across requests

**Solution:**
1. Ensure `credentials: 'include'` in fetch requests
2. Set `SECURE_COOKIES=true` for HTTPS deployments
3. Verify `SESSION_SECRET` is set and consistent

### Mixed Content Warnings

**Cause:** Frontend on HTTPS trying to connect to HTTP backend

**Solution:**
- Use Cloudflare SSL (Flexible mode) so both are HTTPS
- Or configure Nginx in frontend to proxy to backend (already configured)

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_SECRET` | ✅ Yes | - | Secret key for session encryption (use random string) |
| `ALLOWED_ORIGINS` | ✅ Yes | `*` (dev only) | Comma-separated list of allowed origins with protocol |
| `SECURE_COOKIES` | ✅ Yes | `false` | Set to `true` for HTTPS deployments |
| `PORT` | No | `3001` | Backend port |
| `NODE_ENV` | No | `development` | Set to `production` for production |

## Security Recommendations

1. **Never use `ALLOWED_ORIGINS=*` in production** - always specify exact domains
2. **Use a strong `SESSION_SECRET`** - generate with: `openssl rand -base64 32`
3. **Enable Cloudflare Bot Fight Mode** - protects against automated attacks
4. **Rate Limiting** - consider implementing rate limiting for API endpoints
5. **IP Allowlist** - restrict backend access to Cloudflare IPs only

## Architecture

```
Browser (HTTPS)
    ↓
Cloudflare (HTTPS)
    ↓
Your Server
    ↓
Docker Compose
    ├── Frontend (Nginx :8080) ← User accesses this
    └── Backend (Express :3001) ← Proxied by Nginx
```

## Quick Start for Cloudflare

```bash
# 1. Create .env file
cat > .env << EOF
SESSION_SECRET=$(openssl rand -base64 32)
ALLOWED_ORIGINS=https://yourdomain.com
SECURE_COOKIES=true
EOF

# 2. Deploy
docker-compose down
docker-compose build
docker-compose up -d

# 3. Check logs
docker-compose logs -f backend
```

## Debugging

### Check Backend Logs

```bash
docker-compose logs -f backend
```

Look for:
- CORS errors
- Session creation/destruction
- Request origins being logged

### Check Current Configuration

```bash
# Check if environment variables are set
docker-compose exec backend env | grep -E "ALLOWED_ORIGINS|SECURE_COOKIES"

# Check if backend is receiving requests
docker-compose logs backend | tail -20

# Test health endpoint
curl http://localhost:3001/api/check-status
```

### Test CORS from Command Line

```bash
# Test preflight request
curl -X OPTIONS http://localhost:3001/api/check-status \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should return headers like:
#   Access-Control-Allow-Origin: https://yourdomain.com
#   Access-Control-Allow-Credentials: true
```

### Test Session Cookie

```bash
# Check if cookies are being set
curl -X POST http://localhost:3001/api/connect \
  -H "Content-Type: application/json" \
  -H "Origin: https://yourdomain.com" \
  -d '{"kubeconfig":"invalid"}' \
  -v 2>&1 | grep -i "set-cookie"

# Should see: Set-Cookie: connect.sid=...
```

### Test Locally First

Before deploying to Cloudflare:

```bash
# Test with ALLOWED_ORIGINS=*
ALLOWED_ORIGINS=* docker-compose up

# If it works, then configure specific origins
```

### Verify Cloudflare Headers

Check what headers Cloudflare is sending:

```javascript
// Add this temporarily to backend index.ts for debugging
app.use((req, res, next) => {
  console.log('Headers:', req.headers);
  next();
});
```

## Additional Resources

- [Cloudflare SSL Modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)
- [Express Behind Proxies](https://expressjs.com/en/guide/behind-proxies.html)
- [CORS MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

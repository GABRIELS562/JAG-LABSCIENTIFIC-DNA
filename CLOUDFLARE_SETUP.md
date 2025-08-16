# 🔒 Cloudflare Zero Trust Setup for LabScientific LIMS

## Overview
This guide sets up secure remote access to your LIMS system using Cloudflare's Zero Trust network, allowing access from outside the lab while maintaining maximum security.

## Architecture
```
Internet → Cloudflare Edge → Cloudflare Tunnel → Docker Container → LIMS App
                ↓
          WAF & DDoS Protection
                ↓
          Access Control
                ↓
          Zero Trust Network
```

## Prerequisites
- Cloudflare account (Free tier works, but recommend Pro for better security)
- Domain name (e.g., `lims.yourcompany.com`)
- Docker and Docker Compose installed
- Server with static IP or dynamic DNS

## Step 1: Cloudflare Account Setup

### 1.1 Create Cloudflare Account
1. Go to https://dash.cloudflare.com/sign-up
2. Add your domain
3. Update nameservers at your registrar

### 1.2 Enable Security Features (Free)
1. Go to **SSL/TLS** → Set to "Full (Strict)"
2. Enable **Always Use HTTPS**
3. Enable **Automatic HTTPS Rewrites**
4. Set **Minimum TLS Version** to 1.2

## Step 2: Cloudflare Tunnel Setup (No Port Forwarding Needed!)

### 2.1 Create Tunnel
```bash
# Install cloudflared on your server
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create lims-tunnel

# This creates a credentials file: ~/.cloudflared/<TUNNEL_ID>.json
# Save the Tunnel ID and Secret!
```

### 2.2 Configure Tunnel
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/user/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  # Main application
  - hostname: lims.yourcompany.com
    service: http://localhost:8080
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      
  # API endpoint
  - hostname: lims.yourcompany.com
    path: /api/*
    service: http://localhost:3001
    
  # Health check endpoint
  - hostname: lims.yourcompany.com
    path: /health
    service: http://localhost:3001
    
  # Catch-all
  - service: http_status:404
```

### 2.3 Route DNS
```bash
# Create DNS route
cloudflared tunnel route dns lims-tunnel lims.yourcompany.com
```

### 2.4 Get Tunnel Token (for Docker)
```bash
# Get the token for docker-compose
cloudflared tunnel token lims-tunnel
# Copy this token to your .env.production as CLOUDFLARE_TUNNEL_TOKEN
```

## Step 3: Cloudflare Access (Zero Trust)

### 3.1 Enable Zero Trust
1. Go to https://one.dash.cloudflare.com/
2. Set up your team domain (e.g., `yourcompany.cloudflareaccess.com`)

### 3.2 Create Access Application
1. Go to **Access** → **Applications**
2. Click **Add an application**
3. Choose **Self-hosted**
4. Configure:
   ```
   Application name: LabScientific LIMS
   Session duration: 8 hours
   Application domain: lims.yourcompany.com
   ```

### 3.3 Configure Access Policies
Create multiple policies for different access levels:

#### Policy 1: Lab Network Access (No Auth)
```yaml
Name: Lab Network Direct Access
Action: Allow
Include:
  - IP ranges: 192.168.1.0/24  # Your lab's IP range
```

#### Policy 2: Employee Access (Email Auth)
```yaml
Name: Employee Remote Access
Action: Allow
Include:
  - Emails ending in: @yourcompany.com
Require:
  - Purpose: Legitimate business need
```

#### Policy 3: Admin Access (Multi-factor)
```yaml
Name: Admin Access
Action: Allow
Include:
  - Email: admin@yourcompany.com
  - Email: it@yourcompany.com
Require:
  - Authentication method: One-time PIN
  - Country: Your Country
```

#### Policy 4: Block List
```yaml
Name: Block Suspicious Access
Action: Block
Include:
  - Everyone
Exclude:
  - IP ranges: Your trusted IPs
  - Emails: Authorized users
```

## Step 4: WAF Configuration

### 4.1 Enable WAF Rules
1. Go to **Security** → **WAF**
2. Enable **Managed Rules**
3. Set sensitivity to **High**

### 4.2 Create Custom Rules
Add these custom WAF rules:

```javascript
// Rule 1: Block SQL Injection attempts
(http.request.uri.query contains "union" and http.request.uri.query contains "select") or
(http.request.uri.query contains "'; drop") or
(http.request.body.raw contains "'; drop")
Action: Block

// Rule 2: Rate limiting
(rate(5m) > 100 and not ip.src in {your_office_ip})
Action: Challenge

// Rule 3: Block suspicious user agents
(http.user_agent contains "scanner") or
(http.user_agent contains "bot" and not http.user_agent contains "googlebot")
Action: Block

// Rule 4: Protect API endpoints
(http.request.uri.path contains "/api/" and 
 http.request.method eq "POST" and 
 not http.referer contains "yourcompany.com")
Action: Challenge
```

### 4.3 Configure Rate Limiting
1. Go to **Security** → **Rate limiting**
2. Create rule:
   ```
   Path: /api/*
   Requests: 10 per 10 seconds per IP
   Action: Block for 1 minute
   ```

## Step 5: Network Security Configuration

### 5.1 Update .env.production
```bash
# Cloudflare Configuration
CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token_here
CORS_ORIGIN=https://lims.yourcompany.com
TRUSTED_PROXIES=172.20.0.0/16,173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22
```

### 5.2 Docker Network Security
Update nginx/nginx.docker.conf:
```nginx
events {
    worker_connections 1024;
}

http {
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    # Only allow Cloudflare IPs
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 172.20.0.0/16; # Docker network
    
    real_ip_header CF-Connecting-IP;
    
    upstream backend {
        server lims-app:3001;
    }
    
    server {
        listen 80;
        server_name _;
        
        # Check if request is from Cloudflare
        if ($http_cf_connecting_ip = "") {
            return 403;
        }
        
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
        
        location /api {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $http_cf_connecting_ip;
            proxy_set_header X-Forwarded-For $http_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /api/auth/login {
            limit_req zone=login burst=2 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $http_cf_connecting_ip;
        }
    }
}
```

## Step 6: Deployment

### 6.1 Prepare Environment
```bash
# Clone repository
git clone [repository] /opt/labscientific-lims
cd /opt/labscientific-lims

# Create directories
mkdir -p data uploads reports logs backups nginx/ssl monitoring

# Set permissions
chmod 700 data backups
chmod 755 uploads reports logs

# Copy production environment
cp .env.production.example .env.production
# Edit .env.production with your values
```

### 6.2 Build and Deploy
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### 6.3 Verify Security
```bash
# Test from outside
curl https://lims.yourcompany.com/health

# Check tunnel status
docker logs lims-tunnel

# Check application logs
docker logs labscientific-lims
```

## Step 7: Monitoring & Alerts

### 7.1 Cloudflare Analytics
1. Go to **Analytics** → **Security**
2. Set up alerts for:
   - Spike in 4xx/5xx errors
   - DDoS attacks
   - WAF blocks

### 7.2 Docker Monitoring
```bash
# Install monitoring
docker-compose exec prometheus promtool check config /etc/prometheus/prometheus.yml

# Access Prometheus
http://localhost:9090

# Set up Grafana (optional)
docker run -d -p 3000:3000 grafana/grafana
```

### 7.3 Log Aggregation
```bash
# View all logs
docker-compose logs

# View specific service
docker logs lims-app --tail 100 -f

# Export logs
docker logs lims-app > lims_$(date +%Y%m%d).log
```

## Step 8: Backup Strategy

### 8.1 Automated Backups
The docker-compose includes automatic daily backups. Additionally:

```bash
# Manual backup
docker exec lims-backup sqlite3 /data/lims.db '.backup /backups/manual_backup.db'

# Backup to cloud (S3 example)
aws s3 sync ./backups s3://your-bucket/lims-backups/
```

### 8.2 Disaster Recovery
```bash
# Restore from backup
docker-compose down
cp backups/lims_20240101.db data/lims.db
docker-compose up -d
```

## Security Best Practices

### ✅ DO's:
1. **Use Cloudflare Tunnel** - No open ports needed
2. **Enable 2FA** for Cloudflare account
3. **Rotate secrets** quarterly
4. **Monitor logs** daily
5. **Test backups** monthly
6. **Update Docker images** regularly
7. **Use Access Policies** for user management
8. **Enable all Cloudflare security features**

### ❌ DON'Ts:
1. **Don't expose ports** directly to internet
2. **Don't disable** WAF rules
3. **Don't share** tunnel credentials
4. **Don't ignore** security alerts
5. **Don't use** default passwords
6. **Don't bypass** Cloudflare

## Troubleshooting

### Issue: Cannot access from outside
```bash
# Check tunnel
docker logs lims-tunnel
cloudflared tunnel info lims-tunnel

# Check DNS
nslookup lims.yourcompany.com
```

### Issue: 403 Forbidden
```bash
# Check Cloudflare Access policies
# Verify IP is not blocked in WAF
# Check nginx configuration
docker exec lims-nginx nginx -t
```

### Issue: Slow performance
```bash
# Check rate limiting
# Review Cloudflare Analytics
# Optimize Docker resources
docker stats
```

## Cost Estimation

### Cloudflare Costs:
- **Free Plan**: $0/month (Basic features)
- **Pro Plan**: $25/month (Better WAF, analytics)
- **Business Plan**: $250/month (Advanced security)
- **Zero Trust**: $7/user/month (Access control)

### Recommended Setup:
- **Small Lab (< 10 users)**: Free + Zero Trust = ~$70/month
- **Medium Lab (10-50 users)**: Pro + Zero Trust = ~$375/month
- **Large Lab (50+ users)**: Business + Zero Trust = ~$600/month

## Support Contacts

- **Cloudflare Support**: https://support.cloudflare.com
- **Docker Issues**: Check docker-compose logs
- **Application Issues**: Check /logs directory
- **Emergency**: Have offline backup ready

---

**Security Level**: MAXIMUM 🛡️
**Accessibility**: GLOBAL 🌍
**Maintenance**: MINIMAL 🔧
# HTTPS Setup for Family Wealth Tracker

This guide explains how to enable HTTPS for your Family Wealth Tracker Docker deployment.

## Prerequisites

- Docker and Docker Compose installed
- OpenSSL installed (for certificate generation)

## Step 1: Generate SSL Certificates

### On Linux/macOS:
```bash
chmod +x generate-ssl.sh
./generate-ssl.sh
```

### On Windows (PowerShell):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\generate-ssl.ps1
```

This will create:
- `ssl/server.crt` - SSL certificate
- `ssl/server.key` - Private key

## Step 2: Deploy with HTTPS

The Docker Compose configuration now includes nginx with SSL support:

```bash
# Stop current deployment
docker-compose down

# Start with HTTPS enabled
docker-compose up -d
```

## Step 3: Access Your Application

- **HTTPS**: https://192.168.0.64 (or your server IP)
- **HTTP**: Will automatically redirect to HTTPS

## Port Configuration

- **Port 80** (HTTP): Redirects to HTTPS
- **Port 443** (HTTPS): Main application access
- **Port 3000**: No longer exposed externally (nginx handles all traffic)

## Browser Security Warning

Since this uses a self-signed certificate, browsers will show a security warning. This is normal for self-signed certificates:

1. Click "Advanced"
2. Click "Continue to 192.168.0.64 (unsafe)" or similar
3. The application will work normally with full HTTPS encryption

## Production Considerations

For production use, consider:

### Option 1: Let's Encrypt (Free SSL)
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate Let's Encrypt certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to ssl/ directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/server.crt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/server.key
```

### Option 2: Commercial SSL Certificate
Replace the self-signed certificates in `ssl/` with your commercial SSL certificate files.

## Troubleshooting

### Certificate Issues
If you get certificate errors:
```bash
# Regenerate certificates
rm -rf ssl/
./generate-ssl.sh  # or generate-ssl.ps1 on Windows
docker-compose restart nginx
```

### Port Conflicts
If ports 80/443 are in use:
```bash
# Check what's using the ports
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Stop conflicting services if needed
sudo systemctl stop apache2  # Example
sudo systemctl stop nginx    # Example
```

### Application Not Starting
Check logs:
```bash
docker-compose logs -f web-patrimonio
docker-compose logs -f nginx
```

## Security Features Enabled

The nginx configuration includes:
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Modern SSL/TLS configuration
- Automatic HTTP to HTTPS redirection

## Testing HTTPS

Test your setup:
```bash
# Test certificate
openssl s_client -connect 192.168.0.64:443 -servername 192.168.0.64

# Test redirect
curl -I http://192.168.0.64
# Should return: HTTP/1.1 301 Moved Permanently

# Test HTTPS
curl -k https://192.168.0.64/api/auth/registration-status
# Should return: {"enabled":true}
```
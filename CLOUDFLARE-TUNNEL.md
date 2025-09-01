# Cloudflare Tunnel Setup for Family Wealth Tracker

This guide explains how to configure Cloudflare Tunnel to provide secure external access to your Family Wealth Tracker application.

## Architecture Overview

```
Internet → Cloudflare (HTTPS) → Tunnel → Your Server (HTTP:3000) → App
                                      ↗ Direct Access (HTTPS:443) → nginx → App
```

## Prerequisites

- Cloudflare account with a domain
- cloudflared installed on your server
- Family Wealth Tracker running with HTTPS enabled

## Step 1: Install cloudflared

### On Ubuntu/Debian:
```bash
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### On other systems:
Visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

## Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```
This opens a browser window to authenticate with your Cloudflare account.

## Step 3: Create a Tunnel

```bash
# Create the tunnel
cloudflared tunnel create family-wealth-tracker

# Note the tunnel ID from the output
```

## Step 4: Configure the Tunnel

Create a configuration file at `~/.cloudflared/config.yml`:

```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID_HERE.json

ingress:
  # Main application
  - hostname: wealth.yourdomain.com
    service: http://192.168.0.64:3000
    originRequest:
      httpHostHeader: 192.168.0.64
  
  # Catch-all rule (required)
  - service: http_status:404
```

**Important Notes:**
- Replace `YOUR_TUNNEL_ID_HERE` with your actual tunnel ID
- Replace `wealth.yourdomain.com` with your desired subdomain
- Replace `192.168.0.64` with your actual server IP
- Use **HTTP** (not HTTPS) for the service to avoid certificate issues

## Step 5: Create DNS Record

```bash
cloudflared tunnel route dns family-wealth-tracker wealth.yourdomain.com
```

## Step 6: Start the Tunnel

### Run once to test:
```bash
cloudflared tunnel run family-wealth-tracker
```

### Run as a service:
```bash
# Install as system service
sudo cloudflared service install

# Start the service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## Step 7: Update Application Configuration

Add the domain to your server's `.env` file:

```bash
# Add this to your .env file
COOKIE_DOMAIN=wealth.yourdomain.com
```

Then restart your Docker containers:
```bash
docker-compose down
docker-compose up -d
```

## Access Methods

After setup, you'll have two ways to access your application:

1. **Direct HTTPS**: `https://192.168.0.64` (local network)
2. **Cloudflare Tunnel**: `https://wealth.yourdomain.com` (internet access)

Both methods will have fully working session authentication.

## Security Benefits

✅ **No port forwarding needed** - No firewall configuration required
✅ **DDoS protection** - Cloudflare's network protects your server  
✅ **Valid SSL certificates** - No browser warnings
✅ **Access control** - Can add Cloudflare Access for additional security
✅ **Hidden origin** - Your server IP is not exposed

## Troubleshooting

### Tunnel not connecting:
```bash
# Check tunnel status
cloudflared tunnel list

# Check service logs
sudo journalctl -u cloudflared -f
```

### Session issues:
Make sure `COOKIE_DOMAIN` is set correctly in your `.env` file and matches your Cloudflare domain.

### 502 Bad Gateway:
- Ensure your application is running on port 3000
- Check that the service URL in config.yml is correct
- Verify firewall allows connections to port 3000

## Advanced Configuration

### Multiple Subdomains:
```yaml
ingress:
  - hostname: wealth.yourdomain.com
    service: http://192.168.0.64:3000
  - hostname: api.yourdomain.com
    service: http://192.168.0.64:3000
    path: /api/*
  - service: http_status:404
```

### Access Control (Optional):
Add Cloudflare Access for additional authentication:
```yaml
ingress:
  - hostname: wealth.yourdomain.com
    service: http://192.168.0.64:3000
    originRequest:
      access:
        required: true
        teamName: your-team-name
```

## Testing

Test your setup:
```bash
# Test direct access
curl -k https://192.168.0.64/api/auth/registration-status

# Test tunnel access
curl https://wealth.yourdomain.com/api/auth/registration-status
```

Both should return: `{"enabled":true}`
# PowerShell script to generate SSL certificates for Family Wealth Tracker
# This script requires OpenSSL to be installed

Write-Host "Generating SSL certificate for Family Wealth Tracker..." -ForegroundColor Green

# Create SSL directory
New-Item -ItemType Directory -Force -Path "ssl" | Out-Null

# Check if OpenSSL is available
try {
    $null = Get-Command openssl -ErrorAction Stop
} catch {
    Write-Error "OpenSSL is not installed or not in PATH. Please install OpenSSL first."
    Write-Host "You can download OpenSSL from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    exit 1
}

# Generate private key
Write-Host "Generating private key..." -ForegroundColor Yellow
& openssl genrsa -out ssl/server.key 2048

# Create certificate configuration
$configContent = @"
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C=ES
ST=Spain
L=Madrid
O=Family Wealth Tracker
OU=IT Department
CN=192.168.0.64
emailAddress=admin@family-wealth-tracker.local

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 192.168.0.64
DNS.3 = family-wealth-tracker.local
IP.1 = 127.0.0.1
IP.2 = 192.168.0.64
"@

$configContent | Out-File -FilePath "ssl/server.conf" -Encoding utf8

# Generate certificate signing request
Write-Host "Generating certificate signing request..." -ForegroundColor Yellow
& openssl req -new -key ssl/server.key -out ssl/server.csr -config ssl/server.conf

# Generate self-signed certificate
Write-Host "Generating self-signed certificate..." -ForegroundColor Yellow
& openssl x509 -req -days 365 -in ssl/server.csr -signkey ssl/server.key -out ssl/server.crt -extensions v3_req -extfile ssl/server.conf

# Clean up temporary files
Remove-Item ssl/server.csr -ErrorAction SilentlyContinue
Remove-Item ssl/server.conf -ErrorAction SilentlyContinue

Write-Host "SSL certificate generated successfully!" -ForegroundColor Green
Write-Host "Certificate: ssl/server.crt" -ForegroundColor Cyan
Write-Host "Private Key: ssl/server.key" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: This is a self-signed certificate. Your browser will show a security warning." -ForegroundColor Yellow
Write-Host "For production use, consider using Let's Encrypt or a proper CA-signed certificate." -ForegroundColor Yellow
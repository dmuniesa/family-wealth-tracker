#!/bin/bash

# Create SSL directory
mkdir -p ssl

# Generate SSL certificate for local development and production
# This creates a self-signed certificate valid for both localhost and your server IP

echo "Generating SSL certificate for Family Wealth Tracker..."

# Generate private key
openssl genrsa -out ssl/server.key 2048

# Generate certificate signing request
openssl req -new -key ssl/server.key -out ssl/server.csr -subj "/C=ES/ST=Spain/L=Madrid/O=Family Wealth Tracker/OU=IT Department/CN=192.168.0.64/emailAddress=admin@family-wealth-tracker.local"

# Generate self-signed certificate with SAN for multiple domains
openssl x509 -req -days 365 -in ssl/server.csr -signkey ssl/server.key -out ssl/server.crt -extensions v3_req -extfile <(
cat <<EOF
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
EOF
)

# Clean up CSR file
rm ssl/server.csr

# Set proper permissions
chmod 600 ssl/server.key
chmod 644 ssl/server.crt

echo "SSL certificate generated successfully!"
echo "Certificate: ssl/server.crt"
echo "Private Key: ssl/server.key"
echo ""
echo "Note: This is a self-signed certificate. Your browser will show a security warning."
echo "For production use, consider using Let's Encrypt or a proper CA-signed certificate."
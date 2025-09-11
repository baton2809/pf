#!/bin/bash

set -e

LOCAL_IP=$(ifconfig | grep -E 'inet (192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)

if [[ -z "$LOCAL_IP" ]]; then
    echo "Enter your local IP:"
    read -r LOCAL_IP
fi

echo "Using IP: $LOCAL_IP"

mkdir -p ssl
cd ssl

cat > cert.conf << EOF
[req]
default_bits = 2048
prompt = no
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
C=US
ST=Dev
L=Local
O=DevCorp
CN=$LOCAL_IP

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.local
IP.1 = $LOCAL_IP
IP.2 = 127.0.0.1
IP.3 = 0.0.0.0
EOF

openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -config cert.conf -extensions v3_req

rm cert.conf

echo "SSL certificates created:"
echo "  - ssl/key.pem"
echo "  - ssl/cert.pem"
echo ""
echo "Access URLs:"
echo "  - Desktop: https://localhost:3005"
echo "  - Mobile: https://$LOCAL_IP:3005"
echo ""
echo "Mobile setup:"
echo "  1. Connect mobile device to same WiFi network"
echo "  2. Open browser and go to https://$LOCAL_IP:3005"
echo "  3. Accept SSL certificate warnings (self-signed certificate)"
echo "  4. See MOBILE_ACCESS_GUIDE.md for detailed instructions"
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
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = Dev
L = Local
O = DevCorp
CN = $LOCAL_IP

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.local
IP.1 = 127.0.0.1
IP.2 = $LOCAL_IP
EOF

openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -config cert.conf -extensions v3_req

rm cert.conf

echo "SSL certificates created:"
echo "  - ssl/key.pem"
echo "  - ssl/cert.pem"
echo ""
echo "Access URLs:"
echo "  - https://localhost:3005"
echo "  - https://$LOCAL_IP:3005"
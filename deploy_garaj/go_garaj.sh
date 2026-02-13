#!/bin/bash
set -e

# Configuration
DB_IP="119.160.105.121"
DB_PORT="2266"
APP_IP="119.160.105.120"
APP_PORT="2255"

# Priority passwords
DESIRED_SSH_PASS="Smart@4ever"
OLD_SSH_PASS="P@kistan1234"

JWT_SECRET="018ccd50dc47ee20d2dbea3a162010176bfdc08930df44b12447320a1504c6ee"

echo "🚀 Starting Garaj Deployment..."
echo "--------------------------------"

# Make scripts executable
chmod +x deploy_garaj/*.expect

# 1. Setup & Migration Database VM
echo "🔧 STEP 1: Provisioning & Migrating Database..."
PROD_URI="mongodb://bidsflow_user:Smart%404ever@34.172.151.20:27017/bidsflow"

if ./deploy_garaj/setup_db.expect "$DB_IP" "$DB_PORT" "$DESIRED_SSH_PASS" "$DESIRED_SSH_PASS" "$APP_IP" "$PROD_URI"; then
    echo "✅ DB Setup & Migration Success"
elif ./deploy_garaj/setup_db.expect "$DB_IP" "$DB_PORT" "$OLD_SSH_PASS" "$DESIRED_SSH_PASS" "$APP_IP" "$PROD_URI"; then
    echo "✅ DB Setup & Migration Success (from OLD password)"
else
    echo "❌ DB Setup Failed"
    exit 1
fi

# 2. Setup Application VM
echo "🔧 STEP 2: Provisioning Application VM..."
if ./deploy_garaj/setup_app.expect "$APP_IP" "$APP_PORT" "$DESIRED_SSH_PASS" "$DESIRED_SSH_PASS"; then
    echo "✅ App Setup Success"
elif ./deploy_garaj/setup_app.expect "$APP_IP" "$APP_PORT" "$OLD_SSH_PASS" "$DESIRED_SSH_PASS"; then
    echo "✅ App Setup Success (from OLD password)"
else
    echo "❌ App Setup Failed"
    exit 1
fi

# 3. Prepare Application Code
echo "📦 STEP 3: Packaging Application..."
rm -f bidsflow_dist.zip
# STRICT EXCLUSIONS to keep the zip small
zip -r bidsflow_dist.zip . -x "node_modules/*" ".git/*" "google-cloud-sdk/*" "dist/*" "dev.log" "dump*" "*.gzip" "garaj_dist.zip" "deploy_garaj/*" ".env*" "scripts/*" "Files/*"

# 4. Deploy Application
echo "⬆️  STEP 4: Uploading & Starting Application..."
./deploy_garaj/scp_upload.expect "bidsflow_dist.zip" "$APP_PORT" "root" "$APP_IP" "/var/www/bidsflow/bidsflow_dist.zip" "$DESIRED_SSH_PASS"

# Start App
# IMPORTANT: Use Private IP for internal connection
DB_PRIVATE_IP="192.168.10.3"
MONGO_URI_INTERNAL="mongodb://bidsflow_user:Smart%404ever@${DB_PRIVATE_IP}:27017/bidsflow"

if ./deploy_garaj/start_app.expect "$APP_IP" "$APP_PORT" "$DESIRED_SSH_PASS" "$MONGO_URI_INTERNAL" "$JWT_SECRET"; then
    echo "✅ App Start Success"
else
    echo "❌ App Start Failed"
    exit 1
fi

echo "✅ Deployment Complete!"
echo "Access the app here: http://$APP_IP"

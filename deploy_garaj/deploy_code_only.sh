#!/bin/bash
set -e

# Configuration
APP_IP="119.160.105.120"
APP_PORT="2255"
DESIRED_SSH_PASS="Smart@4ever"
JWT_SECRET="018ccd50dc47ee20d2dbea3a162010176bfdc08930df44b12447320a1504c6ee"
DB_PRIVATE_IP="192.168.10.3"
MONGO_URI_INTERNAL="mongodb://bidsflow_user:Smart%404ever@${DB_PRIVATE_IP}:27017/bidsflow"

echo "📦 Packaging Application..."
rm -f bidsflow_dist.zip
zip -r bidsflow_dist.zip . -x "node_modules/*" ".git/*" "google-cloud-sdk/*" "dist/*" "dev.log" "dump*" "*.gzip" "garaj_dist.zip" "deploy_garaj/*" ".env*" "scripts/*" "Files/*" "reproduce_issue.js" "reproduce_issue_pdf.js"

echo "⬆️  Uploading Application..."
chmod +x deploy_garaj/*.expect
./deploy_garaj/scp_upload.expect "bidsflow_dist.zip" "$APP_PORT" "root" "$APP_IP" "/var/www/bidsflow/bidsflow_dist.zip" "$DESIRED_SSH_PASS"

echo "🔄 Restarting Application..."
if ./deploy_garaj/start_app.expect "$APP_IP" "$APP_PORT" "$DESIRED_SSH_PASS" "$MONGO_URI_INTERNAL" "$JWT_SECRET"; then
    echo "✅ App Deployed & Started Successfully"
else
    echo "❌ Deployment Failed"
    exit 1
fi

#!/bin/bash
set -e

# This script deploys the application to the BidsFlow Test Server (VM)
echo "🚀 Preparing deployment to BidsFlow Test Server (VM)..."

ENV_FILE=".env.staging"
VM_NAME="bidsflow-test-server"
ZONE="us-central1-a"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: Configuration file $ENV_FILE not found!"
    exit 1
fi

# Update MONGODB_URI to localhost for the VM deployment
sed -i '' 's/@.*:27017/@127.0.0.1:27017/g' "$ENV_FILE"

echo "🔍 Pre-flight check: Verifying environment variables in $ENV_FILE..."
REQUIRED_VARS=("API_KEY" "GEMINI_API_KEY" "JWT_SECRET" "MONGODB_URI")
MISSING=0
for VAR in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$VAR=" "$ENV_FILE"; then
        echo "❌ MISSING VARIABLE: $VAR"
        MISSING=1
    fi
done

if [ "$MISSING" -eq 1 ]; then
    echo "🛑 Deployment aborted due to missing variables."
    exit 1
fi

echo "🏗️ Building app..."
npm run build

echo "📦 Packaging app..."
zip -r bidsflow_test.zip dist server.js models routes middleware services package.json .env.staging

echo "📤 Uploading to $VM_NAME..."
gcloud compute scp bidsflow_test.zip root@$VM_NAME:/var/www/bidsflow/ --zone=$ZONE --quiet

echo "⚡ Starting app on $VM_NAME..."
gcloud compute ssh root@$VM_NAME --zone=$ZONE --command="cd /var/www/bidsflow && unzip -o bidsflow_test.zip && npm install --production && pm2 delete bidsflow || true && pm2 start server.js --name bidsflow --env .env.staging" --quiet

echo "✅ Deployment complete."
echo "Access the test server here: http://34.172.151.20"

#!/bin/bash
set -e

# WARNING: DEPRECATED SCRIPT
echo "⚠️  WARNING: This Google Cloud deployment script is DEPRECATED."
echo "⚠️  We have migrated to Garaj Cloud."
echo "⚠️  Please use ./deploy_garaj/go_garaj.sh instead."
echo "Exiting..."
exit 1

# Usage: ./deploy.sh [staging|production]

ENV=$1

if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
    echo "Usage: ./deploy.sh [staging|production]"
    exit 1
fi

ENV_FILE=".env.$ENV"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: Configuration file $ENV_FILE not found!"
    exit 1
fi

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

echo "✅ Environment check passed."

# Project ID
PROJECT_ID="gen-lang-client-0197652040"
REGION="us-central1"

if [ "$ENV" == "production" ]; then
    SERVICE_NAME="bidsflow-app"
else
    SERVICE_NAME="bidsflow-staging"
fi

echo "🚀 Deploying to $ENV (Service: $SERVICE_NAME)..."

# Construct env vars string
ENV_VARS=$(paste -sd, "$ENV_FILE")

gcloud run deploy "$SERVICE_NAME" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --source . \
    --set-env-vars "$ENV_VARS" \
    --allow-unauthenticated

echo "✅ Deployment complete."
echo "Running verification..."
./verify.sh "$ENV"

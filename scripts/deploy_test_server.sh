#!/bin/bash
set -e

# This script deploys the application to the Google Cloud Test Server (formerly Production)
echo "🚀 Preparing deployment to BidsFlow Test Server (Google Cloud)..."

ENV_FILE=".env.staging"

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

# Project ID - BidsFlow Test Server
PROJECT_ID="gen-lang-client-0197652040"
REGION="us-central1"
SERVICE_NAME="bidsflow-test-server"

echo "🚀 Deploying to Google Cloud (Project: $PROJECT_ID, Service: $SERVICE_NAME)..."

# Construct env vars string
ENV_VARS=$(paste -sd, "$ENV_FILE")

gcloud run deploy "$SERVICE_NAME" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --source . \
    --set-env-vars "$ENV_VARS" \
    --allow-unauthenticated

echo "✅ Deployment complete."
echo "Access the test server here: https://bidsflow-test-server-661116307651.us-central1.run.app"

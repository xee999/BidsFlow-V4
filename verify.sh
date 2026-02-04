#!/bin/bash

# Usage: ./verify.sh [staging|production]

ENV=$1

if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
    echo "Usage: ./verify.sh [staging|production]"
    exit 1
fi

if [ "$ENV" == "production" ]; then
    URL="https://bidsflow-app-661116307651.us-central1.run.app"
else
    URL="https://bidsflow-staging-661116307651.us-central1.run.app"
fi

echo "🔍 Verifying $ENV at $URL..."

# Check Health Endpoint
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/health")

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Health Check Passed (200 OK)"
else
    echo "❌ Health Check Failed! Status: $HTTP_STATUS"
    exit 1
fi

# Check DB Connection in response body
RESPONSE=$(curl -s "$URL/api/health")
if echo "$RESPONSE" | grep -q '"database":"connected"'; then
    echo "✅ Database Connection Verified"
else
    echo "❌ Database Connection FAILED"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "🎉 Verification Successful!"

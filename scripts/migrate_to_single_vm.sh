#!/bin/bash
set -e

# Configuration
TEST_VM="bidsflow-backup"
DB_VM="bidsflow-db"
ZONE="us-central1-a"
DUMP_PATH="/tmp/bidsflow_test_dump.gzip"

echo "🎨 Step 1: Labelling VMs..."
gcloud compute instances add-labels $TEST_VM --labels=purpose=test-server --zone=$ZONE --quiet || true
gcloud compute instances add-labels $DB_VM --labels=purpose=xee-openclaw --zone=$ZONE --quiet || true

echo "🔋 Step 2: Ensuring tools on Source DB machine ($DB_VM)..."
gcloud compute ssh root@$DB_VM --zone=$ZONE --command="apt-get update && apt-get install -y gnupg curl && curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes && echo 'deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' | tee /etc/apt/sources.list.d/mongodb-org-7.0.list && apt-get update && apt-get install -y mongodb-database-tools" --quiet

echo "📥 Step 3: Dumping database from $DB_VM..."
gcloud compute ssh root@$DB_VM --zone=$ZONE --command="mongodump --uri='mongodb://staging_user:staging_secure_password_123@127.0.0.1:27017/bidsflow_staging?authSource=bidsflow_staging' --gzip --archive=$DUMP_PATH" --quiet

echo "🚀 Step 4: Provisioning Target Test machine ($TEST_VM)..."
gcloud compute ssh root@$TEST_VM --zone=$ZONE --command="apt-get update && apt-get install -y gnupg curl nodejs npm nginx unzip && npm install -g pm2 && curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes && echo 'deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' | tee /etc/apt/sources.list.d/mongodb-org-7.0.list && apt-get update && apt-get install -y mongodb-org && systemctl enable mongod && systemctl start mongod" --quiet

echo "🔄 Step 5: Transferring data..."
# Use a middle-man temporary file on the local machine for easiest transfer if direct SSHing between VMs is not configured
gcloud compute scp root@$DB_VM:$DUMP_PATH ./dump.gzip --zone=$ZONE --quiet
gcloud compute scp ./dump.gzip root@$TEST_VM:$DUMP_PATH --zone=$ZONE --quiet
rm ./dump.gzip

echo "📤 Step 6: Restoring database on $TEST_VM..."
gcloud compute ssh root@$TEST_VM --zone=$ZONE --command="mongorestore --gzip --archive=$DUMP_PATH" --quiet

echo "⚙️ Step 7: Finalizing Test VM configuration..."
# Update the local .env.staging to point to localhost
sed -i '' 's/34.172.151.20/127.0.0.1/g' .env.staging

echo "✅ Migration Complete!"
echo "Next step: Run 'npm run deploy:test' to push the app to this machine."

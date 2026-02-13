# Database Backup Setup Guide (Garaj Production)

Use this guide to set up automated "Cron Job" backups on your MongoDB server (Garaj DB VM).

## 1. Frequency Recommendation
**Daily at 3:00 AM** is the recommended frequency implementation.
*   **Why**: It captures the entire day's work without interrupting users (low traffic time).
*   **Retention**: This script keeps the last **7 days** of backups, automatically deleting older ones to save space.

## 2. The Implementation
You need to copy the script below, save it on your server, and activate it.

### Step 1: Login to your Server
Open your terminal and SSH into the machine:
```bash
ssh -p 2266 root@119.160.105.121
```

### Step 2: Create the Backup Script
Run this command to create the file:
```bash
nano /root/mongo_backup.sh
```

**Paste this content into the file:**
```bash
#!/bin/bash

# --- CONFIGURATION ---
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/root/backups"
MONGO_URI="mongodb://bidsflow_user:Smart%404ever@localhost:27017/bidsflow"
RETENTION_DAYS=7
# ---------------------

# 1. Create backup directory if not exists
mkdir -p $BACKUP_DIR

# 2. Run mongodump (Backup)
echo "Starting backup for $TIMESTAMP..."
mongodump --uri="$MONGO_URI" --gzip --archive=$BACKUP_DIR/mongo_backup_$TIMESTAMP.gz

# 3. Check if success
if [ $? -eq 0 ]; then
  echo "Backup successful: $BACKUP_DIR/mongo_backup_$TIMESTAMP.gz"
else
  echo "Backup FAILED!"
  exit 1
fi

# 4. Clean up old backups (older than 7 days)
find $BACKUP_DIR -type f -name "*.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days."
```

Save and exit: `Ctrl+O`, `Enter`, `Ctrl+X`.

### Step 3: Make it Executable
Give the script permission to run:
```bash
chmod +x /root/mongo_backup.sh
```

### Step 4: Test it Manually
Run it once to make sure it works:
```bash
./mongo_backup.sh
```
*Check if a file was created in `/root/backups`.*

### Step 5: Schedule the Cron Job (The Automation)
Open the cron editor:
```bash
crontab -e
```

Add this line at the bottom to run **Daily at 3:00 AM**:
```
0 3 * * * /root/mongo_backup.sh >> /root/backup.log 2>&1
```

Save and exit.

# 5. Remote Backup to App VM (Optional Redundancy)

Your App VM is live at: `119.160.105.120`

### Step 1: Establish Trust (One-time Setup)
On your **Primary DB Server** (`119.160.105.121`):
1.  Generate an SSH key (if you don't have one):
    ```bash
    ssh-keygen -t rsa -b 4096
    # Press Enter for all prompts (no passphrase)
    ```
2.  Copy the key to the App VM:
    ```bash
    ssh-copy-id -p 2255 root@119.160.105.120
    # You will need the password for the App VM root initially.
    ```

### Step 2: Update the Script
Modify your `/root/mongo_backup.sh` to include the remote copy command.

Add this section **before** the cleanup step:

```bash
# ... after mongodump ...

# 4. REMOTE TRANSFER
REMOTE_USER="root"
REMOTE_HOST="119.160.105.120"
REMOTE_PORT="2255"
REMOTE_DIR="/root/db_backups_redundancy"

echo "Transferring to App VM..."
# Ensure remote dir exists
ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_DIR"
scp -P $REMOTE_PORT $BACKUP_DIR/mongo_backup_$TIMESTAMP.gz $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

if [ $? -eq 0 ]; then
  echo "Remote transfer successful."
else
  echo "REMOTE TRANSFER FAILED!"
fi

# ... then cleanup ...
```

### Step 3: Verify
Run `./mongo_backup.sh` again.
It should now:
1.  Create a local backup.
2.  Send a copy to the App VM.
3.  Report success.

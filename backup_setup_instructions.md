# Database Backup Setup Guide

Use this guide to set up automated "Cron Job" backups on your MongoDB server.

## 1. Frequency Recommendation
**Daily at 3:00 AM** is the recommended frequency implementation.
*   **Why**: It captures the entire day's work without interrupting users (low traffic time).
*   **Retention**: This script keeps the last **7 days** of backups, automatically deleting older ones to save space.

## 2. The Implementation
You need to copy the script below, save it on your server, and activate it.

### Step 1: Login to your Server
Open your terminal and SSH into the machine:
```bash
ssh user@34.172.151.20
```

### Step 2: Create the Backup Script
Run this command to create the file:
```bash
nano /home/user/mongo_backup.sh
```

**Paste this content into the file:**
```bash
#!/bin/bash

# --- CONFIGURATION ---
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/home/user/backups"
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
chmod +x /home/user/mongo_backup.sh
```

### Step 4: Test it Manually
Run it once to make sure it works:
```bash
./mongo_backup.sh
```
*Check if a file was created in `/home/user/backups`.*

### Step 5: Schedule the Cron Job (The Automation)
Open the cron editor:
```bash
crontab -e
```

Add this line at the bottom to run **Daily at 3:00 AM**:
```
0 3 * * * /home/user/mongo_backup.sh >> /home/user/backup.log 2>&1
```

Save and exit.

# 5. Remote Backup to Secondary VM (The Vault)

Your Secondary VM is live at: `136.111.109.139` (Internal IP: `10.128.0.3`)

### Step 1: Establish Trust (One-time Setup)
On your **Primary DB Server** (`34.172.151.20`):
1.  Generate an SSH key (if you don't have one):
    ```bash
    ssh-keygen -t rsa -b 4096
    # Press Enter for all prompts (no passphrase)
    ```
2.  Copy the key to the Secondary VM:
    ```bash
    ssh-copy-id user@10.128.0.3
    # You will need the password for the Secondary VM user initially.
    ```

### Step 2: Update the Script
Modify your `/home/user/mongo_backup.sh` to include the remote copy command.

Add this section **before** the cleanup step:

```bash
# ... after mongodump ...

# 4. REMOTE TRANSFER
REMOTE_USER="user"
REMOTE_HOST="10.128.0.3"
REMOTE_DIR="/home/user/backups"

echo "Transferring to Secondary VM..."
scp $BACKUP_DIR/mongo_backup_$TIMESTAMP.gz $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

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
2.  Send a copy to `10.128.0.3`.
3.  Report success.

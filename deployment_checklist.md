# Deployment Checklist

> [!IMPORTANT]
> **STOP.** Do not deploy without completing this checklist.
> **PRIMARY ENVIRONMENT:** Garaj Cloud (Migrated from Google Cloud).

## Pre-Flight Checks (Local)
- [ ] **Code Review**: verified all changes are committed and pushed?
- [ ] **Lint & Build**: verified `npm run build` succeeds locally?
- [ ] **Environment Variables**:
    - [ ] Checked `.env` configuration.
    - [ ] Ensured **API_KEY** and **GEMINI_API_KEY** are present/updated.
    - [ ] Ensured **JWT_SECRET** is present.
    - [ ] Ensured **MONGODB_URI** is referencing the Garaj internal DB if setting up full env.

## Garaj Staging / Testing
- [ ] **Test Deployment**:
    - [ ] Run `./deploy_garaj/deploy_code_only.sh` (if testing code updates).
    - [ ] Or run `./deploy_garaj/go_garaj.sh` (for full env provision/reset).
- [ ] **Verification**:
    - [ ] Log in to App URL (http://119.160.105.120).
    - [ ] **Test Critical Features**:
        - [ ] Upload a dummy bid document to test AI analysis (verifies API Key).
        - [ ] Check Dashboard load (verifies DB connection).

## Production Deployment (Garaj)
- [ ] **Only proceed if verify passed.**
- [ ] **Execute Deployment**:
    - [ ] Run `./deploy_garaj/go_garaj.sh`
- [ ] **Verification**:
    - [ ] Log in to Production URL.
    - [ ] Check recent Audit Logs to ensure system is recording activity.

## Post-Mortem (if failure occurs)
- [ ] Check logs on the VM directly:
    ```bash
    ssh -p 2255 root@119.160.105.120 "pm2 logs bidsflow"
    ```

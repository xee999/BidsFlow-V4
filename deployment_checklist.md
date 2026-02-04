# Deployment Checklist

> [!IMPORTANT]
> **STOP.** Do not deploy without completing this checklist.
> Negligence leads to downtime.

## Pre-Flight Checks (Local)
- [ ] **Code Review**: verified all changes are committed and pushed?
- [ ] **Lint & Build**: verified `npm run build` succeeds locally?
- [ ] **Environment Variables**:
    - [ ] Checked `.env.staging` or `.env.production` for completeness.
    - [ ] Ensured **API_KEY** and **GEMINI_API_KEY** are present.
    - [ ] Ensured **JWT_SECRET** is present.
    - [ ] Ensured **MONGODB_URI** is correct for the target environment.

## Staging Deployment
- [ ] Run `./deploy.sh staging`
- [ ] **Verification**:
    - [ ] Script `verify.sh` passed?
    - [ ] Log in to Staging URL.
    - [ ] **Test Critical Features**:
        - [ ] Upload a dummy bid document to test AI analysis (verifies API Key).
        - [ ] Check Dashboard load (verifies DB connection).

## Production Deployment
- [ ] **Only proceed if Staging Verification passed.**
- [ ] Run `./deploy.sh production`
- [ ] **Verification**:
    - [ ] Script `verify.sh` passed?
    - [ ] Log in to Production URL.
    - [ ] Check recent Audit Logs to ensure system is recording activity.

## Post-Mortem (if failure occurs)
- [ ] Do not just re-deploy. Check logs first:
    ```bash
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=bidsflow-app" --limit 20
    ```

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1CZa5p1Imns8ZGl-LqgshKqTDnTi0U_-3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## 🛡️ Developer Guidelines & Protocols

### 1. Deployment Protocol (The "Staging First" Rule)
**NEVER deploy directly to Production.**
1.  **Develop Locally**: `npm run dev`
2.  **Deploy to Staging**:
    ```bash
    gcloud run deploy bidsflow-staging --project gen-lang-client-0197652040
    ```
    *   *Verify*: Check https://bidsflow-staging-661116307651.us-central1.run.app
3.  **Promote to Production**:
    ```bash
    gcloud run deploy bidsflow-app --project gen-lang-client-0197652040
    ```

### 2. Data Safety & Backups
*   **Production DB**: Self-hosted VM at `34.172.151.20`.
*   **Backup Server**: Secondary VM at `136.111.109.139` (Internal: `10.128.0.3`).
*   **Automation**: A cron job runs daily at 03:00 AM on Prod, dumping data and `scp`ing it to Backup Server.
*   **Emergency Backup Command** (Run on Prod VM):
    ```bash
    ./mongo_backup.sh
    ```

### 3. Business Logic (Revenue Streams)
When updating classifiers, ensure these 3 keys are always maintained:
1.  **Cloud & IT**: Hardware, Productivity Suites, Cloud Infrastructure.
2.  **Managed Services**: Security, Connectivity, MSSP.
3.  **System Integration (SI)**: Custom Software, specialized implementatons.

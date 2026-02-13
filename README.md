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

### 1. Deployment Protocol (GARAJ PRODUCTION)
**NOTE: We have migrated from Google Cloud to Garaj as our primary Production Environment.**

1.  **Develop Locally**: `npm run dev`
2.  **Deploy to Garaj Production**:
    *   **Deployment Script**: `./deploy_garaj/go_garaj.sh`
    *   *Note*: This script allows full provisioning. For code-only updates, use `./deploy_garaj/deploy_code_only.sh`.
    *   *Verify*: Check http://119.160.105.120

### 2. Data Safety & Backups
*   **Production Environment**: Garaj VMs.
*   **Database**: MongoDB hosted on Garaj DB VM (`119.160.105.121`).
*   **Application**: Hosted on Garaj App VM (`119.160.105.120`).
*   **Backups**: Maintained within the Garaj infrastructure.

### 3. Business Logic (Revenue Streams)
When updating classifiers, ensure these 3 keys are always maintained:
1.  **Cloud & IT**: Hardware, Productivity Suites, Cloud Infrastructure.
2.  **Managed Services**: Security, Connectivity, MSSP.
3.  **System Integration (SI)**: Custom Software, specialized implementatons.

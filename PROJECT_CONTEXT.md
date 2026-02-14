# BidsFlow-V4 Project Context
*Generated on 2026-02-08*

This document provides a comprehensive overview of the **BidsFlow-V4** application, its architecture, core functionality, and recent development history. It is designed to serve as the "brain" for the project, allowing AI agents and developers to quickly understand the system state.

## 1. Project Overview
BidsFlow is a sophisticated **Bid Management & Governance System** built for high-stakes B2B/B2G proposal management. It streamlines the entire lifecycle of a bid from intake to submission, incorporating AI-powered analysis, strict stage gating, and comprehensive risk assessment.

### Tech Stack
- **Frontend**: React (Vite), TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Build Tooling**: Vite, ESLint
- **Key Libraries**: `framer-motion` (animations), `recharts` (analytics), `jszip` (bulk processing), `jspdf`/`html2canvas` (reporting).
- **Backend/Services**: Custom `api.ts` connecting to Cloud Run endpoints, Local Storage handling for offline resilience.

---

## 2. Core Modules & Functionality

### 🎛️ **Dashboard & Control Tower**
- Central command center displaying critical metrics: Win/Loss rates, Active Bids, Pipeline Value, and TCV (Total Contract Value).
- **Control Tower**: Visualizes agent workflows, roles, and process automation status.
- **Orchestration**: Toggle switches for enabling/disabling specific AI agents.

### 📝 **Bid Intake & Management**
- **Intake Form**: Standardized entry for new opportunities with fields for customer, deadline, and TCV.
- **Bid Lifecycle Engine** (`BidLifecycle.tsx`):
    - **Stage Gating**: Strict progression through stages: `Intake -> Qualification -> Solutioning -> Pricing -> Compliance -> Final Review`.
    - **Timing Analysis**: Calculates "On Track/Behind" status based on complexity weights (`High/Medium/Low`) and remaining days.
    - **T-Minus Alerts**: Visual warnings for bids approaching deadlines (e.g., "T-2 Days").

### 🤖 **AI & Automation Features**
- **Intelligent Document Processing (IDP)**:
    - **RFP Analysis**: Auto-extracts requirements and scope from uploaded RFPs.
    - **Compliance Matrix**: auto-generates compliance checklists from tender documents.
    - **Pricing Analysis**: Parses BOQs/Financial formats to populate pricing tables.
    - **Bid Security Scan**: Validates bank guarantees and bid bonds against required amounts.
- **Proposal Studio** (`ProposalStudio.tsx`):
    - **AI Drafting**: Generates professional proposal content based on uploaded assets and context.
    - **Vault Integration**: Direct access to reusable corporate assets (case studies, certs) for drag-and-drop inclusion.
    - **HTML/PDF Export**: Compiles sections into a styled final proposal document.

### 🗓️ **Calendar & Scheduling**
- **Visual Calendar**: Monthly/Weekly views of bid deadlines and key events.
- **Status Colorization**: DISTINCT visual styles for "No Bid" (Grey), Active (Green/Blue), and Critical (Red) items.
- **Hover Details**: Tooltips showing "Current Stage" and key metadata.

### 🔔 **Notification Engine** (`notificationEngine.ts`)
- **Polling System**: Background service checking for deadlines, meetings, and stalled bids every minute.
- **Smart Alerts**:
    - **Deadline**: 24h, 12h, 2h, 1h warnings.
    - **Stalled Bids**: Alerts when a bid sits in a stage longer than the threshold (default 3 days).
    - **Browser Notifications**: Native system notifications for critical events.

### 📊 **Reports & Analytics**
- **Detailed Reporting**: Breakdown of wins, losses, no-bids, and rigorous stage duration tracking.
- **Strategic Analysis**: "No Bid" reasoning breakdown with strategic categories and counting.

### 🔐 **Security & RBAC**
- **Permission Guard**: Granular access control based on user roles (`SUPER_ADMIN`, `BID_TEAM`, `VIEWER`).
- **Audit Reports**: Full immutability log of all actions (Stage changes, document uploads, user logins).

---

## 3. Data Models (`types.ts`)

| Model | Description | Key Fields |
| :--- | :--- | :--- |
| **BidRecord** | The core entity. | `id`, `currentStage`, `status`, `deadline`, `complianceChecklist`, `technicalDocuments`, `financialFormats` |
| **User** | System users. | `id`, `role`, `permissions`, `avatar` |
| **Notification**| System alerts. | `type`, `priority`, `readStatus`, `triggerTime` |
| **TechnicalDocument** | Assts/Docs. | `category` (Tender, Pricing, etc.), `aiTags`, `aiSummary` |

---

## 4. Key Configuration & Setup

### Environment
- **API Endpoints**: Defined in `.env` (or defaulted in code).
- **Feature Flags**: Controlled via `constants.tsx` or dynamic settings.

### Permissions
- **Super Admin**: Full access to all modules, including User Management and Delete operations.
- **Bid Team**: Read/Write on bids, confined to their assigned items.
- **Viewer**: Read-only access for executives.

---

## 5. Infrastructure & Deployment

The application follows a dual-cloud strategy for production and testing:

| Environment | Platform | Purpose | Deployment Command |
| :--- | :--- | :--- | :--- |
| **Production** | **Garaj Cloud** | Primary customer-facing application. | `npm run deploy:prod` |
| **Test Server** | **Google Cloud** | Unified VM hosting both App & DB. | `npm run deploy:test` |
| **Staging** | **Google Cloud** | Pre-production validation. | (via gcloud script) |

- **Project ID (GCP)**: `gen-lang-client-0197652040` (Renamed to "BidsFlow Test Server")
- **Containerization**: Docker-based deployment on both platforms.
- **Database**: MongoDB (Atlas or self-hosted depending on environment).

---

## 6. Recent Version History (Log)

| Feature | Details | Status |
| :--- | :--- | :--- |
| **No-Bid Logic** | Added "Strategic Analysis" field and summary tables for No-Bid reasons. | ✅ Deployed |
| **Calendar UI** | "No Bid" items now rendered in dull grey; added hover stage details. | ✅ Deployed |
| **Notifications** | Implemented `NotificationManager` with permission handling and native browser alerts. | ✅ Deployed |
| **Crash Fixes** | Fixed `ReportsView` null pointer exceptions on missing integrity breakdown data. | ✅ Deployed |
| **Dashboard** | Logic update: Show bids due *from tomorrow onwards* only. | ✅ Deployed |
| **Data Sync** | Excel ingestion of 139 historic bids with accurate "days in stage" calculation. | ✅ Deployed |
| **Code Cleanup** | Removed 191 unused dependencies and organized root directory scripts. | ✅ Deployed |
| **Server Repurposing**| Google Cloud Production renamed to "BidsFlow Test Server"; Garaj promoted to Prod. | ✅ Live |

---

## 6. Known Issues / Active Tasks
- **Quota Scheduling**: "Second Brain" agent scheduling is currently being planned to respect API quotas.
- **Dashboard Filters**: Recent fixes applied, monitoring for regression.

---

> **Note**: This file should be kept in the root directory. If the project folder is moved, simply open the new folder and read this file to restore context.

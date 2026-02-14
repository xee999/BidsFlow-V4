# Project Plan: BidsFlow Enterprise Hardening & ISG Compliance

**Version:** 1.0  
**Date:** February 13, 2026  
**Subject:** Technical Implementation Roadmap for ISG Approval  

---

## 1. Executive Summary
Following the security review by the Information Security Governance (ISG) team, the BidsFlow platform has been granted "Conditional Acceptance" subject to the implementation of enterprise-grade security controls. This document outlines the technical workstreams required to mitigate residual risks from "Medium-High" to an acceptable "Medium" level for production go-live on the Garaj platform.

---

## 2. Technical Workstreams

### Workstream 1: Identity & Access Management (IAM)
*Objective: Eliminate tenant-wide exposure and harden service accounts.*

| ID | Task | Implementation Detail |
| :--- | :--- | :--- |
| **IAM-01** | **Exchange App Access Policy** | Implement `New-ApplicationAccessPolicy` to restrict the Azure AD App ID specifically to the `bids@jazz.com.pk` mailbox. |
| **IAM-02** | **Conditional Access (CA)** | Restrict `svc-bidsflow@jazz.com.pk` to Jazz Corporate Network IP ranges via Azure AD CA policies. |
| **IAM-03** | **OAuth Token Life-cycle** | Configure refresh token rotation and set TTL (Time-to-Live) limits to prevent persistent session risks. |

### Workstream 2: Application Development (Security-by-Design)
*Objective: Implement Proactive DLP and Secrets Management.*

| ID | Task | Status | Implementation Detail |
| :--- | :--- | :--- | :--- |
| **APP-01** | **Azure Key Vault Integration** | In Progress | Terminate use of local `.env` or config files for secrets. Implement runtime fetching from **Azure Key Vault**. |
| **APP-02** | **Dynamic PDF Watermarking** | **COMPLETED** | Stamping all downloaded documents with User identity and "CONFIDENTIAL". |
| **APP-03** | **FortiSIEM Log Export** | **COMPLETED** | Application audit logs exported with SIEM prefixes to console/endpoint. |
| **APP-04** | **Enhanced Session Control** | **COMPLETED** | Enforced 30-minute session timeouts and inactivity locking. |

### Workstream 3: Infrastructure & Operations
*Objective: Harden the Garaj hosting environment.*

| ID | Task | Status | Implementation Detail |
| :--- | :--- | :--- | :--- |
| **INF-01** | **EDR Deployment** | Pending | Jazz-standard **EDR** agents installation on production nodes. |
| **INF-02** | **Net-Segment & Firewall** | Pending | Strict egress rules for Graph API and OpenAI. |
| **INF-03** | **Patch & Vulnerability Mgmt** | Pending | Enrollment in Jazz vulnerability scanning program. |

---

## 3. Revised Security Architecture
The updated architecture moves from an "Open Trust" model to a **"Zero Trust"** framework:

1.  **Identity Layer:** Every API call to Outlook is checked against the *Application Access Policy*.
2.  **Secret Layer:** No credentials exist on the server; they are pulled from the *Secure Vault* just-in-time.
3.  **Data Layer:** Documents are processed in an *Isolated Subnet*; any export is *Watermarked* and *Logged*.
4.  **Monitoring Layer:** OS, App, and Azure AD logs are aggregated into *FortiSIEM* for real-time anomaly detection.

---

## 4. Timeline & Milestones (Compressed 48hr Sprint)

*   **T+0h (Completed):** Implementation of Watermarking, SIEM logging service, and Session Security logic.
*   **T+24h (Target):** Verification of M365 Application Access Policy and Azure Key Vault connectivity.
*   **T+48h (Target):** Full technical session prep with ISG and evidence gathering.

---

## 5. Risk Assessment (Residual)
| Phase | Risk Level | Primary Controls |
| :--- | :--- | :--- |
| **Pre-Implementation** | Medium-High | Local configuration, wide identity scope. |
| **Post-Implementation** | **Medium** | Centralized secrets, scoped access, EDR/SIEM visibility. |

---
**Prepared by:**  
BidsFlow Implementation Team - Technical Workstream Lead

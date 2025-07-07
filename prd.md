# Aqlen – Mobile Inspection MVP

> **Document type:** Product Requirements Document (PRD)\
> **Audience:** Founders, early engineers, DevOps, design\
> **Status:** Draft v0.1 · July 7 2025\
> **Owners:** Anees (Prod/Eng), IBM DevOps Co‑founder\
> **Review cadence:** Weekly sprint retro (Friday EOD)

---

## 0 · Design Principles

1. **Lean Loop Obsessed** – Iterate in ≤1‑week sprints, ship to prod daily.
2. **MVP First** – Scope to *one* outcome: *engineer captures site evidence → PDF in ≤30 min*.
3. **Opinionated, Boring Tech** – Expo SDK ≥50 + custom dev‑client, Cloud Run, Firestore; Terraform IaC.
4. **Data‑Driven** – North‑Star Metric: *Avg. prep time from last photo → PDF*. Track pirate metrics (AARRR).
5. **Security & Cost Mindful** – Least‑privilege IAM; stay within GCP \$300 credit window.
6. **Transparent Road‑mapping** – One Kanban board, MoSCoW priority, updated every retro.

---

## 1 · Background & Problem

Field and forensic engineers currently:

1. Record voice notes while walking a site.
2. Take 50‑200 photos that must be captioned later.
3. Manually merge audio‑derived notes, photos and tables into a formal PDF report.

This workflow consumes **3‑4 hours per claim** and is error‑prone (caption mismatches, missing images). Existing apps (e.g. CompanyCam, Site Audit Pro) tackle photo logging or fast PDF export but **none sync continuous audio with photos nor auto‑generate narrative PDFs**.

---

## 2 · Goals & Success Metrics

| Objective               | KPI                             | Target (MVP)                  |
| ----------------------- | ------------------------------- | ----------------------------- |
| Reduce report prep time | Avg. time (photo → PDF)         | **≤ 30 min**                  |
| Caption correctness     | % auto‑captions kept w/o edit   | **≥ 85 %**                    |
| Early adoption          | Weekly Active Inspectors (WAIs) | **≥ 10** (pilot firm)         |
| YC‑readiness            | Live end‑to‑end demo            | Before next YC batch deadline |

---

## 3 · Personas & Key Use Cases

| Persona                      | Primary Need                | Key Use Case                                            |
| ---------------------------- | --------------------------- | ------------------------------------------------------- |
| **Field Engineer** (primary) | Hands‑free evidence capture | Walk site → record audio → snap photos → one‑tap upload |
| **Claims Adjuster / PM**     | Fast, readable report       | Download auto‑generated PDF; request edits              |
| **Back‑office QA**           | Quality control             | Review / edit captions, regenerate PDF                  |

---

## 4 · Product Scope (MVP)

### 4.1 Mobile App (Expo React‑Native)

| Feature                    | Detail                                 | Acceptance Criteria                                  |
| -------------------------- | -------------------------------------- | ---------------------------------------------------- |
| Continuous audio track     | Record in‑app (AAC 96 kbps, mono)      | 30‑min recording ≤ 20 MB; no gap on backgrounding    |
| Photo capture w/ timestamp | `expo‑camera`; store `photo_timestamp` | Photo timestamp within ±100 ms of system clock       |
| Offline‑first queue        | SQLite; retries on network             | Complete upload after 3 offline uploads in flight    |
| Minimal job form           | Client, address, claim #, date         | Validation errors inline; no empty submits           |
| Review & submit screen     | Thumbnails + auto captions             | Engineer can edit caption inline then tap **Upload** |

### 4.2 Backend & Cloud Services (GCP)

| Component                   | Purpose / Tech                                      | Notes                                      |
| --------------------------- | --------------------------------------------------- | ------------------------------------------ |
| **Cloud Run** `api-gateway` | REST + Auth (Firebase)                              | OpenAPI spec; CI deploy via GitHub Actions |
| **Cloud Functions v2**      | Async jobs (transcribe, caption, pdf)               | Triggered by Pub/Sub topics                |
| Speech‑to‑Text              | Audio → transcript                                  | Enhanced model, punctuation on             |
| Vertex AI Gemini            | Transcript window → 25‑word caption                 | Fallback to Vision API labels              |
| Firestore                   | Structured data (jobs, photos, captions)            | Native mode, regional = `us‑central1`      |
| Cloud Storage               | Media buckets: `audio‑raw`, `images‑raw`, `pdf‑out` | Signed URL uploads from mobile             |

### 4.3 Admin Dashboard (Next.js 13 / Vercel)

- List inspections with status chips (Draft/Ready/Error).
- Inline caption edits → **Regenerate PDF** button.
- Download link secure via Firebase Auth token.

---

## 5 · Out‑of‑Scope (MVP)

- Multi‑language transcription.
- Desktop photo uploader.
- Advanced cost‑estimation logic – stub CSV import only.
- Granular role matrix beyond Engineer/Admin.

---

## 6 · User Stories (High Priority)

| ID    | As a …         | I want …                                      | So that …                                |
| ----- | -------------- | --------------------------------------------- | ---------------------------------------- |
| US‑01 | Field Engineer | start an inspection & record audio hands‑free | I can focus on safety                    |
| US‑02 | Field Engineer | each photo auto‑captioned from recent speech  | I avoid typing on site                   |
| US‑03 | Field Engineer | review captions before upload                 | I catch obvious errors                   |
| US‑04 | Admin          | download a formatted PDF                      | I can send it straight to insurer        |
| US‑05 | Admin          | edit any caption & re‑export                  | I fix mistakes without re‑capturing data |

---

## 7 · Technical Architecture Overview

```
Mobile (Expo dev‑client)
   ↓ HTTPS (signed URL request)
Cloud Run  — Firestore
   ↘            ↘
    Pub/Sub → Cloud Functions (transcription → caption → pdf)
                ↘           ↘
           Speech‑to‑Text    Vertex AI · Vision API
                ↘           ↘
               Cloud Storage (media)
```

- **Auth** – Firebase Auth (email + magic‑link).
- **Observability** – Cloud Logging, Error Reporting, GCP Profiler.
- **IaC** – Terraform; state in remote GCS bucket.

---

## 8 · Risks & Mitigations

| Risk                        | Impact             | Mitigation                                                        |
| --------------------------- | ------------------ | ----------------------------------------------------------------- |
| Noisy environments hurt ASR | Bad captions       | Add RN `expo‑audio` noise‑suppression; allow manual edit          |
| Large media on LTE          | Upload fails       | Compress image (1600 px, 85 JPEG); chunked uploads                |
| Expo Go API limits          | Blocked testing    | Use custom dev‑client via `eas build --profile development`       |
| GCP cost overrun            | Burn credits early | Budget alerts at 50 / 80 / 100 % of \$300; scale‑to‑zero services |

---

## 9 · Analytics & Metrics

- **North‑Star:** avg. minutes from last photo → PDF ready.
- Funnel: *Active jobs started → Jobs uploaded → PDFs downloaded*.
- Retention: WAIs plotted weekly (target ≥ 10).
- Dashboards in Looker Studio; BigQuery sink from Firestore export.

---

## 10 · Milestones & Timeline (12‑Week Plan)

| Week | Deliverable                                             |
| ---- | ------------------------------------------------------- |
| 0–1  | Design sprint; finalize PDF template; scaffold monorepo |
| 2–4  | Mobile capture (audio + photo) complete                 |
| 5    | Cloud Run + transcription pipeline                      |
| 6    | Captioning + PDF renderer                               |
| 7–8  | Internal pilot; bug fixes; golden dataset logged        |
| 9    | Admin dashboard v0.1 launch                             |
| 10   | First external pilot customer onboarded                 |
| 11   | Security hardening, logging, alerts                     |
| 12   | YC demo & application package                           |

---

## 11 · Acceptance Criteria (End‑to‑End)

1. Engineer records a 5‑min walkthrough with 10 photos; presses **Upload** once network returns.
2. Within **30 minutes**, Admin dashboard shows *Ready*, captions 85 % correct.
3. PDF matches provided template sections and passes manual QA.

---

## 12 · Appendix

### JSON Schema `inspection.json` (v1)

```json
{
  "id": "string",                // UUID
  "client": "string",
  "address": "string",
  "claimNumber": "string",
  "inspectionDate": "YYYY-MM-DD",
  "photos": [
    {
      "id": "string",
      "url": "string",
      "timestamp": "ISO8601",
      "caption": "string"
    }
  ],
  "audioUrl": "string",
  "transcriptUrl": "string",
  "pdfUrl": "string",
  "status": "DRAFT|PROCESSING|READY|ERROR",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### Report Template Requirements (condensed)

- **Cover Page** – Client, location, date.
- **Property Description** – Auto‑populate; allow free‑text.
- **Observations** – Table: photo thumb, caption, timestamp.
- **Scope & Cost** – Placeholder CSV import.
- **Conclusions & Sign‑off** – Engineer name + drawn signature.

---

## 13 · Next Steps

1. **Create GCP project & enable APIs** (Speech, Vertex, Firestore, Cloud Run, Storage).
2. **Bootstrap Terraform repo** – project, billing link, service accounts, buckets, Firestore.
3. **Generate custom Expo dev‑client** and test camera + mic on device.
4. **Record a golden dataset** (2‑min audio + 5 photos) for CI regression tests.

---

*Ship fast, iterate, and talk to users.*


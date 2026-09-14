# 👁️ iRetina - AI-Powered Diabetic Retinopathy Diagnostic Workstation

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.2.0-red.svg)](https://pytorch.org/)
[![NodeJS](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-cyan.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-darkgreen.svg)](https://www.mongodb.com/atlas)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Clinical-grade automated fundus screening, ETDRS severity classification, and explainable Grad-CAM lesion localization powered by Deep Learning.**

---

## 📋 Table of Contents
- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [ETDRS Clinical Staging](#-etdrs-clinical-staging)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)
- [Contact & Support](#-contact--support)

---

## 🚨 Problem Statement

### The Challenge
Diabetic Retinopathy (DR) is the leading cause of preventable blindness worldwide:
- **Asymptomatic Early Stages**: Microaneurysms develop silently without visual impairment.
- **Critical Shortage of Specialists**: Low ophthalmologist-to-patient ratio causes long screening backlogs.
- **Diagnostic Fatigue & Subjectivity**: High intra- and inter-observer variability during manual fundus inspection.
- **Delayed Intervention**: Late-stage proliferative DR and macular edema often lead to permanent vision loss.

### The Gap
While digital fundus cameras are widely available, existing clinics lack:
- Instant, multi-stage automated triage at primary health centers.
- Explainable AI (XAI) that visually validates predictions for clinicians.
- Integrated digital workflows connecting patient records, optical filters, and certified clinical reports.

---

## 💡 Solution Overview

**iRetina Workstation** bridges this gap by providing an end-to-end clinical diagnostic system:
- 🧠 **DenseNet-121 Architecture** for 5-stage International Clinical Diabetic Retinopathy (ICDR/ETDRS) grading.
- 🔬 **Grad-CAM & Morphological Contours** for transparent microaneurysm, exudate, and hemorrhage mapping.
- 🖥️ **Interactive Tele-Ophthalmology Viewport** equipped with red-free filters, ETDRS grids, and digital magnification.
- 📄 **Certified Diagnostic Reports** with automated 2-page clinical PDF exports and longitudinal EHR archiving.

### How It Works
1. **Intake & Upload** → Attending physician uploads a standard 50° digital fundus photograph.
2. **Preprocessing Pipeline** → Aspect-ratio cropping and Ben Graham local contrast enhancement.
3. **Deep Learning Inference** → DenseNet-121 extracts high-level retinal features and classifies severity.
4. **Grad-CAM Attention Mapping** → Localizes pathological regions and marks lesion bounding clusters.
5. **Electronic Health Record Storage** → Node.js gateway registers patient history in MongoDB Atlas.
6. **Clinical Review & Export** → Viewport optical inspection and one-click PDF generation.

---

## ✨ Features

### Core Features
| Feature | Description |
|---|---|
| **🎯 Automated 5-Stage Staging** | Classifies fundus scans from Stage 0 (No DR) to Stage 4 (Proliferative DR). |
| **🔍 Explainable AI (Grad-CAM)** | Highlights exact regions of concern (ischemia, microvascular leaks). |
| **📦 Dynamic Lesion Bounding** | Detects and clusters microaneurysms, hemorrhages, and hard exudates. |
| **🌐 Telemetric Optical Viewport** | 540nm Red-Free, high gamma, invert tones, and ETDRS macular grid overlays. |
| **📄 Certified PDF Audit Export** | Generates tamper-proof 2-page pathology summaries for clinical records. |
| **🔐 Role-Based Access Control** | Dedicated portals for Attending Clinicians and Registered Patients. |

### Advanced Features
| Feature | Description |
|---|---|
| **⚡ Low-Memory Optimized Inference** | Zero-memory DenseNet feature extraction operating within 512MB RAM constraints. |
| **🛡️ Resilience to Cold Starts** | 90-second timeout handling and gateway sanitization for zero connection drops. |
| **📊 Longitudinal EHR Tracking** | Chronological record search and progression monitoring for registered patients. |
| **🎨 Responsive Medical UI** | High-contrast dark ergonomic theme designed for ophthalmology workstations. |

---

## 🛠️ Tech Stack

### Frontend Client
| Technology | Purpose |
|---|---|
| **React 18** | Interactive single-page workstation application |
| **Axios** | Resilient HTTP client configured with cold-boot tolerance |
| **Canvas & SVG** | Telecentric zoom, viewport panning, and ETDRS grid overlays |

### API Gateway & EHR Backend
| Technology | Purpose |
|---|---|
| **Node.js & Express** | Secure middleware gateway and multipart stream handling |
| **MongoDB Atlas** | Cloud NoSQL storage for clinical records and user authentication |
| **JWT & Bcrypt.js** | Token-based security and encrypted credential storage |
| **PDFKit** | Dynamic generation of 2-page certified clinical audit documents |

### AI Deep Learning Engine
| Technology | Purpose |
|---|---|
| **FastAPI** | High-throughput asynchronous ASGI microservice |
| **PyTorch & Torchvision** | DenseNet-121 CNN transfer learning architecture |
| **Grad-CAM** | Gradient-weighted Class Activation Mapping for visual explainability |
| **OpenCV** | Color space transformations, morphology, and lesion contour bounding |

---

## 🔬 ETDRS Clinical Staging

The classifier aligns with the **International Clinical Diabetic Retinopathy (ICDR)** standard:

| Stage | Classification | Clinical Presentation | Recommended Action |
|:---:|:---|:---|:---|
| **0** | **No Apparent DR** | Intact microvasculature, sharp foveal margins. | Annual routine screening, glycemic monitoring. |
| **1** | **Mild NPDR** | Isolated microaneurysms in focal retinal zones. | Follow-up in 6 to 9 months; lipid profile review. |
| **2** | **Moderate NPDR** | Multiple dot-blot hemorrhages, hard lipid exudates. | Ophthalmology referral within 4 to 8 weeks; OCT scan. |
| **3** | **Severe NPDR** | >20 intraretinal hemorrhages per quadrant, IRMA. | Urgent retina consult within 1 to 2 weeks; FFA prep. |
| **4** | **Proliferative DR** | Neovascularization (NVD/NVE), vitreous bleed risk. | Emergency evaluation (24-48h); PRP laser / Anti-VEGF. |

---

## 📦 Installation

### Prerequisites
- Node.js v18+
- Python v3.10 - v3.12
- MongoDB Atlas Cluster

### 1. Clone the Repository
```bash
git clone https://github.com/Aditya-Sharma-dev18/iRetina-Diabetic-Retinopathy-Detector.git
cd iRetina-Diabetic-Retinopathy-Detector
```

### 2. Setup AI Inference Engine (FastAPI)
```bash
cd ai_service
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Setup Backend Gateway (Node.js)
```bash
cd ../backend
npm install
npm start
```

### 4. Setup Frontend Client (React)
```bash
cd ../frontend
npm install
npm run dev
```

---

## 🎯 Usage

### Clinical Workflow
1. Open the portal (http://localhost:5173 or deployed instance).
2. Sign in as a Doctor or register an attending profile.
3. In the Fundus Exam Console, enter the patient email.
4. Upload a 50° fundus scan (.jpg, .png).
5. Click **Run Clinical Biomarker Inference**.
6. Review classification, examine the Lesion Overlay with 540nm Red-Free mode, and click **Export Certified 2-Page Pathology Report**.

---

## 📡 API Endpoints

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/register` | POST | Public | Register doctor or patient profile |
| `/api/auth/login` | POST | Public | Verify credentials and receive JWT |
| `/api/reports/analyze` | POST | Doctor | Ingest fundus scan, trigger AI inference |
| `/api/reports/all` | GET | Doctor | Retrieve hospital-wide diagnostic repository |
| `/api/reports/my` | GET | Patient | Retrieve personal screening history |
| `/api/reports/:id/pdf` | GET | Doctor/Patient | Generate certified clinical PDF |
| `/api/v1/diagnose` | POST | Internal | FastAPI deep learning endpoint |
| `/health` | GET | Public | Microservice health check |

---

## 🔧 Troubleshooting

| Issue | Root Cause | Solution |
|---|---|---|
| 502 Bad Gateway | FastAPI engine killed by Render 512MB RAM ceiling during backward pass. | Restricted gradients to classification head; frozen DenseNet backbone in `torch.no_grad()`. |
| Request Timeout | Free-tier instances entering sleep state (cold starts). | Configured Axios with 90s threshold; pre-warm engine via `/docs`. |
| Invalid URL Alert | Environment variables containing markdown syntax or quotes. | Added regex sanitization in `server.js`. |
| Atlas DNS Lookup Fail | Strict local ISP blocking SRV resolution. | Enforced Google Public DNS (8.8.8.8) at process runtime. |

---

## 📄 License
This project is distributed under the MIT License. Refer to the LICENSE file for complete details.

---

## 📞 Contact & Support
**Lead Developer:** Aditya Sharma
**Email:** sharma.adityaaa0001@gmail.com
**Repository:** iRetina-Diabetic-Retinopathy-Detector

Made with ❤️ for AI-Assisted Ophthalmology

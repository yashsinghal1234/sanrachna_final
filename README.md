# 🏗️ Sanrachna — Construction Management Platform

> **सनरचना** *(n.)* — Sanskrit for *"structure" or "construction"*

Sanrachna is a full-stack, AI-powered construction management platform built to bridge the gap between field workers, site engineers, and project stakeholders. It provides real-time project tracking, AI-assisted planning, intelligent reporting, and collaborative tools — all in one unified interface.

---

## 📸 Overview

Sanrachna consolidates the entire construction workflow — from initial cost estimation and AI-generated project plans to daily logs, task assignment, issue tracking, RFIs, procurement, and emergency incident management — into a role-aware, cloud-deployable platform.

---

## ✨ Features

### 🧠 AI-Powered Planning Studio
- Generate complete project plans using the **DeepSeek AI** API
- Auto-generates tasks, milestones, resource allocations, and material procurement lists from a natural-language project brief
- Role-aware AI Copilot with persistent chat history and project-context awareness

### 📊 Interactive Dashboard
- Live project health score, cost burn rate, and schedule adherence
- Gantt-style timeline visualization
- Procurement status tracker and resource utilization cards

### 📋 Task Management
- Role-based task assignment (Engineer → Worker)
- Status updates, priority flags, and deadline tracking
- Real-time task feed with filtering and search

### 🧾 Daily Logs
- Workers can submit daily progress logs from the field
- Engineers can review, approve, or flag entries
- Exportable log history per project

### 🚨 Emergency & Safety Management
- Incident reporting with severity classification
- Emergency contact directory with one-tap alert capability
- Safety incident audit trail

### 📄 Document Management
- Secure file upload and storage per project
- Document categorization (contracts, drawings, approvals)
- Version-tracked document access

### 💬 RFI (Request for Information)
- Structured RFI submission and response workflow
- Status tracking: Open → In Review → Closed
- Threaded comments between field and office teams

### ⚠️ Issue Tracker
- Raise, assign, and resolve site issues
- Priority classification and assignee management
- Link issues to tasks and daily logs

### 💰 Cost & Resource Management
- Live cost vs. budget tracking per phase
- Resource allocation visualization
- Procurement planning aligned with project timeline

### 📈 ML-Based Cost Estimation
- Predict project cost from parameters using trained ML model (`estimate_model.pkl`)
- Helps stakeholders get realistic budget forecasts before committing

### 📑 PDF Report Engine
- AI-generated narrative construction reports (Python / FastAPI)
- Phase-by-phase analysis with cost, timeline, and risk breakdowns
- Exportable to PDF using ReportLab

### 👤 Role-Based Access Control
- Three roles: **Owner**, **Engineer**, **Worker**
- Each role sees a tailored dashboard with relevant features
- JWT-secured authentication with refresh flows

---

## 🏛️ Architecture

```
Sanrachna/
├── frontend-v2/          # React 19 + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── pages/        # All UI pages (Dashboard, Tasks, Issues, RFI, etc.)
│       ├── components/   # Reusable UI components
│       ├── lib/          # API hooks, utilities, demo data
│       └── store/        # Zustand global state
│
├── backend/              # Node.js + Express REST API
│   └── src/
│       ├── models/       # Mongoose schemas (User, Task, Issue, RFI, etc.)
│       ├── controllers/  # Business logic handlers
│       ├── routes/       # Express route definitions
│       ├── services/     # DeepSeek AI, file handling
│       ├── middleware/   # Auth (JWT), role guards
│       └── ml/           # ML model integration (cost estimation)
│
└── report-engine/        # Python FastAPI microservice
    └── app/
        ├── main.py       # FastAPI app entrypoint + route handlers
        ├── models.py     # Pydantic schemas
        ├── models_planning.py  # Planning-specific schemas
        └── services/     # AI report generation, PDF export
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 |
| **State Management** | Zustand |
| **Charts & Visualization** | Recharts, React Google Charts |
| **Forms** | React Hook Form + Zod |
| **Backend API** | Node.js, Express v5 |
| **Database** | MongoDB + Mongoose |
| **Authentication** | JWT (jsonwebtoken + bcryptjs) |
| **File Uploads** | Multer |
| **AI / LLM** | DeepSeek API (OpenAI-compatible) |
| **Report Engine** | Python, FastAPI, Uvicorn |
| **PDF Generation** | ReportLab |
| **ML Estimation** | scikit-learn (pre-trained `.pkl` model) |
| **Deployment** | Vercel (frontend) + Render (backend + report engine) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.11
- MongoDB (Atlas URI or local)
- DeepSeek API key

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/sanrachna.git
cd sanrachna
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file (see `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/sanrachna
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

Start the dev server:

```bash
npm run dev
```

---

### 3. Report Engine Setup

```bash
cd report-engine
pip install -r requirements.txt
```

Create a `.env` file:

```env
CORS_ORIGINS=http://localhost:5173
HF_TOKEN=hf_xxxxxxxxxxxxxxxx   # Optional: HuggingFace token if using HF router
```

Start the report engine:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 4. Frontend Setup

```bash
cd frontend-v2
npm install
```

Create a `.env` file (see `.env.example`):

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_PLANNING_API_BASE=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

The app will be available at **http://localhost:5173**

---

## 🌐 Deployment

Sanrachna is configured for one-command deployment on **Render** (backend + report engine) and **Vercel** (frontend).

### Render (Backend + Report Engine)

A `render.yaml` is included at the root. Import your repo in [Render Dashboard](https://dashboard.render.com) and it will auto-detect both services.

Set the following in Render's environment dashboard:
- `MONGODB_URI`
- `JWT_SECRET`
- `CORS_ORIGIN` → your Vercel URL
- `DEEPSEEK_API_KEY`
- `HF_TOKEN` (report engine)
- `CORS_ORIGINS` (report engine) → your Vercel URL

### Vercel (Frontend)

Push `frontend-v2/` or import the repo in [Vercel](https://vercel.com). Set:
- `VITE_BACKEND_URL` → your Render backend URL
- `VITE_PLANNING_API_BASE` → your Render report engine URL

A `vercel.json` is included for SPA routing support.

---

## 📡 API Reference (Key Endpoints)

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Authenticate and receive JWT |

### Projects & Workspaces
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/workspaces` | List user's workspaces (projects) |
| POST | `/api/workspaces` | Create a new project |
| GET | `/api/projects/:id/tasks` | Get tasks for a project |
| POST | `/api/projects/:id/tasks` | Create a task |
| POST | `/api/projects/:id/issues` | Raise an issue |
| GET | `/api/projects/:id/rfis` | List RFIs |
| POST | `/api/projects/:id/logs` | Submit a daily log |

### Report Engine (FastAPI — port 8000)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/generate-report` | Generate AI construction report |
| POST | `/export-pdf` | Export report to PDF |
| POST | `/plan` | Generate AI project plan |

---

## 🗂️ Environment Variables

### Backend (`.env`)
| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `DEEPSEEK_API_KEY` | DeepSeek API key for AI Copilot |

### Frontend (`.env`)
| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | Base URL of the Express backend |
| `VITE_PLANNING_API_BASE` | Base URL of the Python report engine |

### Report Engine (`.env`)
| Variable | Description |
|---|---|
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `HF_TOKEN` | HuggingFace API token (optional) |

---

## 🔮 Roadmap & Future Features

### 🗺️ Live Site Blueprint & Worker Map *(In Development)*
One of the most exciting features planned for Sanrachna is a **real-time interactive site map / blueprint system**:
- **Live Floor Plan View** — Upload a 2D architectural blueprint (DWG/PDF/image). Workers and engineers will appear as **live pins** on the map based on their assigned zones or GPS check-in.
- **Worker Location Tracking** — Workers scan a QR code at entry/exit points to mark their current zone. The dashboard shows a live heatmap of workforce distribution across the site.
- **Engineer Zone Assignment** — Engineers can divide the blueprint into named zones (Foundation, Block A, Electrical Wing, etc.) and assign teams to each zone.
- **Task-to-Zone Linking** — Tasks are pinned to a physical location on the blueprint so everyone knows exactly *where* work is happening.
- **Incident Markers** — Emergency incidents and safety issues automatically drop markers on the relevant blueprint location.

### 🧱 3D Building Model Viewer *(Planned)*
- **Interactive 3D Model** — Upload a `.glb` / `.gltf` building model (from Revit, AutoCAD, or SketchUp). Sanrachna will render it in-browser using **Three.js** or **Babylon.js**.
- **Progress Overlay** — Completed floors/sections are color-coded (green = done, yellow = in-progress, red = blocked) directly on the 3D model.
- **Click-to-Inspect** — Click on any structural element to see its associated tasks, issues, materials used, and engineer responsible.
- **BIM Integration** — Planned support for IFC (Industry Foundation Classes) format for deep BIM (Building Information Modeling) data integration.
- **Time-Lapse Simulation** — Animate the 3D model to simulate construction progress over the project timeline — a visual way to review schedule adherence.

### 🤖 Other Upcoming Features
- **Offline-First PWA Mode** — Workers on remote sites with no connectivity can submit logs and tasks offline, which sync automatically when back online.
- **Push Notifications** — Real-time alerts for new task assignments, issue escalations, and RFI responses via web push.
- **WhatsApp / SMS Integration** — Send task and emergency alerts to workers who don't have the app via WhatsApp Business API or SMS.
- **Advanced ML Estimations** — Expand the cost estimation model to include regional material pricing, weather delays, and labor productivity variations.
- **Document OCR** — Automatically extract and index data from uploaded drawing PDFs using OCR for searchability.
- **Multi-Language Support** — UI translations in Hindi, Marathi, Tamil, and other regional languages for on-ground workers.
- **Subcontractor Portal** — A limited-access view for subcontractors to view their scope, submit progress, and upload invoices.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow conventional commits and keep PRs focused on a single feature or fix.

---

## 📜 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [DeepSeek](https://platform.deepseek.com) — LLM powering the AI Copilot and Planning Studio
- [HuggingFace](https://huggingface.co) — Model hosting for the report generation pipeline
- [ReportLab](https://www.reportlab.com) — PDF generation library
- [Recharts](https://recharts.org) — Chart components
- [Lucide Icons](https://lucide.dev) — Clean, consistent icon set

---

<p align="center">Built with ❤️ for the construction industry of India 🇮🇳</p>

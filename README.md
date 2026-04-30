# 🏗️ Sanrachna — Construction Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://www.python.org)

> **सनरचना** *(n.)* — Sanskrit for *"structure" or "construction"*
>
> A full-stack, AI-powered construction management platform built to bridge the gap between field workers, site engineers, and project stakeholders.

---

## 📸 Overview

Sanrachna consolidates the entire construction workflow — from initial cost estimation and AI-generated project plans to daily logs, task assignment, issue tracking, RFIs, procurement, and emergency incident management — into a role-aware, cloud-deployable platform.

### 🎯 Target Users

| Role | Use Case |
|------|----------|
| **Project Owners** | Monitor project health, costs, and progress across multiple sites |
| **Site Engineers** | Assign tasks, review logs, manage RFIs and issues |
| **Field Workers** | Submit daily logs, update task status, report emergencies |

### 🏗️ Project Status

> **Current Status**: 🟡 Active Development — Production-ready for small to medium deployments

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

### Frontend
| Technology | Purpose |
|-------------|---------|
| [React 19](https://react.dev) | UI framework |
| [TypeScript](https://www.typescriptlang.org) | Type safety |
| [Vite](https://vitejs.dev) | Build tool |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [Zustand](https://zustand-demo.pmnd.rs) | State management |
| [Recharts](https://recharts.org) | Charts & graphs |
| [React Hook Form](https://react-hook-form.com) | Form handling |
| [Zod](https://zod.dev) | Schema validation |

### Backend
| Technology | Purpose |
|-------------|---------|
| [Node.js](https://nodejs.org) | Runtime |
| [Express v5](https://expressjs.com) | Web framework |
| [MongoDB](https://www.mongodb.com) + [Mongoose](https://mongoosejs.com) | Database |
| [JWT](https://jwt.io) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Authentication |
| [Multer](https://github.com/expressjs/multer) | File uploads |
| [DeepSeek API](https://platform.deepseek.com) | AI/LLM |

### Report Engine (Python)
| Technology | Purpose |
|-------------|---------|
| [Python ≥ 3.11](https://www.python.org) | Runtime |
| [FastAPI](https://fastapi.tiangolo.com) | Web framework |
| [Uvicorn](https://www.uvicorn.org) | ASGI server |
| [ReportLab](https://www.reportlab.com) | PDF generation |
| [scikit-learn](https://scikit-learn.org) | ML estimation |

### Deployment
| Service | Target |
|---------|--------|
| [Vercel](https://vercel.com) | Frontend |
| [Render](https://render.com) | Backend + Report Engine |

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org) | ≥ 18 | Backend runtime |
| [Python](https://www.python.org) | ≥ 3.11 | Report engine runtime |
| [MongoDB](https://www.mongodb.com) | Atlas or local | Database |
| [DeepSeek API Key](https://platform.deepseek.com) | — | AI features |

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/sanrachna.git
cd sanrachna
```

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

Create a `.env` file in `backend/` directory:

```env
# Server Configuration
PORT=5000

# Database
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/sanrachna

# Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# AI Configuration
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

Start the development server:

```bash
npm run dev
```

> ✅ Backend running at **http://localhost:5000**

---

### 3. Report Engine Setup (Python)

```bash
# Navigate to report engine directory
cd report-engine

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in `report-engine/` directory:

```env
# CORS Configuration
CORS_ORIGINS=http://localhost:5173

# HuggingFace Token (optional - for advanced AI features)
HF_TOKEN=hf_xxxxxxxxxxxxxxxx
```

Start the report engine:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> ✅ Report engine running at **http://localhost:8000**

---

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend-v2

# Install dependencies
npm install
```

Create a `.env` file in `frontend-v2/` directory:

```env
# Backend API URLs
VITE_BACKEND_URL=http://localhost:5000
VITE_PLANNING_API_BASE=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

> ✅ Frontend running at **http://localhost:5173**

---

### 5. Verify Installation

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api/health (if available)
- **Report Engine**: http://localhost:8000/docs (Swagger UI)

---

## 🌐 Deployment

Sanrachna is configured for one-command deployment on **Render** (backend + report engine) and **Vercel** (frontend).

### Render (Backend + Report Engine)

A `render.yaml` is included at the root. Import your repo in [Render Dashboard](https://dashboard.render.com) and it will auto-detect both services.

#### Environment Variables (Render Dashboard)

| Variable | Value | Description |
|----------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `JWT_SECRET` | `your-secret-key` | Secret for JWT signing |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | Your Vercel frontend URL |
| `DEEPSEEK_API_KEY` | `sk-...` | DeepSeek API key |

#### Report Engine Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `CORS_ORIGINS` | `https://your-app.vercel.app` | Your Vercel frontend URL |
| `HF_TOKEN` | `hf_...` | HuggingFace token (optional) |

---

### Vercel (Frontend)

1. Push `frontend-v2/` folder to GitHub, or import the entire repo in [Vercel](https://vercel.com)
2. Configure the following environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_BACKEND_URL` | `https://your-backend.onrender.com` | Your Render backend URL |
| `VITE_PLANNING_API_BASE` | `https://your-report-engine.onrender.com` | Your Render report engine URL |

> 📝 A `vercel.json` is included in `frontend-v2/` for SPA routing support.

---

### Quick Deploy Buttons

> ⬇️ *Coming soon - Add deploy buttons for one-click deployment*

---

## 📡 API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Body Parameters |
|--------|----------|-------------|-----------------|
| POST | `/api/auth/register` | Create new user account | `name`, `email`, `password`, `role` |
| POST | `/api/auth/login` | Authenticate and receive JWT | `email`, `password` |
| POST | `/api/auth/refresh` | Refresh expired JWT token | `refreshToken` |
| GET | `/api/auth/me` | Get current user profile | — |

### Projects & Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces` | List user's workspaces (projects) |
| POST | `/api/workspaces` | Create a new project |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tasks` | Get all tasks for a project |
| POST | `/api/projects/:id/tasks` | Create a new task |
| PUT | `/api/tasks/:id` | Update task status |
| DELETE | `/api/tasks/:id` | Delete a task |

### Issues & RFIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/issues` | Raise a new issue |
| GET | `/api/projects/:id/issues` | List all issues |
| POST | `/api/projects/:id/rfis` | Submit a new RFI |
| GET | `/api/projects/:id/rfis` | List all RFIs |

### Daily Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/logs` | Submit a daily progress log |
| GET | `/api/projects/:id/logs` | Get log history for a project |
| PUT | `/api/logs/:id` | Update log entry |
| PUT | `/api/logs/:id/approve` | Engineer approval of log |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/documents` | Upload a document |
| GET | `/api/projects/:id/documents` | List project documents |
| GET | `/api/documents/:id` | Download a document |
| DELETE | `/api/documents/:id` | Delete a document |

### Report Engine (FastAPI — port 8000)

| Method | Endpoint | Description | Body Parameters |
|--------|----------|-------------|-----------------|
| POST | `/generate-report` | Generate AI construction report | `project_id`, `phase`, `include_cost`, `include_timeline` |
| POST | `/export-pdf` | Export report to PDF | `report_data` |
| POST | `/plan` | Generate AI project plan | `project_brief`, `budget`, `timeline` |

> 📖 Full API documentation available at `/docs` endpoint when running the report engine.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ✅ | `5000` | Server port number |
| `MONGODB_URI` | ✅ | — | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | ✅ | — | Secret key for JWT token signing |
| `JWT_EXPIRES_IN` | ❌ | `7d` | Token expiry time (e.g., `7d`, `24h`) |
| `CORS_ORIGIN` | ✅ | — | Allowed frontend origin (for CORS) |
| `DEEPSEEK_API_KEY` | ✅ | — | DeepSeek API key for AI features |

### Frontend (`frontend-v2/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_BACKEND_URL` | ✅ | — | Base URL of the Express backend |
| `VITE_PLANNING_API_BASE` | ✅ | — | Base URL of the Python report engine |

### Report Engine (`report-engine/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGINS` | ✅ | — | Comma-separated list of allowed origins |
| `HF_TOKEN` | ❌ | — | HuggingFace API token (optional, for advanced AI) |

---

## 🔮 Roadmap & Future Features

### � In Development

#### 🗺️ Live Site Blueprint & Worker Map
One of the most exciting features planned for Sanrachna is a **real-time interactive site map / blueprint system**:

| Feature | Description |
|---------|-------------|
| **Live Floor Plan View** | Upload a 2D architectural blueprint (DWG/PDF/image). Workers and engineers appear as **live pins** on the map based on their assigned zones or GPS check-in. |
| **Worker Location Tracking** | Workers scan QR codes at entry/exit points to mark their current zone. The dashboard shows a live heatmap of workforce distribution. |
| **Engineer Zone Assignment** | Engineers can divide blueprints into named zones (Foundation, Block A, Electrical Wing, etc.) and assign teams. |
| **Task-to-Zone Linking** | Tasks are pinned to physical locations on the blueprint for location-based tracking. |
| **Incident Markers** | Emergency incidents and safety issues automatically drop markers on relevant blueprint locations. |

---

### 🟢 Planned Features

#### 🧱 3D Building Model Viewer
- **Interactive 3D Model** — Upload `.glb` / `.gltf` building models (from Revit, AutoCAD, SketchUp) and render in-browser using **Three.js** or **Babylon.js**
- **Progress Overlay** — Completed floors/sections color-coded (green = done, yellow = in-progress, red = blocked)
- **Click-to-Inspect** — Click any structural element to see associated tasks, issues, materials, and responsible engineer
- **BIM Integration** — Planned IFC (Industry Foundation Classes) support for deep BIM data integration
- **Time-Lapse Simulation** — Animate construction progress over the project timeline

#### 🤖 AI & Automation
- **Offline-First PWA Mode** — Workers submit logs/tasks offline, auto-sync when back online
- **Push Notifications** — Real-time alerts for task assignments, issue escalations, RFI responses
- **WhatsApp / SMS Integration** — Send task and emergency alerts via WhatsApp Business API or SMS
- **Document OCR** — Auto-extract and index data from drawing PDFs for searchability

#### 📊 Advanced Features
- **Advanced ML Estimations** — Regional material pricing, weather delays, labor productivity variations
- **Multi-Language Support** — UI translations in Hindi, Marathi, Tamil, and other regional languages
- **Subcontractor Portal** — Limited-access view for subcontractors to view scope, submit progress, upload invoices

---

## 🤝 Contributing

Contributions are welcome! Whether you want to report a bug, suggest a feature, or contribute code — help make Sanrachna better for the construction industry.

### 🐛 Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/your-username/sanrachna/issues) with:
- Clear description of the issue
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Screenshots if applicable

### 💻 Code Contributions

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/your-username/sanrachna.git
   ```
3. **Create** a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```
4. **Make your changes** and commit:
   ```bash
   git commit -m 'feat: add your feature'
   # or
   git commit -m 'fix: resolve issue description'
   ```
5. **Push** to your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** against the `main` branch

### 📋 Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org):

| Type | Description |
|------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | Code style changes (formatting, no logic) |
| `refactor:` | Code refactoring |
| `test:` | Adding/updating tests |
| `chore:` | Maintenance tasks |

### 🎯 PR Guidelines

- Keep PRs focused on a single feature or fix
- Include a clear description of what the PR does
- Link any related issues
- Ensure all tests pass before submitting
- Update documentation if needed

---

## 📜 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 Sanrachna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

See [LICENSE](LICENSE) for the full license text.

---

## 🙏 Acknowledgements

| Tool/Service | Description |
|--------------|-------------|
| [DeepSeek](https://platform.deepseek.com) | LLM powering the AI Copilot and Planning Studio |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Cloud database hosting |
| [Vercel](https://vercel.com) | Frontend deployment platform |
| [Render](https://render.com) | Backend deployment platform |
| [React](https://react.dev) | UI library |
| [FastAPI](https://fastapi.tiangolo.com) | Python web framework |

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| Stars | ⭐ Add your repo stars here |
| Forks | 🍴 Add your repo forks here |
| Contributors | 👥 Add contributor count |
| Last Updated | 📅 April 2026 |

---

<div align="center">

### 🚀 Built with ❤️ for the Construction Industry

*Made with care for builders, engineers, and dreamers.*

</div>
- [HuggingFace](https://huggingface.co) — Model hosting for the report generation pipeline
- [ReportLab](https://www.reportlab.com) — PDF generation library
- [Recharts](https://recharts.org) — Chart components
- [Lucide Icons](https://lucide.dev) — Clean, consistent icon set

---

<p align="center">Built with ❤️ for the construction industry of India 🇮🇳</p>

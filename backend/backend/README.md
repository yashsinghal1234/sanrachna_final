# Sanrachna Backend

Node.js + Express backend setup for authentication using MongoDB Atlas.

## Stack

- Node.js
- Express
- MongoDB Atlas with Mongoose
- JWT auth
- bcrypt password hashing

## Setup

1. In the `backend` folder, create `.env` (it is gitignored):
   - **PowerShell:** `Copy-Item .env.example .env`
   - Then open `.env` and set real values for `MONGODB_URI` and `JWT_SECRET`.
2. Run:

```bash
npm install
npm run dev
```

## Available endpoints

### Public

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/signin`

### Authenticated (`Authorization: Bearer <token>`)

**Projects**

- `GET /api/projects` — list projects you can access; **auto-seeds** one demo project if you have none
- `POST /api/projects` — create empty project `{ "name", "location" }`
- `GET /api/projects/:projectId` — project + `planning` snapshot
- `GET /api/projects/:projectId/dashboard` — dashboard bundle (costs, timeline, charts, logs, RFIs, issues, activity)

**Per project**

- `GET|POST /api/projects/:projectId/logs`
- `GET|POST /api/projects/:projectId/rfis` · `PATCH /api/projects/:projectId/rfis/:rfiId` (`{ "status" }`)
- `GET|POST /api/projects/:projectId/issues` · `PATCH /api/projects/:projectId/issues/:issueId`
- `GET|POST /api/projects/:projectId/contacts`
- `GET|POST /api/projects/:projectId/documents` (metadata only; `file_url` optional)

## Request payloads

### `POST /api/auth/signup`

```json
{
  "name": "Demo User",
  "email": "demo@sanrachna.in",
  "password": "Strong@123",
  "role": "engineer"
}
```

### `POST /api/auth/signin`

```json
{
  "email": "demo@sanrachna.in",
  "password": "Strong@123"
}
```

### Example: dashboard

```http
GET /api/projects/<projectId>/dashboard
Authorization: Bearer <token>
```

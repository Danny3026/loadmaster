# 🚛 LoadMaster — Load Management System

> A full-stack, multi-tenant load management platform for trucking companies.  
> Built with **React + TypeScript** (frontend) and **Node.js + Express + PostgreSQL** (backend).

---

## ✨ Features

| Area | Features |
|------|----------|
| **Dashboard** | Real-time KPIs — active loads, revenue, available trucks, missing documents |
| **Load Management** | Create, assign, dispatch, and track loads through the full lifecycle |
| **Dispatch Workflow** | One-click assign + dispatch with driver & truck selection |
| **Driver Portal** | Mobile-first interface for drivers to view loads, update status, upload docs |
| **Document Management** | Upload BOL, POD, Rate Confirmations with automatic data extraction |
| **Master Data** | Drivers, Trucks, Brokers, Users — full CRUD with pagination & search |
| **Reports & Analytics** | Revenue, load volume, driver performance — exportable charts |
| **Notifications** | Real-time in-app alerts for load updates, document approvals |
| **Activity Logs** | Audit trail for all system actions |
| **Role-Based Access** | Admin · Dispatcher · Driver roles with isolated views |
| **Multi-Tenant** | Company-scoped data — complete data isolation per organisation |

---

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for lightning-fast dev/build
- **Tailwind CSS** for utility-first styling
- **React Router v6** with lazy-loaded routes
- **TanStack Query v5** for server state management
- **Axios** with JWT interceptors
- **Recharts** for analytics charts
- **Lucide React** for icons

### Backend
- **Node.js + Express** (TypeScript)
- **PostgreSQL** with **Knex.js** query builder
- **Argon2** for password hashing
- **JWT** (access + refresh tokens)
- **Multer** for file uploads
- **Zod** for request validation
- **Winston** for structured logging

---

## 📂 Project Structure

```
loadmaster/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── config/           # env, database, storage config
│   │   ├── controllers/      # Route controllers
│   │   ├── database/
│   │   │   ├── migrations/   # 14 Knex migrations
│   │   │   └── seeds/        # Demo seed data
│   │   ├── middleware/        # auth, RBAC, tenant, rate-limit, upload
│   │   ├── repositories/     # Data access layer
│   │   ├── routes/           # Express routers
│   │   ├── services/         # Business logic
│   │   ├── types/            # Shared TypeScript types
│   │   ├── utils/            # logger, errors, pagination, response
│   │   └── validators/       # Zod schemas
│   ├── .env                  # ← create from .env.example
│   ├── knexfile.ts
│   └── package.json
│
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── api/              # Axios API modules per entity
│   │   ├── components/
│   │   │   ├── dashboard/    # KPI cards, charts
│   │   │   ├── documents/    # Upload & viewer components
│   │   │   ├── driver/       # Driver-specific components
│   │   │   ├── layout/       # AdminLayout, DriverLayout, Sidebar, TopNav
│   │   │   ├── loads/        # Load table, status badge, stop list
│   │   │   └── ui/           # Button, Input, Modal, Card, Badge, Toast…
│   │   ├── contexts/         # AuthContext, ToastContext
│   │   ├── hooks/            # TanStack Query hooks per entity
│   │   ├── pages/
│   │   │   ├── admin/        # 13 admin/dispatcher pages
│   │   │   ├── auth/         # Login, ForgotPassword, ResetPassword
│   │   │   └── driver/       # 6 driver mobile pages
│   │   ├── routes/           # Protected + role-based routing
│   │   ├── types/            # Shared TypeScript interfaces
│   │   └── utils/            # formatters, validators, classNames
│   └── package.json
│
├── docker-compose.yml        # PostgreSQL + backend + frontend
├── .env.example              # Template for all env vars
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **PostgreSQL** ≥ 14 (or Docker)
- **npm** ≥ 9.x

---

### 1. Clone & Install

```bash
git clone <repo-url>
cd loadmaster

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### 2. Set Up Environment Variables

```bash
# In the backend directory
cp .env.example .env   # then edit .env with your values
```

Key variables to set:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random secret (min 64 chars) |
| `JWT_REFRESH_SECRET` | Another long random secret |
| `CORS_ORIGIN` | Frontend URL (default: `http://localhost:5173`) |
| `PORT` | Backend port (default: `3001`) |

Generate strong secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 3. Start PostgreSQL

**Option A — Docker (recommended)**
```bash
# From repo root
docker-compose up -d db
```

**Option B — Local PostgreSQL**
```sql
CREATE DATABASE loadmaster;
CREATE USER loadmaster WITH PASSWORD 'loadmaster';
GRANT ALL PRIVILEGES ON DATABASE loadmaster TO loadmaster;
```

---

### 4. Run Database Migrations & Seed

```bash
cd backend
npm run migrate   # Run all 14 migrations
npm run seed      # Load demo data (company, users, drivers, loads)
```

---

### 5. Start the Development Servers

```bash
# Terminal 1 — Backend API (port 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Demo Credentials

After seeding, use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@loadmaster.io` | `Admin123!` |
| Dispatcher | `dispatcher@loadmaster.io` | `Dispatch123!` |
| Driver | `driver@loadmaster.io` | `Driver123!` |

---

## 🐳 Docker (Full Stack)

```bash
# Start all services
docker-compose up

# Stop
docker-compose down

# With volume cleanup
docker-compose down -v
```

Services:
- `db` — PostgreSQL on port 5432
- `backend` — API on port 3001
- `frontend` — Vite dev server on port 5173

---

## 📡 API Reference

Base URL: `http://localhost:3001/api`

All protected routes require: `Authorization: Bearer <token>`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Authenticate and get JWT |
| `GET` | `/auth/me` | Get current user |
| `GET` | `/loads` | List loads (paginated) |
| `POST` | `/loads` | Create a new load |
| `GET` | `/loads/:id` | Get load details |
| `PUT` | `/loads/:id` | Update load |
| `DELETE` | `/loads/:id` | Delete load |
| `POST` | `/loads/:id/assign` | Assign driver & truck |
| `POST` | `/loads/:id/dispatch` | Dispatch load |
| `PUT` | `/loads/:id/status` | Update load status |
| `GET` | `/loads/:id/status-history` | Status history |
| `GET` | `/drivers` | List drivers |
| `GET` | `/trucks` | List trucks |
| `GET` | `/brokers` | List brokers |
| `GET` | `/users` | List users |
| `GET` | `/documents` | List documents |
| `POST` | `/documents/upload` | Upload document |
| `GET` | `/reports/summary` | Summary report |
| `GET` | `/dashboard/stats` | Dashboard KPIs |
| `GET` | `/notifications` | User notifications |

---

## 🗄️ Database Schema

The database has 14 tables:

```
companies → users → drivers, trucks
                 ↘ loads → load_stops, load_assignments
                        → documents → document_extractions
                        → load_status_history
                        → notifications
brokers → loads
activity_logs
```

---

## 🔐 Authentication & Authorization

- JWT access tokens (7 day expiry) + refresh tokens (30 day)
- Passwords hashed with **Argon2id**
- Role-based access: `ADMIN` | `DISPATCHER` | `DRIVER`
- Multi-tenant: all queries scoped to `company_id` from JWT payload

---

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test
```

---

## 📋 Load Lifecycle

```
NEW → ASSIGNED → DISPATCHED → AT_PICKUP → PICKED_UP
   → IN_TRANSIT → AT_DELIVERY → DELIVERED → COMPLETED
                                           ↘ CANCELLED (any stage)
```

---

## 🛠️ Scripts Reference

| Directory | Command | Description |
|-----------|---------|-------------|
| `backend` | `npm run dev` | Start with hot-reload |
| `backend` | `npm run build` | Compile TypeScript |
| `backend` | `npm run migrate` | Run pending migrations |
| `backend` | `npm run seed` | Seed demo data |
| `frontend` | `npm run dev` | Start Vite dev server |
| `frontend` | `npm run build` | Production build |
| `frontend` | `npm run preview` | Preview production build |

---

## 📝 License

MIT — see [LICENSE](LICENSE)

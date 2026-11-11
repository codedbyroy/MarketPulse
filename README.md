# MarketPulse — Indian Financial Market API Monitoring & Public Status Platform

[![MarketPulse CI Pipeline](https://github.com/codedbyroy/MarketPulse/actions/workflows/ci.yml/badge.svg)](https://github.com/codedbyroy/MarketPulse/actions)
![Python](https://img.shields.io/badge/Python-3.12%20%7C%203.14-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.162.4-009688)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![License](https://img.shields.io/badge/License-MIT-green)

MarketPulse is a centralized, production-ready financial infrastructure health monitoring platform designed specifically for the **Indian Stock Markets & Financial Ecosystem**.

Unlike generic uptime checkers, MarketPulse evaluates real endpoint availability, measures microsecond response latency, validates response payload integrity, and maintains clear architectural segregation between web frontends, market-data feeds, and exchange order-execution gateways.

---

## 🏛️ Target Coverage

### 1. Indian Exchanges
- **National Stock Exchange (NSE India)**: Web portal health, market status, and API gateways.
- **Bombay Stock Exchange (BSE India)**: Market status API feed (`https://api.bseindia.com/BseIndiaAPI/api/MarketStatus/w`).
- **Multi Commodity Exchange (MCX India)**: Commodity trading market gateway.

### 2. Broker Trading APIs
- **Zerodha Kite Connect Platform**: Login authentication, market session endpoint (`https://kite.zerodha.com`).
- **Angel One SmartAPI Gateway**: Developer API base & gateway (`https://smartapi.angelone.in`).
- **Upstox Developer Platform**: Developer platform base (`https://api.upstox.com`).
- **Groww Investment Tech**: Web portal & investor gateway (`https://groww.in`).

### 3. Market Data Providers
- **Yahoo Finance NIFTY 50 API**: Real-time Nifty 50 Index Chart data feed (`^NSEI`).
- **Reserve Bank of India (RBI) Portal**: Official reference rates and banking gateway (`https://www.rbi.org.in`).

---

## 🏗️ System Architecture

MarketPulse is structured into modular, decoupled tiers:

```
                          ┌──────────────────────────┐
                          │   Next.js 14 Frontend    │
                          │   (Tailwind, Recharts)   │
                          └────────────┬─────────────┘
                                       │ (REST API / CORS)
                                       ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│   Independent Worker    │   │     FastAPI Backend      │
│  (APScheduler / HTTPX)  │──▶│    (Uvicorn/Gunicorn)    │
└────────────┬────────────┘   └────────────┬─────────────┘
             │                             │
             │   PostgreSQL / SQLAlchemy   │
             └──────────────┬──────────────┘
                            ▼
               ┌────────────────────────┐
               │  PostgreSQL Database   │
               │  (Services, Checks,    │
               │   Incidents, Admin)    │
               └────────────────────────┘
```

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts, Lucide icons.
- **Backend**: Python 3.12/3.14, FastAPI, HTTPX async client, Pydantic v2, PyJWT, bcrypt.
- **Worker**: APScheduler persistent asynchronous background monitoring loop executing concurrent non-blocking health checks.
- **Database**: PostgreSQL (using SQLAlchemy 2.0 with async engine `asyncpg` and sync Alembic migrations). Supports SQLite locally for rapid development and testing.

---

## 🛡️ Reliability & Security (SSRF Protection)

MarketPulse implements defense-in-depth security:

- **Strict SSRF Defense**: Every monitored URL passes hostname resolution and IP validation against RFC 1918, RFC 3927 (link-local), RFC 6598 (carrier NAT), loopback (`127.0.0.0/8`, `::1`), and cloud metadata (`169.254.169.254`). Unsafe or internal addresses are rejected before socket allocation.
- **Safe Redirect Validation**: Redirect destinations are dynamically revalidated before HTTPX follows them.
- **Zero Credentials Leakage**: Authentication tokens or keys configured for broker endpoints are encrypted/masked in responses.
- **JWT Admin Authorization**: Protected administration routes for endpoint creation and manual incident management.

---

## ⚡ Core Features

### 1. Public Overview Dashboard (`/`)
- Real-time overall system status indicator.
- Total monitored, operational, degraded, and down endpoint counters.
- Average response time in milliseconds and rolling 24-hour uptime percentage.
- IST Live Indian Market Session clock (Regular Session, Pre-Open, MCX Evening, Market Closed).
- Category filtering (Exchanges, Broker APIs, Market Data) and instant live search.
- Auto-refresh toggle (every 30 seconds).

### 2. Endpoint Performance Analytics (`/services/[id]`)
- Historical uptime calculations over **24 hours**, **7 days**, and **30 days**.
- Comprehensive latency distribution: **Average**, **Minimum**, **Maximum**, **Median**, and **P95 Latency**.
- Interactive Recharts area chart plotting response latency from real database records.
- Recent health check audit log table displaying HTTP status codes, latency in ms, and validation diagnostics.

### 3. Automated Incident Detection Engine (`/incidents`)
- **Outage Rule**: 3 consecutive failed health checks automatically trigger an incident declared as `investigating`.
- **Degraded Rule**: Repeated latency exceeding 2000ms flags the endpoint as `degraded`.
- **Auto-Recovery**: 3 consecutive operational checks automatically resolve the active incident and post a resolution timestamp note.
- Public incident timeline with chronological updates.

### 4. Admin Management Console (`/admin`)
- Secure login with JWT Bearer authentication.
- Endpoint management: Add, edit, delete, toggle active, and set expected HTTP codes.
- **Instant Check Trigger**: Execute a manual live check on any endpoint with instantaneous latency feedback.
- Incident Management: Declare incidents manually, post investigation updates, and change severity.
- Audit Log stream: Real-time inspection of all worker checks.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Python 3.10+ (or 3.12 / 3.14)
- Node.js 18+ (Node 20 recommended)
- PostgreSQL (or use default SQLite for local development)

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Run automated tests
pytest -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- API Documentation is live at: `http://localhost:8000/docs`
- Default Seed Admin: `admin@marketpulse.in` / `MarketPulse@2026Admin`

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
- Open `http://localhost:3000` in your browser.

---

## ☁️ Production Deployment

### 1. Frontend on Vercel
1. Import repository into [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Configure Environment Variable:
   - `NEXT_PUBLIC_API_URL`: URL of your deployed backend (e.g. `https://marketpulse-api.onrender.com/api`).
4. Deploy.

### 2. Backend & Worker on Render
MarketPulse includes a ready-to-deploy `render.yaml` Blueprint:
1. Link your GitHub repository in the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Blueprint** and select this repository.
3. Render automatically provisions:
   - `marketpulse-db`: Managed PostgreSQL database
   - `marketpulse-api`: Persistent FastAPI web service
   - `marketpulse-worker`: Dedicated background scheduler worker

### Required Environment Variables

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql+asyncpg://user:pass@host/db` |
| `SECRET_KEY` | JWT signing secret | 64-character random string |
| `DEFAULT_ADMIN_EMAIL` | Initial admin account email | `admin@marketpulse.in` |
| `DEFAULT_ADMIN_PASSWORD`| Initial admin account password| Strong password |
| `NEXT_PUBLIC_API_URL` | Frontend API client base URL | `https://api.marketpulse.in/api` |

---

## 🧪 Automated Testing

MarketPulse includes pytest suites verifying:
- SSRF validation across loopback, link-local, private, and RFC 6598 ranges.
- Bcrypt password hashing and JWT token verification.
- Automated incident detection and recovery lifecycle.
- Full API lifecycle across status, services, incidents, and admin routes.

Run tests:
```bash
cd backend
source venv/bin/activate
pytest -v
```

---

## 📄 License
MIT License. Built for the Indian Financial Technology & Algorithmic Trading community.

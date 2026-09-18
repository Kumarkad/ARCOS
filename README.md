# ARCOS ⚡
> **Your Personal Financial Intelligence System**  
> *Engineered by Stark Techno*

ARCOS is a modern, full-stack financial intelligence platform designed to manage personal expenses, budgets, financial goals, vehicle maintenance/mileage, and investment portfolios—powered by **JARVIS**, your integrated AI financial assistant.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Directory Layout](#-project-directory-layout)
- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Mobile App Setup](#2-mobile-app-setup)
  - [3. Configuring JARVIS (AI Assistant)](#3-configuring-jarvis-ai-assistant)
- [Database Configuration & Migrations](#-database-configuration--migrations)
- [API Documentation](#-api-documentation)
- [Running Automated Tests](#-running-automated-tests)
- [Offline Support & Sync](#-offline-support--sync)
- [License & Credits](#-license--credits)

---

## 🚀 Key Features

### ⚡ JARVIS — AI Financial Assistant
- **Natural Language Expense Logging**: Speak or type naturally (e.g., *"I bought chai for ₹20"*, *"Spent 1,200 on petrol"*) and JARVIS extracts amount, category, date, and payment method.
- **Safety Confirmation Actions**: Write actions generate an interactive confirmation card before committing to the database.
- **Financial Intelligence Queries**: Ask questions like *"How much did I spend today?"*, *"Am I on budget this month?"*, or *"Can I afford ₹5,000?"*.
- **Multi-Engine Intelligence**: Native support for **Groq** (`llama-3.3-70b-versatile`), **Google Gemini** (`gemini-2.0-flash`), with an intelligent zero-dependency heuristic parser for offline local testing.

### 💳 Expense & Cash Flow Management
- Categorized expense tracking with custom categories, icons, and colors.
- Multi-payment support: **UPI**, **Credit Card**, **Debit Card**, **Net Banking**, and **Cash**.
- Offline-first queuing: expenses created without network connection are queued and synced automatically when online.

### 📊 Budgets & Threshold Warnings
- Monthly budget limits overall or per category.
- Real-time utilization tracking with status indicators:
  - 🟢 **NORMAL**: Under 80% utilization
  - 🟡 **WARNING**: Between 80% and 100% utilization
  - 🔴 **EXCEEDED**: Above 100% budget cap

### 🎯 Financial Goals
- Target amount milestones, deadline schedules, and current savings progress.
- Progress visualization with percentage milestones.

### 📈 Investments & Portfolio
- Track Stocks, Mutual Funds, ETFs, and IPO allotments.
- Integrated market valuation with real-time currency formatting in Indian Rupees (₹).

### 🏍️ Bike & Vehicle Intelligence
- Fuel fill-up log with automated mileage calculations (**km/L**).
- Maintenance expense tracking and recurring service reminders based on odometer readings.

### 📤 Data Export & Reports
- Instant export of transactions to **CSV** and **PDF** formats.

---

## 🏛 System Architecture

```mermaid
graph TD
    A[Mobile App - React Native / Expo] -->|REST API + JWT| B[FastAPI Backend]
    B -->|Async Session| C[(SQLite / PostgreSQL)]
    B -->|Tool Calling / Chat| D[LLM Providers: Groq / Gemini]
    B -->|Market Quotes| E[Yahoo Finance API]
    A -->|Offline Cache & Queue| F[AsyncStorage / MMKV]
```

---

## 🛠 Technology Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Asyncio)
- **Database Driver**: `aiosqlite` (default SQLite) / `asyncpg` (PostgreSQL)
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/) & Pydantic Settings
- **Auth**: JWT (JSON Web Tokens) with Passlib (Bcrypt)
- **AI / LLM**: Groq Cloud SDK, Google Gemini REST, HTTPX

### Mobile App
- **Framework**: [React Native 0.76](https://reactnative.dev/) with [Expo SDK 52](https://expo.dev/)
- **Routing**: [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Styling**: [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Server State & Caching**: [TanStack React Query v5](https://tanstack.com/query/latest)
- **Icons**: Expo Vector Icons (Ionicons)
- **Secure Storage**: Expo SecureStore

---

## 📁 Project Directory Layout

```
ARCOS/
├── backend/                        # FastAPI Backend Application
│   ├── alembic/                    # Database migration scripts
│   ├── app/
│   │   ├── api/                    # Route handlers (auth, expenses, budgets, chat, etc.)
│   │   ├── core/                   # Config, security, exceptions, constants
│   │   ├── db/                     # Database engine & session management
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── providers/              # LLM and market data providers
│   │   ├── repositories/           # Data access layer
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Business logic & AI tool definitions
│   │   └── utils/                  # Formatting & helper utilities
│   ├── tests/                      # Automated test suite (pytest)
│   ├── .env.example                # Sample environment variables
│   ├── alembic.ini                 # Alembic configuration
│   ├── pyproject.toml              # Python project metadata & dependencies
│   └── requirements.txt            # Pinned dependencies
│
├── mobile/                         # Expo / React Native Application
│   ├── app/                        # Expo Router screen tree
│   │   ├── (auth)/                 # Login & Registration screens
│   │   ├── (tabs)/                 # Bottom navigation tabs:
│   │   │   ├── index.tsx           # Home Dashboard
│   │   │   ├── expenses/           # Expense listings & Add Expense
│   │   │   ├── investments/        # Stock & Mutual Fund tracking
│   │   │   ├── bike/               # Bike tracker & Mileage calculation
│   │   │   └── chat.tsx            # JARVIS AI Assistant Interface
│   │   ├── analytics.tsx           # Spending trends & analytics
│   │   ├── budgets/                # Budget management
│   │   └── goals/                  # Savings goals
│   ├── src/
│   │   ├── api/                    # Axios API client functions
│   │   ├── stores/                 # Zustand state stores (auth, offline)
│   │   ├── types/                  # TypeScript interface definitions
│   │   └── utils/                  # Formatting (INR) & constants
│   ├── app.json                    # Expo application configuration
│   ├── package.json                # Node dependencies & npm scripts
│   └── tailwind.config.js          # NativeWind Tailwind config
│
└── README.md                       # Project Documentation
```

---

## 📋 Prerequisites

Before running the application, ensure you have the following installed on your machine:

1. **Python**: Version `3.11` or higher ([Download Python](https://www.python.org/downloads/))
2. **Node.js**: Version `18.x` or `20.x` LTS ([Download Node.js](https://nodejs.org/))
3. **npm** or **yarn** (bundled with Node.js)
4. **Expo Go** app (installed on your physical iOS or Android device from App Store / Play Store) OR an **Android Studio Emulator** / **Xcode Simulator**.

---

## ⚡ Quick Start Guide

### 1. Backend Setup

#### Step 1.1: Open terminal in the `backend` directory
```bash
cd backend
```

#### Step 1.2: Create and activate a Python virtual environment
- **Windows (PowerShell)**:
  ```powershell
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  ```
- **macOS / Linux**:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

#### Step 1.3: Install dependencies
```bash
pip install -r requirements.txt
pip install aiosqlite yfinance pytest pytest-asyncio
```
*(Alternatively, if using `uv`: `uv sync`)*

#### Step 1.4: Configure Environment Variables
Copy `.env.example` to `.env`:
- **Windows**:
  ```powershell
  copy .env.example .env
  ```
- **macOS / Linux**:
  ```bash
  cp .env.example .env
  ```

Default local `.env` values (ready for SQLite):
```ini
DATABASE_URL=sqlite+aiosqlite:///./arcos.db
JWT_SECRET_KEY=arcos-secret-key-super-secure-change-in-prod-2026
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30
CORS_ORIGINS=["*"]
ENVIRONMENT=development
```

#### Step 1.5: Run the Backend Server
Start Uvicorn with hot-reloading:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Interactive Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Alternative ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. Mobile App Setup

#### Step 2.1: Open a new terminal in the `mobile` directory
```bash
cd mobile
```

#### Step 2.2: Install Node modules
```bash
npm install
```

#### Step 2.3: Configure the API Endpoint
Create or update `mobile/.env`:
```ini
EXPO_PUBLIC_API_URL=http://<YOUR_BACKEND_IP>:8000/api/v1
```

> **Target Device Connection Guide**:
> - **Physical Phone (Expo Go)**: Use your computer's local Wi-Fi IP (e.g. `http://192.168.1.100:8000/api/v1`). Both computer and phone must be on the same Wi-Fi.
> - **Android Emulator**: Use `http://10.0.2.2:8000/api/v1` (maps to host localhost).
> - **iOS Simulator / Web**: Use `http://localhost:8000/api/v1`.

#### Step 2.4: Start the Expo Development Server
```bash
npm start
```
- Press `a` to launch in Android Emulator.
- Press `i` to launch in iOS Simulator.
- Press `w` to launch in Web browser.
- Or scan the displayed QR code using the **Expo Go** mobile app on your phone!

---

### 3. Configuring JARVIS (AI Assistant)

JARVIS operates out of the box with an intelligent local heuristic natural language engine. To unlock cloud LLM reasoning with tool calling:

Add **one** of the following keys into `backend/.env`:

#### Option A: Groq Cloud (Recommended: Extremely fast & generous free tier)
```ini
GROQ_API_KEY=gsk_your_groq_api_key_here
```
*(Get a key from [console.groq.com](https://console.groq.com/))*

#### Option B: Google Gemini
```ini
GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here
```
*(Get a key from [aistudio.google.com](https://aistudio.google.com/))*

When configured, JARVIS automatically leverages function calling (`create_expense`, `get_spending_summary`, `get_budget_status`, `can_i_afford`) to interact directly with your database.

---

## 🗄 Database Configuration & Migrations

ARCOS supports both **SQLite** (default for zero-setup local dev) and **PostgreSQL** (for production).

### SQLite Configuration
```ini
DATABASE_URL=sqlite+aiosqlite:///./arcos.db
```

### PostgreSQL Configuration
```ini
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/arcos_db
```

### Alembic Migrations
Run migrations to initialize or update the database schema:
```bash
# Apply migrations to the latest version
alembic upgrade head

# Generate a new migration revision after modifying models
alembic revision --autogenerate -m "describe changes"
```

---

## 📡 API Documentation

When the backend is running, browse to `http://localhost:8000/docs` for the interactive API playground.

| Module | Route Prefix | Key Endpoints | Description |
|---|---|---|---|
| **Auth** | `/api/v1/auth` | `POST /register`, `POST /login`, `GET /me` | User registration, authentication, JWT tokens |
| **Expenses** | `/api/v1/expenses` | `GET /`, `POST /`, `GET /summary`, `DELETE /{id}` | Transaction management and spending aggregation |
| **Categories** | `/api/v1/categories` | `GET /`, `POST /` | Custom category management |
| **Budgets** | `/api/v1/budgets` | `GET /`, `POST /`, `GET /{id}` | Monthly limits and alert thresholds |
| **Analytics** | `/api/v1/analytics` | `GET /monthly`, `GET /trends` | Spending analytics and category percentages |
| **JARVIS Chat** | `/api/v1/chat` | `POST /message`, `POST /confirm`, `GET /sessions` | AI conversation and safe action confirmation |
| **Investments** | `/api/v1/investments` | `GET /`, `POST /`, `GET /portfolio` | Stock, mutual fund, and IPO tracking |
| **Bikes** | `/api/v1/bikes` | `GET /`, `POST /fillup`, `POST /expense` | Fuel logs, mileage calculation, maintenance |
| **Goals** | `/api/v1/goals` | `GET /`, `POST /`, `PUT /{id}` | Financial target savings goals |
| **Export** | `/api/v1/export` | `GET /csv`, `GET /pdf` | Export financial records |

---

## 🧪 Running Automated Tests

Run backend tests using `pytest`:

```bash
cd backend
.venv\Scripts\pytest.exe -v
```

To run individual test suites:
```bash
# Test JARVIS natural language parsing and action confirmations
pytest tests/test_chat.py -v

# Test expense creation and calculations
pytest tests/test_expenses.py -v

# Test health checks and core formatting
pytest tests/test_health.py tests/test_formatting.py -v
```

---

## 📶 Offline Support & Sync

The mobile app includes an offline queue powered by **Zustand** and local persistence:
1. When you log an expense while disconnected, it is saved locally to the offline queue.
2. The UI updates optimistically with immediate visual feedback.
3. Once network connectivity is restored, the queue flushes and commits the expenses to the ARCOS backend.

---

## 🛡 Security & Best Practices

- Passwords hashed using standard `bcrypt` with salt rounds.
- Stateless authentication with signed JWT access tokens and persistent refresh tokens.
- Parameterized SQL queries using SQLAlchemy ORM to prevent SQL injection.
- Pydantic models enforcing strict input validation and type sanitization.

---

## 📄 License & Credits

- **Owner**: Stark Techno
- **Product**: ARCOS (Personal Financial Intelligence System)
- **AI Engine**: JARVIS

# ARCOS Backend ⚡
> **FastAPI Async Engine for ARCOS (Personal Financial Intelligence System)**  
> *Developed by Stark Techno*

This directory contains the production-grade, asynchronous backend API powering ARCOS and the JARVIS AI Assistant.

---

## 🏛 Architecture Overview

The backend is built with modern asynchronous Python (3.11+) following clean layered architecture:

```
app/
├── api/            # API Route handlers (Endpoints & Request validation)
├── core/           # Configuration, Security (JWT/Bcrypt), Custom Exceptions
├── db/             # SQLAlchemy Async Engine, Session Factory, Base Model
├── models/         # SQLAlchemy ORM database models
├── providers/      # LLM Providers (Groq, Gemini, Heuristic), Market Data (yfinance)
├── repositories/   # Direct database queries & persistence layer
├── schemas/        # Pydantic v2 schemas for request validation & response serialization
├── services/       # Business logic layer (Budgets, Expenses, JARVIS orchestration)
└── utils/          # Indian Rupee (INR) formatting, helpers
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.11+
- Virtualenv or `uv`

### 2. Environment Setup

#### Create virtual environment:
- **Windows**:
  ```powershell
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  ```
- **Linux/macOS**:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

#### Install dependencies:
```bash
pip install -r requirements.txt
pip install aiosqlite yfinance pytest pytest-asyncio
```
*(Or if using `uv`: `uv sync`)*

### 3. Environment Variables

Create `.env` from `.env.example`:

```ini
# Database Connection URL (SQLite default or PostgreSQL)
DATABASE_URL=sqlite+aiosqlite:///./arcos.db
# DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/arcos_db

# Security & Tokens
JWT_SECRET_KEY=arcos-secret-key-super-secure-change-in-prod-2026
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30

# CORS
CORS_ORIGINS=["*"]
ENVIRONMENT=development

# Optional AI Assistant Keys (If omitted, JARVIS uses the local heuristic engine)
# GROQ_API_KEY=gsk_your_groq_api_key_here
# GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here
```

### 4. Running Database Migrations

```bash
# Apply migrations to latest
alembic upgrade head

# Generate revision after updating models
alembic revision --autogenerate -m "add new table"
```

### 5. Running the Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Interactive API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🤖 JARVIS AI Engine

JARVIS handles natural language financial conversations and actions via `app/services/chat_service.py` and `app/providers/llm_provider.py`.

### Supported Providers:
1. **Groq Cloud** (`llama-3.3-70b-versatile`): Ultra-low latency, OpenAI-compatible tool calling.
2. **Google Gemini** (`gemini-2.0-flash`): High-accuracy reasoning and structured tool calls.
3. **Local Heuristic Engine**: Zero-setup offline parser using deterministic NLP regex and intent extraction.

### Tool Execution Flow:
```
User Message 
  → LLM Provider (generates tool call, e.g. create_expense)
  → ChatService creates a PendingAction with a unique action_id
  → Returns preview card to Mobile App
  → User clicks "Confirm" or "Cancel"
  → ChatService executes confirmed action safely in the DB
```

---

## 🧪 Testing

Run test suite with `pytest`:

```bash
# Run all tests
pytest -v

# Run specific modules
pytest tests/test_chat.py -v
pytest tests/test_expenses.py -v
pytest tests/test_health.py -v
```

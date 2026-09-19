# ARCHITECT-X

> **Evidence-Grounded Multi-Agent Software Architecture Review System**

[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111%2B-green)](https://fastapi.tiangolo.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 1. What ARCHITECT-X Does

ARCHITECT-X accepts a **natural-language software requirement** and runs it through a multi-stage AI pipeline that produces:

- Structured requirements breakdown (FRs, NFRs, scale constraints)
- Parallel multi-agent review (Architecture, Security, Performance agents)
- Cross-agent conflict detection & Principal Architect adjudication
- RAG-grounded technical evidence retrieval from engineering literature
- MADR-compliant Architecture Decision Records (ADRs)
- Interactive C4 Architecture Diagrams (System → Container → Component)
- Unified normalized architecture workspace with traceability matrix
- Resilience challenge simulations (7 real failure & scale scenarios)
- Pipeline traceability validation (chain integrity checking)

---

## 2. Architecture Overview

```
Requirement Text
      │
      ▼
┌─────────────────┐
│ Requirement     │  Extracts FRs, NFRs, scale, constraints
│ Engine          │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Multi-Agent Execution (parallel) │
│  ┌───────────┐ ┌──────────┐ ┌─────────┐ │
│  │Architecture│ │Security  │ │Perf &   │ │
│  │  Agent    │ │  Agent   │ │Reliability│ │
│  └───────────┘ └──────────┘ └─────────┘ │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│    Reviewer & Conflict Engine           │
│  Cross-agent conflict detection,        │
│  trade-off synthesis, RAG evidence      │
│  grounding, Principal Architect ADR     │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│    Explainability Engine                │
│  MADR ADRs, C4 Diagrams (3 tiers)       │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│    Architecture Workspace               │
│  Components, Connections, Security      │
│  Boundaries, Traceability Matrix        │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│    Challenge Engine                     │
│  7 failure/scale scenarios,             │
│  blast radius, recovery playbooks       │
└─────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI (Python 3.11+) |
| Validation | Pydantic v2, pydantic-settings |
| ORM & Migrations | SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL 16 |
| Database driver | psycopg2-binary |
| Vector store | ChromaDB (persistent) with in-memory fallback |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Testing | pytest, httpx TestClient |
| Frontend | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS |
| Containerization | Docker, Docker Compose |

---

## 4. Complete Pipeline

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | `POST /api/projects` | Create project with requirement text |
| 2 | `POST /api/projects/{id}/analyze-requirement` | Extract structured requirements |
| 3 | `POST /api/projects/{id}/run-agents` | Parallel multi-agent review |
| 4 | `POST /api/projects/{id}/review` | Conflict detection & adjudication |
| 5 | `POST /api/projects/{id}/retrieve-evidence` | RAG evidence retrieval |
| 6 | `POST /api/projects/{id}/explainability` | ADR & C4 diagram generation |
| 7 | `GET  /api/projects/{id}/architecture` | Unified architecture workspace |
| 8 | `POST /api/projects/{id}/challenge` | Resilience scenario simulation |
| 9 | `GET  /api/projects/{id}/traceability-validation` | Pipeline chain integrity check |

Full interactive docs available at `http://localhost:8000/api/docs`.

---

## 5. Project Structure

```
architect-x/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── agents/             # Multi-agent system
│   │   ├── api/routes/         # REST API endpoints
│   │   ├── architecture/       # Unified architecture service
│   │   ├── challenge/          # Resilience challenge engine
│   │   ├── core/               # Config, error handling
│   │   ├── db/                 # Database session
│   │   ├── explainability/     # ADR & C4 generation
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── rag/                # Vector store & evidence retrieval
│   │   ├── requirement_engine/ # Requirement parsing
│   │   ├── reviewer/           # Conflict detection & reviewer agent
│   │   ├── services/           # Cross-cutting services (traceability)
│   │   └── main.py             # Application entry point
│   ├── alembic/                # Database migrations
│   ├── tests/                  # pytest test suite
│   └── requirements.txt
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/                # App router pages
│   │   ├── components/         # UI components
│   │   └── lib/                # API client, types
│   └── package.json
├── evaluation/                 # Evaluation framework
│   ├── benchmark.json          # 20 benchmark cases
│   ├── run_evaluation.py       # Evaluation runner
│   └── README.md               # Evaluation documentation
├── docs/                       # Architecture documentation
│   ├── EVALUATION.md           # Evaluation methodology
│   └── ARCHITECTURE_DECISIONS.md  # ARCHITECT-X design decisions
├── knowledge_base/             # Engineering literature for RAG
├── docker-compose.yml
├── .env.example                # Environment variable template
└── README.md
```

---

## 6. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | PostgreSQL local | SQLAlchemy connection string |
| `ENVIRONMENT` | `development` | `development` / `staging` / `production` |
| `LLM_MOCK_MODE` | `True` | Use mock AI responses (no API key needed) |
| `LLM_API_KEY` | *(empty)* | OpenAI API key (required if mock=False) |
| `LLM_MODEL` | `gpt-4o-mini` | Model for real LLM calls |
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `CORS_ORIGINS` | localhost:3000 | Allowed frontend origins |
| `CHROMA_PERSIST_DIRECTORY` | `chroma_db` | Vector store persistence path |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Frontend API base URL |

---

## 7. Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16 (or use Docker Compose)
- Git

### Clone

```bash
git clone https://github.com/bharatraghupatruni-ai/ARCHITECT-X.git
cd architect-x
```

### Database (Docker Compose)

```bash
docker-compose up -d db
```

Or use an existing PostgreSQL instance and set `DATABASE_URL` in `.env`.

---

## 8. Running Backend & Frontend

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Apply database migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend available at `http://localhost:8000`  
API docs at `http://localhost:8000/api/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend available at `http://localhost:3000`

---

## 9. Running Tests

```bash
cd backend
pytest -v
```

Expected: all tests pass. The test suite uses SQLite in-memory and mocked services — no live PostgreSQL or API key required.

To check TypeScript types:

```bash
cd frontend
npx tsc --noEmit
```

To verify production build:

```bash
cd frontend
npm run build
```

---

## 10. Running the Evaluation

The evaluation framework benchmarks the full ARCHITECT-X pipeline against 20 real-world software requirement cases.

**Prerequisite**: backend must be running on `http://localhost:8000`.

```bash
# Run all 20 cases
python evaluation/run_evaluation.py

# Run specific cases
python evaluation/run_evaluation.py --cases EC-001,BK-001

# Point to a remote API
python evaluation/run_evaluation.py --api-url http://your-server:8000
```

Results saved to `evaluation/results.json` and `evaluation/results.csv`.

See [evaluation/README.md](evaluation/README.md) and [docs/EVALUATION.md](docs/EVALUATION.md) for full details.

---

## 11. API Overview

Base path: `http://localhost:8000/api`

### Projects

| Method | Path | Summary |
|--------|------|---------|
| `POST` | `/projects` | Create project |
| `GET` | `/projects` | List all projects |
| `GET` | `/projects/{id}` | Get project by ID |

### Pipeline

| Method | Path | Summary |
|--------|------|---------|
| `POST` | `/projects/{id}/analyze-requirement` | Run requirement engine |
| `POST` | `/projects/{id}/run-agents` | Run multi-agent review |
| `POST` | `/projects/{id}/review` | Run reviewer & conflict engine |
| `POST` | `/projects/{id}/retrieve-evidence` | Run RAG evidence retrieval |
| `POST` | `/projects/{id}/explainability` | Generate ADRs & C4 diagrams |
| `GET` | `/projects/{id}/architecture` | Get unified architecture |
| `POST` | `/projects/{id}/challenge` | Run challenge simulation |
| `GET` | `/projects/{id}/traceability-validation` | Validate pipeline chain |

### Utilities

| Method | Path | Summary |
|--------|------|---------|
| `GET` | `/health` | Health check (API + DB + vector store) |
| `GET` | `/projects/{id}/adr/export` | Export ADRs as Markdown |
| `GET` | `/projects/{id}/challenge-scenarios` | List available scenarios |

Full OpenAPI specification: `http://localhost:8000/api/openapi.json`

---

## 12. Example Workflow

```bash
# 1. Create a project
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Food Delivery Platform", "requirement": "Build a food delivery platform for 50,000 concurrent users with real-time order tracking and sub-500ms response times."}'

# Save the returned "id" as PROJECT_ID

# 2. Analyze requirement
curl -X POST http://localhost:8000/api/projects/$PROJECT_ID/analyze-requirement

# 3. Run agents
curl -X POST http://localhost:8000/api/projects/$PROJECT_ID/run-agents

# 4. Review & detect conflicts
curl -X POST http://localhost:8000/api/projects/$PROJECT_ID/review

# 5. Retrieve evidence
curl -X POST http://localhost:8000/api/projects/$PROJECT_ID/retrieve-evidence

# 6. Generate ADRs & C4
curl -X POST http://localhost:8000/api/projects/$PROJECT_ID/explainability

# 7. Get unified architecture
curl http://localhost:8000/api/projects/$PROJECT_ID/architecture

# 8. Challenge with a scenario
curl -X POST http://localhost:8000/api/projects/$PROJECT_ID/challenge \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": "traffic_spike_20x"}'

# 9. Validate traceability chain
curl http://localhost:8000/api/projects/$PROJECT_ID/traceability-validation
```

---

## 13. Known Limitations & Recommended Next Steps

### Known Limitations

- **Mock mode by default**: Without an OpenAI API key, the pipeline runs deterministic mock responses. Real LLM outputs require `LLM_MOCK_MODE=False` and a valid `LLM_API_KEY`.
- **RAG coverage**: The knowledge base contains curated engineering literature. Highly specialized domains (e.g., quantum computing, bio-informatics) may have limited evidence coverage.
- **Evaluation scoring**: `decision_consistency` metric requires human review of ADR content — automated scoring only measures ADR count and status.
- **Single-region**: No built-in multi-region or multi-instance deployment support in the current version.
- **No authentication**: The API has no user authentication. For production deployments, add an auth layer (e.g., OAuth2 / API keys).

### Recommended Next Steps

1. **Real LLM integration**: Configure `LLM_API_KEY` and set `LLM_MOCK_MODE=False` for production-quality analysis.
2. **Authentication**: Add JWT or API-key authentication to the FastAPI backend.
3. **Knowledge base expansion**: Ingest additional domain-specific technical papers into the RAG knowledge base.
4. **CI/CD pipeline**: Set up GitHub Actions with automated `pytest`, `tsc`, and evaluation runs.
5. **Multi-region deployment**: Deploy with a managed PostgreSQL (e.g., Supabase, RDS) and a container registry.
6. **WebSocket pipeline streaming**: Stream pipeline stages to the frontend in real-time rather than polling.

---

## Completed Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Foundation (FastAPI, PostgreSQL, Next.js, Docker) | ✅ Done |
| 2 | Requirement Engine (NL parsing, FR/NFR extraction) | ✅ Done |
| 3 | Multi-Agent Core (Architecture, Security, Performance agents) | ✅ Done |
| 4 | Reviewer & Conflict Engine | ✅ Done |
| 5 | RAG Evidence Engine (ChromaDB, sentence-transformers) | ✅ Done |
| 6 | Decision & Explainability Engine (ADRs, C4 Diagrams) | ✅ Done |
| 7 | Final Architecture Workspace & Traceability | ✅ Done |
| 8 | Challenge My Architecture (7 resilience scenarios) | ✅ Done |
| 9 | Evaluation & Productionization | ✅ Done |

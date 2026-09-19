# ARCHITECT-X Architecture Decisions

This document captures the key architectural decisions made during the design and implementation of the ARCHITECT-X platform itself. It is distinct from the ADRs that ARCHITECT-X *generates* for user projects — these are decisions about the platform's own construction.

---

## ADR-001: FastAPI over Django/Flask for Backend

**Status**: Accepted  
**Date**: Phase 1

### Context
The backend needs to expose a REST API with clearly typed request/response contracts, support concurrent I/O, and be easily testable.

### Decision
Use **FastAPI** as the backend framework.

### Rationale
- Native Pydantic v2 integration provides automatic request validation and OpenAPI schema generation without boilerplate.
- `async`-native: can run blocking CPU work in threadpool executors without blocking the event loop.
- Built-in dependency injection (`Depends`) makes database session and service injection clean and testable.
- Django was ruled out (too opinionated, ORM not composable with SQLAlchemy 2.0's Core API). Flask was ruled out (no first-class Pydantic integration, manual schema work).

---

## ADR-002: SQLAlchemy 2.0 + PostgreSQL over Document DB

**Status**: Accepted  
**Date**: Phase 1

### Context
The platform stores structured entities with FK relationships: Projects → RequirementAnalyses → AgentRuns → ReviewRuns → ADRs. These form a strict parent-child hierarchy.

### Decision
Use **SQLAlchemy 2.0** ORM with **PostgreSQL 16** as the primary datastore.

### Rationale
- Strongly relational domain: FK cascade behavior, join queries, and ordering by FK-linked timestamps are all cleaner with SQL.
- SQLAlchemy 2.0's new `select()` style API is type-annotated and compatible with Pydantic v2 `from_attributes=True` ORM mode.
- PostgreSQL JSONB columns allow semi-structured agent output storage without requiring a separate document store.
- A document DB (MongoDB) would have added complexity without benefit for a relational entity graph.

---

## ADR-003: Parallel Agent Execution with ThreadPoolExecutor

**Status**: Accepted  
**Date**: Phase 3

### Context
Three specialized agents (Architecture, Security, Performance) must produce independent analyses. Sequential execution would triple the response time.

### Decision
Use **`concurrent.futures.ThreadPoolExecutor`** with `max_workers=3` for parallel agent execution.

### Rationale
- The agents are CPU-bound in mock mode (JSON formatting) and I/O-bound in real LLM mode (API calls). Both are well-served by thread-based concurrency within FastAPI's synchronous route handlers.
- Process-based parallelism (`multiprocessing`) was ruled out: overhead of inter-process communication and shared state serialization is unnecessary for 3 short-lived tasks.
- AsyncIO tasks would require all agent code to be `async`, which complicates third-party SDK integration.
- `max_workers=3` exactly matches the agent count — no thread pool queueing overhead.

---

## ADR-004: ChromaDB with In-Memory Fallback for Vector Store

**Status**: Accepted  
**Date**: Phase 5

### Context
The RAG evidence engine needs to store and retrieve embeddings over ~200 technical document chunks. The system must work out-of-the-box without requiring a separate vector DB service.

### Decision
Use **ChromaDB** (persistent client) with automatic fallback to an **in-memory NumPy cosine similarity** index.

### Rationale
- ChromaDB is embeddable (no separate server), installs via pip, and persists to a local directory.
- The in-memory fallback allows the system to operate in environments where ChromaDB cannot initialize (e.g., permission issues, minimal Docker containers).
- Qdrant/Pinecone were ruled out: they require separate infrastructure, adding operational complexity.
- The knowledge base size (~200 chunks) does not require HNSW approximate nearest neighbor — exact cosine similarity over NumPy is fast enough.

---

## ADR-005: JSONB Columns for Agent Output Storage

**Status**: Accepted  
**Date**: Phase 3

### Context
Agent outputs are structured Pydantic models (nested dicts, lists) but their schema may evolve as agents are updated.

### Decision
Store agent outputs as **PostgreSQL JSONB columns** on the `AgentRun`, `ReviewRun`, `RetrievedEvidence`, and `C4Diagram` models.

### Rationale
- Avoids a proliferation of narrow schema-coupled tables that would require migrations on every agent schema change.
- JSONB in PostgreSQL supports indexing and querying if needed in the future.
- Deserialization into Pydantic models happens at the service layer with `model_validate()`, preserving type safety at the application boundary.
- SQLAlchemy's `JSON` column type maps cleanly to Python dicts with no additional libraries.

---

## ADR-006: Pydantic Settings for All Configuration

**Status**: Accepted  
**Date**: Phase 1

### Context
The application needs to read configuration from environment variables with type coercion, default values, and `.env` file support.

### Decision
Use **`pydantic-settings`** (`BaseSettings`) for all application configuration.

### Rationale
- Automatically reads from environment variables, `.env` files, and `.env.example` without manual `os.getenv()` calls.
- Type coercion (e.g., `LLM_MOCK_MODE: bool = True` reads `"true"` as Python `True`) eliminates common parsing bugs.
- Field validators (`@field_validator`) allow complex parsing like JSON-array CORS origins.
- A single `settings` singleton is safe to import anywhere without circular dependencies.

---

## ADR-007: Next.js 14 App Router for Frontend

**Status**: Accepted  
**Date**: Phase 1

### Context
The frontend needs to be a modern single-page application that can be built to a static or server-rendered bundle and communicate with the backend API.

### Decision
Use **Next.js 14** with the **App Router** pattern.

### Rationale
- App Router supports React Server Components for fast initial loads and Client Components for interactive pipeline controls.
- Built-in TypeScript support aligns with the typed API client pattern used throughout the project.
- `npm run build` produces an optimized production bundle without additional configuration.
- The App Router file-based routing keeps the single-page architecture clean without a separate router library.

---

## ADR-008: Mock Mode Architecture for Testability

**Status**: Accepted  
**Date**: Phase 2

### Context
The platform must be fully testable without an active OpenAI API key or a running LLM, and must be demo-able without incurring API costs.

### Decision
Implement a **`LLM_MOCK_MODE` flag** in all AI-dependent services (requirement engine, agents, reviewer, RAG embeddings). In mock mode, services return deterministic, schema-valid responses.

### Rationale
- Enables full `pytest` integration test coverage without API key dependencies.
- Allows new developers to run the full pipeline locally on first checkout.
- Mock outputs are schema-valid Pydantic model instances — tests validate the API contract, not the AI quality.
- Switching to real LLM mode requires only `LLM_MOCK_MODE=False` + `LLM_API_KEY=...` in `.env`.
- The mock/real code paths share the same interface — no test-specific code paths in production handlers.

---

## ADR-009: Pipeline-as-Explicit-API-Steps (Not a Background Queue)

**Status**: Accepted  
**Date**: Phase 1

### Context
The pipeline has 7 sequential stages. These could be implemented as a background job queue (Celery, RQ) or as individual API endpoints called in sequence by the client.

### Decision
Implement each pipeline stage as an **explicit synchronous REST endpoint** called sequentially by the client.

### Rationale
- Eliminates Celery/Redis/RQ infrastructure dependency — reduces the operational footprint significantly.
- Each stage is independently retryable from the frontend without restarting the full pipeline.
- Response times per stage (with mock mode) are under 2 seconds — synchronous is acceptable.
- Pipeline state is persisted to PostgreSQL after each stage, so the client can resume from any stage after a failure.
- A background queue would add complexity (worker management, job state tracking) that the current scale does not justify.

**Trade-off acknowledged**: With real LLM calls, some stages (agents, reviewer) may take 15–30 seconds. A background job system would improve UX for real mode. This is noted as a recommended next step.

---

## ADR-010: Single-File Traceability Validator (Not a Separate Service)

**Status**: Accepted  
**Date**: Phase 9

### Context
Phase 9 requires a traceability validation capability to verify the integrity of the full pipeline chain (Requirement → Agent → Conflict → Evidence → ADR → Architecture).

### Decision
Implement traceability validation as a **single-file service** (`app/services/traceability_validator.py`) called synchronously from a GET endpoint, rather than a separate microservice or background process.

### Rationale
- The validator is read-only — it only queries the database, never writes.
- Running validation on-demand (per API call) is sufficient for the use case (debugging, evaluation).
- A separate microservice or scheduled background job would add infrastructure complexity with no throughput benefit at the current scale.
- The validator is directly testable with a mock SQLAlchemy Session in pytest.

import uuid
import pytest
from fastapi.testclient import TestClient

from app.requirement_engine.parser import requirement_parser
from app.agents.architecture_agent import architecture_agent
from app.agents.security_agent import security_agent
from app.agents.performance_agent import performance_agent
from app.reviewer.conflict_detector import ConflictDetector
from app.reviewer.reviewer import ReviewerAgent
from app.rag.ingestion import document_ingestion_service
from app.rag.embeddings import embedding_service
from app.rag.retriever import retriever
from app.rag.service import rag_service
from app.rag.schemas import EvidenceQuery, RetrievedEvidenceItem, EvidenceRetrievalResponse


@pytest.fixture
def sample_requirement():
    return requirement_parser.analyze("Build a food delivery platform supporting 50,000 concurrent users with strict transaction consistency.")


@pytest.fixture
def agent_outputs(sample_requirement):
    return {
        "architecture": architecture_agent.analyze(sample_requirement),
        "security": security_agent.analyze(sample_requirement),
        "performance": performance_agent.analyze(sample_requirement),
    }


def test_document_chunking_and_metadata_preservation() -> None:
    """Test that knowledge base documents are chunked cleanly while preserving section and source metadata."""
    chunks = document_ingestion_service.load_all_documents()
    assert len(chunks) >= 5

    sources = {c.source for c in chunks}
    assert "postgresql_architecture.md" in sources
    assert "redis_caching_patterns.md" in sources
    assert "kafka_event_streaming.md" in sources
    assert "security_zero_trust_mtls.md" in sources
    assert "microservices_scalability_reliability.md" in sources

    for chunk in chunks:
        assert chunk.chunk_id
        assert chunk.source
        assert chunk.section
        assert len(chunk.text) > 20
        assert "document_title" in chunk.metadata


def test_embedding_service_vector_generation() -> None:
    """Test that EmbeddingService produces valid 384-dimensional normalized float vectors."""
    text = "PostgreSQL ACID transaction guarantees and connection pooling"
    vec = embedding_service.embed_text(text)

    assert isinstance(vec, list)
    assert len(vec) == 384
    assert all(isinstance(v, float) for v in vec)

    batch_vecs = embedding_service.embed_batch([
        "Redis cluster cache-aside",
        "Apache Kafka event streaming",
    ])
    assert len(batch_vecs) == 2
    assert len(batch_vecs[0]) == 384
    assert len(batch_vecs[1]) == 384


def test_relevant_evidence_semantic_retrieval() -> None:
    """Test that semantic search surfaces the correct authoritative technical documentation."""
    # 1. Database query
    pg_results = retriever.search("PostgreSQL connection pooling limits and PgBouncer", top_k=2)
    assert len(pg_results) >= 1
    assert any("postgresql" in r.source.lower() or "pgbouncer" in r.excerpt.lower() for r in pg_results)
    assert pg_results[0].relevance_score >= 0.35

    # 2. Caching query
    redis_results = retriever.search("Redis cache invalidation Debezium CDC and stampede protection", top_k=2)
    assert len(redis_results) >= 1
    assert any("redis" in r.source.lower() or "cache" in r.excerpt.lower() for r in redis_results)

    # 3. Kafka query
    kafka_results = retriever.search("Kafka partitioned consumer groups and message ordering keys", top_k=2)
    assert len(kafka_results) >= 1
    assert any("kafka" in r.source.lower() or "partition" in r.excerpt.lower() for r in kafka_results)


def test_insufficient_evidence_handling() -> None:
    """Test that searching for completely off-domain topics correctly returns empty or low relevance without forcing a match."""
    results = retriever.search(
        "Quantum entanglement superluminal teleportation in 1960s COBOL mainframe",
        top_k=2,
        threshold=0.85,  # High threshold for exact matching
    )
    # Insufficient evidence must not return forced matches above high threshold
    assert len(results) == 0


def test_reviewer_agent_with_evidence_grounding(sample_requirement, agent_outputs) -> None:
    """Test that ReviewerAgent incorporates empirical evidence into decisions and reports evidence sources."""
    detector = ConflictDetector()
    conflicts = detector.detect_conflicts(
        architecture_output=agent_outputs["architecture"],
        security_output=agent_outputs["security"],
        performance_output=agent_outputs["performance"],
    )

    evidence_queries = rag_service.generate_queries_for_conflicts(conflicts, sample_requirement)
    evidence_items = rag_service.retrieve_evidence_for_queries(evidence_queries, top_k_per_query=2)

    reviewer = ReviewerAgent()
    output = reviewer.review(
        requirement=sample_requirement,
        agent_outputs=agent_outputs,
        conflicts=conflicts,
        evidence=evidence_items,
    )

    assert len(output.retrieved_evidence) >= 1
    assert len(output.adjudicated_decisions) >= 3

    # Check evidence citation in decisions
    decisions_with_evidence = [d for d in output.adjudicated_decisions if d.evidence_used]
    assert len(decisions_with_evidence) >= 1
    for d in decisions_with_evidence:
        assert len(d.evidence_sources) >= 1
        assert d.evidence_summary is not None
        assert d.evidence_confidence is not None
        assert 0.0 <= d.evidence_confidence <= 1.0


def test_e2e_rag_review_api_flow(client: TestClient) -> None:
    """Test full Phase 5 API workflow: project creation -> requirement -> agents -> RAG retrieval -> evidence-grounded review."""
    # 1. Create project
    create_res = client.post("/api/projects", json={
        "name": "Phase 5 RAG Test Platform",
        "requirement": "Build a food delivery platform supporting 50,000 concurrent users with strict transaction consistency."
    })
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # 2. Analyze requirement
    client.post(f"/api/projects/{project_id}/analyze-requirement")

    # 3. Run multi-agent review
    client.post(f"/api/projects/{project_id}/run-agents")

    # 4. Explicitly retrieve evidence via POST /api/projects/{id}/retrieve-evidence
    evidence_res = client.post(f"/api/projects/{project_id}/retrieve-evidence")
    assert evidence_res.status_code == 200
    evidence_data = evidence_res.json()
    assert evidence_data["project_id"] == project_id
    assert len(evidence_data["evidence_items"]) >= 2
    assert evidence_data["is_sufficient"] is True

    # 5. Run full Review with automatic RAG grounding
    review_res = client.post(f"/api/projects/{project_id}/review")
    assert review_res.status_code == 200
    review_data = review_res.json()

    assert review_data["status"] == "completed"
    assert len(review_data["retrieved_evidence"]) >= 2
    assert review_data["output"] is not None

    # Check that decisions cite evidence sources
    decisions = review_data["output"]["adjudicated_decisions"]
    assert any(d["evidence_used"] for d in decisions)
    assert any(len(d["evidence_sources"]) > 0 for d in decisions)

    # 6. Retrieve review via GET /api/projects/{id}/review
    get_res = client.get(f"/api/projects/{project_id}/review")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert len(fetched["retrieved_evidence"]) == len(review_data["retrieved_evidence"])
    assert fetched["retrieved_evidence"][0]["source"]
    assert fetched["retrieved_evidence"][0]["relevance_score"] >= 0.0

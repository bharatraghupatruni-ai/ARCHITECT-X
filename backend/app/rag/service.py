from __future__ import annotations

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional, TYPE_CHECKING
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.requirement_analysis import RequirementAnalysis as RequirementAnalysisModel
from app.models.review_run import ReviewRun, ArchitectureConflict
from app.models.retrieved_evidence import RetrievedEvidence
from app.requirement_engine.service import requirement_service
from app.requirement_engine.schemas import RequirementAnalysis
from app.rag.schemas import (
    EvidenceQuery,
    RetrievedEvidenceItem,
    EvidenceRetrievalResponse,
    IngestionSummary,
)
from app.rag.retriever import retriever

if TYPE_CHECKING:
    from app.reviewer.schemas import DetectedConflict

logger = logging.getLogger("architect_x.rag")



class RagService:
    """
    RAG & Evidence Service: Generates targeted technical queries from architectural conflicts
    and structured requirements, performs vector retrieval against curated documentation,
    and manages evidence database persistence.
    """

    QUERY_TEMPLATES = {
        "database": "PostgreSQL ACID transactional consistency, MVCC isolation, and PgBouncer connection pooling limits",
        "caching": "Redis cluster cache-aside invalidation, Debezium CDC triggers, and thundering herd stampede protection",
        "transport_security": "Zero-trust mutual TLS mTLS latency overhead, TLS 1.3 session resumption, and Envoy sidecar mesh",
        "messaging_and_events": "Apache Kafka partitioned event streaming, message ordering keys, and flash-crowd load leveling",
        "scalability_and_resilience": "50,000 concurrent user scaling, microservice P99 latency budgets under 100ms, and circuit breakers",
        "authentication_and_auth": "OAuth2 OIDC stateless JWT RS256 token verification and token revocation bloom filters",
    }

    def generate_queries_for_conflicts(
        self,
        conflicts: List[DetectedConflict],
        requirement: Optional[RequirementAnalysis] = None,
    ) -> List[EvidenceQuery]:
        """Generate targeted semantic queries for detected conflicts and requirements."""
        queries: List[EvidenceQuery] = []
        seen_queries = set()

        # 1. Generate queries for each detected conflict
        for conflict in conflicts:
            cat = conflict.category.lower()
            query_str = None

            for key, tmpl in self.QUERY_TEMPLATES.items():
                if key in cat or cat in key:
                    query_str = tmpl
                    break

            if not query_str:
                query_str = f"{conflict.category.replace('_', ' ')}: {conflict.description[:120]}"

            if query_str not in seen_queries:
                seen_queries.add(query_str)
                queries.append(
                    EvidenceQuery(
                        query=query_str,
                        conflict_id=conflict.id,
                        category=conflict.category,
                        reason=f"Substantiate resolution for {conflict.conflict_type} in {conflict.category}",
                    )
                )

        # 2. Add high-priority baseline queries if scale or latency constraints are present
        if requirement and requirement.scale:
            if requirement.scale.expected_concurrent_users and requirement.scale.expected_concurrent_users >= 10000:
                scale_q = "High-concurrency PostgreSQL connection limits, PgBouncer pooling, and Redis read offloading"
                if scale_q not in seen_queries:
                    seen_queries.add(scale_q)
                    queries.append(
                        EvidenceQuery(
                            query=scale_q,
                            category="scalability_and_resilience",
                            reason="Validate architecture for peak concurrency requirements",
                        )
                    )

        # Fallback baseline queries if list is empty
        if not queries:
            queries.append(
                EvidenceQuery(
                    query="Microservices latency budgets, circuit breakers, and distributed resilience",
                    category="scalability_and_resilience",
                    reason="Baseline architecture resilience verification",
                )
            )

        return queries

    def retrieve_evidence_for_queries(
        self,
        queries: List[EvidenceQuery],
        top_k_per_query: int = 2,
        threshold: float = 0.35,
    ) -> List[RetrievedEvidenceItem]:
        """Execute vector search across all generated queries and deduplicate results."""
        all_items: List[RetrievedEvidenceItem] = []
        seen_excerpts = set()

        for q in queries:
            results = retriever.search(
                query=q.query,
                top_k=top_k_per_query,
                threshold=threshold,
                conflict_id=q.conflict_id,
            )
            for item in results:
                # Deduplicate by first 80 characters of excerpt
                excerpt_key = item.excerpt[:80].strip()
                if excerpt_key not in seen_excerpts:
                    seen_excerpts.add(excerpt_key)
                    all_items.append(item)

        logger.info(f"RAG retrieval surfaced {len(all_items)} distinct evidence items across {len(queries)} queries.")
        return all_items

    def retrieve_evidence_for_project(
        self,
        db: Session,
        project_id: uuid.UUID,
    ) -> EvidenceRetrievalResponse:
        """API workflow: Fetch latest conflicts, run RAG retrieval, and return structured evidence."""
        project = db.scalar(select(Project).where(Project.id == project_id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        # Retrieve latest requirement analysis
        latest_analysis_record = db.scalar(
            select(RequirementAnalysisModel)
            .where(RequirementAnalysisModel.project_id == project_id)
            .order_by(desc(RequirementAnalysisModel.version))
            .limit(1)
        )
        analysis_dto = (
            requirement_service._to_response_dto(latest_analysis_record).analysis
            if latest_analysis_record
            else None
        )

        # Retrieve latest review run and conflicts (or detect dynamically from agents)
        latest_review = db.scalar(
            select(ReviewRun)
            .where(ReviewRun.project_id == project_id)
            .order_by(desc(ReviewRun.created_at))
            .limit(1)
        )

        conflicts_dto: List[DetectedConflict] = []
        if latest_review and latest_review.conflicts:
            conflicts_dto = [
                DetectedConflict(
                    id=c.id,
                    category=c.category,
                    conflict_type=c.conflict_type,
                    severity=c.severity,
                    description=c.description,
                    agent_positions=c.agent_positions,
                    resolution=c.resolution,
                )
                for c in latest_review.conflicts
            ]
        else:
            # Check if agent runs exist and detect conflicts
            from app.models.agent_run import AgentRun, AgentRunStatus, AgentType
            from app.agents.schemas import AgentOutput
            from app.reviewer.conflict_detector import ConflictDetector

            agent_outputs = {}
            for at in [AgentType.ARCHITECTURE, AgentType.SECURITY, AgentType.PERFORMANCE]:
                run_rec = db.scalar(
                    select(AgentRun)
                    .where(
                        AgentRun.project_id == project_id,
                        AgentRun.agent_type == at,
                        AgentRun.status == AgentRunStatus.COMPLETED,
                    )
                    .order_by(desc(AgentRun.created_at))
                    .limit(1)
                )
                if run_rec and run_rec.output:
                    try:
                        agent_outputs[at] = AgentOutput.model_validate(run_rec.output)
                    except Exception:
                        pass

            if agent_outputs.get(AgentType.ARCHITECTURE):
                detector = ConflictDetector()
                conflicts_dto = detector.detect_conflicts(
                    architecture_output=agent_outputs.get(AgentType.ARCHITECTURE),
                    security_output=agent_outputs.get(AgentType.SECURITY),
                    performance_output=agent_outputs.get(AgentType.PERFORMANCE),
                )

        # Generate queries and retrieve evidence
        queries = self.generate_queries_for_conflicts(conflicts_dto, analysis_dto)
        evidence_items = self.retrieve_evidence_for_queries(queries, top_k_per_query=2, threshold=0.15)

        is_sufficient = len(evidence_items) >= 2
        summary = (
            f"Retrieved {len(evidence_items)} authoritative technical documentation excerpts "
            f"across {len(queries)} architectural focus areas."
            if is_sufficient
            else "Evidence coverage is limited; additional technical documentation required."
        )

        return EvidenceRetrievalResponse(
            project_id=project_id,
            review_run_id=latest_review.id if latest_review else None,
            queries_executed=[q.query for q in queries],
            evidence_items=evidence_items,
            is_sufficient=is_sufficient,
            summary=summary,
        )

    def persist_retrieved_evidence(
        self,
        db: Session,
        project_id: uuid.UUID,
        review_run_id: Optional[uuid.UUID],
        evidence_items: List[RetrievedEvidenceItem],
    ) -> List[RetrievedEvidence]:
        """Persist evidence chunks to retrieved_evidence table."""
        now = datetime.utcnow()
        persisted_records: List[RetrievedEvidence] = []

        for item in evidence_items:
            rec_id = item.id or uuid.uuid4()
            evidence_rec = RetrievedEvidence(
                id=rec_id,
                project_id=project_id,
                review_run_id=review_run_id,
                conflict_id=item.conflict_id,
                query=item.query,
                source=item.source,
                section=item.section,
                excerpt=item.excerpt,
                evidence_metadata=item.evidence_metadata,
                relevance_score=item.relevance_score,
                created_at=now,
            )
            db.add(evidence_rec)
            persisted_records.append(evidence_rec)
            item.id = rec_id
            item.created_at = now

        db.flush()
        return persisted_records


rag_service = RagService()

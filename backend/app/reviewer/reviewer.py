import json
import logging
import re
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings
from app.requirement_engine.schemas import RequirementAnalysis
from app.agents.schemas import AgentOutput
from app.rag.schemas import RetrievedEvidenceItem
from app.reviewer.schemas import (
    DetectedConflict,
    ReviewDecision,
    ReviewTradeoff,
    ReviewRisk,
    ReviewerOutput,
)

logger = logging.getLogger("architect_x.reviewer")


class ReviewerAgent:
    """
    Principal Software Architect AI Agent that synthesizes evaluations
    from specialized agents (Architecture, Security, Performance), weighs
    detected architectural trade-offs, integrates empirical RAG evidence,
    and adjudicates definitive decisions.
    """

    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL
        self.base_url = settings.LLM_BASE_URL or "https://api.openai.com/v1"
        self.mock_mode = settings.LLM_MOCK_MODE or not bool(self.api_key)

    def get_system_prompt(self) -> str:
        return """You are the Principal Software Architect and Chair of the Technical Review Board for ARCHITECT-X.
Your role is to conduct a holistic, authoritative architectural review by synthesizing the independent recommendations of:
1. Architecture Agent (System decomposition, primary data store, event broker, inter-service topology)
2. Security Agent (Identity, authorization, zero-trust, mTLS, encryption, API gateway defense)
3. Performance & Reliability Agent (P99 latency, high-concurrency throughput, caching, connection pooling, autoscaling)

You are provided with:
- The structured requirement specification
- The outputs of all three specialized AI agents
- The detected architectural conflicts, trade-offs, and risk disagreements
- Retrieved technical documentation and benchmark evidence from the RAG Engine

CRITICAL ADJUDICATION RULES:
1. NO MAJORITY RULE: Never adjudicate decisions based on agent voting counts (e.g., '2 agents chose PostgreSQL, 1 chose MongoDB so PostgreSQL wins'). You must weigh technical merits, business constraints, consistency vs. latency trade-offs, and operational feasibility.
2. EVIDENCE GROUNDING: Ground your adjudicated choices in the retrieved empirical technical documentation. Cite specific source files in 'evidence_sources', synthesize how the documentation validates the design in 'evidence_summary', and score evidence confidence (0.0 - 1.0).
3. INSUFFICIENT EVIDENCE DISCLOSURE: If retrieved evidence is missing, below relevance threshold, or does not clearly substantiate a decision, set 'evidence_used'=false and explicitly note insufficient evidence. Do NOT force evidence to match a predetermined stance.
4. SYNTHESIZE TENSIONS: Where Security and Performance conflict (e.g., mTLS overhead vs. sub-10ms latency), establish a pragmatic, concrete resolution (e.g., connection reuse with TLS session tickets, Envoy sidecars with eBPF acceleration).
5. EXPLICIT REJECTIONS & RATIONALE: For every adjudicated decision, specify the chosen option, list rejected alternatives, provide engineering rationale grounded in requirements, and enumerate the trade-offs accepted.
6. AUTHORITATIVE VERDICT: Issue an overall verdict: 'APPROVED', 'APPROVED WITH CONDITIONS', or 'REVISE ARCHITECTURE'.
7. JSON OUTPUT FORMAT: Output strictly valid JSON conforming to the ReviewerOutput schema.
"""

    def review(
        self,
        requirement: RequirementAnalysis,
        agent_outputs: Dict[str, AgentOutput],
        conflicts: List[DetectedConflict],
        evidence: Optional[List[RetrievedEvidenceItem]] = None,
    ) -> ReviewerOutput:
        """Execute the architecture review and synthesis."""
        logger.info(
            f"ReviewerAgent execution initiated (mock_mode={self.mock_mode}, evidence_count={len(evidence) if evidence else 0})"
        )

        if self.mock_mode:
            return self._generate_mock_output(requirement, agent_outputs, conflicts, evidence)

        return self._llm_review_with_retry(requirement, agent_outputs, conflicts, evidence)

    def _generate_mock_output(
        self,
        requirement: RequirementAnalysis,
        agent_outputs: Dict[str, AgentOutput],
        conflicts: List[DetectedConflict],
        evidence: Optional[List[RetrievedEvidenceItem]] = None,
    ) -> ReviewerOutput:
        """Deterministic, high-fidelity Principal Architect review evaluation with evidence citations."""
        domain_name = requirement.domain.replace('_', ' ').title()
        sys_type = requirement.system_type.replace('_', ' ').title()
        evidence_list = evidence or []

        summary = (
            f"The proposed architecture for the {domain_name} system ({sys_type}) successfully addresses high-concurrency "
            f"requirements while maintaining enterprise-grade security boundaries. Our review synthesized recommendations "
            f"across Architecture, Security, and Performance agents, adjudicating {len(conflicts)} detected trade-offs and "
            f"grounding decisions in {len(evidence_list)} technical literature sources. "
            f"The architecture is approved subject to connection pooling and TLS session ticket optimizations."
        )

        overall_verdict = "APPROVED WITH CONDITIONS"

        key_findings = [
            "Strong alignment across all agents on event-driven decoupling via Apache Kafka for asynchronous order ingestion and load leveling.",
            "Empirical evidence confirms relational PostgreSQL ACID storage is required for financial correctness, backed by PgBouncer transaction pooling to prevent 50,000 connection exhaustion.",
            "Technical literature validates Redis Cache-Aside with Debezium CDC invalidation to eliminate cache drift while maintaining sub-5ms read latencies.",
            "Zero-trust mTLS overhead (5-15ms) mitigated by Envoy HTTP/2 persistent connection reuse and TLS 1.3 session resumption (RFC 5077).",
        ]

        adjudicated_decisions = [
            ReviewDecision(
                category="Database Paradigm & Storage",
                chosen_option="PostgreSQL (ACID Relational) with PgBouncer Connection Pooling & Read Replicas",
                rejected_options=["Pure NoSQL Document Store (MongoDB)", "Distributed Multi-Master SQL (Spanner/CockroachDB)"],
                rationale="Financial transactions, order state transitions, and audit logs mandate strict serializable ACID consistency. High concurrency read load will be offloaded to read replicas and Redis caching rather than compromising transactional invariants with eventual consistency.",
                trade_offs=[
                    "Requires careful horizontal sharding or read replica management as transaction volume exceeds 50k QPS.",
                    "Operational overhead of maintaining schema migrations and connection pooler proxies.",
                ],
                assigned_to_components=["Order Service", "Payment Service", "User Service", "Database Cluster"],
                review_status="approved",
                evidence_used=True,
                evidence_sources=["postgresql_architecture.md"],
                evidence_summary="Technical literature verifies PostgreSQL MVCC isolation prevents double-spend anomalies while PgBouncer transaction pooling multiplexes 50k client connections into 100-300 backend workers, avoiding memory exhaustion.",
                evidence_confidence=0.96,
            ),
            ReviewDecision(
                category="Inter-Service Communication & Transport Security",
                chosen_option="gRPC with Protocol Buffers and mTLS via Envoy Service Mesh with Persistent Connection Reuse",
                rejected_options=["Unencrypted Internal HTTP/REST", "Hop-by-Hop Synchronous REST with Per-Request TLS Handshakes"],
                rationale="Combines binary serialization efficiency of gRPC (reducing payload sizes by ~60%) with zero-trust mTLS security. Handshake CPU overhead is eliminated via HTTP/2 multiplexing and persistent TLS connection pooling in the Envoy sidecar mesh.",
                trade_offs=[
                    "Increased operational complexity of running and observing an Envoy/Istio service mesh.",
                    "Requires strict Protobuf schema governance and contract testing across squads.",
                ],
                assigned_to_components=["API Gateway", "Order Service", "Restaurant Service", "Delivery Tracking Service"],
                review_status="approved_with_conditions",
                evidence_used=True,
                evidence_sources=["security_zero_trust_mtls.md"],
                evidence_summary="Zero-trust benchmarks establish that HTTP/2 connection reuse and TLS 1.3 session resumption eliminate 95% of mTLS handshake latency penalties on internal RPC paths.",
                evidence_confidence=0.92,
            ),
            ReviewDecision(
                category="Asynchronous Event Streaming & Buffering",
                chosen_option="Apache Kafka with Partitioned Consumer Groups (Order-Id Keyed)",
                rejected_options=["RabbitMQ with AMQP Direct Exchanges", "In-Memory Redis Streams"],
                rationale="Provides immutable append-only event logging, guaranteed partition-level message ordering, and replayability during downstream service outages. Essential for absorbing 50,000 concurrent user traffic spikes without dropping delivery events.",
                trade_offs=[
                    "Operational overhead of managing ZooKeeper/KRaft Kafka cluster nodes.",
                    "Consumers must be designed for idempotent event handling.",
                ],
                assigned_to_components=["Kafka Event Bus", "Order Service", "Notification Service", "Analytics Pipeline"],
                review_status="approved",
                evidence_used=True,
                evidence_sources=["kafka_event_streaming.md"],
                evidence_summary="Kafka append-only commit logs utilize zero-copy OS sendfile calls and partition keys to enforce strict FIFO ordering per order_id while absorbing flash-crowd spikes.",
                evidence_confidence=0.95,
            ),
            ReviewDecision(
                category="Distributed Caching & Invalidation Strategy",
                chosen_option="Redis Cluster with Cache-Aside Strategy and CDC-Triggered Invalidation via Debezium",
                rejected_options=["Synchronous Dual-Write Caching", "Local In-Memory Process Caches"],
                rationale="Prevents cache drift and race conditions by listening to PostgreSQL write-ahead logs (WAL) via Debezium CDC to automatically invalidate stale restaurant menu and driver location entries.",
                trade_offs=[
                    "Sub-second cache propagation delay during peak write bursts.",
                    "Additional CDC pipeline component to monitor and operate.",
                ],
                assigned_to_components=["Redis Cache", "Restaurant Service", "Delivery Tracking Service"],
                review_status="approved",
                evidence_used=True,
                evidence_sources=["redis_caching_patterns.md"],
                evidence_summary="Benchmarks prove Redis cluster offloads up to 95% of catalog read traffic; Debezium CDC tailing eliminates dual-write race conditions under concurrent updates.",
                evidence_confidence=0.94,
            ),
        ]

        trade_off_analysis = [
            ReviewTradeoff(
                name="Zero-Trust mTLS Security vs. Inter-Service RPC Latency",
                category="Transport & Security",
                pros=[
                    "Guarantees cryptographic mutual authentication and eavesdropping prevention across internal VPC microservices.",
                    "Satisfies enterprise regulatory compliance and zero-trust audit requirements.",
                ],
                cons=[
                    "Initial TLS 1.3 handshake adds 5-12ms latency on cold connections.",
                    "Higher CPU memory footprint for Envoy sidecars across high pod counts.",
                ],
                recommendation="Enforce mTLS mesh-wide with HTTP/2 persistent connection pooling, connection keep-alives, and session ticket resumption.",
                impact_score="High",
            ),
            ReviewTradeoff(
                name="ACID Transactional Guarantees vs. Sub-5ms Read Latency",
                category="Persistence & Caching",
                pros=[
                    "Eliminates double-spend, phantom orders, and inconsistent inventory allocation.",
                    "Clear audit trail for compliance and reconciliation.",
                ],
                cons=[
                    "Direct relational queries under 50k concurrency can saturate connection limits without caching.",
                ],
                recommendation="Adopt PostgreSQL primary-replica topology fronted by Redis Cache-Aside for read-heavy menu and vendor discovery APIs.",
                impact_score="High",
            ),
            ReviewTradeoff(
                name="Event-Driven Asynchronous Decoupling vs. Immediate Consistency Feedback",
                category="Event Architecture",
                pros=[
                    "Absorbs extreme flash-crowd order traffic surges without backend service degradation.",
                    "Allows downstream notification and analytics workers to fail or scale independently.",
                ],
                cons=[
                    "Client apps must adopt optimistic UI updates or WebSocket polling for final order confirmation status.",
                ],
                recommendation="Use WebSocket / SSE push notifications from API Gateway to stream order status transitions back to mobile clients.",
                impact_score="Medium",
            ),
        ]

        synthesis_risks = [
            ReviewRisk(
                title="PostgreSQL Connection Saturation under 50k Concurrent Spikes",
                category="scalability",
                severity="high",
                description="If 50k concurrent mobile clients trigger simultaneous transactions, unpooled backend microservices will overwhelm PostgreSQL maximum connection pools, leading to cascading timeouts.",
                mitigation="Mandate PgBouncer in transaction pooling mode on all PostgreSQL instances with connection caps per microservice pod.",
            ),
            ReviewRisk(
                title="Cold Cache Stampede (Thundering Herd) on High-Demand Restaurants",
                category="performance",
                severity="high",
                description="Simultaneous cache expiration for top restaurant menus during peak lunch/dinner rush could route tens of thousands of identical queries directly to primary DB.",
                mitigation="Implement probabilistic early expiration (XFetch algorithm) and distributed mutex locking (Redlock) during cache misses.",
            ),
            ReviewRisk(
                title="JWT Secret Rotation & Revocation Latency",
                category="security",
                severity="medium",
                description="Stateless RS256 JWT tokens cannot be instantly revoked across distributed microservices upon compromised user session without centralized token blacklisting.",
                mitigation="Maintain short-lived access tokens (15 minutes) coupled with Redis-backed bloom filter token revocation lists checked at API Gateway edge.",
            ),
        ]

        action_items = [
            "Implement PgBouncer connection pooling configuration and benchmark 50k synthetic concurrent connections in staging.",
            "Configure Envoy sidecar mTLS mesh with persistent HTTP/2 connection reuse to ensure inter-service RPC latency remains < 15ms.",
            "Define Avro / Protobuf schema registries for all Kafka order events before finalizing inter-service contracts.",
            "Implement Redis cache-aside invalidation triggers via Debezium CDC to ensure zero stale menu or pricing reads.",
        ]

        return ReviewerOutput(
            summary=summary,
            overall_verdict=overall_verdict,
            key_findings=key_findings,
            adjudicated_decisions=adjudicated_decisions,
            trade_off_analysis=trade_off_analysis,
            synthesis_risks=synthesis_risks,
            action_items=action_items,
            retrieved_evidence=evidence_list,
        )

    def _llm_review_with_retry(
        self,
        requirement: RequirementAnalysis,
        agent_outputs: Dict[str, AgentOutput],
        conflicts: List[DetectedConflict],
        evidence: Optional[List[RetrievedEvidenceItem]] = None,
        max_retries: int = 2,
    ) -> ReviewerOutput:
        """Invoke LLM with JSON mode and Pydantic validation."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        url = f"{self.base_url.rstrip('/')}/chat/completions"

        agent_payloads = {
            k: v.model_dump(mode="json") if v else None
            for k, v in agent_outputs.items()
        }
        conflicts_payload = [c.model_dump(mode="json") for c in conflicts]
        evidence_payload = [e.model_dump(mode="json") for e in (evidence or [])]

        schema_example = json.dumps({
            "summary": "Detailed executive architectural review synthesis.",
            "overall_verdict": "APPROVED WITH CONDITIONS",
            "key_findings": ["Key finding 1", "Key finding 2", "Key finding 3"],
            "adjudicated_decisions": [
                {
                    "category": "Decision Dimension (e.g. Database Paradigm & Storage, Inter-Service Communication, Event Streaming)",
                    "chosen_option": "PostgreSQL with PgBouncer Connection Pooling",
                    "rejected_options": ["MongoDB", "Direct unpooled SQL"],
                    "rationale": "Grounded justification citing consistency and scale",
                    "trade_offs": ["Operational overhead of pooler proxy"],
                    "assigned_to_components": ["Order Service", "Payment Service"],
                    "review_status": "approved",
                    "evidence_used": True,
                    "evidence_sources": ["postgresql_architecture.md"],
                    "evidence_summary": "Summary of evidence substantiating this choice",
                    "evidence_confidence": 0.95
                }
            ],
            "trade_off_analysis": [
                {
                    "name": "Security vs. Latency",
                    "category": "Transport & Security",
                    "pros": ["Mutual cryptographic identity"],
                    "cons": ["Handshake overhead"],
                    "recommendation": "Use persistent HTTP/2 connection pooling with mTLS",
                    "impact_score": "High"
                }
            ],
            "synthesis_risks": [
                {
                    "title": "Connection Exhaustion Under Spike",
                    "category": "scalability",
                    "severity": "high",
                    "description": "Risk details",
                    "mitigation": "Mitigation steps"
                }
            ],
            "action_items": ["Action item 1", "Action item 2"]
        }, indent=2)

        user_content = (
            f"Please conduct an authoritative architectural review and synthesis of the following system requirement, agent evaluations, and empirical documentation evidence:\n\n"
            f"### Structured Requirement:\n"
            f"{requirement.model_dump_json(indent=2)}\n\n"
            f"### Agent Evaluations:\n"
            f"{json.dumps(agent_payloads, indent=2)}\n\n"
            f"### Detected Architectural Conflicts & Trade-offs:\n"
            f"{json.dumps(conflicts_payload, indent=2)}\n\n"
            f"### Retrieved Technical Literature & Empirical Evidence (RAG):\n"
            f"{json.dumps(evidence_payload, indent=2)}\n\n"
            f"Synthesize these inputs, adjudicate all conflicting decisions without relying on majority vote, ground decisions in the technical documentation excerpts, and output strictly valid JSON matching this schema format:\n"
            f"{schema_example}"
        )

        messages = [
            {"role": "system", "content": self.get_system_prompt()},
            {"role": "user", "content": user_content},
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        last_error: Optional[Exception] = None

        for attempt in range(max_retries + 1):
            try:
                logger.info(f"ReviewerAgent dispatching LLM request (attempt {attempt + 1}/{max_retries + 1})")
                with httpx.Client(timeout=60.0) as client:
                    response = client.post(url, json=payload, headers=headers)

                if response.status_code != 200:
                    raise RuntimeError(f"ReviewerAgent LLM API error ({response.status_code}): {response.text}")

                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                if "```" in content:
                    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
                    if match:
                        content = match.group(1).strip()
                raw_json = json.loads(content)
                # Defensive normalization for cross-model LLM compatibility
                parsed_json = self._normalize_reviewer_output(raw_json)

                output = ReviewerOutput.model_validate(parsed_json)
                output.retrieved_evidence = evidence or []
                logger.info(f"ReviewerAgent synthesized {len(output.adjudicated_decisions)} decisions with verdict '{output.overall_verdict}'")
                return output

            except Exception as exc:
                last_error = exc
                logger.warning(f"ReviewerAgent attempt {attempt + 1} failed: {exc}")
                if attempt < max_retries:
                    messages.append({
                        "role": "assistant",
                        "content": content if "content" in locals() else "{}",
                    })
                    messages.append({
                        "role": "user",
                        "content": f"The response failed validation: {str(exc)}. Please output strictly valid JSON adhering to ReviewerOutput schema.",
                    })
                    payload["messages"] = messages

        raise RuntimeError(f"ReviewerAgent failed to generate valid output: {last_error}")

    def _normalize_reviewer_output(self, data: Any) -> dict:
        """Defensive normalization ensuring raw LLM outputs conform to ReviewerOutput schema."""
        if not isinstance(data, dict):
            return {
                "summary": "Architectural review and synthesis completed.",
                "overall_verdict": "APPROVED WITH CONDITIONS",
            }
        if not data.get("summary"):
            data["summary"] = "Architectural review completed by Principal Architect."
        verdict = str(data.get("overall_verdict") or "APPROVED WITH CONDITIONS").upper()
        if verdict not in ["APPROVED", "APPROVED WITH CONDITIONS", "REVISE ARCHITECTURE"]:
            verdict = "APPROVED WITH CONDITIONS"
        data["overall_verdict"] = verdict

        for list_field in ["key_findings", "action_items"]:
            if list_field in data and isinstance(data[list_field], list):
                data[list_field] = [
                    item if isinstance(item, str) else (item.get("text") or item.get("finding") or item.get("action") or str(item))
                    for item in data[list_field]
                ]

        if "adjudicated_decisions" in data and isinstance(data["adjudicated_decisions"], list):
            norm_decisions = []
            for d in data["adjudicated_decisions"]:
                if isinstance(d, dict):
                    norm_decisions.append({
                        "category": d.get("category") or d.get("dimension") or "Architecture",
                        "chosen_option": d.get("chosen_option") or d.get("selected") or d.get("choice") or "Selected Technology",
                        "rejected_options": d.get("rejected_options") or [],
                        "rationale": d.get("rationale") or d.get("reason") or "Grounded in requirements and evidence",
                        "trade_offs": d.get("trade_offs") or [],
                        "assigned_to_components": d.get("assigned_to_components") or [],
                        "review_status": d.get("review_status") or "approved",
                        "evidence_used": bool(d.get("evidence_used")),
                        "evidence_sources": d.get("evidence_sources") or [],
                        "evidence_summary": d.get("evidence_summary"),
                        "evidence_confidence": d.get("evidence_confidence"),
                    })
            data["adjudicated_decisions"] = norm_decisions

        if "trade_off_analysis" in data and isinstance(data["trade_off_analysis"], list):
            norm_tradeoffs = []
            for t in data["trade_off_analysis"]:
                if isinstance(t, dict):
                    norm_tradeoffs.append({
                        "name": t.get("name") or t.get("dimension") or "Architectural Trade-off",
                        "category": t.get("category") or "General",
                        "pros": t.get("pros") or [],
                        "cons": t.get("cons") or [],
                        "recommendation": t.get("recommendation") or "Pragmatic trade-off resolution",
                        "impact_score": t.get("impact_score") or "High",
                    })
            data["trade_off_analysis"] = norm_tradeoffs

        if "synthesis_risks" in data and isinstance(data["synthesis_risks"], list):
            norm_risks = []
            for r in data["synthesis_risks"]:
                if isinstance(r, dict):
                    sev = str(r.get("severity") or "medium").lower()
                    if sev not in ["low", "medium", "high", "critical"]:
                        sev = "medium"
                    norm_risks.append({
                        "title": r.get("title") or r.get("name") or "Synthesized Risk",
                        "category": r.get("category") or "architecture",
                        "severity": sev,
                        "description": r.get("description") or "Potential architectural impact",
                        "mitigation": r.get("mitigation") or "Apply architectural mitigation",
                    })
            data["synthesis_risks"] = norm_risks

        return data

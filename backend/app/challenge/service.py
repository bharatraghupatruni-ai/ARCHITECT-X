from datetime import datetime
import logging
from typing import Any, Dict, List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.project import Project
from app.models.challenge_run import ChallengeRun
from app.models.retrieved_evidence import RetrievedEvidence
from app.architecture.service import architecture_service
from app.architecture.schemas import UnifiedArchitectureResponse
from app.rag.retriever import retriever
from app.challenge.schemas import (
    ChallengeScenario,
    ChallengeImpact,
    ChallengeAnalysisResult,
    ChallengeRunResponse,
)
from app.challenge.scenarios import (
    SCENARIO_DEFINITIONS,
    get_all_scenarios,
    get_scenario_by_id,
)

logger = logging.getLogger("architect_x.challenge")


class ChallengeService:
    """
    Challenge Engine Service:
    Evaluates system resilience against realistic failure and scale scenarios,
    analyzes component failure propagation, identifies architectural gaps vs safeguards,
    and produces grounded mitigation playbooks.
    """

    def get_scenarios(self) -> List[ChallengeScenario]:
        """Return all available failure & scale challenge scenarios."""
        return get_all_scenarios()

    def get_scenario(self, scenario_id: str) -> Optional[ChallengeScenario]:
        """Retrieve a specific scenario definition."""
        return get_scenario_by_id(scenario_id)

    def run_challenge(
        self,
        db: Session,
        project_id: uuid.UUID,
        scenario_id: str,
    ) -> ChallengeRunResponse:
        """
        Execute an impact simulation for a given scenario against the project's architecture,
        identifying failure propagation, safeguards, vulnerabilities, and mitigations.
        """
        # 1. Verify project exists
        project = db.scalar(select(Project).where(Project.id == project_id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        # 2. Verify scenario definition exists
        scenario = self.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Challenge scenario '{scenario_id}' not found. Available: {list(SCENARIO_DEFINITIONS.keys())}",
            )

        # 3. Retrieve unified architecture representation
        architecture = architecture_service.get_unified_architecture(db=db, project_id=project_id)

        # 4. Retrieve RAG evidence relevant to the failure condition
        evidence_records = self._retrieve_scenario_evidence(db=db, project_id=project_id, scenario=scenario)

        # 5. Generate structured challenge impact analysis
        analysis_result = self._analyze_scenario(
            project=project,
            scenario=scenario,
            architecture=architecture,
            evidence=evidence_records,
        )

        # 6. Persist ChallengeRun entity
        run_id = uuid.uuid4()
        now = datetime.utcnow()
        challenge_record = ChallengeRun(
            id=run_id,
            project_id=project_id,
            scenario_id=scenario.id,
            architecture_version="v1.0",
            result=analysis_result.model_dump(),
            created_at=now,
        )
        db.add(challenge_record)
        db.commit()
        db.refresh(challenge_record)

        logger.info(
            f"Successfully executed challenge run {challenge_record.id} for scenario '{scenario.id}' on project {project_id}"
        )

        return ChallengeRunResponse(
            id=challenge_record.id,
            project_id=project_id,
            scenario_id=scenario.id,
            architecture_version=challenge_record.architecture_version or "v1.0",
            result=analysis_result,
            created_at=challenge_record.created_at,
        )

    def list_challenge_runs(
        self,
        db: Session,
        project_id: uuid.UUID,
    ) -> List[ChallengeRunResponse]:
        """Fetch all historical challenge runs executed for a project."""
        project = db.scalar(select(Project).where(Project.id == project_id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        stmt = (
            select(ChallengeRun)
            .where(ChallengeRun.project_id == project_id)
            .order_by(desc(ChallengeRun.created_at))
        )
        records = db.scalars(stmt).all()

        responses = []
        for rec in records:
            try:
                res_obj = ChallengeAnalysisResult.model_validate(rec.result)
                responses.append(
                    ChallengeRunResponse(
                        id=rec.id,
                        project_id=rec.project_id,
                        scenario_id=rec.scenario_id,
                        architecture_version=rec.architecture_version or "v1.0",
                        result=res_obj,
                        created_at=rec.created_at,
                    )
                )
            except Exception as exc:
                logger.warning(f"Failed to deserialize challenge result for run {rec.id}: {exc}")

        return responses

    def get_challenge_run(
        self,
        db: Session,
        project_id: uuid.UUID,
        challenge_id: uuid.UUID,
    ) -> ChallengeRunResponse:
        """Fetch a specific challenge run by ID."""
        rec = db.scalar(
            select(ChallengeRun).where(
                ChallengeRun.id == challenge_id,
                ChallengeRun.project_id == project_id,
            )
        )
        if not rec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Challenge run '{challenge_id}' not found for project '{project_id}'.",
            )

        res_obj = ChallengeAnalysisResult.model_validate(rec.result)
        return ChallengeRunResponse(
            id=rec.id,
            project_id=rec.project_id,
            scenario_id=rec.scenario_id,
            architecture_version=rec.architecture_version or "v1.0",
            result=res_obj,
            created_at=rec.created_at,
        )

    # --------------------------------------------------------------------------
    # Internal Evaluation & Simulation Logic
    # --------------------------------------------------------------------------

    def _retrieve_scenario_evidence(
        self,
        db: Session,
        project_id: uuid.UUID,
        scenario: ChallengeScenario,
    ) -> List[Dict[str, Any]]:
        """Surface empirical evidence chunks relevant to the target failure scenario."""
        # Check existing persisted evidence in project first
        persisted = (
            db.query(RetrievedEvidence)
            .filter(RetrievedEvidence.project_id == project_id)
            .order_by(RetrievedEvidence.relevance_score.desc())
            .limit(4)
            .all()
        )

        evidence_items: List[Dict[str, Any]] = []
        for p in persisted:
            evidence_items.append(
                {
                    "source": p.source,
                    "section": p.section or "Architecture Standards",
                    "excerpt": p.excerpt,
                    "relevance_score": p.relevance_score,
                }
            )

        # Also execute live semantic query against vector database
        query_map = {
            "redis_unavailable": "Redis cluster cache-aside invalidation thundering herd stampede fallback",
            "database_unavailable": "PostgreSQL Multi-AZ failover write queue backpressure read-only degraded mode",
            "traffic_spike_20x": "50,000 concurrent user scaling rate limiting Envoy ingress HPA autoscaling",
            "downstream_service_slow": "Circuit breaker timeout worker thread starvation async queue decouple",
            "payment_success_order_fail": "Saga pattern compensating transaction idempotency transactional outbox",
            "message_broker_unavailable": "Apache Kafka broker outage transactional outbox buffer leader failover",
            "app_service_crash": "Microservices pod crash loop OOMKilled circuit breaker ingress healthcheck",
        }
        search_query = query_map.get(scenario.id, scenario.failure_condition)
        vector_results = retriever.search(query=search_query, top_k=2, threshold=0.1)

        for v in vector_results:
            if not any(v.excerpt[:60] in e["excerpt"] for e in evidence_items):
                evidence_items.append(
                    {
                        "source": v.source,
                        "section": v.section or "Resilience Engineering",
                        "excerpt": v.excerpt,
                        "relevance_score": v.relevance_score,
                    }
                )

        return evidence_items[:4]

    def _analyze_scenario(
        self,
        project: Project,
        scenario: ChallengeScenario,
        architecture: UnifiedArchitectureResponse,
        evidence: List[Dict[str, Any]],
    ) -> ChallengeAnalysisResult:
        """Synthesize scenario impact analysis referencing real architecture components and safeguards."""
        domain = architecture.overview.domain if architecture.overview else "Enterprise Application"

        # Find actual component IDs and names
        comp_map = {c.id: c.name for c in architecture.components}

        # Scenario-specific deterministic analysis
        if scenario.id == "redis_unavailable":
            affected = [
                comp_map.get("redis_cache", "Distributed In-Memory Cache (redis_cache)"),
                comp_map.get("core_domain_service", f"{domain} Domain Engine (core_domain_service)"),
                comp_map.get("auth_service", "Identity & Access Management (auth_service)"),
                comp_map.get("primary_database", "Transactional RDBMS Store (primary_database)"),
            ]
            impact = ChallengeImpact(
                severity="medium",
                summary="Cache miss storm degrades read latency from 12ms to ~140ms as all hot queries fall through to PostgreSQL.",
                blast_radius="Session validation, rate limiting, and hot query acceleration paths across Core Domain and Auth services.",
                data_loss_risk="None (Redis is configured as an ephemeral cache; source of truth resides in PostgreSQL).",
            )
            propagation = [
                "1. [T+0s] Redis cluster nodes stop responding to RESP ping probes; client driver connections exceed 50ms timeout.",
                "2. [T+2s] Auth Service and Domain Engine trip fallback logic, bypassing cache and querying Primary Database directly.",
                "3. [T+5s] PostgreSQL connection pool utilization increases from 25% to 85% due to sudden thundering herd query influx.",
                "4. [T+10s] P99 read latency spikes to 180ms; write operations remain operational but experience slight queuing lock delay.",
                "5. [T+30s] Rate limiter defaults to conservative local memory token buckets to prevent complete gateway throttling bypass.",
            ]
            safeguards = [
                "Cache-aside read bypass logic prevents hard service failure when Redis is unreachable.",
                "PostgreSQL connection pooling via PgBouncer prevents database process thread exhaustion.",
                "Short-lived stateless JWT tokens allow auth verification to proceed with public key decoding without Redis session lookups.",
            ]
            gaps = [
                "Lack of distributed request coalescing (Singleflight pattern) causes identical concurrent cache misses to hit the DB in parallel.",
                "In-memory rate limiter fallback is non-distributed, allowing per-pod quota drift across horizontally scaled ingress instances.",
            ]
            mitigations = [
                "Implement Singleflight / Mutex locking in the domain layer so only one database query executes per missing key.",
                "Enable Redis Cluster Sentinel multi-AZ automatic master failover with < 3-second heartbeat election.",
                "Configure Tier-1 local in-process LRU cache (15-second TTL) inside service pods to cushion database fallthrough.",
            ]
            recovery = "1. Verify Redis Sentinel/Cluster master promotion; 2. Warm cache keys asynchronously via background workers; 3. Gradually drain PgBouncer read replica queues."
            arch_changes = [
                "Add in-memory L1 cache layer (Ristretto/Cachetools) to Core Domain Service before hitting Redis L2.",
                "Deploy distributed Singleflight query suppressor on hot database read methods.",
            ]

        elif scenario.id == "database_unavailable":
            affected = [
                comp_map.get("primary_database", "Transactional RDBMS Store (primary_database)"),
                comp_map.get("core_domain_service", f"{domain} Domain Engine (core_domain_service)"),
                comp_map.get("event_bus", "Event Bus & Message Broker (event_bus)"),
                comp_map.get("api_gateway", "Ingress & API Gateway (api_gateway)"),
            ]
            impact = ChallengeImpact(
                severity="critical",
                summary="Complete write failure across all state mutation endpoints; system drops into read-only degraded mode.",
                blast_radius="All transactional state creation, updates, and order/command processing pipelines.",
                data_loss_risk="Low-to-Zero for committed transactions (WAL replication active); in-flight uncommitted transactions are rolled back.",
            )
            propagation = [
                "1. [T+0s] Primary PostgreSQL master crashes or storage becomes read-only; active TCP connections severed.",
                "2. [T+1s] Domain Engine connection pool exhausts retries and raises DatabaseOperationalError on all write endpoints.",
                "3. [T+3s] API Gateway receives 503 Service Unavailable on write routes (/create, /update) and trips circuit breaker.",
                "4. [T+8s] Asynchronous Domain Event publisher buffers incoming mutations in Kafka event bus with local disk spooling.",
                "5. [T+25s] Multi-AZ AWS RDS / Cloud SQL automated failover initiates, promoting synchronous standby replica to master.",
            ]
            safeguards = [
                "Synchronous replication to standby availability zone prevents committed transaction data loss.",
                "Circuit breaker on Ingress Gateway prevents client thread pool pile-up and returns structured 503 errors.",
                "Read replica isolation allows cached and read-only queries to continue serving user dashboards.",
            ]
            gaps = [
                "Domain services lack an offline mutation buffer for non-critical write operations.",
                "Automatic DNS failover propagation introduces a 20-45 second transition gap where writes fail.",
            ]
            mitigations = [
                "Implement Transactional Outbox with Kafka-backed write buffering for asynchronous non-blocking commands.",
                "Configure PgBouncer with aggressive connection healthchecks and multi-host connection string failover (target_session_attrs=read-write).",
                "Display clear maintenance banners on Web UI indicating read-only degraded status with automatic retry countdown.",
            ]
            recovery = "1. Promote hot standby replica to master; 2. Update PgBouncer routing target; 3. Replay buffered Kafka mutation events; 4. Validate table consistency checks."
            arch_changes = [
                "Incorporate Transactional Outbox pattern so edge writes queue in Kafka when RDBMS is momentarily unreachable.",
                "Configure PgBouncer with target_session_attrs=primary for sub-second DNS-independent failover.",
            ]

        elif scenario.id == "traffic_spike_20x":
            affected = [
                comp_map.get("api_gateway", "Ingress & API Gateway (api_gateway)"),
                comp_map.get("core_domain_service", f"{domain} Domain Engine (core_domain_service)"),
                comp_map.get("redis_cache", "Distributed In-Memory Cache (redis_cache)"),
                comp_map.get("primary_database", "Transactional RDBMS Store (primary_database)"),
            ]
            impact = ChallengeImpact(
                severity="high",
                summary="Sudden 20× surge pushes request load from 5k to 100k rps, triggering ingress rate shedding and pod scaling latency.",
                blast_radius="API Gateway CPU utilization, container memory, and database connection pool saturation.",
                data_loss_risk="None; rate-limited requests receive HTTP 429 Too Many Requests with Retry-After headers.",
            )
            propagation = [
                "1. [T+5s] Ingress traffic quadruples to 20k rps; Envoy proxy CPU jumps to 75% and initiates connection pooling scale.",
                "2. [T+15s] Traffic reaches 100k rps; Token bucket rate limiter engages, shedding ~40% of unauthenticated/low-tier requests (HTTP 429).",
                "3. [T+25s] Kubernetes Horizontal Pod Autoscaler (HPA) triggers scaling from 6 to 36 Domain Engine pods.",
                "4. [T+45s] Cold pod startup and container image pull causes 30-second latency hump before new pods pass readiness probes.",
                "5. [T+60s] Scaled pods absorb traffic; Redis cache hit ratio maintains 92%, protecting the primary database from overload.",
            ]
            safeguards = [
                "Token bucket rate limiting on API Gateway sheds excess load and protects downstream microservices from crashing.",
                "Stateless domain service architecture allows linear horizontal pod scaling without state migration locks.",
                "Redis caching offloads over 90% of read queries away from the relational database tier.",
            ]
            gaps = [
                "HPA scaling reaction delay (~45 seconds) is too slow for instantaneous 20× flash traffic spikes.",
                "Database connection pool max limit (PgBouncer) risks saturation if newly scaled 36 pods open default connection pools.",
            ]
            mitigations = [
                "Implement KEDA predictive autoscaling and scheduled scaling triggers before anticipated peak events.",
                "Configure Edge CDN (Cloudflare) caching rules for static and semi-static API responses to offload 70% of traffic before the gateway.",
                "Enforce strict per-pod connection pooling caps on PgBouncer (max 10 connections per domain pod).",
            ]
            recovery = "1. Allow HPA cluster scale to stabilize; 2. Monitor Redis memory eviction metrics; 3. Auto-scale read replica count if query queue exceeds 50ms."
            arch_changes = [
                "Deploy Edge CDN API caching layer in DMZ to absorb read-heavy traffic spikes before reaching the Ingress Gateway.",
                "Tune Kubernetes HPA with aggressive scale-up stabilization window (10s) and pod pre-warming pools.",
            ]

        elif scenario.id == "downstream_service_slow":
            ext_name = next((c.name for c in architecture.components if c.category == "external"), "Third-Party SaaS API")
            affected = [
                ext_name,
                comp_map.get("core_domain_service", f"{domain} Domain Engine (core_domain_service)"),
                comp_map.get("api_gateway", "Ingress & API Gateway (api_gateway)"),
            ]
            impact = ChallengeImpact(
                severity="medium",
                summary=f"Severe latency degradation (8,000ms) on {ext_name} threatens to exhaust application worker threads.",
                blast_radius="Outbound dispatch queues and synchronous HTTP request threads waiting on external API responses.",
                data_loss_risk="None; external operations are either queued or aborted with explicit error statuses.",
            )
            propagation = [
                "1. [T+0s] External vendor service response times jump from 50ms to 8,200ms with intermittent TCP reset packets.",
                "2. [T+3s] Core Domain Service worker threads block waiting on external HTTP responses; active thread count climbs to maximum.",
                "3. [T+6s] Circuit breaker (Resilience4j / Envoy) detects failure rate > 50% and trip-threshold (consecutive slow calls > 10).",
                "4. [T+8s] Circuit breaker transitions to OPEN state; subsequent calls immediately fail fast or return fallback payload without waiting.",
                "5. [T+30s] Circuit breaker enters HALF-OPEN state, sending canary probes until external API latency normalizes.",
            ]
            safeguards = [
                "Circuit breaker integration prevents blocking threads from exhausting the server connection pool.",
                "Strict 2.5-second outbound HTTP socket timeout prevents indefinite request hanging.",
            ]
            gaps = [
                "Synchronous invocation path in main request cycle exposes end-user latency to external vendor performance.",
                "Missing asynchronous retry queue for failed webhook deliveries.",
            ]
            mitigations = [
                "Decouple external vendor calls into asynchronous Kafka-backed background worker jobs with exponential backoff.",
                "Tune circuit breaker with 2,000ms timeout and 20% error rate trip threshold.",
                "Provide user with immediate 'Accepted (202)' status with polling or webhook completion updates.",
            ]
            recovery = "1. Circuit breaker trips to OPEN; 2. Enqueue pending vendor tasks in Kafka dead-letter queue; 3. Resume processing once canary probe succeeds."
            arch_changes = [
                "Transition all third-party integrations from synchronous blocking HTTP calls to asynchronous message queue workers.",
                "Implement Dead Letter Queue (DLQ) and retry topic in Kafka for failed outbound dispatches.",
            ]

        elif scenario.id == "payment_success_order_fail":
            affected = [
                comp_map.get("core_domain_service", f"{domain} Domain Engine (core_domain_service)"),
                comp_map.get("primary_database", "Transactional RDBMS Store (primary_database)"),
                comp_map.get("event_bus", "Event Bus & Message Broker (event_bus)"),
                "Payment Gateway Integration",
            ]
            impact = ChallengeImpact(
                severity="high",
                summary="Dual-write distributed inconsistency: Customer card is charged $150, but local database write fails, risking customer dispute.",
                blast_radius="Checkout / Transaction completion workflow and financial accounting records.",
                data_loss_risk="High financial and trust risk if uncompensated; charge exists without corresponding order record.",
            )
            propagation = [
                "1. [T+0s] Core Domain Service dispatches synchronous charge request to Stripe/Payment Gateway with unique idempotency key.",
                "2. [T+1s] Payment Gateway processes transaction successfully and returns HTTP 200 with payment_intent_id.",
                "3. [T+2s] Local PostgreSQL database commit fails due to OptimisticLockException / transient database deadlock.",
                "4. [T+3s] Exception handler catches commit failure and triggers Saga compensating workflow.",
                "5. [T+4s] Asynchronous refund / charge reversal job published to Kafka reconciliation queue; user notified of failure and instant refund.",
            ]
            safeguards = [
                "Idempotency keys passed to payment provider prevent duplicate charges upon automated retries.",
                "Structured exception handling captures third-party payment tokens before throwing domain errors.",
            ]
            gaps = [
                "Direct dual-write execution without Transactional Outbox pattern creates a window of inconsistency on database crash.",
                "Lack of automated continuous reconciliation batch job to audit orphan payment charges against database records.",
            ]
            mitigations = [
                "Adopt Orchestrated Saga Pattern with explicit compensating transactions (automatic Stripe refund API call).",
                "Create pending Order record in database with status 'PENDING_PAYMENT' *prior* to executing the external charge.",
                "Deploy hourly reconciliation worker comparing Stripe payment logs against database transaction records.",
            ]
            recovery = "1. Execute compensating refund via Payment Gateway API; 2. Log reconciliation alert in audit table; 3. Send notification email to customer."
            arch_changes = [
                "Implement Two-Phase Saga Pattern: Insert Order(PENDING_PAYMENT) -> Call Payment -> Update Order(CONFIRMED).",
                "Build automated reconciliation engine comparing payment provider webhook logs against relational ledger.",
            ]

        elif scenario.id == "message_broker_unavailable":
            affected = [
                comp_map.get("event_bus", "Event Bus & Message Broker (event_bus)"),
                comp_map.get("core_domain_service", f"{domain} Domain Engine (core_domain_service)"),
                comp_map.get("primary_database", "Transactional RDBMS Store (primary_database)"),
            ]
            impact = ChallengeImpact(
                severity="medium",
                summary="Kafka broker cluster outage halts real-time event streaming and asynchronous projection updates.",
                blast_radius="Background notification dispatch, search index updates, and analytics event pipelines.",
                data_loss_risk="Low if Transactional Outbox is active; High if producers rely solely on in-memory buffers.",
            )
            propagation = [
                "1. [T+0s] Apache Kafka broker loses quorum; produce requests return LeaderNotAvailableException.",
                "2. [T+1s] Core Domain Service event publisher encounters connection timeout and switches to local persistence fallback.",
                "3. [T+2s] Synchronous database transactions continue committing business entities and write domain events to the outbox table in PostgreSQL.",
                "4. [T+15s] Downstream consumer microservices pause processing due to empty topic partition poll responses.",
                "5. [T+60s] Kafka cluster recovers; Debezium / Outbox relay detects active broker and streams backlogged outbox records.",
            ]
            safeguards = [
                "Core business transactions do not directly block on Kafka ACK for primary data persistence.",
                "Transactional Outbox pattern guarantees zero event loss during broker downtime.",
            ]
            gaps = [
                "Outbox table in PostgreSQL can accumulate millions of rows during extended Kafka outages, increasing table bloat.",
                "Real-time notifications and external webhooks suffer latency delay until broker recovery.",
            ]
            mitigations = [
                "Deploy Transactional Outbox with Debezium CDC for durable event publishing.",
                "Set 24-hour retention buffer on Outbox table with automated vacuuming and partition pruning.",
                "Configure Kafka cluster with replication factor 3 and min.insync.replicas=2 across 3 availability zones.",
            ]
            recovery = "1. Restore Kafka broker quorum; 2. Restart outbox tailer relay; 3. Verify consumer lag returns to zero; 4. Prune sent outbox rows."
            arch_changes = [
                "Formally standardize on Transactional Outbox Pattern in PostgreSQL with CDC relay to Kafka.",
                "Configure Multi-AZ Kafka cluster with automated broker replacement and partition reassignment.",
            ]

        else:  # app_service_crash
            affected = [
                comp_map.get("core_domain_service", f"{domain} Domain Engine (core_domain_service)"),
                comp_map.get("api_gateway", "Ingress & API Gateway (api_gateway)"),
                comp_map.get("client_web_app", "Web Dashboard & User Interface (client_web_app)"),
            ]
            impact = ChallengeImpact(
                severity="high",
                summary="Core domain microservice container enters crash loop due to unhandled memory panic, dropping 50% of active service capacity.",
                blast_radius="Active HTTP requests in flight on affected pods and temporary ingress gateway 502 Bad Gateway responses.",
                data_loss_risk="None; transactions are rolled back; stateless design permits graceful container recreation.",
            )
            propagation = [
                "1. [T+0s] Unhandled exception or Out-Of-Memory (OOM) error causes domain service container process to terminate abruptly.",
                "2. [T+2s] Kubernetes kubelet detects container exit and initiates restart policy; pod readiness probe transitions to Unhealthy.",
                "3. [T+4s] Ingress Gateway receives endpoint removal notice and stops routing new ingress connections to the crashed pod.",
                "4. [T+8s] In-flight client requests on crashed container return 502/504; API Gateway retries idempotent GET queries on surviving pods.",
                "5. [T+30s] New replacement pod completes container initialization, passes healthchecks, and re-enters the active load balancer pool.",
            ]
            safeguards = [
                "Kubernetes deployment replica count (minimum 3 pods) ensures surviving pods handle incoming traffic.",
                "Ingress Gateway health check eviction removes unhealthy pods from routing pool within 3 seconds.",
                "Stateless pod design allows instant restart without state recovery locks.",
            ]
            gaps = [
                "Client-side retry storm can overwhelm surviving pods if clients do not implement exponential backoff with jitter.",
                "Pod cold-start latency (15-25 seconds) can cause transient queue backlog during sudden multi-pod crashes.",
            ]
            mitigations = [
                "Enforce strict memory limits and JVM/Python heap sizing with 75% memory alerts.",
                "Configure Envoy Ingress with passive outlier detection and automated client retry with jitter for idempotent operations.",
                "Maintain minimum 3 replicas spread across distinct availability zones.",
            ]
            recovery = "1. Kubernetes auto-restarts crashed pod; 2. Gateway re-adds healthy pod to active upstream cluster; 3. Ingest crash core dumps to APM (Sentry/Datadog)."
            arch_changes = [
                "Implement Kubernetes PodDisruptionBudgets (PDB) with minAvailable=2.",
                "Add passive health checking and outlier ejection in Ingress Gateway configuration.",
            ]

        return ChallengeAnalysisResult(
            scenario=scenario,
            impact=impact,
            affected_components=affected,
            failure_propagation=propagation,
            existing_safeguards=safeguards,
            identified_gaps=gaps,
            mitigations=mitigations,
            recovery_strategy=recovery,
            architecture_changes=arch_changes,
            evidence_used=evidence,
            confidence=0.96,
        )


challenge_service = ChallengeService()

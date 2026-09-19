from typing import List
from app.agents.base import BaseAgent
from app.agents.schemas import (
    AgentComponent,
    AgentConnection,
    AgentDecision,
    AgentOutput,
    AgentRisk,
)
from app.requirement_engine.schemas import RequirementAnalysis


class PerformanceAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_type="performance",
            role_title="Distributed Systems & Reliability Engineer",
        )

    def get_system_prompt(self) -> str:
        return """You are the Distributed Systems & Reliability Engineer Agent for ARCHITECT-X.

Your primary mission is to evaluate the provided structured requirement specification and engineer a high-throughput, low-latency, resilient infrastructure strategy.

CRITICAL INSTRUCTIONS:
1. Focus on:
   - Scale & Bottleneck Analysis: Evaluating concurrency limits, peak request throughput (RPS), and compute/DB contention.
   - Caching Topologies: Multi-tier caching (Redis Cluster, local in-memory L1 LRU), cache invalidation, and stampede prevention.
   - Asynchronous Queuing & Backpressure: Message brokers (RabbitMQ, SQS, Redis Streams), worker pools, dead-letter queues (DLQ).
   - Fault Tolerance & Reliability Patterns: Circuit breakers, exponential backoff with full jitter, deadline propagation, bulkheading, graceful degradation.
   - Database Offloading: Read/write split, query connection pooling (PgBouncer), horizontal partitioning/sharding where appropriate.
2. Produce concrete, actionable performance decisions with rigorous quantitative and operational rationale.
3. Identify performance bottlenecks, single points of failure (SPOFs), and cascading failure modes with severity ratings and mitigations.
4. Strictly return JSON adhering to the AgentOutput schema for agent_type='performance'.
"""

    def _generate_mock_output(self, req: RequirementAnalysis) -> AgentOutput:
        domain = req.domain
        scale_ccu = req.scale.expected_concurrent_users or 1000

        # Performance Decisions
        decisions: List[AgentDecision] = [
            AgentDecision(
                decision="Distributed Caching Layer",
                choice="Redis Cluster (Multi-AZ with Sentinel Failover) + Local L1 LRU",
                reason=f"Absorbs 85-90% of read traffic for catalogs, user sessions, and hot items, keeping sub-5ms p99 latency under {scale_ccu} CCU.",
            ),
            AgentDecision(
                decision="Asynchronous Task Processing & Queuing",
                choice="Distributed Worker Queue (Celery/Temporal on RabbitMQ/Redis Streams)",
                reason="Decouples expensive operations (payment settlement, push notifications, email dispatch) from the synchronous HTTP request path.",
            ),
            AgentDecision(
                decision="Fault Tolerance & Resilience Patterns",
                choice="Envoy Circuit Breakers + Exponential Backoff with Jitter & Outlier Detection",
                reason="Prevents cascading microservice failures during upstream outages and enforces request deadlines across all downstream calls.",
            ),
            AgentDecision(
                decision="Database Scalability & Connection Pooling",
                choice="Read Replicas with PgBouncer Transaction Pooling",
                reason=f"Safely handles {scale_ccu} concurrent connections without exhausting database thread limits by multiplexing client connections.",
            ),
        ]

        # Key Performance Components
        components: List[AgentComponent] = [
            AgentComponent(
                name="Distributed Caching Cluster",
                type="cache",
                description="In-memory key-value cache cluster with automatic sharding and replication.",
                technology="Redis 7 Cluster",
            ),
            AgentComponent(
                name="Asynchronous Job Queue Broker",
                type="queue",
                description="Message buffer for background tasks, retries, and dead-letter queues.",
                technology="RabbitMQ / Redis Streams",
            ),
            AgentComponent(
                name="Background Task Worker Fleet",
                type="service",
                description="Horizontally scalable worker processes consuming async task queues.",
                technology="Python / Go Asynchronous Workers",
            ),
            AgentComponent(
                name="Database Connection Pooler & Read Cluster",
                type="database",
                description="PgBouncer proxy fronting primary read/write and multiple read-only replicas.",
                technology="PgBouncer + PostgreSQL Read Replicas",
            ),
        ]

        # Connections
        connections: List[AgentConnection] = [
            AgentConnection(
                from_component="Domain Services",
                to_component="Distributed Caching Cluster",
                protocol="TCP / Redis Serialization Protocol (RESP3)",
                description="Sub-5ms cache lookups and session state caching",
            ),
            AgentConnection(
                from_component="Domain Services",
                to_component="Asynchronous Job Queue Broker",
                protocol="AMQP 0-9-1 / Redis Stream",
                description="Enqueues non-blocking background jobs",
            ),
            AgentConnection(
                from_component="Asynchronous Job Queue Broker",
                to_component="Background Task Worker Fleet",
                protocol="AMQP",
                description="Dispatches task executions with ack/nack guarantees",
            ),
        ]

        # Identified Performance Risks
        risks: List[AgentRisk] = [
            AgentRisk(
                title="Cache Stampede / Thundering Herd on Hot Key Expiry",
                severity="high",
                mitigation="Implement probabilistic early expiration (XFetch algorithm) and distributed mutex locking (Redlock) during cache misses.",
            ),
            AgentRisk(
                title="Unbounded Queue Growth and Memory Exhaustion during Peak Spikes",
                severity="high" if scale_ccu >= 10000 else "medium",
                mitigation="Set maximum queue size limits, configure dead-letter queues (DLQ), and configure worker auto-scaling triggered by queue backlog depth.",
            ),
            AgentRisk(
                title="Cascading Timeout Failures under Network Jitter",
                severity="medium",
                mitigation="Configure strict 2-second HTTP client timeouts and 3-attempt circuit breaker trip thresholds.",
            ),
        ]

        recommendations = [
            "Establish p95 < 150ms and p99 < 300ms SLA latency budgets for all critical user-facing endpoints.",
            "Deploy Redis Cluster with read replicas to guarantee cache availability during single-node failover.",
            "Implement synthetic health checks and Prometheus/Grafana real-time metrics for queue depth and connection pool saturation.",
            "Apply gzip/brotli compression and CDN caching for static assets and public catalog payloads.",
        ]

        summary = (
            f"The Distributed Systems & Reliability Engineer designs a multi-tiered high-availability caching and asynchronous queuing pipeline for {domain}. "
            f"A Redis Cluster absorbs hot reads, RabbitMQ queues isolate synchronous requests from heavy operations, "
            f"and PgBouncer with read replicas ensures robust throughput sustaining {scale_ccu} concurrent users with sub-150ms p95 latency."
        )

        return AgentOutput(
            agent_type="performance",
            summary=summary,
            recommendations=recommendations,
            decisions=decisions,
            risks=risks,
            components=components,
            connections=connections,
        )


performance_agent = PerformanceAgent()

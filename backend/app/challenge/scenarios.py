from typing import Dict, List, Optional
from app.challenge.schemas import ChallengeScenario

SCENARIO_DEFINITIONS: Dict[str, ChallengeScenario] = {
    "redis_unavailable": ChallengeScenario(
        id="redis_unavailable",
        name="Redis / Distributed Cache Outage",
        description="The primary distributed cache cluster (Redis) fails or becomes unreachable due to network partition.",
        category="Infrastructure Failure",
        failure_condition="All read and write operations to the distributed in-memory cache time out after 50ms.",
        expected_analysis_areas=[
            "Thundering herd load on relational database",
            "Session validation latency degradation",
            "Rate-limiting token bucket fallback behavior",
            "Graceful cache-aside bypass strategies",
        ],
    ),
    "database_unavailable": ChallengeScenario(
        id="database_unavailable",
        name="Primary PostgreSQL Database Outage",
        description="The primary transactional database node crashes or experiences storage volume corruption during peak load.",
        category="Infrastructure Failure",
        failure_condition="Master database accepts no new write connections; active transactions are rolled back.",
        expected_analysis_areas=[
            "Automated Multi-AZ replica promotion and failover duration",
            "Write queue buffering and backpressure isolation",
            "Read-only degraded mode execution",
            "Data consistency and split-brain prevention",
        ],
    ),
    "traffic_spike_20x": ChallengeScenario(
        id="traffic_spike_20x",
        name="20× Ingress Traffic Surge",
        description="Unprecedented viral surge causes incoming HTTP/gRPC request rate to multiply by 20× within 60 seconds.",
        category="Load / Scalability Spike",
        failure_condition="Incoming request throughput surges from 5,000 to 100,000 requests/sec with concurrent user spike.",
        expected_analysis_areas=[
            "Ingress gateway rate-limiting and shedding threshold",
            "Horizontal Pod Autoscaling (HPA) warm-up latency",
            "Connection pool exhaustion on database and cache",
            "Edge CDN caching offload percentage",
        ],
    ),
    "downstream_service_slow": ChallengeScenario(
        id="downstream_service_slow",
        name="Downstream Dependency Latency Degradation",
        description="An external partner API or third-party vendor service experiences latency increase from 50ms to 8,000ms.",
        category="Network / Latency Degradation",
        failure_condition="Third-party payment/logistics endpoints hang with high latency before returning intermittent 504 gateway timeouts.",
        expected_analysis_areas=[
            "Thread/worker pool starvation across upstream services",
            "Circuit breaker tripping thresholds and fallback execution",
            "Client request timeout propagation",
            "Asynchronous decouple queuing vs blocking HTTP calls",
        ],
    ),
    "payment_success_order_fail": ChallengeScenario(
        id="payment_success_order_fail",
        name="Dual-Write Inconsistency (Payment Charged, Order Fails)",
        description="Credit card charge succeeds at payment gateway, but the subsequent order creation fails due to network glitch.",
        category="Distributed Data Inconsistency",
        failure_condition="Third-party charge commits $150 transaction, but local database write throws OptimisticLockException.",
        expected_analysis_areas=[
            "Distributed transaction (Saga pattern) compensating transactions",
            "Idempotency key enforcement on payment retries",
            "Outbox pattern and transactional event streaming",
            "Reconciliation batch jobs and customer refund webhooks",
        ],
    ),
    "message_broker_unavailable": ChallengeScenario(
        id="message_broker_unavailable",
        name="Apache Kafka / Message Broker Outage",
        description="The distributed message broker cluster loses quorum or disk is full, rejecting all incoming produce requests.",
        category="Infrastructure Failure",
        failure_condition="Produce requests to Kafka/RabbitMQ fail with LeaderNotAvailableException; consumers halt event processing.",
        expected_analysis_areas=[
            "Transactional Outbox storage in primary database as buffer",
            "Memory buffer exhaustion in producer services",
            "Asynchronous telemetry loss vs critical business event preservation",
            "Consumer recovery and offset replay upon broker restoration",
        ],
    ),
    "app_service_crash": ChallengeScenario(
        id="app_service_crash",
        name="Core Application Container Crash Loop",
        description="A memory leak or unhandled panic causes all instances of a core application microservice to terminate abruptly.",
        category="Infrastructure Failure",
        failure_condition="Core domain service pods crash with OOMKilled; health checks fail continuously for 3 minutes.",
        expected_analysis_areas=[
            "Ingress gateway health check eviction and traffic rerouting",
            "Blast radius containment (preventing cascading crashes in adjacent microservices)",
            "Kubernetes pod auto-restart and cold-start warm-up latency",
            "Client-side retry storms and exponential backoff jitter",
        ],
    ),
}


def get_all_scenarios() -> List[ChallengeScenario]:
    """Retrieve all available challenge scenarios."""
    return list(SCENARIO_DEFINITIONS.values())


def get_scenario_by_id(scenario_id: str) -> Optional[ChallengeScenario]:
    """Retrieve a specific scenario by its identifier."""
    return SCENARIO_DEFINITIONS.get(scenario_id)

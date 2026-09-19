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


class ArchitectureAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_type="architecture",
            role_title="Senior Software Architect",
        )

    def get_system_prompt(self) -> str:
        return """You are the Senior Software Architect Agent for ARCHITECT-X.

Your primary mission is to evaluate the provided structured requirement specification and formulate an optimal, scalable system architecture proposal.

CRITICAL INSTRUCTIONS:
1. Focus on:
   - Overall topology (e.g., Modular Service Architecture, Event-Driven Microservices, Distributed Services).
   - Service boundaries & domain decomposition.
   - Primary database paradigm & persistence choice (e.g., PostgreSQL for ACID transactional needs).
   - Inter-service communication protocols (gRPC, REST, Async Event Bus).
   - Infrastructure components & containerized deployment topology.
2. Produce actionable, concrete technical decisions with thorough architectural rationale.
3. Identify structural architectural risks and trade-offs (e.g., distributed state, schema evolution, eventual consistency).
4. Strictly return JSON adhering to the AgentOutput schema for agent_type='architecture'.
"""

    def _generate_mock_output(self, req: RequirementAnalysis) -> AgentOutput:
        domain = req.domain
        scale_ccu = req.scale.expected_concurrent_users or 1000

        # Architecture Decisions
        decisions: List[AgentDecision] = [
            AgentDecision(
                decision="Architectural Style",
                choice="Event-Driven Modular Microservices",
                reason=f"Decouples core domain boundaries and facilitates independent scaling for {domain} operations.",
            ),
            AgentDecision(
                decision="Primary Database Paradigm",
                choice="PostgreSQL (Relational / ACID)",
                reason="Provides strict consistency, relational integrity, and transactional guarantees for orders and accounts.",
            ),
            AgentDecision(
                decision="Inter-Service Communication",
                choice="gRPC for internal RPC + Apache Kafka for asynchronous domain events",
                reason="High-throughput low-latency internal communication with decoupled asynchronous event streaming.",
            ),
            AgentDecision(
                decision="API Gateway & Ingress",
                choice="Envoy / Kong API Gateway with JWT verification",
                reason="Centralized TLS termination, edge routing, request validation, and rate limiting.",
            ),
        ]

        # Key Architecture Components
        components: List[AgentComponent] = [
            AgentComponent(
                name="Edge API Gateway",
                type="gateway",
                description="Ingress routing, TLS termination, and token verification.",
                technology="Kong / Envoy",
            ),
            AgentComponent(
                name=f"{domain.replace('_', ' ').title()} Core Service",
                type="service",
                description="Encapsulates core domain business logic and transactional state transitions.",
                technology="Go / FastAPI",
            ),
            AgentComponent(
                name="Primary Relational Cluster",
                type="database",
                description="Primary transactional store with read replicas.",
                technology="PostgreSQL 16",
            ),
            AgentComponent(
                name="Event Stream Broker",
                type="queue",
                description="Decoupled asynchronous event backbone.",
                technology="Apache Kafka",
            ),
        ]

        # Connections
        connections: List[AgentConnection] = [
            AgentConnection(
                from_component="Edge API Gateway",
                to_component=f"{domain.replace('_', ' ').title()} Core Service",
                protocol="HTTPS / gRPC",
                description="Internal load-balanced RPC routing",
            ),
            AgentConnection(
                from_component=f"{domain.replace('_', ' ').title()} Core Service",
                to_component="Primary Relational Cluster",
                protocol="TCP / Postgres Wire Protocol",
                description="Transactional read/write queries",
            ),
            AgentConnection(
                from_component=f"{domain.replace('_', ' ').title()} Core Service",
                to_component="Event Stream Broker",
                protocol="TCP / Kafka Protocol",
                description="Publishes state change domain events",
            ),
        ]

        # Identified Risks
        risks: List[AgentRisk] = [
            AgentRisk(
                title="Distributed Transaction Complexity",
                severity="medium" if scale_ccu < 10000 else "high",
                mitigation="Implement Saga orchestration pattern for multi-service state transitions.",
            ),
            AgentRisk(
                title="Database Connection Pool Exhaustion under Peak Concurrency",
                severity="high",
                mitigation="Deploy PgBouncer connection poolers and enforce read replica routing for query workloads.",
            ),
        ]

        recommendations = [
            "Maintain strict domain boundaries with dedicated schemas per service domain.",
            "Implement transactional outbox pattern to guarantee event publication consistency.",
            f"Provision horizontal pod auto-scaling (HPA) targets based on CPU & request queue depth for {scale_ccu} concurrent users.",
        ]

        summary = (
            f"The Senior Software Architect recommends an Event-Driven Modular Architecture for the {domain} system. "
            f"PostgreSQL is designated as the primary ACID data store, fronted by an API Gateway with asynchronous Kafka event streaming "
            f"to reliably sustain {scale_ccu} concurrent users with clean boundary isolation."
        )

        return AgentOutput(
            agent_type="architecture",
            summary=summary,
            recommendations=recommendations,
            decisions=decisions,
            risks=risks,
            components=components,
            connections=connections,
        )


architecture_agent = ArchitectureAgent()

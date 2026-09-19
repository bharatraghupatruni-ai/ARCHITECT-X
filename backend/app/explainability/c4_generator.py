import re
from typing import Any, Dict, List, Optional
from app.explainability.schemas import (
    C4Boundary,
    C4LevelData,
    C4Node,
    C4Relationship,
)


class C4Generator:
    """Generates deterministic, multi-level C4 model architectures and Mermaid diagrams."""

    def generate_c4_model(
        self,
        project_name: str,
        analysis_data: Optional[Dict[str, Any]],
        agent_results_data: Optional[Dict[str, Any]],
        review_output_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generate structured Level 1, Level 2, and Level 3 C4 diagrams along with Mermaid representations."""
        analysis = (analysis_data or {}).get("analysis", {}) if "analysis" in (analysis_data or {}) else (analysis_data or {})
        domain = analysis.get("domain", "Enterprise System")
        system_type = analysis.get("system_type", "Distributed Microservices")
        external_integrations = analysis.get("external_integrations", [])
        architecture_agent = (agent_results_data or {}).get("architecture", {}) or {}
        components_from_agent = architecture_agent.get("components", [])

        # 1. Level 1: System Context
        level_1 = self._build_level_1_context(project_name, domain, system_type, external_integrations)
        mermaid_1 = self._render_mermaid_context(project_name, level_1)

        # 2. Level 2: Container Topology
        level_2 = self._build_level_2_container(project_name, domain, external_integrations, components_from_agent)
        mermaid_2 = self._render_mermaid_container(project_name, level_2)

        # 3. Level 3: Component Deep-Dive
        level_3 = self._build_level_3_component(project_name, domain, components_from_agent)
        mermaid_3 = self._render_mermaid_component(project_name, level_3)

        return {
            "title": f"C4 Architectural Topology: {project_name}",
            "level_1_context": level_1.model_dump(),
            "level_2_container": level_2.model_dump(),
            "level_3_component": level_3.model_dump(),
            "mermaid_context": mermaid_1,
            "mermaid_container": mermaid_2,
            "mermaid_component": mermaid_3,
        }

    def _build_level_1_context(
        self,
        project_name: str,
        domain: str,
        system_type: str,
        external_integrations: List[str],
    ) -> C4LevelData:
        nodes: List[C4Node] = [
            C4Node(
                id="user_actor",
                label="Primary Client / User",
                type="person",
                technology="Web Browser / Mobile App",
                description=f"End-user accessing {domain} services and workflows.",
                security_zone="public",
                icon="user",
            ),
            C4Node(
                id="admin_actor",
                label="Platform Administrator",
                type="person",
                technology="Secured Web Console",
                description="DevOps and operations engineers managing system state, observability, and configurations.",
                security_zone="public",
                icon="shield",
            ),
            C4Node(
                id="core_system",
                label=f"{project_name} Platform",
                type="system",
                technology=f"{system_type} Architecture",
                description=f"Evidence-grounded {domain} core platform handling state, processing, and transactions.",
                security_zone="vpc_private",
                icon="server",
            ),
        ]

        # External Integrations as external systems
        ext_list = external_integrations if external_integrations else ["Payment Gateway (Stripe/Adyen)", "Notification Service (SMS/Email)"]
        for idx, ext in enumerate(ext_list[:3]):
            ext_id = f"ext_sys_{idx + 1}"
            nodes.append(
                C4Node(
                    id=ext_id,
                    label=ext,
                    type="system",
                    technology="External 3rd-Party SaaS / Cloud",
                    description=f"External vendor integration for {ext}.",
                    security_zone="third_party",
                    icon="external-link",
                )
            )

        relationships: List[C4Relationship] = [
            C4Relationship(
                source="user_actor",
                target="core_system",
                protocol="HTTPS / TLS 1.3 / WSS",
                description="Submits requests, views telemetry, and consumes domain workflows",
            ),
            C4Relationship(
                source="admin_actor",
                target="core_system",
                protocol="HTTPS / mTLS / SSO",
                description="Manages deployment configurations, audit policies, and scale bounds",
            ),
        ]

        for idx, ext in enumerate(ext_list[:3]):
            ext_id = f"ext_sys_{idx + 1}"
            relationships.append(
                C4Relationship(
                    source="core_system",
                    target=ext_id,
                    protocol="REST / Webhook / OAuth2",
                    description=f"Dispatches secure callbacks and queries {ext}",
                )
            )

        boundaries = [
            C4Boundary(
                id="enterprise_boundary",
                label=f"{project_name} Enterprise Boundary",
                type="enterprise",
                node_ids=["core_system"],
            )
        ]

        return C4LevelData(
            level=1,
            title="Level 1: System Context Diagram",
            description=f"High-level context showing actors, the {project_name} system boundary, and external SaaS dependencies.",
            nodes=nodes,
            relationships=relationships,
            boundaries=boundaries,
        )

    def _build_level_2_container(
        self,
        project_name: str,
        domain: str,
        external_integrations: List[str],
        components: List[Dict[str, Any]],
    ) -> C4LevelData:
        nodes: List[C4Node] = [
            C4Node(
                id="frontend_spa",
                label="Single Page Application",
                type="container",
                technology="Next.js 14 / TypeScript / Tailwind CSS",
                description="Responsive rich dashboard for real-time interactions and telemetry.",
                security_zone="public",
                icon="layout",
            ),
            C4Node(
                id="api_gateway",
                label="API Gateway & Ingress",
                type="gateway",
                technology="Envoy Proxy / Kong / Cloudflare",
                description="Provides rate limiting, TLS termination, JWT validation, and routing.",
                security_zone="dmz",
                icon="shield-alert",
            ),
            C4Node(
                id="app_core_service",
                label="Core Processing Engine",
                type="container",
                technology="Python FastAPI / Go / Rust",
                description=f"Core microservice orchestrating business logic and state transitions for {domain}.",
                security_zone="vpc_private",
                icon="cpu",
            ),
            C4Node(
                id="event_broker",
                label="Event Bus & Message Queue",
                type="queue",
                technology="Apache Kafka / RabbitMQ",
                description="Asynchronous publish/subscribe message broker handling event-driven decoupled streaming.",
                security_zone="vpc_private",
                icon="layers",
            ),
            C4Node(
                id="primary_database",
                label="Transactional Database",
                type="database",
                technology="PostgreSQL 16 (Multi-AZ with Read Replicas)",
                description="Stores structured entities, audit trails, and ACID transactional state.",
                security_zone="secure_persistence",
                icon="database",
            ),
            C4Node(
                id="cache_layer",
                label="Distributed Cache & In-Memory Store",
                type="database",
                technology="Redis Cluster v7",
                description="Caches hot session states, idempotency keys, and sub-millisecond query results.",
                security_zone="secure_persistence",
                icon="zap",
            ),
        ]

        # Add external payment/webhook container
        nodes.append(
            C4Node(
                id="ext_services_hub",
                label="3rd-Party Payment & Vendor APIs",
                type="system",
                technology="External REST APIs",
                description="Stripe, Twilio, and external partner endpoints.",
                security_zone="third_party",
                icon="globe",
            )
        )

        relationships: List[C4Relationship] = [
            C4Relationship(
                source="frontend_spa",
                target="api_gateway",
                protocol="HTTPS / REST / WebSocket",
                description="Encrypted user requests & live status streams",
            ),
            C4Relationship(
                source="api_gateway",
                target="app_core_service",
                protocol="gRPC / HTTP/2 / mTLS",
                description="Authenticated & rate-limited internal RPC calls",
            ),
            C4Relationship(
                source="app_core_service",
                target="event_broker",
                protocol="AMQP / Kafka Protocol",
                description="Publishes async state events & audit signals",
                is_async=True,
            ),
            C4Relationship(
                source="app_core_service",
                target="cache_layer",
                protocol="RESP (Redis Protocol)",
                description="Fetches hot keys and evaluates idempotency locks",
            ),
            C4Relationship(
                source="app_core_service",
                target="primary_database",
                protocol="PostgreSQL Wire / TCP",
                description="Executes ACID transactional writes and queries",
            ),
            C4Relationship(
                source="app_core_service",
                target="ext_services_hub",
                protocol="HTTPS / TLS 1.3",
                description="External payment dispatch & notification webhooks",
                is_async=False,
            ),
        ]

        boundaries = [
            C4Boundary(
                id="dmz_boundary",
                label="DMZ & Ingress Zone",
                type="security_zone",
                node_ids=["api_gateway"],
            ),
            C4Boundary(
                id="private_vpc_boundary",
                label="Private Application VPC (Zero-Trust)",
                type="security_zone",
                node_ids=["app_core_service", "event_broker"],
            ),
            C4Boundary(
                id="persistence_boundary",
                label="Encrypted Persistence Subnet",
                type="security_zone",
                node_ids=["primary_database", "cache_layer"],
            ),
        ]

        return C4LevelData(
            level=2,
            title="Level 2: Container Diagram",
            description=f"Decomposes the {project_name} system into deployable containers, network zones, and protocols.",
            nodes=nodes,
            relationships=relationships,
            boundaries=boundaries,
        )

    def _build_level_3_component(
        self,
        project_name: str,
        domain: str,
        components: List[Dict[str, Any]],
    ) -> C4LevelData:
        nodes: List[C4Node] = [
            C4Node(
                id="api_controller",
                label="API Router & Request Controller",
                type="component",
                technology="FastAPI Route Handlers",
                description="Parses incoming HTTP payloads, performs schema validation, and maps to use-cases.",
                security_zone="vpc_private",
                icon="terminal",
            ),
            C4Node(
                id="auth_interceptor",
                label="Security & Auth Guard",
                type="component",
                technology="JWT / Ed25519 Validator",
                description="Validates cryptographic identity tokens, user scopes, and enforces least-privilege RBAC.",
                security_zone="vpc_private",
                icon="lock",
            ),
            C4Node(
                id="domain_orchestrator",
                label=f"{domain} Domain Engine",
                type="component",
                technology="Pure Domain Services",
                description="Coordinates core business state rules, transactional boundaries, and domain workflows.",
                security_zone="vpc_private",
                icon="box",
            ),
            C4Node(
                id="resilience_circuit",
                label="Resilience & Circuit Breaker Guard",
                type="component",
                technology="Resilience4j / Tenacity Adapter",
                description="Guards against downstream latency spikes with automatic fallback policies.",
                security_zone="vpc_private",
                icon="shield-check",
            ),
            C4Node(
                id="event_publisher",
                label="Event Producer & Publisher",
                type="component",
                technology="Kafka Async Producer",
                description="Serializes domain events to Avro/JSON and streams to the message broker.",
                security_zone="vpc_private",
                icon="radio",
            ),
            C4Node(
                id="repo_layer",
                label="Repository & Data Access Layer",
                type="component",
                technology="SQLAlchemy 2.0 / Async Engine",
                description="Encapsulates SQL queries, connection pooling, and optimistic concurrency locks.",
                security_zone="vpc_private",
                icon="database",
            ),
        ]

        relationships: List[C4Relationship] = [
            C4Relationship(
                source="api_controller",
                target="auth_interceptor",
                protocol="In-Memory Method Call",
                description="Verifies token authorization headers",
            ),
            C4Relationship(
                source="api_controller",
                target="domain_orchestrator",
                protocol="In-Memory Dispatch",
                description="Executes authorized command/query",
            ),
            C4Relationship(
                source="domain_orchestrator",
                target="resilience_circuit",
                protocol="Interceptor Hook",
                description="Wraps external network calls with timeout & retry policies",
            ),
            C4Relationship(
                source="domain_orchestrator",
                target="repo_layer",
                protocol="Async DAO Call",
                description="Persists state changes and reads entity aggregations",
            ),
            C4Relationship(
                source="domain_orchestrator",
                target="event_publisher",
                protocol="Async Non-blocking Dispatch",
                description="Emits domain events upon successful state commit",
                is_async=True,
            ),
        ]

        boundaries = [
            C4Boundary(
                id="core_component_boundary",
                label="Core Processing Engine Container Boundary",
                type="container",
                node_ids=[n.id for n in nodes],
            )
        ]

        return C4LevelData(
            level=3,
            title="Level 3: Component Diagram",
            description=f"Detailed internal architectural components within the Core Processing Engine container.",
            nodes=nodes,
            relationships=relationships,
            boundaries=boundaries,
        )

    def _render_mermaid_context(self, project_name: str, level_1: C4LevelData) -> str:
        clean_name = re.sub(r'[^a-zA-Z0-9_]', '_', project_name)
        lines = [
            "C4Context",
            f"  title System Context Diagram for {project_name}",
            "",
            "  Person(user, \"Primary User\", \"Customer or client interacting with the system\")",
            "  Person(admin, \"Platform Admin\", \"Operations, DevOps, and administrators\")",
            f"  System({clean_name}, \"{project_name}\", \"Core architecture system providing business operations\")",
            "  System_Ext(payment_ext, \"Payment Gateway\", \"External payment processing SaaS\")",
            "  System_Ext(notify_ext, \"Notification Service\", \"SMS, Push, and Email messaging provider\")",
            "",
            f"  Rel(user, {clean_name}, \"Interacts with\", \"HTTPS/TLS\")",
            f"  Rel(admin, {clean_name}, \"Configures & monitors\", \"HTTPS/mTLS\")",
            f"  Rel({clean_name}, payment_ext, \"Dispatches charges & verifies transactions\", \"REST/OAuth2\")",
            f"  Rel({clean_name}, notify_ext, \"Streams alerts and receipts\", \"REST/Webhook\")",
        ]
        return "\n".join(lines)

    def _render_mermaid_container(self, project_name: str, level_2: C4LevelData) -> str:
        clean_name = re.sub(r'[^a-zA-Z0-9_]', '_', project_name)
        lines = [
            "C4Container",
            f"  title Container Diagram for {project_name}",
            "",
            "  Person(user, \"Customer\", \"End user client\")",
            f"  System_Boundary({clean_name}_boundary, \"{project_name} Boundary\") {{",
            "    Container(spa, \"Single-Page App\", \"Next.js 14, TypeScript\", \"User interface & dashboard\")",
            "    Container(api_gw, \"API Gateway\", \"Envoy / Kong\", \"TLS termination, rate limiting, auth routing\")",
            "    Container(core_srv, \"Core Processing Engine\", \"FastAPI / Go\", \"Business domain logic & orchestration\")",
            "    ContainerQueue(event_bus, \"Event Bus\", \"Apache Kafka / RabbitMQ\", \"Asynchronous event streaming & backpressure\")",
            "    ContainerDb(db, \"Transactional DB\", \"PostgreSQL 16\", \"ACID persistence, relational data\")",
            "    ContainerDb(cache, \"In-Memory Cache\", \"Redis Cluster\", \"Hot sessions, rate limits, idempotency\")",
            "  }",
            "  System_Ext(ext_payment, \"External Partner APIs\", \"Stripe / Third-Party\", \"External transaction services\")",
            "",
            "  Rel(user, spa, \"Uses\", \"HTTPS\")",
            "  Rel(spa, api_gw, \"Sends API calls\", \"JSON / HTTPS / WSS\")",
            "  Rel(api_gw, core_srv, \"Routes verified requests\", \"gRPC / mTLS\")",
            "  Rel(core_srv, cache, \"Queries cached data & locks\", \"RESP Protocol\")",
            "  Rel(core_srv, db, \"Reads & writes state\", \"SQL / TCP\")",
            "  Rel(core_srv, event_bus, \"Publishes domain events\", \"Kafka / AMQP\")",
            "  Rel(core_srv, ext_payment, \"Processes payments\", \"REST / HTTPS\")",
        ]
        return "\n".join(lines)

    def _render_mermaid_component(self, project_name: str, level_3: C4LevelData) -> str:
        lines = [
            "C4Component",
            f"  title Component Diagram for {project_name} Core Engine",
            "",
            "  Container_Boundary(core_engine, \"Core Processing Engine Container\") {",
            "    Component(controller, \"API Controller\", \"FastAPI Router\", \"Parses requests & performs validation\")",
            "    Component(auth_guard, \"Auth Interceptor\", \"JWT / Ed25519 Validator\", \"Enforces RBAC & verifies tokens\")",
            "    Component(domain_svc, \"Domain Engine\", \"Business Logic\", \"Executes transactional state workflows\")",
            "    Component(circuit, \"Resilience Guard\", \"Circuit Breaker\", \"Protects against downstream failure\")",
            "    Component(repo, \"Repository DAO\", \"SQLAlchemy 2.0\", \"Data access layer & persistence\")",
            "    Component(event_pub, \"Event Producer\", \"Kafka Async Producer\", \"Publishes domain state events\")",
            "  }",
            "  ContainerDb_Ext(db_inst, \"PostgreSQL Database\", \"Relational store\")",
            "  ContainerQueue_Ext(kafka_inst, \"Kafka Event Broker\", \"Event stream\")",
            "",
            "  Rel(controller, auth_guard, \"Validates token\")",
            "  Rel(controller, domain_svc, \"Dispatches command\")",
            "  Rel(domain_svc, circuit, \"Executes network call with fallback\")",
            "  Rel(domain_svc, repo, \"Persists state changes\")",
            "  Rel(domain_svc, event_pub, \"Emits event on commit\")",
            "  Rel(repo, db_inst, \"Reads/Writes SQL\")",
            "  Rel(event_pub, kafka_inst, \"Streams Avro/JSON event\")",
        ]
        return "\n".join(lines)


c4_generator = C4Generator()

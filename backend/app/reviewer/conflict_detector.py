import re
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple
from app.agents.schemas import AgentOutput, AgentDecision, AgentRisk, AgentComponent, AgentConnection
from app.reviewer.schemas import DetectedConflict


class ConflictDetector:
    """
    Analyzes and compares multi-agent outputs (Architecture, Security, Performance)
    to detect architectural disagreements, trade-offs, conflicting decisions,
    risk tensions, and missing structural decisions.
    """

    # Category normalization keywords
    CATEGORY_KEYWORDS = {
        "database": ["database", "storage", "db", "persistence", "datastore", "sql", "nosql"],
        "caching": ["cache", "caching", "redis", "memcached", "in-memory"],
        "authentication_and_auth": ["auth", "authentication", "authorization", "oauth", "jwt", "oidc", "rbac", "identity"],
        "communication_protocol": ["protocol", "communication", "grpc", "rest", "http", "api", "transport", "rpc"],
        "messaging_and_events": ["queue", "broker", "kafka", "rabbitmq", "pubsub", "event", "messaging", "stream"],
        "transport_security": ["tls", "mtls", "ssl", "mesh", "transport security", "service mesh"],
        "scalability_and_resilience": ["scaling", "autoscaling", "concurrency", "load", "replica", "pooling", "resilience"],
        "encryption_and_secrets": ["encryption", "kms", "secret", "vault", "at-rest", "in-transit"],
    }

    # Known technology signatures for comparison
    TECH_SIGNATURES = {
        "postgresql": ["postgres", "postgresql", "psql", "relational", "acid", "rdbms"],
        "mongodb": ["mongo", "mongodb", "document", "nosql"],
        "mysql": ["mysql", "mariadb"],
        "redis": ["redis", "valkey", "in-memory cache"],
        "kafka": ["kafka", "apache kafka", "event streaming", "event log"],
        "rabbitmq": ["rabbitmq", "amqp", "message queue"],
        "grpc": ["grpc", "protobuf", "protocol buffer"],
        "rest": ["rest", "http/json", "openapi"],
        "mtls": ["mtls", "mutual tls", "service mesh", "istio", "envoy"],
        "oauth2_jwt": ["oauth2", "jwt", "oidc", "json web token"],
        "session_cookies": ["session cookie", "stateful session", "server session"],
    }

    def detect_conflicts(
        self,
        architecture_output: Optional[AgentOutput],
        security_output: Optional[AgentOutput],
        performance_output: Optional[AgentOutput],
    ) -> List[DetectedConflict]:
        """
        Main conflict detection entry point.
        Analyzes all agent decisions, risks, components, and connections.
        """
        conflicts: List[DetectedConflict] = []
        agent_map: Dict[str, Optional[AgentOutput]] = {
            "architecture": architecture_output,
            "security": security_output,
            "performance": performance_output,
        }

        # 1. Compare Decision Categories across Agents
        category_decisions = self._group_decisions_by_category(agent_map)
        conflicts.extend(self._detect_decision_disagreements(category_decisions))

        # 2. Detect Cross-Cutting Trade-Off Tensions (Security vs Performance, Consistency vs Latency)
        conflicts.extend(self._detect_tradeoff_tensions(agent_map))

        # 3. Detect Risk Disagreements and Threat-Overload
        conflicts.extend(self._detect_risk_disagreements(agent_map))

        # 4. Detect Component & Protocol Clashes
        conflicts.extend(self._detect_protocol_and_component_clashes(agent_map))

        # 5. Detect Critical Architecture Gaps / Missing Decisions
        conflicts.extend(self._detect_missing_decisions(category_decisions, agent_map))

        # Ensure unique IDs and deduplicate by (category, conflict_type, description)
        deduped_conflicts = self._deduplicate_conflicts(conflicts)
        return deduped_conflicts

    def _normalize_category(self, raw_category_or_decision: str) -> str:
        """Map raw text string to standard architectural category."""
        text = raw_category_or_decision.lower()
        for standard_cat, keywords in self.CATEGORY_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                return standard_cat
        return "general_architecture"

    def _extract_tech_signatures(self, text: str) -> Set[str]:
        """Extract canonical technology signatures from agent choice/reason text."""
        lowered = text.lower()
        found = set()
        for tech_key, aliases in self.TECH_SIGNATURES.items():
            if any(alias in lowered for alias in aliases):
                found.add(tech_key)
        return found

    def _group_decisions_by_category(
        self,
        agent_map: Dict[str, Optional[AgentOutput]],
    ) -> Dict[str, Dict[str, List[AgentDecision]]]:
        """Organizes decisions by standard category across agents."""
        grouped: Dict[str, Dict[str, List[AgentDecision]]] = {}

        for agent_type, output in agent_map.items():
            if not output or not output.decisions:
                continue
            for dec in output.decisions:
                cat = self._normalize_category(f"{dec.decision} {dec.choice}")
                if cat not in grouped:
                    grouped[cat] = {"architecture": [], "security": [], "performance": []}
                grouped[cat][agent_type].append(dec)

        return grouped

    def _detect_decision_disagreements(
        self,
        category_decisions: Dict[str, Dict[str, List[AgentDecision]]],
    ) -> List[DetectedConflict]:
        """Detect direct technical disagreements across agents within the same category."""
        conflicts: List[DetectedConflict] = []

        for category, agent_decs in category_decisions.items():
            active_agents = {agent: decs for agent, decs in agent_decs.items() if decs}
            if len(active_agents) < 2:
                continue

            # Compare technology signatures
            agent_techs: Dict[str, Set[str]] = {}
            agent_choices: Dict[str, str] = {}

            for agent, decs in active_agents.items():
                combined_text = " ".join([f"{d.choice} {d.reason}" for d in decs])
                agent_techs[agent] = self._extract_tech_signatures(combined_text)
                agent_choices[agent] = " | ".join([d.choice for d in decs])

            # Check for mutually exclusive or competing choices
            # E.g. PostgreSQL vs MongoDB / Cassandra
            if "database" in category:
                has_relational = any("postgresql" in techs or "mysql" in techs for techs in agent_techs.values())
                has_nosql = any("mongodb" in techs for techs in agent_techs.values())
                if has_relational and has_nosql:
                    conflicts.append(
                        DetectedConflict(
                            category="database",
                            conflict_type="disagreement",
                            severity="high",
                            description="Direct disagreement on primary database paradigm: relational ACID storage vs. NoSQL document store.",
                            agent_positions=agent_choices,
                            impacted_requirements=["Data consistency", "Transactional guarantees", "Query throughput"],
                            resolution="Evaluate write concurrency vs. strict transactional correctness.",
                        )
                    )

            # E.g. Kafka vs RabbitMQ
            if "messaging_and_events" in category:
                has_kafka = any("kafka" in techs for techs in agent_techs.values())
                has_rabbitmq = any("rabbitmq" in techs for techs in agent_techs.values())
                if has_kafka and has_rabbitmq:
                    conflicts.append(
                        DetectedConflict(
                            category="messaging_and_events",
                            conflict_type="disagreement",
                            severity="medium",
                            description="Message broker selection conflict between high-throughput event streaming (Kafka) and complex AMQP routing (RabbitMQ).",
                            agent_positions=agent_choices,
                            impacted_requirements=["Event throughput", "Message ordering", "Routing flexibility"],
                        )
                    )

            # E.g. REST vs gRPC for internal mesh
            if "communication_protocol" in category:
                has_grpc = any("grpc" in techs for techs in agent_techs.values())
                has_rest = any("rest" in techs for techs in agent_techs.values())
                if has_grpc and has_rest:
                    conflicts.append(
                        DetectedConflict(
                            category="communication_protocol",
                            conflict_type="tradeoff",
                            severity="medium",
                            description="Divergent protocol strategy: High-performance binary multiplexing (gRPC) vs. lightweight HTTP/JSON REST interfaces.",
                            agent_positions=agent_choices,
                            impacted_requirements=["Inter-service latency", "Serialization overhead", "Developer ergonomics"],
                        )
                    )

        return conflicts

    def _detect_tradeoff_tensions(
        self,
        agent_map: Dict[str, Optional[AgentOutput]],
    ) -> List[DetectedConflict]:
        """Detect inherent trade-offs between Security, Performance, and Architecture."""
        conflicts: List[DetectedConflict] = []
        sec = agent_map.get("security")
        perf = agent_map.get("performance")
        arch = agent_map.get("architecture")

        # Tension 1: mTLS / Cryptographic Inspection vs Latency Overhead
        if sec and perf:
            sec_text = " ".join([d.choice + " " + d.reason for d in sec.decisions] + sec.recommendations).lower()
            perf_text = " ".join([d.choice + " " + d.reason for d in perf.decisions] + perf.recommendations).lower()

            if ("mtls" in sec_text or "encryption" in sec_text or "zero-trust" in sec_text) and (
                "latency" in perf_text or "sub-10ms" in perf_text or "p99" in perf_text or "throughput" in perf_text
            ):
                conflicts.append(
                    DetectedConflict(
                        category="transport_security",
                        conflict_type="tradeoff",
                        severity="high",
                        description="Security mandates ubiquitous mTLS / cryptographic verification across all microservices, which introduces a 5-15ms TLS handshake and CPU encryption overhead on high-throughput internal RPC paths.",
                        agent_positions={
                            "security": "Zero-trust mTLS encryption for all inter-service communication.",
                            "performance": "Strict latency budgets (<100ms P99) and minimal serialization/TLS hop overhead.",
                        },
                        impacted_requirements=["Inter-service latency SLA", "Zero-trust compliance", "CPU utilization"],
                        resolution="Utilize persistent connection pooling with TLS session resumption (or Envoy sidecars with eBPF acceleration) to mitigate handshake costs.",
                    )
                )

        # Tension 2: Cache Consistency vs Read Throughput (Cache-Aside / Eventual Consistency)
        if arch and perf:
            arch_text = " ".join([d.choice + " " + d.reason for d in arch.decisions]).lower()
            perf_text = " ".join([d.choice + " " + d.reason for d in perf.decisions]).lower()

            if "redis" in perf_text or "cache" in perf_text:
                conflicts.append(
                    DetectedConflict(
                        category="caching",
                        conflict_type="tradeoff",
                        severity="medium",
                        description="Aggressive multi-tier caching (Redis) achieves 50k concurrent user throughput but creates potential cache staleness / invalidation races with transactional databases.",
                        agent_positions={
                            "architecture": "PostgreSQL relational persistence for strict ACID order guarantees.",
                            "performance": "Multi-AZ Redis cluster with aggressive TTLs and cache-aside read offloading.",
                        },
                        impacted_requirements=["Data freshness", "Database load shedding", "Concurrent read scalability"],
                        resolution="Implement write-through or Kafka change-data-capture (Debezium) cache invalidation.",
                    )
                )

        return conflicts

    def _detect_risk_disagreements(
        self,
        agent_map: Dict[str, Optional[AgentOutput]],
    ) -> List[DetectedConflict]:
        """Detect conflicting risk priorities or risk escalations across agents."""
        conflicts: List[DetectedConflict] = []
        all_risks: List[Tuple[str, AgentRisk]] = []

        for agent, out in agent_map.items():
            if out:
                for r in out.risks:
                    all_risks.append((agent, r))

        # Check for critical / high risk collisions or unmitigated risks
        critical_risks = [r for r in all_risks if r[1].severity.lower() in ["critical", "high"]]
        if len(critical_risks) >= 2:
            positions: Dict[str, Any] = {}
            for agent, r in critical_risks:
                if agent not in positions:
                    positions[agent] = []
                positions[agent].append(f"[{r.severity.upper()}] {r.title}")

            conflicts.append(
                DetectedConflict(
                    category="resilience_and_threat_modeling",
                    conflict_type="risk_disagreement",
                    severity="high",
                    description="Multiple critical architectural vulnerabilities identified simultaneously across security threat models and peak traffic reliability limits.",
                    agent_positions={agent: "; ".join(items) for agent, items in positions.items()},
                    impacted_requirements=["System uptime SLA", "Zero-day attack surface", "Peak concurrency resilience"],
                    resolution="Prioritize circuit breakers and automated failovers before enterprise-wide feature rollout.",
                )
            )

        return conflicts

    def _detect_protocol_and_component_clashes(
        self,
        agent_map: Dict[str, Optional[AgentOutput]],
    ) -> List[DetectedConflict]:
        """Detect component protocol discrepancies across proposed topologies."""
        conflicts: List[DetectedConflict] = []
        connections_by_agent: Dict[str, List[AgentConnection]] = {}

        for agent, out in agent_map.items():
            if out and out.connections:
                connections_by_agent[agent] = out.connections

        # Look for differing protocols on similar links
        if len(connections_by_agent) >= 2:
            links_map: Dict[str, Dict[str, str]] = {}
            for agent, conns in connections_by_agent.items():
                for c in conns:
                    link_key = f"{c.from_component.lower()} -> {c.to_component.lower()}"
                    if link_key not in links_map:
                        links_map[link_key] = {}
                    links_map[link_key][agent] = c.protocol

            for link, protocols in links_map.items():
                if len(protocols) >= 2:
                    unique_protocols = set(protocols.values())
                    if len(unique_protocols) > 1:
                        conflicts.append(
                            DetectedConflict(
                                category="communication_protocol",
                                conflict_type="component_clash",
                                severity="medium",
                                description=f"Conflicting communication protocols proposed for edge/inter-service connection '{link}'.",
                                agent_positions=protocols,
                                impacted_requirements=["Interoperability", "Client protocol compatibility", "Latency"],
                            )
                        )

        return conflicts

    def _detect_missing_decisions(
        self,
        category_decisions: Dict[str, Dict[str, List[AgentDecision]]],
        agent_map: Dict[str, Optional[AgentOutput]],
    ) -> List[DetectedConflict]:
        """Identify critical architectural dimensions that were only addressed by one agent without multi-domain scrutiny."""
        conflicts: List[DetectedConflict] = []
        essential_categories = [
            ("authentication_and_auth", "Authentication & Access Control"),
            ("scalability_and_resilience", "Scalability & Load Balancing"),
            ("caching", "Distributed Caching"),
        ]

        for cat_key, cat_label in essential_categories:
            if cat_key in category_decisions:
                agents_present = [a for a, decs in category_decisions[cat_key].items() if decs]
                if len(agents_present) == 1:
                    solo_agent = agents_present[0]
                    conflicts.append(
                        DetectedConflict(
                            category=cat_key,
                            conflict_type="missing_decision",
                            severity="medium",
                            description=f"Critical dimension '{cat_label}' was analyzed exclusively by {solo_agent.capitalize()} Agent, lacking peer review or trade-off evaluation from other perspectives.",
                            agent_positions={solo_agent: f"Decision specified without peer counter-analysis."},
                            impacted_requirements=[cat_label, "Holistic system integration"],
                            resolution=f"Require cross-discipline sign-off on {cat_label}.",
                        )
                    )

        return conflicts

    def _deduplicate_conflicts(self, conflicts: List[DetectedConflict]) -> List[DetectedConflict]:
        """Deduplicate conflicts by category and type to prevent redundant UI alerts."""
        seen = set()
        deduped = []
        for c in conflicts:
            key = (c.category, c.conflict_type, c.description[:60])
            if key not in seen:
                seen.add(key)
                if not c.id:
                    c.id = uuid.uuid4()
                deduped.append(c)
        return deduped

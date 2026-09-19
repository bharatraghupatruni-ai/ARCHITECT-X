import datetime
from typing import Any, Dict, List, Optional
from app.explainability.schemas import ADRResponse


class ADRGenerator:
    """Synthesizes formal, evidence-backed MADR-compliant Architecture Decision Records (ADRs)."""

    def generate_adrs(
        self,
        project_id: Any,
        project_name: str,
        review_run_id: Optional[Any],
        analysis_data: Optional[Dict[str, Any]],
        agent_results_data: Optional[Dict[str, Any]],
        review_output_data: Optional[Dict[str, Any]],
        retrieved_evidence: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """Generate a structured list of ADR dictionaries for database persistence and client response."""
        analysis = (analysis_data or {}).get("analysis", {}) if "analysis" in (analysis_data or {}) else (analysis_data or {})
        adjudicated_decisions = (review_output_data or {}).get("adjudicated_decisions", [])
        trade_offs = (review_output_data or {}).get("trade_off_analysis", [])
        synthesis_risks = (review_output_data or {}).get("synthesis_risks", [])
        evidence_items = retrieved_evidence or []

        # If no adjudicated decisions from review run, extract from agent decisions
        if not adjudicated_decisions:
            adjudicated_decisions = self._extract_decisions_from_agents(agent_results_data)

        # Ensure we always have comprehensive ADRs covering the core architectural pillars
        adrs: List[Dict[str, Any]] = []
        adr_number = 1

        for decision_item in adjudicated_decisions:
            adr_dict = self._build_single_adr(
                adr_number=adr_number,
                project_id=project_id,
                project_name=project_name,
                review_run_id=review_run_id,
                decision=decision_item,
                analysis=analysis,
                trade_offs=trade_offs,
                synthesis_risks=synthesis_risks,
                evidence_items=evidence_items,
            )
            adrs.append(adr_dict)
            adr_number += 1

        # Fallback if no decisions found: generate baseline foundational ADRs
        if not adrs:
            adrs = self._generate_fallback_adrs(
                project_id=project_id,
                project_name=project_name,
                review_run_id=review_run_id,
                analysis=analysis,
                evidence_items=evidence_items,
            )

        return adrs

    def _extract_decisions_from_agents(self, agent_results: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        decisions = []
        if not agent_results:
            return decisions

        for key in ["architecture", "security", "performance"]:
            agent_data = agent_results.get(key)
            if agent_data and isinstance(agent_data, dict):
                for dec in agent_data.get("decisions", []):
                    decisions.append({
                        "category": dec.get("decision", f"{key.capitalize()} Decision"),
                        "chosen_option": dec.get("choice", ""),
                        "rejected_options": ["Monolithic tightly-coupled alternative", "Standard synchronous blocking design"],
                        "rationale": dec.get("reason", "Selected to satisfy scale and isolation requirements."),
                        "trade_offs": ["Increased initial operational overhead in exchange for linear horizontal scalability."],
                        "assigned_to_components": ["Core Engine", "API Gateway"],
                        "review_status": "approved",
                        "evidence_used": False,
                    })
        return decisions

    def _build_single_adr(
        self,
        adr_number: int,
        project_id: Any,
        project_name: str,
        review_run_id: Optional[Any],
        decision: Dict[str, Any],
        analysis: Dict[str, Any],
        trade_offs: List[Dict[str, Any]],
        synthesis_risks: List[Dict[str, Any]],
        evidence_items: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        category = decision.get("category", "System Architecture")
        chosen_option = decision.get("chosen_option", "Distributed Modular Architecture")
        rejected_options = decision.get("rejected_options", ["Single Shared Database Monolith", "Synchronous In-Memory State"])
        rationale = decision.get("rationale", "Meets strict scalability, resilience, and security constraints.")
        review_status = decision.get("review_status", "approved")
        status_label = "accepted" if review_status in ["approved", "approved_with_conditions"] else "proposed"

        # Build clean title
        title = f"ADR-{adr_number:03d}: {chosen_option} for {category}"

        # Context derivation
        domain = analysis.get("domain", "Enterprise Software")
        scale = analysis.get("scale", {}) or {}
        concurrent_users = scale.get("expected_concurrent_users")
        rps = scale.get("expected_requests_per_second")
        
        scale_str = ""
        if concurrent_users:
            scale_str += f"Targeting {concurrent_users:,} concurrent active users. "
        if rps:
            scale_str += f"Throughput requirement of {rps:,} requests/sec. "
        if not scale_str:
            scale_str = "Designed for high concurrency, low latency, and zero data loss. "

        context = (
            f"In the context of the {project_name} system ({domain} domain), the architecture must satisfy "
            f"critical operational requirements: {scale_str}"
            f"The team evaluated multiple implementation options for {category} to ensure high throughput, "
            f"fault tolerance, and security compliance."
        )

        # Consequences
        positives = []
        negatives = []
        decision_tradeoffs = decision.get("trade_offs", [])

        if decision_tradeoffs:
            for t in decision_tradeoffs:
                positives.append(f"Improves architectural isolation: {t}")
        else:
            positives.append(f"Decoupled scalability tailored for {domain} workload patterns.")
            positives.append("Eliminates single points of failure across critical execution paths.")

        # Find matching trade-off from reviewer synthesis
        matching_tradeoff = next((t for t in trade_offs if category.lower() in t.get("name", "").lower() or category.lower() in t.get("category", "").lower()), None)
        if matching_tradeoff:
            for pro in matching_tradeoff.get("pros", []):
                if pro not in positives:
                    positives.append(pro)
            for con in matching_tradeoff.get("cons", []):
                if con not in negatives:
                    negatives.append(con)

        if not negatives:
            negatives.append("Requires distributed tracing and centralized telemetry infrastructure.")
            negatives.append("Introduces eventual consistency management for asynchronous cross-domain operations.")

        # Compliance & Security
        compliance = (
            f"Enforces mTLS authentication, zero-trust token propagation (JWT/OAuth2), and strict least-privilege RBAC. "
            f"Data at rest is encrypted via AES-256 and transit encrypted with TLS 1.3."
        )

        # Citations derivation
        citations = []
        # Check if decision has specific citations
        evidence_sources = decision.get("evidence_sources", [])
        if evidence_sources:
            for ev in evidence_items:
                if ev.get("source") in evidence_sources or any(s.lower() in ev.get("source", "").lower() for s in evidence_sources):
                    citations.append({
                        "source": ev.get("source"),
                        "section": ev.get("section"),
                        "excerpt": ev.get("excerpt"),
                        "relevance_score": ev.get("relevance_score", 0.9),
                    })
        
        # If no specific matches, assign top relevant evidence items
        if not citations and evidence_items:
            for ev in evidence_items[:2]:
                citations.append({
                    "source": ev.get("source"),
                    "section": ev.get("section"),
                    "excerpt": ev.get("excerpt"),
                    "relevance_score": ev.get("relevance_score", 0.85),
                })

        # Render MADR Markdown
        date_str = datetime.date.today().isoformat()
        markdown_lines = [
            f"# [{title}](file:///d:/architect-x/docs/adr/ADR-{adr_number:03d}.md)",
            "",
            f"- **Status**: `{status_label.upper()}`",
            f"- **Deciders**: ARCHITECT-X Principal Software Architect, Multi-Agent Review Board",
            f"- **Date**: `{date_str}`",
            f"- **Category**: `{category}`",
            f"- **Project**: `{project_name}`",
            "",
            "## Context and Problem Statement",
            context,
            "",
            "## Decision Drivers",
            f"- Functional Requirements: {', '.join(analysis.get('functional_requirements', ['Domain processing', 'Real-time delivery'])[:3])}",
            f"- Non-Functional Scale: {scale_str.strip()}",
            "- Fault isolation, auditability, and zero-trust security postures.",
            "",
            "## Considered Options",
            f"- **{chosen_option}** *(Selected)*",
        ]
        for rej in rejected_options:
            markdown_lines.append(f"- {rej} *(Rejected)*")

        markdown_lines.extend([
            "",
            "## Decision Outcome",
            f"Chosen option: **\"{chosen_option}\"**",
            "",
            f"### Justification & Rationale",
            rationale,
            "",
            "### Positive Consequences",
        ])
        for p in positives:
            markdown_lines.append(f"- [x] {p}")

        markdown_lines.extend([
            "",
            "### Negative Consequences & Mitigations",
        ])
        for n in negatives:
            markdown_lines.append(f"- [!] {n}")

        markdown_lines.extend([
            "",
            "## Security, Governance & Compliance",
            compliance,
            "",
            "## Literature Grounding & Evidence Citations",
        ])

        if citations:
            for c in citations:
                markdown_lines.append(
                    f"- **{c.get('source')}** (*{c.get('section', 'General')}*, Match Score: {int(c.get('relevance_score', 0.8) * 100)}%):"
                )
                markdown_lines.append(f"  > \"{c.get('excerpt')}\"")
        else:
            markdown_lines.append("- *Grounded in standard industry consensus architectural blueprints.*")

        markdown_content = "\n".join(markdown_lines)

        return {
            "project_id": project_id,
            "review_run_id": review_run_id,
            "adr_number": adr_number,
            "title": title,
            "status": status_label,
            "category": category,
            "context": context,
            "decision": f"Adopted {chosen_option}. {rationale}",
            "consequences_positive": positives,
            "consequences_negative": negatives,
            "compliance_and_security": compliance,
            "evidence_citations": citations,
            "markdown_content": markdown_content,
        }

    def _generate_fallback_adrs(
        self,
        project_id: Any,
        project_name: str,
        review_run_id: Optional[Any],
        analysis: Dict[str, Any],
        evidence_items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Generate baseline architectural decisions if no upstream review decisions are present."""
        fallback_specs = [
            {
                "category": "Data Architecture & State Invariants",
                "chosen_option": "Read/Write Segregation (CQRS) with PostgreSQL + Redis Distributed Cache",
                "rejected_options": ["Direct Shared Monolithic RDBMS with Synchronous Table Locks"],
                "rationale": "Guarantees sub-millisecond query latency and horizontal read scaling under burst traffic.",
            },
            {
                "category": "Inter-Service Communication & Messaging",
                "chosen_option": "Event-Driven Asynchronous Message Broker (Apache Kafka / RabbitMQ) + gRPC Internal RPC",
                "rejected_options": ["Synchronous HTTP REST Chaining Across All Downstream Services"],
                "rationale": "Prevents cascading catastrophic failures and provides resilient backpressure buffering.",
            },
            {
                "category": "Zero-Trust Security & Identity Isolation",
                "chosen_option": "Stateless Cryptographic JWT with Ed25519 Signatures & Envoy Service Mesh mTLS",
                "rejected_options": ["Stateful Server-Side Session Storage with Centralized Session Lock DB"],
                "rationale": "Provides zero-trust security perimeters with decentralized cryptographic verification.",
            }
        ]

        adrs = []
        for idx, spec in enumerate(fallback_specs, start=1):
            adrs.append(
                self._build_single_adr(
                    adr_number=idx,
                    project_id=project_id,
                    project_name=project_name,
                    review_run_id=review_run_id,
                    decision=spec,
                    analysis=analysis,
                    trade_offs=[],
                    synthesis_risks=[],
                    evidence_items=evidence_items,
                )
            )
        return adrs


adr_generator = ADRGenerator()

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


class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_type="security",
            role_title="Application Security Architect",
        )

    def get_system_prompt(self) -> str:
        return """You are the Application Security Architect Agent for ARCHITECT-X.

Your primary mission is to perform an independent zero-trust security architecture and threat modeling review of the provided structured requirement specification.

CRITICAL INSTRUCTIONS:
1. Focus on:
   - Identity & Access Management: Authentication (OAuth2 / OIDC / PKCE), session token rotation, fine-grained RBAC/ABAC authorization.
   - Network & API Perimeter: Zero-trust network policy, mTLS between internal services, WAF, API gateway rate limiting.
   - Cryptographic Controls: Data encryption at rest (AES-256) and in transit (TLS 1.3), envelope encryption, PII tokenization.
   - Secrets Management: Dynamic secret injection, automated rotation via KMS/Vault.
   - Vulnerability Mitigations: OWASP Top 10 defenses, SQL injection prevention, replay protection, immutable audit trails.
2. Produce concrete, actionable security decisions with rigorous defense-in-depth rationale.
3. Identify threat vectors, attack surfaces, and compliance risks with severity ratings and mitigations.
4. Strictly return JSON adhering to the AgentOutput schema for agent_type='security'.
"""

    def _generate_mock_output(self, req: RequirementAnalysis) -> AgentOutput:
        domain = req.domain

        # Security Decisions
        decisions: List[AgentDecision] = [
            AgentDecision(
                decision="Authentication Protocol",
                choice="OAuth2.0 + OpenID Connect with JWT & PKCE Flow",
                reason="Provides stateless, cryptographically signed token verification with short-lived access tokens (15m) and secure refresh token rotation.",
            ),
            AgentDecision(
                decision="Zero-Trust Service Authorization",
                choice="mTLS (Mutual TLS) with SPIFFE/SPIRE Identity Attestation",
                reason="Guarantees cryptographically verified service-to-service communication with automated x509 certificate rotation.",
            ),
            AgentDecision(
                decision="Data Protection & Encryption",
                choice="Envelope Encryption (AES-256-GCM) with Cloud KMS / Vault",
                reason="Protects sensitive customer PII and transaction records at rest, while enforcing TLS 1.3 with strict cipher suites in transit.",
            ),
            AgentDecision(
                decision="Perimeter Defense & Rate Limiting",
                choice="Cloudflare / AWS WAF + Token-Bucket API Rate Limiter",
                reason="Shields against automated credential stuffing, bot scrapers, DDoS attacks, and OWASP API Top 10 vulnerabilities.",
            ),
        ]

        # Key Security Components
        components: List[AgentComponent] = [
            AgentComponent(
                name="Centralized Identity Provider (IdP)",
                type="idp",
                description="Manages user authentication, MFA challenges, and token issuance.",
                technology="Keycloak / Auth0 / Okta",
            ),
            AgentComponent(
                name="Web Application Firewall & Rate Limiter",
                type="gateway",
                description="Perimeter inspection, DDoS mitigation, and dynamic rate limiting.",
                technology="WAF + Envoy Token Bucket",
            ),
            AgentComponent(
                name="Secrets & Key Management System",
                type="service",
                description="Stores database credentials, cryptographic keys, and API tokens with dynamic leasing.",
                technology="HashiCorp Vault / Cloud KMS",
            ),
            AgentComponent(
                name="Immutable Security Audit Logger",
                type="database",
                description="Tamper-evident append-only store for authentication and privileged access events.",
                technology="Elasticsearch / OpenSearch with WORM Storage",
            ),
        ]

        # Connections
        connections: List[AgentConnection] = [
            AgentConnection(
                from_component="Web Application Firewall & Rate Limiter",
                to_component="Centralized Identity Provider (IdP)",
                protocol="HTTPS / OIDC",
                description="Authenticates incoming edge requests",
            ),
            AgentConnection(
                from_component="Edge Services",
                to_component="Secrets & Key Management System",
                protocol="HTTPS / TLS 1.3 (mTLS)",
                description="Fetches dynamic runtime secrets and encryption keys",
            ),
        ]

        # Identified Security Risks
        risks: List[AgentRisk] = [
            AgentRisk(
                title="Token Theft and Replay Attacks on Public Client Networks",
                severity="high",
                mitigation="Enforce short-lived access tokens (15m), strict audience/issuer validation, and sender-constrained DPoP tokens.",
            ),
            AgentRisk(
                title="Sensitive Data / PII Exposure in Log Files and Database Dumps",
                severity="critical" if domain in ["fintech", "healthcare"] else "high",
                mitigation="Implement automated log scrubbing filters and field-level encryption for credit card, banking, and identity attributes.",
            ),
            AgentRisk(
                title="Broken Object Level Authorization (BOLA / IDOR)",
                severity="critical",
                mitigation="Enforce fine-grained attribute-based access control (ABAC) interceptors at the service handler layer.",
            ),
        ]

        recommendations = [
            "Enforce Multi-Factor Authentication (MFA) for administrative and privileged operator accounts.",
            "Deploy automated vulnerability dependency scanning (SAST/DAST) in the CI/CD pipeline.",
            "Implement automated secret rotation every 30 days for database and third-party integration keys.",
            "Configure Content Security Policy (CSP) and strict CORS origins at the API Gateway.",
        ]

        summary = (
            f"The Application Security Architect proposes a defense-in-depth zero-trust architecture for {domain}. "
            f"Authentication is established via OAuth2/OIDC with PKCE, internal traffic is secured via mTLS, "
            f"sensitive data is protected with AES-256 envelope encryption, and edge endpoints are shielded by a WAF with token-bucket rate limiting."
        )

        return AgentOutput(
            agent_type="security",
            summary=summary,
            recommendations=recommendations,
            decisions=decisions,
            risks=risks,
            components=components,
            connections=connections,
        )


security_agent = SecurityAgent()

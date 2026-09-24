import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings
from app.agents.schemas import AgentOutput
from app.requirement_engine.schemas import RequirementAnalysis

logger = logging.getLogger("architect_x.agents")


class BaseAgent(ABC):
    """Abstract base class for all ARCHITECT-X specialized AI review agents."""

    def __init__(self, agent_type: str, role_title: str):
        self.agent_type = agent_type
        self.role_title = role_title
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL
        self.base_url = settings.LLM_BASE_URL or "https://api.openai.com/v1"
        self.mock_mode = settings.LLM_MOCK_MODE or not bool(self.api_key)

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the specialized persona and engineering instructions for this agent."""
        pass

    @abstractmethod
    def _generate_mock_output(self, requirement: RequirementAnalysis) -> AgentOutput:
        """Generate specialized, high-fidelity deterministic proposal for mock mode."""
        pass

    def analyze(self, requirement: RequirementAnalysis) -> AgentOutput:
        """Analyze the structured requirement and return validated AgentOutput."""
        logger.info(f"Agent '{self.agent_type}' ({self.role_title}) execution initiated (mock_mode={self.mock_mode})")

        if self.mock_mode:
            return self._generate_mock_output(requirement)

        return self._llm_analyze_with_retry(requirement)

    def _llm_analyze_with_retry(self, requirement: RequirementAnalysis, max_retries: int = 2) -> AgentOutput:
        """Dispatch structured requirement to LLM API with Pydantic schema validation & retries."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        url = f"{self.base_url.rstrip('/')}/chat/completions"

        schema_example = json.dumps({
            "agent_type": self.agent_type,
            "summary": "Detailed executive summary of this agent's architectural proposal and rationale.",
            "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
            "decisions": [
                {
                    "decision": "Dimension name (e.g., Service Decomposition, Primary Database, Inter-Service Communication, API Gateway, Authentication)",
                    "choice": "Concrete technology or pattern choice (e.g., PostgreSQL, Apache Kafka, gRPC, OAuth2/OIDC)",
                    "reason": "Clear engineering rationale strictly grounded in requirements and scale"
                }
            ],
            "risks": [
                {
                    "title": "Clear risk title",
                    "severity": "high",
                    "mitigation": "Concrete actionable mitigation strategy"
                }
            ],
            "components": [
                {
                    "name": "Component Name (e.g., Order Service, API Gateway)",
                    "type": "service",
                    "description": "Responsibility of the component",
                    "technology": "Specific technology (e.g., FastAPI, PostgreSQL, Redis)"
                }
            ],
            "connections": [
                {
                    "from_component": "Client",
                    "to_component": "API Gateway",
                    "protocol": "HTTPS/REST",
                    "description": "Ingress routing"
                }
            ]
        }, indent=2)

        user_content = (
            f"Please conduct an independent architectural evaluation of the following structured engineering requirement specification:\n\n"
            f"{requirement.model_dump_json(indent=2)}\n\n"
            f"Produce your specialized evaluation as valid JSON strictly matching the following schema format for agent_type='{self.agent_type}':\n"
            f"{schema_example}\n\n"
            f"Provide at least 3-5 concrete decisions, 2-4 risks, and the major components and connections."
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
                logger.info(f"Agent '{self.agent_type}' dispatching request (attempt {attempt + 1}/{max_retries + 1})")
                with httpx.Client(timeout=45.0) as client:
                    response = client.post(url, json=payload, headers=headers)

                if response.status_code != 200:
                    raise RuntimeError(f"Agent '{self.agent_type}' LLM API error ({response.status_code}): {response.text}")

                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                if "```" in content:
                    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
                    if match:
                        content = match.group(1).strip()
                raw_json = json.loads(content)
                # Defensive normalization for cross-model LLM compatibility
                parsed_json = self._normalize_agent_output(raw_json)

                output = AgentOutput.model_validate(parsed_json)
                logger.info(f"Agent '{self.agent_type}' analysis validated successfully with {len(output.decisions)} decisions")
                return output

            except Exception as exc:
                last_error = exc
                logger.warning(f"Agent '{self.agent_type}' attempt {attempt + 1} failed: {exc}")
                if attempt < max_retries:
                    messages.append({
                        "role": "assistant",
                        "content": content if "content" in locals() else "{}",
                    })
                    messages.append({
                        "role": "user",
                        "content": f"The response failed schema validation: {str(exc)}. Please output strictly valid JSON conforming to the AgentOutput schema with agent_type='{self.agent_type}'.",
                    })
                    payload["messages"] = messages

        raise RuntimeError(f"Agent '{self.agent_type}' failed to generate valid output: {last_error}")

    def _normalize_agent_output(self, data: Any) -> dict:
        """Defensive normalization ensuring raw LLM outputs conform to AgentOutput schema."""
        if not isinstance(data, dict):
            return {"agent_type": self.agent_type, "summary": f"Evaluation by {self.agent_type} agent"}
        data["agent_type"] = self.agent_type
        if not data.get("summary"):
            data["summary"] = f"Architectural evaluation and recommendations by the {self.role_title}."
        if "recommendations" in data and isinstance(data["recommendations"], list):
            data["recommendations"] = [
                r if isinstance(r, str) else (r.get("text") or r.get("description") or r.get("recommendation") or str(r))
                for r in data["recommendations"]
            ]
        if "decisions" in data and isinstance(data["decisions"], list):
            norm_decisions = []
            for d in data["decisions"]:
                if isinstance(d, dict):
                    norm_decisions.append({
                        "decision": d.get("decision") or d.get("dimension") or d.get("category") or d.get("name") or "Architectural Choice",
                        "choice": d.get("choice") or d.get("selected") or d.get("option") or d.get("recommendation") or "Standard Approach",
                        "reason": d.get("reason") or d.get("rationale") or d.get("justification") or d.get("description") or "Grounded in system requirements",
                    })
            data["decisions"] = norm_decisions
        if "risks" in data and isinstance(data["risks"], list):
            norm_risks = []
            for r in data["risks"]:
                if isinstance(r, dict):
                    sev = str(r.get("severity") or r.get("level") or "medium").lower()
                    if sev not in ["low", "medium", "high", "critical"]:
                        sev = "medium"
                    norm_risks.append({
                        "title": r.get("title") or r.get("risk") or r.get("name") or "Identified Risk",
                        "severity": sev,
                        "mitigation": r.get("mitigation") or r.get("resolution") or r.get("strategy") or "Apply standard engineering mitigation",
                    })
            data["risks"] = norm_risks
        if "components" in data and isinstance(data["components"], list):
            norm_comps = []
            for c in data["components"]:
                if isinstance(c, dict):
                    norm_comps.append({
                        "name": c.get("name") or "Core Service",
                        "type": c.get("type") or "service",
                        "description": c.get("description") or "Component responsibility",
                        "technology": c.get("technology"),
                    })
            data["components"] = norm_comps
        if "connections" in data and isinstance(data["connections"], list):
            norm_conns = []
            for cn in data["connections"]:
                if isinstance(cn, dict):
                    norm_conns.append({
                        "from_component": cn.get("from_component") or cn.get("source") or cn.get("from") or "Client",
                        "to_component": cn.get("to_component") or cn.get("target") or cn.get("to") or "API Gateway",
                        "protocol": cn.get("protocol") or "HTTPS/REST",
                        "description": cn.get("description"),
                    })
            data["connections"] = norm_conns
        return data

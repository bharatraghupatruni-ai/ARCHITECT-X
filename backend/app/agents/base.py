import json
import logging
from abc import ABC, abstractmethod
from typing import Optional
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

        user_content = (
            f"Please conduct an independent architectural evaluation of the following structured engineering requirement specification:\n\n"
            f"{requirement.model_dump_json(indent=2)}\n\n"
            f"Produce your specialized evaluation as valid JSON strictly adhering to the AgentOutput schema for agent_type='{self.agent_type}'."
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
                content = data["choices"][0]["message"]["content"]
                parsed_json = json.loads(content)

                # Enforce agent_type consistency
                parsed_json["agent_type"] = self.agent_type

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

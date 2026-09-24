import json
import logging
import re
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings
from app.requirement_engine.prompts import (
    REQUIREMENT_ENGINE_SYSTEM_PROMPT,
    build_requirement_analysis_prompt,
)
from app.requirement_engine.schemas import RequirementAnalysis, Scale

logger = logging.getLogger("architect_x.requirement_engine")


class RequirementParser:
    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL
        self.base_url = settings.LLM_BASE_URL or "https://api.openai.com/v1"
        self.mock_mode = settings.LLM_MOCK_MODE or not bool(self.api_key)

    def analyze(self, requirement_text: str) -> RequirementAnalysis:
        """Analyze raw requirement text and return validated RequirementAnalysis object."""
        if not requirement_text or not requirement_text.strip():
            raise ValueError("Requirement text cannot be empty.")

        cleaned_text = requirement_text.strip()
        logger.info(f"Requirement analysis initiated (mock_mode={self.mock_mode}, model={self.model})")

        if self.mock_mode:
            return self._mock_analyze(cleaned_text)

        return self._llm_analyze_with_retry(cleaned_text)

    def _llm_analyze_with_retry(self, requirement_text: str, max_retries: int = 2) -> RequirementAnalysis:
        """Call external LLM API with structured JSON output and validation retries."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        url = f"{self.base_url.rstrip('/')}/chat/completions"

        messages = [
            {"role": "system", "content": REQUIREMENT_ENGINE_SYSTEM_PROMPT},
            {"role": "user", "content": build_requirement_analysis_prompt(requirement_text)},
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }

        last_error: Optional[Exception] = None

        for attempt in range(max_retries + 1):
            try:
                logger.info(f"Dispatching LLM request (attempt {attempt + 1}/{max_retries + 1})")
                with httpx.Client(timeout=30.0) as client:
                    response = client.post(url, json=payload, headers=headers)
                
                if response.status_code != 200:
                    raise RuntimeError(f"LLM API request failed with status {response.status_code}: {response.text}")

                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                if "```" in content:
                    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
                    if match:
                        content = match.group(1).strip()
                raw_json = json.loads(content)
                # Defensive normalization for cross-model LLM compatibility
                parsed_json = self._normalize_llm_json(raw_json)

                # Validate with Pydantic
                analysis = RequirementAnalysis.model_validate(parsed_json)
                logger.info(f"LLM requirement analysis successfully validated (domain={analysis.domain})")
                return analysis

            except Exception as exc:
                last_error = exc
                logger.warning(f"LLM analysis attempt {attempt + 1} failed: {exc}")
                if attempt < max_retries:
                    # Provide validation feedback in messages for retry
                    messages.append({
                        "role": "assistant",
                        "content": content if "content" in locals() else "{}",
                    })
                    messages.append({
                        "role": "user",
                        "content": f"The previous response failed schema validation with error: {str(exc)}. Please output strictly valid JSON conforming to the RequirementAnalysis schema.",
                    })
                    payload["messages"] = messages

        raise RuntimeError(f"Failed to generate valid requirement analysis from LLM: {last_error}")

    def _normalize_llm_json(self, data: Any) -> Dict[str, Any]:
        """Defensive normalization ensuring raw LLM outputs match RequirementAnalysis schema."""
        if not isinstance(data, dict):
            return {}
        list_fields = [
            'functional_requirements', 'non_functional_requirements', 'constraints',
            'priorities', 'external_integrations', 'data_requirements', 'assumptions',
            'ambiguities', 'missing_information'
        ]
        for field in list_fields:
            if field in data and isinstance(data[field], list):
                normalized_list = []
                for item in data[field]:
                    if isinstance(item, dict):
                        text = item.get('description') or item.get('name') or item.get('requirement') or item.get('text') or str(item)
                        req_id = item.get('id')
                        if req_id and not str(text).startswith(str(req_id)):
                            text = f"{req_id}: {text}"
                        normalized_list.append(str(text))
                    elif isinstance(item, str):
                        normalized_list.append(item)
                    else:
                        normalized_list.append(str(item))
                data[field] = normalized_list

        if 'domain' not in data or not data['domain']:
            data['domain'] = 'unknown'
        if 'system_type' not in data or not data['system_type']:
            data['system_type'] = 'web_application'

        if 'confidence' not in data or data['confidence'] is None:
            data['confidence'] = 0.85
        elif not isinstance(data['confidence'], (int, float)):
            try:
                data['confidence'] = float(data['confidence'])
            except Exception:
                data['confidence'] = 0.85
        return data

    def _mock_analyze(self, text: str) -> RequirementAnalysis:
        """Deterministic, rule-based mock engine used in test / mock development modes."""
        text_lower = text.lower()

        # 1. Domain Detection
        domain = "unknown"
        if any(w in text_lower for w in ["food delivery", "restaurant", "meal", "food", "kitchen"]):
            domain = "food_delivery"
        elif any(w in text_lower for w in ["bank", "banking", "fintech", "payment", "financial", "wallet"]):
            domain = "fintech"
        elif any(w in text_lower for w in ["shop", "shopping", "e-commerce", "ecommerce", "retail", "store"]):
            domain = "e_commerce"
        elif any(w in text_lower for w in ["video streaming", "streaming", "media", "netflix", "broadcast"]):
            domain = "media_streaming"
        elif any(w in text_lower for w in ["ride sharing", "rideshare", "taxi", "transportation", "uber"]):
            domain = "transportation"
        elif any(w in text_lower for w in ["exam", "examination", "education", "elearning", "student", "quiz"]):
            domain = "education"
        elif any(w in text_lower for w in ["health", "hospital", "clinic", "medical", "patient"]):
            domain = "healthcare"

        # 2. System Type Detection
        system_type = "web_application"
        if any(w in text_lower for w in ["mobile", "ios", "android", "app"]):
            system_type = "mobile_application"
        elif any(w in text_lower for w in ["api", "platform", "backend services", "gateway"]):
            system_type = "api_platform"
        elif any(w in text_lower for w in ["real-time", "real time", "websocket", "telemetry"]):
            system_type = "real_time_system"
        elif any(w in text_lower for w in ["data pipeline", "data platform", "analytics platform"]):
            system_type = "data_platform"
        elif any(w in text_lower for w in ["distributed system", "cluster", "event-driven"]):
            system_type = "distributed_system"

        # 3. Explicit Scale Extraction
        concurrent_users: Optional[int] = None
        total_users: Optional[int] = None
        requests_per_second: Optional[int] = None
        storage: Optional[str] = None
        geographic_scope: Optional[str] = None

        # Concurrent users regex (e.g., 50,000 concurrent users / 50k ccu)
        ccu_match = re.search(r"(\d+(?:,\d+)*|\d+k|\d+m)\s*(?:concurrent\s+users?|ccu)", text_lower)
        if not ccu_match:
            ccu_match = re.search(r"supporting\s+(\d+(?:,\d+)*)\s*concurrent\s+users", text_lower)
        if ccu_match:
            val_str = ccu_match.group(1).replace(",", "")
            if val_str.endswith("k"):
                concurrent_users = int(float(val_str[:-1]) * 1000)
            elif val_str.endswith("m"):
                concurrent_users = int(float(val_str[:-1]) * 1000000)
            else:
                concurrent_users = int(val_str)

        # Total users regex (e.g., 10 million users / 10m users)
        total_match = re.search(r"(\d+(?:,\d+)*|\d+m|\d+k|\d+\s+million)\s*(?:total\s+users?|registered\s+users?|users)", text_lower)
        if total_match and not ccu_match:
            val_str = total_match.group(1).replace(",", "").strip()
            if "million" in val_str:
                num = float(val_str.replace("million", "").strip())
                total_users = int(num * 1000000)
            elif val_str.endswith("m"):
                total_users = int(float(val_str[:-1]) * 1000000)
            elif val_str.endswith("k"):
                total_users = int(float(val_str[:-1]) * 1000)
            elif val_str.isdigit():
                total_users = int(val_str)

        # Requests per second regex (e.g., 500 requests per second / 500 rps)
        rps_match = re.search(r"(\d+(?:,\d+)*)\s*(?:requests\s+per\s+second|rps|req/s)", text_lower)
        if rps_match:
            requests_per_second = int(rps_match.group(1).replace(",", ""))

        # Storage regex (e.g., 10 TB of data / 500 GB)
        storage_match = re.search(r"(\d+\s*(?:tb|gb|pb)\s*(?:of\s+data|storage)?)", text_lower)
        if storage_match:
            storage = storage_match.group(1).upper().strip()

        # Geographic scope
        if "global" in text_lower or "worldwide" in text_lower:
            geographic_scope = "Global"
        elif "multi-region" in text_lower or "multi region" in text_lower:
            geographic_scope = "Multi-Region"

        scale = Scale(
            expected_concurrent_users=concurrent_users,
            expected_total_users=total_users,
            expected_requests_per_second=requests_per_second,
            expected_storage=storage,
            geographic_scope=geographic_scope,
        )

        # 4. Functional Requirements based on domain
        functional_reqs: List[str] = []
        if domain == "food_delivery":
            functional_reqs = [
                "user authentication & profile management",
                "restaurant & menu catalog management",
                "order placement & lifecycle management",
                "payment processing & transaction settlement",
                "real-time delivery & driver tracking",
            ]
        elif domain == "fintech":
            functional_reqs = [
                "user authentication & KYC identity verification",
                "account & balance management",
                "secure fund transfer & transaction processing",
                "payment gateway integration",
                "comprehensive audit logging & reporting",
            ]
        elif domain == "e_commerce":
            functional_reqs = [
                "product catalog browsing & search",
                "shopping cart & wishlist management",
                "checkout & order fulfillment processing",
                "payment gateway integration",
                "inventory tracking & management",
            ]
        elif domain == "transportation":
            functional_reqs = [
                "passenger & driver registration",
                "real-time ride dispatch & matching",
                "dynamic fare calculation",
                "real-time geospatial vehicle tracking",
                "trip history & digital receipt billing",
            ]
        elif domain == "media_streaming":
            functional_reqs = [
                "video asset catalog & metadata indexing",
                "adaptive bitrate streaming playback",
                "user subscriptions & billing management",
                "watch history & personalized recommendation",
            ]
        elif domain == "education":
            functional_reqs = [
                "student & instructor role management",
                "exam creation & question bank administration",
                "timed assessment test execution",
                "automated grading & result certification",
            ]
        elif domain == "healthcare":
            functional_reqs = [
                "patient records & history management",
                "doctor consultation scheduling",
                "prescription & diagnostic lab tracking",
                "secure messaging & telehealth session",
            ]
        else:
            functional_reqs = [
                "user registration & authentication",
                "core domain entity workflow management",
                "data storage & query retrieval",
            ]

        # 5. Non-Functional Requirements
        nfrs: List[str] = []
        if concurrent_users or "scalable" in text_lower or "scale" in text_lower:
            nfrs.append("high scalability")
        if "available" in text_lower or "availability" in text_lower or domain in ["food_delivery", "fintech"]:
            nfrs.append("high availability")
        if "secure" in text_lower or "security" in text_lower or domain == "fintech":
            nfrs.append("security & data protection")
        if "fast" in text_lower or "latency" in text_lower or "performance" in text_lower:
            nfrs.append("low latency response")
        if not nfrs:
            nfrs = ["maintainability", "reliability"]

        # 6. Constraints Detection
        constraints: List[str] = []
        if "azure" in text_lower:
            constraints.append("Cloud provider constraint: Microsoft Azure")
        if "aws" in text_lower:
            constraints.append("Cloud provider constraint: Amazon Web Services (AWS)")
        if "gcp" in text_lower or "google cloud" in text_lower:
            constraints.append("Cloud provider constraint: Google Cloud Platform (GCP)")
        if "gdpr" in text_lower:
            constraints.append("Compliance constraint: GDPR")
        if "hipaa" in text_lower:
            constraints.append("Compliance constraint: HIPAA")
        if "pci" in text_lower or "pci-dss" in text_lower:
            constraints.append("Compliance constraint: PCI-DSS")

        # 7. Priorities
        priorities: List[str] = []
        if "performance" in text_lower or concurrent_users:
            priorities.append("performance")
        if "scale" in text_lower or "scalability" in text_lower or concurrent_users:
            priorities.append("scalability")
        if "security" in text_lower or domain == "fintech":
            priorities.append("security")
        if "availability" in text_lower or domain in ["food_delivery", "fintech"]:
            priorities.append("availability")
        if not priorities:
            priorities = ["simplicity", "maintainability"]

        # 8. Ambiguity Detection
        ambiguities: List[str] = []
        if ("scalable" in text_lower or "scalability" in text_lower) and concurrent_users is None and requests_per_second is None:
            ambiguities.append("Expected scale is unspecified for scalability requirement.")
        if ("available" in text_lower or "high availability" in text_lower) and "99." not in text_lower:
            ambiguities.append("Availability target SLA is unspecified.")
        if ("fast" in text_lower or "low latency" in text_lower) and "ms" not in text_lower:
            ambiguities.append("Latency threshold is unspecified.")

        # 9. Missing Information
        missing_info: List[str] = []
        if concurrent_users is None and total_users is None and requests_per_second is None:
            missing_info.append("expected user scale & concurrent load")
        if requests_per_second is None:
            missing_info.append("expected peak request throughput (RPS)")
        if geographic_scope is None:
            missing_info.append("target geographic distribution & latency bounds")
        if storage is None:
            missing_info.append("expected data volume & storage retention requirements")
        if not constraints:
            missing_info.append("cloud provider or hosting environment preference")
        if domain == "fintech" and not any("compliance" in c.lower() for c in constraints):
            missing_info.append("regulatory and compliance framework requirements")

        # 10. External Integrations
        external_integrations: List[str] = []
        if domain in ["food_delivery", "e_commerce", "fintech", "transportation"]:
            external_integrations.append("Payment Gateway (e.g., Stripe, Adyen, PayPal)")
        if domain in ["food_delivery", "transportation"]:
            external_integrations.append("Geospatial & Mapping API (e.g., Google Maps, Mapbox)")
        if domain in ["food_delivery", "fintech", "education"]:
            external_integrations.append("SMS / Notification Service (e.g., Twilio, SendGrid)")

        # 11. Assumptions
        assumptions = [
            "The system is assumed to be accessible through standard web and mobile client interfaces.",
            "Standard third-party network connectivity is available.",
        ]

        # 12. Confidence Calculation
        confidence = 0.85
        if domain == "unknown":
            confidence -= 0.25
        if concurrent_users is None and total_users is None:
            confidence -= 0.15
        if ambiguities:
            confidence -= 0.05 * len(ambiguities)
        confidence = max(0.40, min(0.95, round(confidence, 2)))

        return RequirementAnalysis(
            domain=domain,
            system_type=system_type,
            scale=scale,
            functional_requirements=functional_reqs,
            non_functional_requirements=nfrs,
            constraints=constraints,
            priorities=priorities,
            external_integrations=external_integrations,
            data_requirements=["Transactional consistency for financial/order entities"] if domain in ["food_delivery", "fintech", "e_commerce"] else [],
            assumptions=assumptions,
            ambiguities=ambiguities,
            missing_information=missing_info,
            confidence=confidence,
        )


requirement_parser = RequirementParser()

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ChallengeScenario(BaseModel):
    id: str = Field(..., description="Unique scenario identifier e.g. 'redis_unavailable'")
    name: str = Field(..., description="Human-readable scenario title")
    description: str = Field(..., description="High-level description of failure or load event")
    category: str = Field(..., description="Infrastructure Failure, Load / Scalability Spike, Distributed Data Inconsistency, Network / Latency Degradation")
    failure_condition: str = Field(..., description="Precise technical condition triggering failure")
    expected_analysis_areas: List[str] = Field(default_factory=list, description="Target evaluation vectors")


class ChallengeImpact(BaseModel):
    severity: str = Field(..., description="low, medium, high, critical")
    summary: str = Field(..., description="Executive summary of user and system degradation")
    blast_radius: str = Field(..., description="Scope of affected services and data paths")
    data_loss_risk: str = Field(default="None", description="Assessment of persistent data corruption or loss")


class ChallengeAnalysisResult(BaseModel):
    scenario: ChallengeScenario
    impact: ChallengeImpact
    affected_components: List[str] = Field(
        default_factory=list,
        description="Names and IDs of actual architecture components affected",
    )
    failure_propagation: List[str] = Field(
        default_factory=list,
        description="Step-by-step cascade progression through the architecture",
    )
    existing_safeguards: List[str] = Field(
        default_factory=list,
        description="Protections and invariants already present in the architecture",
    )
    identified_gaps: List[str] = Field(
        default_factory=list,
        description="Weaknesses, missing timeouts, or single points of failure uncovered",
    )
    mitigations: List[str] = Field(
        default_factory=list,
        description="Actionable mitigation recommendations",
    )
    recovery_strategy: str = Field(
        ...,
        description="Operational playbook for restoring healthy cluster state",
    )
    architecture_changes: List[str] = Field(
        default_factory=list,
        description="Concrete architectural changes required to become immune to this scenario",
    )
    evidence_used: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Grounded literature citations from knowledge base",
    )
    confidence: float = Field(
        default=0.95,
        description="Confidence score between 0.0 and 1.0",
    )


class ChallengeRequest(BaseModel):
    scenario_id: str = Field(..., description="ID of the failure/scale scenario to simulate")


class ChallengeRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    scenario_id: str
    architecture_version: Optional[str] = "v1.0"
    result: ChallengeAnalysisResult
    created_at: datetime

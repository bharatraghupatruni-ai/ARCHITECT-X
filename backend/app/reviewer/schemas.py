import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DetectedConflict(BaseModel):
    """Normalized architectural conflict detected across agent evaluations."""
    id: Optional[uuid.UUID] = Field(default=None, description="Optional conflict identifier.")
    category: str = Field(
        ...,
        description="Architectural domain (e.g., 'database', 'caching', 'authentication', 'protocol', 'resilience').",
        examples=["database"],
    )
    conflict_type: str = Field(
        ...,
        description="Conflict type ('disagreement', 'tradeoff', 'missing_decision', 'risk_disagreement', 'component_clash').",
        examples=["disagreement"],
    )
    severity: str = Field(
        ...,
        description="Severity assessment ('low', 'medium', 'high', 'critical').",
        examples=["high"],
    )
    description: str = Field(
        ...,
        description="Clear explanation of the tension or disagreement among agents.",
    )
    agent_positions: Dict[str, Any] = Field(
        default_factory=dict,
        description="Mapping of agent type to their specific recommendation or stance.",
        examples=[{"architecture": "PostgreSQL", "performance": "MongoDB", "security": "PostgreSQL"}],
    )
    impacted_requirements: List[str] = Field(
        default_factory=list,
        description="Key requirement criteria affected by this conflict.",
    )
    resolution: Optional[str] = Field(
        default=None,
        description="Adjudicated resolution or guidance from the reviewer agent.",
    )

    model_config = ConfigDict(from_attributes=True)


from app.rag.schemas import RetrievedEvidenceItem


class ReviewDecision(BaseModel):
    """Adjudicated architectural decision with explicit rationale and trade-off weighing."""
    category: str = Field(..., description="Decision domain (e.g., 'Database Paradigm', 'Inter-Service Communication').")
    chosen_option: str = Field(..., description="The authoritative selected technology, pattern, or approach.")
    rejected_options: List[str] = Field(
        default_factory=list,
        description="Alternative options that were evaluated and rejected.",
    )
    rationale: str = Field(
        ...,
        description="Evidence-grounded justification explaining why the chosen option supersedes alternatives.",
    )
    trade_offs: List[str] = Field(
        default_factory=list,
        description="Acknowledged drawbacks or secondary consequences of the choice.",
    )
    assigned_to_components: List[str] = Field(
        default_factory=list,
        description="System components affected by this decision.",
    )
    review_status: str = Field(
        default="approved",
        description="Decision status ('approved', 'approved_with_conditions', 'overruled', 'escalated').",
    )
    evidence_used: bool = Field(
        default=False,
        description="Indicates whether empirical technical evidence grounded this decision.",
    )
    evidence_sources: List[str] = Field(
        default_factory=list,
        description="Authoritative documentation sources cited (e.g., 'postgresql_architecture.md').",
    )
    evidence_summary: Optional[str] = Field(
        default=None,
        description="Concise summary of how the empirical evidence informed or validated the decision.",
    )
    evidence_confidence: Optional[float] = Field(
        default=None,
        description="Confidence score in the supporting technical evidence (0.0 to 1.0).",
    )

    model_config = ConfigDict(from_attributes=True)


class ReviewTradeoff(BaseModel):
    """In-depth trade-off evaluation comparing conflicting design dimensions."""
    name: str = Field(..., description="Trade-off dimension (e.g., 'ACID Consistency vs. Sub-10ms Latency').")
    category: str = Field(..., description="Domain category (e.g., 'Storage & Consistency', 'Security Overhead').")
    pros: List[str] = Field(default_factory=list, description="Architectural advantages of the chosen path.")
    cons: List[str] = Field(default_factory=list, description="Downsides or operational burdens accepted.")
    recommendation: str = Field(..., description="Reviewer's engineering synthesis recommendation.")
    impact_score: str = Field(
        default="High",
        description="Impact rating ('Low', 'Medium', 'High', 'Critical').",
    )

    model_config = ConfigDict(from_attributes=True)


class ReviewRisk(BaseModel):
    """Synthesized risk identified by reviewing combined agent outputs."""
    title: str = Field(..., description="Short risk title.")
    category: str = Field(..., description="Risk domain (e.g., 'security', 'scalability', 'operational', 'data_integrity').")
    severity: str = Field(..., description="Risk severity level ('low', 'medium', 'high', 'critical').")
    description: str = Field(..., description="Root cause and architectural implication of the risk.")
    mitigation: str = Field(..., description="Concrete, actionable mitigation mandate.")

    model_config = ConfigDict(from_attributes=True)


class ReviewerOutput(BaseModel):
    """Comprehensive output produced by the Reviewer Agent."""
    summary: str = Field(
        ...,
        description="Executive review summary evaluating overall system coherence.",
    )
    overall_verdict: str = Field(
        ...,
        description="Authoritative verdict ('APPROVED', 'APPROVED WITH CONDITIONS', 'REVISE ARCHITECTURE').",
        examples=["APPROVED WITH CONDITIONS"],
    )
    key_findings: List[str] = Field(
        default_factory=list,
        description="Key architectural insights synthesized across all agent inputs.",
    )
    adjudicated_decisions: List[ReviewDecision] = Field(
        default_factory=list,
        description="Final adjudicated decisions resolving any agent conflicts or ambiguities.",
    )
    trade_off_analysis: List[ReviewTradeoff] = Field(
        default_factory=list,
        description="Deep-dive trade-off analysis comparing competing approaches.",
    )
    synthesis_risks: List[ReviewRisk] = Field(
        default_factory=list,
        description="Consolidated and prioritized risk matrix across all architectural facets.",
    )
    action_items: List[str] = Field(
        default_factory=list,
        description="Immediate engineering next steps before proceeding to detailed design.",
    )
    retrieved_evidence: List[RetrievedEvidenceItem] = Field(
        default_factory=list,
        description="Empirical documentation evidence utilized during reviewer synthesis.",
    )

    model_config = ConfigDict(from_attributes=True)


class ReviewConflictResponse(BaseModel):
    """API schema representing a persisted architectural conflict record."""
    id: uuid.UUID
    review_run_id: uuid.UUID
    category: str
    conflict_type: str
    description: str
    agent_positions: Dict[str, Any]
    severity: str
    resolution: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewRunResponse(BaseModel):
    """API response for a complete architecture review execution."""
    id: uuid.UUID
    project_id: uuid.UUID
    requirement_analysis_id: uuid.UUID
    status: str
    summary: str
    output: Optional[ReviewerOutput] = None
    conflicts: List[ReviewConflictResponse] = Field(default_factory=list)
    retrieved_evidence: List[RetrievedEvidenceItem] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

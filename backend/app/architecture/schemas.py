import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.project import ProjectResponse
from app.requirement_engine.schemas import RequirementAnalysis


class ArchitectureComponent(BaseModel):
    id: str
    name: str
    category: str = Field(
        ...,
        description="service, database, cache, queue, gateway, ui, external",
    )
    type: str
    technology: str
    purpose: str
    responsibilities: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    security_considerations: str = ""
    scaling_considerations: str = ""
    related_decision_ids: List[str] = Field(default_factory=list)
    security_zone: str = Field(
        default="vpc_private",
        description="public, dmz, vpc_private, secure_persistence, third_party",
    )


class ArchitectureConnection(BaseModel):
    source: str
    target: str
    protocol: str = Field(..., description="Communication protocol e.g. gRPC, HTTPS, AMQP, SQL")
    description: str
    is_async: bool = False
    data_flow: str = Field(
        default="request_response",
        description="request_response, unidirectional_stream, pub_sub, bidirectional_sync",
    )


class SecurityBoundary(BaseModel):
    id: str
    name: str
    zone: str
    description: str
    component_ids: List[str] = Field(default_factory=list)
    enforced_policies: List[str] = Field(default_factory=list)


class TechnologyChoice(BaseModel):
    category: str
    name: str
    version_or_flavor: str
    rationale: str
    used_in_components: List[str] = Field(default_factory=list)


class ScalingCharacteristics(BaseModel):
    expected_concurrency: Optional[int] = None
    expected_rps: Optional[int] = None
    throughput_strategy: str
    caching_strategy: str
    database_scaling: str
    failover_strategy: str


class TraceabilityNode(BaseModel):
    requirement_id: str
    requirement_text: str
    requirement_type: str = Field(
        default="functional",
        description="functional, non_functional, scale, constraint",
    )
    agent_recommendation: Optional[str] = None
    agent_type: Optional[str] = None
    conflict_or_tension: Optional[str] = None
    adjudicated_decision: Optional[str] = None
    adr_title: Optional[str] = None
    target_components: List[str] = Field(default_factory=list)
    evidence_grounding: Optional[str] = None


class ArchitectureOverview(BaseModel):
    domain: str
    system_type: str
    executive_summary: str
    total_components: int
    total_connections: int
    total_security_zones: int
    total_traceability_links: int


class UnifiedArchitectureResponse(BaseModel):
    project: ProjectResponse
    requirements: RequirementAnalysis
    overview: ArchitectureOverview
    components: List[ArchitectureComponent] = Field(default_factory=list)
    connections: List[ArchitectureConnection] = Field(default_factory=list)
    technologies: List[TechnologyChoice] = Field(default_factory=list)
    security_boundaries: List[SecurityBoundary] = Field(default_factory=list)
    scaling: ScalingCharacteristics
    decisions: List[Dict[str, Any]] = Field(default_factory=list)
    risks: List[Dict[str, Any]] = Field(default_factory=list)
    traceability: List[TraceabilityNode] = Field(default_factory=list)
    mermaid_diagram: str

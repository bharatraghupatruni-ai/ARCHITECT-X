import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ADRResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    review_run_id: Optional[uuid.UUID] = None
    adr_number: int
    adr_id_formatted: str = Field(
        ...,
        description="Formatted identifier e.g. 'ADR-001'",
    )
    title: str
    status: str = Field(
        default="accepted",
        description="Status: 'accepted', 'proposed', 'rejected', 'superseded'",
    )
    category: str
    context: str
    decision: str
    consequences_positive: List[str] = Field(default_factory=list)
    consequences_negative: List[str] = Field(default_factory=list)
    compliance_and_security: str = ""
    evidence_citations: List[Dict[str, Any]] = Field(default_factory=list)
    markdown_content: str
    created_at: datetime


class C4Node(BaseModel):
    id: str
    label: str
    type: str = Field(
        default="container",
        description="person, system, container, component, database, queue, gateway",
    )
    technology: Optional[str] = None
    description: str
    security_zone: Optional[str] = Field(
        default=None,
        description="public, dmz, vpc_private, secure_persistence, third_party",
    )
    icon: Optional[str] = None


class C4Relationship(BaseModel):
    source: str
    target: str
    protocol: str = Field(
        default="HTTPS / REST",
        description="Communication protocol e.g. REST, gRPC, AMQP, TCP, SQL",
    )
    description: Optional[str] = None
    is_async: bool = False


class C4Boundary(BaseModel):
    id: str
    label: str
    type: str = Field(default="system", description="enterprise, system, container, security_zone")
    node_ids: List[str] = Field(default_factory=list)


class C4LevelData(BaseModel):
    level: int = Field(..., description="1, 2, or 3")
    title: str
    description: str
    nodes: List[C4Node] = Field(default_factory=list)
    relationships: List[C4Relationship] = Field(default_factory=list)
    boundaries: List[C4Boundary] = Field(default_factory=list)


class C4DiagramResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    review_run_id: Optional[uuid.UUID] = None
    title: str
    level_1_context: C4LevelData
    level_2_container: C4LevelData
    level_3_component: C4LevelData
    mermaid_context: str
    mermaid_container: str
    mermaid_component: str
    created_at: datetime


class ExplainabilityResponse(BaseModel):
    project_id: uuid.UUID
    review_run_id: Optional[uuid.UUID] = None
    status: str = "completed"
    summary: str
    adrs: List[ADRResponse] = Field(default_factory=list)
    c4_diagram: Optional[C4DiagramResponse] = None
    created_at: datetime


class ADRExportResponse(BaseModel):
    project_id: uuid.UUID
    project_name: str
    total_adrs: int
    bundled_markdown: str

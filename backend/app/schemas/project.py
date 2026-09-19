from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectBase(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="The name or title of the software architecture project.",
        examples=["Food Delivery Platform"],
    )
    requirement: str = Field(
        ...,
        min_length=1,
        description="Natural language description of system requirements, scale, constraints, and architecture goals.",
        examples=["Build a food delivery platform supporting 50,000 concurrent users."],
    )

    @field_validator("name", "requirement", mode="before")
    @classmethod
    def strip_and_validate_non_empty(cls, value: str, info) -> str:
        if isinstance(value, str):
            cleaned = value.strip()
            if not cleaned:
                field_name = info.field_name.capitalize() if info.field_name else "Field"
                raise ValueError(f"{field_name} cannot be empty or contain only whitespace.")
            return cleaned
        return value


class ProjectCreate(ProjectBase):
    """Payload schema for creating a new Project."""
    pass


class ProjectUpdate(BaseModel):
    """Payload schema for updating an existing Project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    requirement: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = Field(None, max_length=50)


class ProjectResponse(ProjectBase):
    """Response schema representing a Project entity."""
    id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    """Response schema for a list of Projects."""
    items: List[ProjectResponse]
    total: int


class HealthResponse(BaseModel):
    """Response schema for the API health check endpoint."""
    status: str = "ok"
    service: str = "architect-x"
    version: Optional[str] = None
    environment: Optional[str] = None
    checks: Optional[dict] = None

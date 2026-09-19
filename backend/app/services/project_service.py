from typing import List, Optional, Tuple
import uuid
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectStatus
from app.schemas.project import ProjectCreate


class ProjectService:
    @staticmethod
    def create_project(db: Session, project_in: ProjectCreate) -> Project:
        """Create a new project record in the database."""
        db_project = Project(
            name=project_in.name,
            requirement=project_in.requirement,
            status=ProjectStatus.CREATED,
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        return db_project

    @staticmethod
    def get_project_by_id(db: Session, project_id: uuid.UUID) -> Optional[Project]:
        """Retrieve a project by its unique UUID."""
        stmt = select(Project).where(Project.id == project_id)
        return db.scalar(stmt)

    @staticmethod
    def list_projects(
        db: Session, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Project], int]:
        """Retrieve a paginated list of projects ordered by creation date descending, along with total count."""
        # Total count query
        total_stmt = select(func.count(Project.id))
        total = db.scalar(total_stmt) or 0

        # Items query
        items_stmt = (
            select(Project)
            .order_by(desc(Project.created_at))
            .offset(skip)
            .limit(limit)
        )
        items = list(db.scalars(items_stmt).all())

        return items, total


project_service = ProjectService()

import datetime
import uuid
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.requirement_analysis import RequirementAnalysis
from app.models.review_run import ReviewRun
from app.models.retrieved_evidence import RetrievedEvidence
from app.models.adr_record import ADRRecord
from app.models.c4_diagram import C4Diagram
from app.explainability.schemas import (
    ADRExportResponse,
    ADRResponse,
    C4DiagramResponse,
    C4LevelData,
    ExplainabilityResponse,
)
from app.explainability.adr_generator import adr_generator
from app.explainability.c4_generator import c4_generator
from app.agents.service import multi_agent_service


class ExplainabilityService:
    """Orchestrates generation, persistence, retrieval, and markdown export of ADRs and C4 Diagrams."""

    def generate_explainability_for_project(
        self,
        db: Session,
        project_id: uuid.UUID,
    ) -> ExplainabilityResponse:
        """Generate Architecture Decision Records (ADRs) and C4 Diagrams for a project."""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        # 1. Fetch latest requirement analysis
        latest_analysis = (
            db.query(RequirementAnalysis)
            .filter(RequirementAnalysis.project_id == project_id)
            .order_by(RequirementAnalysis.version.desc())
            .first()
        )
        if latest_analysis:
            analysis_data = {
                "domain": latest_analysis.domain,
                "system_type": latest_analysis.system_type,
                "scale": latest_analysis.scale,
                "functional_requirements": latest_analysis.functional_requirements,
                "non_functional_requirements": latest_analysis.non_functional_requirements,
                "constraints": latest_analysis.constraints,
                "priorities": latest_analysis.priorities,
                "external_integrations": latest_analysis.external_integrations,
                "data_requirements": latest_analysis.data_requirements,
                "assumptions": latest_analysis.assumptions,
                "ambiguities": latest_analysis.ambiguities,
                "missing_information": latest_analysis.missing_information,
                "confidence": latest_analysis.confidence,
            }
        else:
            analysis_data = {"domain": "Enterprise Software"}


        # 2. Fetch agent results
        agent_results = multi_agent_service.get_project_agent_results(db=db, project_id=project_id)
        agent_results_data = agent_results.model_dump() if agent_results else {}

        # 3. Fetch latest review run
        latest_review = (
            db.query(ReviewRun)
            .filter(ReviewRun.project_id == project_id)
            .order_by(ReviewRun.created_at.desc())
            .first()
        )
        review_run_id = latest_review.id if latest_review else None
        review_output_data = latest_review.output if latest_review else {}

        # 4. Fetch retrieved evidence items
        evidence_records = (
            db.query(RetrievedEvidence)
            .filter(RetrievedEvidence.project_id == project_id)
            .order_by(RetrievedEvidence.relevance_score.desc())
            .all()
        )
        evidence_dicts = [
            {
                "source": ev.source,
                "section": ev.section,
                "excerpt": ev.excerpt,
                "relevance_score": ev.relevance_score,
                "evidence_metadata": ev.evidence_metadata,
            }
            for ev in evidence_records
        ]

        # 5. Generate ADR records
        generated_adrs = adr_generator.generate_adrs(
            project_id=project_id,
            project_name=project.name,
            review_run_id=review_run_id,
            analysis_data=analysis_data,
            agent_results_data=agent_results_data,
            review_output_data=review_output_data,
            retrieved_evidence=evidence_dicts,
        )

        # Remove old ADR records for this project before re-inserting
        db.query(ADRRecord).filter(ADRRecord.project_id == project_id).delete()

        persisted_adrs: List[ADRRecord] = []
        for adr_dict in generated_adrs:
            adr_obj = ADRRecord(
                project_id=project_id,
                review_run_id=review_run_id,
                adr_number=adr_dict["adr_number"],
                title=adr_dict["title"],
                status=adr_dict["status"],
                category=adr_dict["category"],
                context=adr_dict["context"],
                decision=adr_dict["decision"],
                consequences_positive=adr_dict["consequences_positive"],
                consequences_negative=adr_dict["consequences_negative"],
                compliance_and_security=adr_dict["compliance_and_security"],
                evidence_citations=adr_dict["evidence_citations"],
                markdown_content=adr_dict["markdown_content"],
            )
            db.add(adr_obj)
            persisted_adrs.append(adr_obj)

        # 6. Generate C4 Diagram
        c4_data = c4_generator.generate_c4_model(
            project_name=project.name,
            analysis_data=analysis_data,
            agent_results_data=agent_results_data,
            review_output_data=review_output_data,
        )

        # Remove old C4 diagrams before inserting new
        db.query(C4Diagram).filter(C4Diagram.project_id == project_id).delete()

        c4_obj = C4Diagram(
            project_id=project_id,
            review_run_id=review_run_id,
            title=c4_data["title"],
            level_1_context=c4_data["level_1_context"],
            level_2_container=c4_data["level_2_container"],
            level_3_component=c4_data["level_3_component"],
            mermaid_context=c4_data["mermaid_context"],
            mermaid_container=c4_data["mermaid_container"],
            mermaid_component=c4_data["mermaid_component"],
        )
        db.add(c4_obj)

        db.commit()
        db.refresh(c4_obj)
        for adr in persisted_adrs:
            db.refresh(adr)

        # Build response
        adr_responses = [
            ADRResponse(
                id=adr.id,
                project_id=adr.project_id,
                review_run_id=adr.review_run_id,
                adr_number=adr.adr_number,
                adr_id_formatted=f"ADR-{adr.adr_number:03d}",
                title=adr.title,
                status=adr.status,
                category=adr.category,
                context=adr.context,
                decision=adr.decision,
                consequences_positive=adr.consequences_positive,
                consequences_negative=adr.consequences_negative,
                compliance_and_security=adr.compliance_and_security,
                evidence_citations=adr.evidence_citations,
                markdown_content=adr.markdown_content,
                created_at=adr.created_at,
            )
            for adr in persisted_adrs
        ]

        c4_response = C4DiagramResponse(
            id=c4_obj.id,
            project_id=c4_obj.project_id,
            review_run_id=c4_obj.review_run_id,
            title=c4_obj.title,
            level_1_context=C4LevelData.model_validate(c4_obj.level_1_context),
            level_2_container=C4LevelData.model_validate(c4_obj.level_2_container),
            level_3_component=C4LevelData.model_validate(c4_obj.level_3_component),
            mermaid_context=c4_obj.mermaid_context,
            mermaid_container=c4_obj.mermaid_container,
            mermaid_component=c4_obj.mermaid_component,
            created_at=c4_obj.created_at,
        )

        return ExplainabilityResponse(
            project_id=project_id,
            review_run_id=review_run_id,
            status="completed",
            summary=f"Synthesized {len(adr_responses)} Architecture Decision Records (ADRs) and 3-tier C4 Model Diagrams with evidence grounding.",
            adrs=adr_responses,
            c4_diagram=c4_response,
            created_at=datetime.datetime.utcnow(),
        )

    def get_latest_explainability(
        self,
        db: Session,
        project_id: uuid.UUID,
    ) -> Optional[ExplainabilityResponse]:
        """Fetch existing ADRs and C4 diagrams for a project without re-generating."""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        adrs = (
            db.query(ADRRecord)
            .filter(ADRRecord.project_id == project_id)
            .order_by(ADRRecord.adr_number.asc())
            .all()
        )

        c4_obj = (
            db.query(C4Diagram)
            .filter(C4Diagram.project_id == project_id)
            .order_by(C4Diagram.created_at.desc())
            .first()
        )

        if not adrs and not c4_obj:
            return None

        adr_responses = [
            ADRResponse(
                id=adr.id,
                project_id=adr.project_id,
                review_run_id=adr.review_run_id,
                adr_number=adr.adr_number,
                adr_id_formatted=f"ADR-{adr.adr_number:03d}",
                title=adr.title,
                status=adr.status,
                category=adr.category,
                context=adr.context,
                decision=adr.decision,
                consequences_positive=adr.consequences_positive,
                consequences_negative=adr.consequences_negative,
                compliance_and_security=adr.compliance_and_security,
                evidence_citations=adr.evidence_citations,
                markdown_content=adr.markdown_content,
                created_at=adr.created_at,
            )
            for adr in adrs
        ]

        c4_response = None
        if c4_obj:
            c4_response = C4DiagramResponse(
                id=c4_obj.id,
                project_id=c4_obj.project_id,
                review_run_id=c4_obj.review_run_id,
                title=c4_obj.title,
                level_1_context=C4LevelData.model_validate(c4_obj.level_1_context),
                level_2_container=C4LevelData.model_validate(c4_obj.level_2_container),
                level_3_component=C4LevelData.model_validate(c4_obj.level_3_component),
                mermaid_context=c4_obj.mermaid_context,
                mermaid_container=c4_obj.mermaid_container,
                mermaid_component=c4_obj.mermaid_component,
                created_at=c4_obj.created_at,
            )

        return ExplainabilityResponse(
            project_id=project_id,
            review_run_id=c4_obj.review_run_id if c4_obj else None,
            status="completed",
            summary=f"Retrieved {len(adr_responses)} Architecture Decision Records (ADRs) and C4 Diagrams.",
            adrs=adr_responses,
            c4_diagram=c4_response,
            created_at=c4_obj.created_at if c4_obj else datetime.datetime.utcnow(),
        )

    def export_adrs_markdown(
        self,
        db: Session,
        project_id: uuid.UUID,
    ) -> ADRExportResponse:
        """Export all ADRs as a unified, ready-to-commit Markdown document."""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        adrs = (
            db.query(ADRRecord)
            .filter(ADRRecord.project_id == project_id)
            .order_by(ADRRecord.adr_number.asc())
            .all()
        )

        if not adrs:
            # Generate them on-the-fly if not present
            exp_res = self.generate_explainability_for_project(db=db, project_id=project_id)
            adrs = (
                db.query(ADRRecord)
                .filter(ADRRecord.project_id == project_id)
                .order_by(ADRRecord.adr_number.asc())
                .all()
            )

        # Build bundled Markdown document
        doc_lines = [
            f"# Architecture Decision Records (ADR Bundle) — {project.name}",
            "",
            "> **Generated by ARCHITECT-X Decision & Explainability Engine**",
            f"> Project ID: `{project.id}`",
            f"> Export Date: `{datetime.date.today().isoformat()}`",
            "",
            "---",
            "",
            "## Table of Contents",
            "",
        ]

        for adr in adrs:
            doc_lines.append(f"- [ADR-{adr.adr_number:03d}: {adr.title}](#adr-{adr.adr_number:03d}) — *Status: {adr.status.upper()}*")

        doc_lines.append("")
        doc_lines.append("---")
        doc_lines.append("")

        for adr in adrs:
            doc_lines.append(f"<a id=\"adr-{adr.adr_number:03d}\"></a>")
            doc_lines.append(adr.markdown_content)
            doc_lines.append("")
            doc_lines.append("---")
            doc_lines.append("")

        bundled = "\n".join(doc_lines)

        return ADRExportResponse(
            project_id=project_id,
            project_name=project.name,
            total_adrs=len(adrs),
            bundled_markdown=bundled,
        )


explainability_service = ExplainabilityService()

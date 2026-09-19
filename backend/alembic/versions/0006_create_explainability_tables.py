"""create_explainability_tables

Revision ID: 0006_create_explainability_tables
Revises: 0005_create_retrieved_evidence_table
Create Date: 2026-09-19 20:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0006_create_explainability_tables'
down_revision: Union[str, None] = '0005_create_retrieved_evidence_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create adr_records table
    op.create_table(
        'adr_records',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('review_run_id', sa.Uuid(), nullable=True),
        sa.Column('adr_number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='accepted'),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('context', sa.Text(), nullable=False),
        sa.Column('decision', sa.Text(), nullable=False),
        sa.Column('consequences_positive', sa.JSON(), nullable=False),
        sa.Column('consequences_negative', sa.JSON(), nullable=False),
        sa.Column('compliance_and_security', sa.Text(), nullable=False, server_default=''),
        sa.Column('evidence_citations', sa.JSON(), nullable=False),
        sa.Column('markdown_content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['review_run_id'], ['review_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_adr_records_id'), 'adr_records', ['id'], unique=False)
    op.create_index(op.f('ix_adr_records_project_id'), 'adr_records', ['project_id'], unique=False)
    op.create_index(op.f('ix_adr_records_review_run_id'), 'adr_records', ['review_run_id'], unique=False)
    op.create_index(op.f('ix_adr_records_adr_number'), 'adr_records', ['adr_number'], unique=False)
    op.create_index(op.f('ix_adr_records_status'), 'adr_records', ['status'], unique=False)
    op.create_index(op.f('ix_adr_records_category'), 'adr_records', ['category'], unique=False)

    # 2. Create c4_diagrams table
    op.create_table(
        'c4_diagrams',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('review_run_id', sa.Uuid(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('level_1_context', sa.JSON(), nullable=False),
        sa.Column('level_2_container', sa.JSON(), nullable=False),
        sa.Column('level_3_component', sa.JSON(), nullable=False),
        sa.Column('mermaid_context', sa.Text(), nullable=False),
        sa.Column('mermaid_container', sa.Text(), nullable=False),
        sa.Column('mermaid_component', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['review_run_id'], ['review_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_c4_diagrams_id'), 'c4_diagrams', ['id'], unique=False)
    op.create_index(op.f('ix_c4_diagrams_project_id'), 'c4_diagrams', ['project_id'], unique=False)
    op.create_index(op.f('ix_c4_diagrams_review_run_id'), 'c4_diagrams', ['review_run_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_c4_diagrams_review_run_id'), table_name='c4_diagrams')
    op.drop_index(op.f('ix_c4_diagrams_project_id'), table_name='c4_diagrams')
    op.drop_index(op.f('ix_c4_diagrams_id'), table_name='c4_diagrams')
    op.drop_table('c4_diagrams')

    op.drop_index(op.f('ix_adr_records_category'), table_name='adr_records')
    op.drop_index(op.f('ix_adr_records_status'), table_name='adr_records')
    op.drop_index(op.f('ix_adr_records_adr_number'), table_name='adr_records')
    op.drop_index(op.f('ix_adr_records_review_run_id'), table_name='adr_records')
    op.drop_index(op.f('ix_adr_records_project_id'), table_name='adr_records')
    op.drop_index(op.f('ix_adr_records_id'), table_name='adr_records')
    op.drop_table('adr_records')

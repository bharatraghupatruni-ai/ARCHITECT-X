"""create_retrieved_evidence_table

Revision ID: 0005_create_retrieved_evidence_table
Revises: 0004_create_review_and_conflict_tables
Create Date: 2026-09-19 19:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_create_retrieved_evidence_table'
down_revision: Union[str, None] = '0004_create_review_and_conflict_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'retrieved_evidence',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('review_run_id', sa.Uuid(), nullable=True),
        sa.Column('conflict_id', sa.Uuid(), nullable=True),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('source', sa.String(length=255), nullable=False),
        sa.Column('section', sa.String(length=255), nullable=True),
        sa.Column('excerpt', sa.Text(), nullable=False),
        sa.Column('evidence_metadata', sa.JSON(), nullable=False),
        sa.Column('relevance_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['review_run_id'], ['review_runs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['conflict_id'], ['architecture_conflicts.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_retrieved_evidence_id'), 'retrieved_evidence', ['id'], unique=False)
    op.create_index(op.f('ix_retrieved_evidence_project_id'), 'retrieved_evidence', ['project_id'], unique=False)
    op.create_index(op.f('ix_retrieved_evidence_review_run_id'), 'retrieved_evidence', ['review_run_id'], unique=False)
    op.create_index(op.f('ix_retrieved_evidence_conflict_id'), 'retrieved_evidence', ['conflict_id'], unique=False)
    op.create_index(op.f('ix_retrieved_evidence_source'), 'retrieved_evidence', ['source'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_retrieved_evidence_source'), table_name='retrieved_evidence')
    op.drop_index(op.f('ix_retrieved_evidence_conflict_id'), table_name='retrieved_evidence')
    op.drop_index(op.f('ix_retrieved_evidence_review_run_id'), table_name='retrieved_evidence')
    op.drop_index(op.f('ix_retrieved_evidence_project_id'), table_name='retrieved_evidence')
    op.drop_index(op.f('ix_retrieved_evidence_id'), table_name='retrieved_evidence')
    op.drop_table('retrieved_evidence')

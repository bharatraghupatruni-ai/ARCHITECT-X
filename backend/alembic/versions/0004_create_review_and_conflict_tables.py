"""create_review_and_conflict_tables

Revision ID: 0004_create_review_and_conflict_tables
Revises: 0003_create_agent_runs_table
Create Date: 2026-09-19 19:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_create_review_and_conflict_tables'
down_revision: Union[str, None] = '0003_create_agent_runs_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create review_runs table
    op.create_table(
        'review_runs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('requirement_analysis_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='completed'),
        sa.Column('summary', sa.Text(), nullable=False, server_default=''),
        sa.Column('output', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requirement_analysis_id'], ['requirement_analyses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_review_runs_id'), 'review_runs', ['id'], unique=False)
    op.create_index(op.f('ix_review_runs_project_id'), 'review_runs', ['project_id'], unique=False)
    op.create_index(op.f('ix_review_runs_requirement_analysis_id'), 'review_runs', ['requirement_analysis_id'], unique=False)
    op.create_index(op.f('ix_review_runs_status'), 'review_runs', ['status'], unique=False)

    # 2. Create architecture_conflicts table
    op.create_table(
        'architecture_conflicts',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('review_run_id', sa.Uuid(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('conflict_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('agent_positions', sa.JSON(), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='medium'),
        sa.Column('resolution', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['review_run_id'], ['review_runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_architecture_conflicts_id'), 'architecture_conflicts', ['id'], unique=False)
    op.create_index(op.f('ix_architecture_conflicts_review_run_id'), 'architecture_conflicts', ['review_run_id'], unique=False)
    op.create_index(op.f('ix_architecture_conflicts_category'), 'architecture_conflicts', ['category'], unique=False)
    op.create_index(op.f('ix_architecture_conflicts_conflict_type'), 'architecture_conflicts', ['conflict_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_architecture_conflicts_conflict_type'), table_name='architecture_conflicts')
    op.drop_index(op.f('ix_architecture_conflicts_category'), table_name='architecture_conflicts')
    op.drop_index(op.f('ix_architecture_conflicts_review_run_id'), table_name='architecture_conflicts')
    op.drop_index(op.f('ix_architecture_conflicts_id'), table_name='architecture_conflicts')
    op.drop_table('architecture_conflicts')

    op.drop_index(op.f('ix_review_runs_status'), table_name='review_runs')
    op.drop_index(op.f('ix_review_runs_requirement_analysis_id'), table_name='review_runs')
    op.drop_index(op.f('ix_review_runs_project_id'), table_name='review_runs')
    op.drop_index(op.f('ix_review_runs_id'), table_name='review_runs')
    op.drop_table('review_runs')

"""create_agent_runs_table

Revision ID: 0003_create_agent_runs_table
Revises: 0002_create_requirement_analyses_table
Create Date: 2026-09-19 18:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_create_agent_runs_table'
down_revision: Union[str, None] = '0002_create_requirement_analyses_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'agent_runs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('requirement_analysis_id', sa.Uuid(), nullable=False),
        sa.Column('agent_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='completed'),
        sa.Column('output', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requirement_analysis_id'], ['requirement_analyses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_runs_id'), 'agent_runs', ['id'], unique=False)
    op.create_index(op.f('ix_agent_runs_project_id'), 'agent_runs', ['project_id'], unique=False)
    op.create_index(op.f('ix_agent_runs_requirement_analysis_id'), 'agent_runs', ['requirement_analysis_id'], unique=False)
    op.create_index(op.f('ix_agent_runs_agent_type'), 'agent_runs', ['agent_type'], unique=False)
    op.create_index(op.f('ix_agent_runs_status'), 'agent_runs', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_agent_runs_status'), table_name='agent_runs')
    op.drop_index(op.f('ix_agent_runs_agent_type'), table_name='agent_runs')
    op.drop_index(op.f('ix_agent_runs_requirement_analysis_id'), table_name='agent_runs')
    op.drop_index(op.f('ix_agent_runs_project_id'), table_name='agent_runs')
    op.drop_index(op.f('ix_agent_runs_id'), table_name='agent_runs')
    op.drop_table('agent_runs')

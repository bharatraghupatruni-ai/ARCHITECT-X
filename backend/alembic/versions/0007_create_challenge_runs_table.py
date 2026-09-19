"""create_challenge_runs_table

Revision ID: 0007_create_challenge_runs_table
Revises: 0006_create_explainability_tables
Create Date: 2026-09-19 20:38:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0007_create_challenge_runs_table'
down_revision: Union[str, None] = '0006_create_explainability_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'challenge_runs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('scenario_id', sa.String(length=100), nullable=False),
        sa.Column('architecture_version', sa.String(length=50), nullable=True),
        sa.Column('result', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_challenge_runs_id'), 'challenge_runs', ['id'], unique=False)
    op.create_index(op.f('ix_challenge_runs_project_id'), 'challenge_runs', ['project_id'], unique=False)
    op.create_index(op.f('ix_challenge_runs_scenario_id'), 'challenge_runs', ['scenario_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_challenge_runs_scenario_id'), table_name='challenge_runs')
    op.drop_index(op.f('ix_challenge_runs_project_id'), table_name='challenge_runs')
    op.drop_index(op.f('ix_challenge_runs_id'), table_name='challenge_runs')
    op.drop_table('challenge_runs')

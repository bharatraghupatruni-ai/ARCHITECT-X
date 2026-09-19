"""create_requirement_analyses_table

Revision ID: 0002_create_requirement_analyses_table
Revises: 0001_create_projects_table
Create Date: 2026-09-19 18:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_create_requirement_analyses_table'
down_revision: Union[str, None] = '0001_create_projects_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'requirement_analyses',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('domain', sa.String(length=100), nullable=False, server_default='unknown'),
        sa.Column('system_type', sa.String(length=100), nullable=False, server_default='unknown'),
        sa.Column('scale', sa.JSON(), nullable=False),
        sa.Column('functional_requirements', sa.JSON(), nullable=False),
        sa.Column('non_functional_requirements', sa.JSON(), nullable=False),
        sa.Column('constraints', sa.JSON(), nullable=False),
        sa.Column('priorities', sa.JSON(), nullable=False),
        sa.Column('external_integrations', sa.JSON(), nullable=False),
        sa.Column('data_requirements', sa.JSON(), nullable=False),
        sa.Column('assumptions', sa.JSON(), nullable=False),
        sa.Column('ambiguities', sa.JSON(), nullable=False),
        sa.Column('missing_information', sa.JSON(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_requirement_analyses_id'), 'requirement_analyses', ['id'], unique=False)
    op.create_index(op.f('ix_requirement_analyses_project_id'), 'requirement_analyses', ['project_id'], unique=False)
    op.create_index(op.f('ix_requirement_analyses_version'), 'requirement_analyses', ['version'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_requirement_analyses_version'), table_name='requirement_analyses')
    op.drop_index(op.f('ix_requirement_analyses_project_id'), table_name='requirement_analyses')
    op.drop_index(op.f('ix_requirement_analyses_id'), table_name='requirement_analyses')
    op.drop_table('requirement_analyses')

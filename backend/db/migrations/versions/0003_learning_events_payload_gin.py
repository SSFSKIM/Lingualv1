"""learning_events payload GIN index

The event-derived analytics aggregations (_aggregate_context_tag_counts /
_aggregate_error_event_metadata in practice_analytics.py) read the payload JSONB
per row; without a GIN index they scan JSONB for every event in the assignment/
class scope. Required before the Slice E analytics-event READ flip
(ANALYTICS_MIGRATION.md §4.1). The model carries this index too
(learning_events_payload_gin_idx); this migration adds it to the LIVE instance,
which was created from the 0001 metadata baseline.

IDEMPOTENT (CREATE/DROP INDEX IF [NOT] EXISTS): the 0001 baseline bootstraps from
live model metadata via create_all (which now includes this index), so a fresh
`alembic upgrade head` would otherwise try to create it twice (0001 create_all,
then this delta). Prod was created at an older baseline and adds it here for the
first time. IF NOT EXISTS makes both paths safe (same posture a delta migration
on a metadata-bootstrap baseline should always take).

CONCURRENTLY is intentionally NOT used (it cannot run inside Alembic's
transaction); at one-school beta the table is small and a brief lock is fine. If
this is ever run against a large multi-school table, build the index out-of-band
with CREATE INDEX CONCURRENTLY instead.

Revision ID: 0003_learning_events_payload_gin
Revises: 0002_assignment_grade_config
Create Date: 2026-06-03
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = '0003_learning_events_payload_gin'
down_revision = '0002_assignment_grade_config'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        'CREATE INDEX IF NOT EXISTS learning_events_payload_gin_idx '
        'ON learning_events USING gin (payload)'
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS learning_events_payload_gin_idx')

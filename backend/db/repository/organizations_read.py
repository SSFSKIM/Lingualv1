"""Organizations read adapter (Postgres -> Firestore-shaped dicts).

The first read-cutover adapter (READ_CUTOVER.md §3.2). Session-injected — the
`ReadRouter` owns the Session lifecycle + flag gating. `get_organization`
returns the FULL org doc shape its callers consume: broad lingual-admin
projections, the fail-closed suspended-org gate (`suspended_org_guard` reads
status/suspend_reason/suspended_until), and the compliance retention default
(`default_retention_policy`). A slim projection would silently degrade all three.

Inverse of the backfill renames (backfill.py): Firestore `suspended_by_uid` /
`restored_by_uid` are stored as `suspended_by_firebase_uid` /
`restored_by_firebase_uid` in PG, so the serializer renames them back.
`school_admin_uids` is Firestore-denormalized and derived (not a PG column); no
get_organization point-get caller reads it (the lingual-admin LIST path is a
separate reader — defect D3), so it is intentionally omitted and allowlisted in
the shadow comparator.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select

from backend.db.models.org import Organization


def _serialize(row: Organization) -> dict[str, Any]:
    """Render an Organization row as the Firestore-shaped `get_organization` dict.

    `id` is the Firestore doc id (legacy_firestore_id) during coexistence.
    Datetimes are returned raw (the route's `_timestamp_to_iso` coerces, matching
    the Firestore path which also returns datetime objects).
    """
    return {
        'id': row.legacy_firestore_id or str(row.id),
        'name': row.name,
        'name_lower': row.name_lower,
        'type': row.type,
        'status': row.status,
        'pilot_stage': row.pilot_stage,
        'lms_capabilities': list(row.lms_capabilities or []),
        'default_modality_policy': row.default_modality_policy,
        'default_retention_policy': row.default_retention_policy,
        'school_type': row.school_type,
        'country': row.country,
        'state': row.state,
        'county': row.county,
        'city': row.city,
        'website_url': row.website_url,
        'public_or_private': row.public_or_private,
        'grade_size': row.grade_size,
        'teacher_invite_code': row.teacher_invite_code,
        'teacher_invite_code_active': bool(row.teacher_invite_code_active),
        'teacher_invite_code_generated_at': row.teacher_invite_code_generated_at,
        'last_activity_at': row.last_activity_at,
        'suspended_at': row.suspended_at,
        # Inverse rename: PG suspended_by_firebase_uid -> Firestore suspended_by_uid.
        'suspended_by_uid': row.suspended_by_firebase_uid,
        'suspend_reason': row.suspend_reason,
        'suspended_until': row.suspended_until,
        'restored_at': row.restored_at,
        'restored_by_uid': row.restored_by_firebase_uid,
        'created_at': row.created_at,
        'updated_at': row.updated_at,
    }


def get_organization(session: Any, org_id: str) -> dict[str, Any] | None:
    """Point-get by Firestore doc id (legacy_firestore_id).

    Returns None for an unmigrated / junk id; the router then fails open to
    Firestore (never a 404), so the ~62 Firestore-only rows degrade correctly.
    """
    stmt = select(Organization).where(Organization.legacy_firestore_id == org_id)
    row = session.execute(stmt).scalar_one_or_none()
    return _serialize(row) if row is not None else None

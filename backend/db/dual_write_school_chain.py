"""Flag-gated Postgres shadow-write for the school PARENT CHAIN (slice 2c).

Companion to `dual_write.py` (enrollments, slice 2b): same fail-open contract,
the SAME shared `_run` harness, but gated on its OWN flag DUAL_WRITE_SCHOOL_CHAIN
and covering organizations / memberships / classes + hard-delete mirroring.

Two flags, deliberately independent:
  - DUAL_WRITE_SCHOOL_CHAIN must be enabled (and parity-verified) FIRST, so the
    org/membership/class parent rows exist...
  - ...before DUAL_WRITE_ENROLLMENTS is enabled, so enrollment FKs resolve.
Either can be toggled off independently for rollback.

Mirror strategy (parent chain is LOW-CHURN, unlike the enrollment hot path):
  - CREATE paths reuse the idempotent `backfill.upsert_*` (the full doc is in
    scope at the call site; the upsert owns the renames/normalization).
  - STATUS-FLIP paths (suspend / restore / remove) use a TARGETED UPDATE keyed by
    legacy_firestore_id. A partial doc through `upsert_organization` would clobber
    NOT-NULL stable fields (name, type) -> IntegrityError; a targeted UPDATE
    touches only the fields the Firestore batch changed.

Heavy imports stay lazy inside function bodies; flag-OFF cost is os + logging.
This increment (2c-1) implements organizations only; membership/class/delete land
in 2c-2..2c-4.
"""

from __future__ import annotations

import datetime
import os
from typing import Any

# The fail-open harness is shared infra (one copy of the safety-critical
# open-session / SET LOCAL statement_timeout / swallow-and-log contract).
from backend.db.dual_write import _run


def _enabled_school_chain() -> bool:
    """Read the flag on EVERY call (not a module constant). OFF unless '1'."""
    return os.environ.get('DUAL_WRITE_SCHOOL_CHAIN') == '1'


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _strip_sentinels(doc: dict[str, Any]) -> dict[str, Any]:
    """Replace Firestore SERVER_TIMESTAMP sentinels with None.

    A freshly-built Firestore write dict carries SERVER_TIMESTAMP sentinels for
    created_at/updated_at (and sometimes other timestamp fields). Those are not
    real datetimes; `backfill.parse_firestore_timestamp` expects None or a real
    value, so neutralize any sentinel to None before the upsert reads it.
    """
    cleaned = {}
    for key, value in doc.items():
        is_sentinel = type(value).__name__ == 'Sentinel' or hasattr(value, '_pb')
        cleaned[key] = None if is_sentinel else value
    return cleaned


def shadow_create_organization(sql_engine: Any, *, org_id: str, org_data: dict[str, Any]) -> None:
    """Mirror an organization CREATE into Postgres (idempotent upsert).

    `org_data` is the same dict the Firestore write used; `org_id` is the
    Firestore doc id (becomes legacy_firestore_id). Idempotent by that key.
    """
    if not _enabled_school_chain():
        return
    from backend.db.repository import backfill

    doc = {**_strip_sentinels(org_data), 'id': org_id}
    _run(sql_engine, 'create_organization', lambda s: backfill.upsert_organization(s, doc))


def shadow_suspend_organization(
    sql_engine: Any, *, org_id: str, actor_uid: str, reason: str, suspended_until: Any
) -> None:
    """Mirror a suspend: targeted UPDATE of the suspension fields only.

    Keyed by legacy_firestore_id, updates the existing row in place; no-op when
    the org is not in Postgres yet (0 rows matched). Never an upsert — a partial
    doc would clobber name/type and trip the NOT NULL CHECK.
    """
    if not _enabled_school_chain():
        return
    from sqlalchemy import update

    from backend.db.models.org import Organization

    def op(session: Any) -> None:
        session.execute(
            update(Organization)
            .where(Organization.legacy_firestore_id == org_id)
            .values(
                status='suspended',
                suspended_at=_utcnow(),
                suspended_by_firebase_uid=actor_uid,
                suspend_reason=reason,
                suspended_until=suspended_until,
                updated_at=_utcnow(),
            )
        )

    _run(sql_engine, 'suspend_organization', op)


def shadow_restore_organization(sql_engine: Any, *, org_id: str, actor_uid: str) -> None:
    """Mirror a restore: targeted UPDATE clearing the suspension fields.

    Keyed by legacy_firestore_id; no-op when the org row is absent. Mirrors
    Firestore's authoritative result (status back to active) faithfully.
    """
    if not _enabled_school_chain():
        return
    from sqlalchemy import update

    from backend.db.models.org import Organization

    def op(session: Any) -> None:
        session.execute(
            update(Organization)
            .where(Organization.legacy_firestore_id == org_id)
            .values(
                status='active',
                suspended_at=None,
                suspended_by_firebase_uid=None,
                suspend_reason=None,
                suspended_until=None,
                restored_at=_utcnow(),
                restored_by_firebase_uid=actor_uid,
                updated_at=_utcnow(),
            )
        )

    _run(sql_engine, 'restore_organization', op)

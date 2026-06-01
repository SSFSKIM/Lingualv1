"""Memberships read adapter (Postgres -> Firestore-shaped dicts).

Slice 4 of the read cutover (READ_CUTOVER.md §3.2, §5). Session-injected — the
`ReadRouter` owns the Session lifecycle + flag gating. Routes ONLY the two raw
membership-row readers:

  get_membership(id)        -> the raw membership doc shape (+ id)
  get_user_memberships(uid) -> the org-enriched membership list (the role-guard feed)

Deliberately NOT routed (D4 resolution — they stay on Firestore):
  * resolve_user_school_context  — a composition layer (it calls the in-module
    get_user_memberships + reads the users profile); keeping it on Firestore lets
    the highest-stakes read (the role guard) stay on the proven store after the
    point-get/list flip. See READ_CUTOVER.md §5.
  * list_org_memberships / list_school_admin_emails / list_lingual_admin_emails —
    membership⋈users HYBRIDS. email/name live in the `users` collection (identity,
    never migrated per ADR-0001) and require an unavoidable per-row Firestore
    fan-out, so a pure-SQL adapter is impossible and routing only the membership
    filter buys nothing for a cold admin path.

FK inversions (the read-side dual of backfill.py's write-side resolution):
  org_id                  -> organizations.legacy_firestore_id  (JOIN; PG holds a UUID FK)
  firebase_uid            -> uid                                  (inverse rename)
  removed_by_firebase_uid -> removed_by_uid                       (inverse rename)
  primary_class_ids[uuid] -> [classes.legacy_firestore_id]        (array translation)

primary_class_ids CAVEAT (D5 — a flip prereq, not benign drift): the backfill
(`upsert_membership`) defers it to [] while the LIVE add/remove/create path DOES
mirror it (resolving each class to a UUID). So backfilled teacher->class attaches
are absent in PG until a reconciliation backfill runs. The field has no UI
consumer (a frontend `primaryClassIds?` type only). This serializer translates it
correctly where populated; the shadow comparator allowlists it on the point-get
(the list path diffs by id-set, so it never sees the field).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select

from backend.db.models.org import Class, Membership, Organization

# Mirrors database.ACTIVE_MEMBERSHIP_STATUSES — the get_user_memberships filter.
_ACTIVE_MEMBERSHIP_STATUSES = ('active', 'invited')

# Mirrors database.SCHOOL_ROLE_PRIORITY — the get_user_memberships sort precedence.
_ROLE_PRIORITY = {'school_admin': 0, 'teacher': 1, 'student': 2}


def _class_legacy_map(session: Any, class_uuids) -> dict:
    """Map class UUID -> legacy_firestore_id for the given UUIDs in one query.

    primary_class_ids is a denormalized ARRAY(UUID) (no FK), so a stored UUID may
    not resolve (e.g. a class deleted out from under it); the caller falls back to
    str(uuid) for those, which is still a stable, comparable token."""
    uniq = {u for u in (class_uuids or []) if u is not None}
    if not uniq:
        return {}
    rows = session.execute(
        select(Class.id, Class.legacy_firestore_id).where(Class.id.in_(uniq))
    ).all()
    return {cid: legacy for cid, legacy in rows}


def _legacy_class_ids(uuids, class_map: dict) -> list:
    """Translate a membership's primary_class_ids UUID array to legacy ids,
    preserving order (matches the Firestore array)."""
    return [class_map.get(u) or str(u) for u in (uuids or [])]


def _serialize_membership(row: Membership, org_legacy_id, class_legacy_ids: list) -> dict[str, Any]:
    """Render a Membership row as the raw Firestore `get_membership` doc shape.

    `id` is the Firestore doc id (legacy_firestore_id) during coexistence. The
    removed_* fields are absent on active Firestore docs; PG returns None, which
    the shadow comparator's _norm collapses to match.
    """
    return {
        'id': row.legacy_firestore_id or str(row.id),
        'org_id': org_legacy_id,
        'uid': row.firebase_uid,                       # inverse rename firebase_uid -> uid
        'roles': list(row.roles or []),
        'status': row.status,
        'primary_class_ids': class_legacy_ids,
        'removed_at': row.removed_at,
        'removed_by_uid': row.removed_by_firebase_uid,  # inverse rename
        'created_at': row.created_at,
        'updated_at': row.updated_at,
    }


def get_membership(session: Any, membership_id: str) -> dict[str, Any] | None:
    """Point-get one membership by its Firestore doc id. None if unmigrated/absent
    (the router then fails open to Firestore)."""
    stmt = (
        select(Membership, Organization.legacy_firestore_id)
        .outerjoin(Organization, Organization.id == Membership.org_id)
        .where(Membership.legacy_firestore_id == membership_id)
    )
    result = session.execute(stmt).one_or_none()
    if result is None:
        return None
    row, org_legacy = result
    class_map = _class_legacy_map(session, row.primary_class_ids)
    return _serialize_membership(row, org_legacy, _legacy_class_ids(row.primary_class_ids, class_map))


def get_user_memberships(session: Any, uid: str) -> list[dict[str, Any]]:
    """Active/invited memberships for a user, org-enriched, in the Firestore order.

    Mirrors database.get_user_memberships: filter by uid + active/invited status,
    enrich with org name/type (here a JOIN, there a per-row get_organization), and
    sort by (role priority, orgName, id). orgId is the org's legacy id so the
    role-guard's `active_organization_id` comparisons keep working post-flip.
    """
    stmt = (
        select(
            Membership,
            Organization.legacy_firestore_id,
            Organization.name,
            Organization.type,
        )
        .outerjoin(Organization, Organization.id == Membership.org_id)
        .where(Membership.firebase_uid == uid)
        .where(Membership.status.in_(_ACTIVE_MEMBERSHIP_STATUSES))
    )
    rows = session.execute(stmt).all()

    # One round-trip to translate every primary_class_ids UUID across all rows.
    all_class_uuids = [u for (m, _o, _n, _t) in rows for u in (m.primary_class_ids or [])]
    class_map = _class_legacy_map(session, all_class_uuids)

    memberships = [
        {
            'id': m.legacy_firestore_id or str(m.id),
            'orgId': org_legacy,
            'orgName': org_name or '',
            'orgType': org_type,
            'roles': list(m.roles or []),
            'status': m.status,
            'primaryClassIds': _legacy_class_ids(m.primary_class_ids, class_map),
        }
        for (m, org_legacy, org_name, org_type) in rows
    ]

    memberships.sort(key=_sort_key)
    return memberships


def _sort_key(m: dict) -> tuple:
    roles = m.get('roles', [])
    role_priority = min((_ROLE_PRIORITY.get(r, 99) for r in roles), default=99)
    return role_priority, (m.get('orgName') or '').lower(), m.get('id') or ''

"""Analytics read adapters (Postgres -> Firestore-shaped dicts).

Slice D of the analytics-family read cutover (ANALYTICS_MIGRATION.md §4.3). Routes
the practice_session + learning_event list readers that feed teacher/class/student
analytics. The `ReadRouter` owns the Session lifecycle, the parent-legacy->UUID
resolution (+ `_FALLBACK` on an unresolved parent), and the per-flag gating; these
functions take the ALREADY-RESOLVED parent UUID (the same split as `enrollments.py`).

FK inversions (read-side dual of the dual-write — emit the parent's Firestore doc id,
NEVER the PG UUID, so the Python analytics layer's id comparisons / cross-store joins
hold):
  org_id        -> organizations.legacy_firestore_id   (JOIN)
  class_id      -> classes.legacy_firestore_id          (JOIN)
  assignment_id -> assignments.legacy_firestore_id       (JOIN)
  session_id    -> practice_sessions.legacy_firestore_id (JOIN, events only)
Field rename back to the Firestore key: student_firebase_uid -> student_uid.

The serializers emit the FULL Firestore doc shape (every column), so a routed read is
a drop-in for the Firestore reader and `practice_analytics.py` needs no change (§4.2
Python-over-PG). Timestamps are emitted as datetimes (what the Firestore reader yields
and `_timestamp_to_iso` expects), JSONB blobs as their dict/None.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select

from backend.db.models.assignment import Assignment
from backend.db.models.org import Class, Organization
from backend.db.models.practice import LearningEvent, PracticeSession


def _serialize_session(
    row: PracticeSession, org_legacy, class_legacy, assignment_legacy
) -> dict[str, Any]:
    """Render a PracticeSession row as the Firestore practice_session doc shape."""
    return {
        'id': row.legacy_firestore_id or str(row.id),
        'org_id': org_legacy,                 # FK legacy id, not UUID
        'class_id': class_legacy,             # FK legacy id, not UUID
        'assignment_id': assignment_legacy,   # FK legacy id, not UUID
        # Renamed back: student_firebase_uid -> Firestore student_uid.
        'student_uid': row.student_firebase_uid,
        'mapping_snapshot': row.mapping_snapshot,
        'assignment_snapshot': row.assignment_snapshot,
        'curriculum_snapshot': row.curriculum_snapshot,
        'pedagogy_snapshot': row.pedagogy_snapshot,
        'class_snapshot': row.class_snapshot,
        'modality': row.modality,
        'voice_enabled': row.voice_enabled,
        'text_enabled': row.text_enabled,
        'status': row.status,
        'started_at': row.started_at,
        'ended_at': row.ended_at,
        'prompt_version': row.prompt_version,
        'system_prompt_preview': row.system_prompt_preview,
        'transcript_ref': row.transcript_ref,
        'cost_summary': row.cost_summary,
        'session_summary': row.session_summary,
        'analysis_state': row.analysis_state,
        'teacher_preview': row.teacher_preview,
        'ui_language': row.ui_language,
        'org_status_when_created': row.org_status_when_created,
        'created_at': row.created_at,
        'updated_at': row.updated_at,
    }


def _serialize_event(
    row: LearningEvent, org_legacy, class_legacy, assignment_legacy, session_legacy
) -> dict[str, Any]:
    """Render a LearningEvent row as the Firestore learning_event doc shape."""
    return {
        'id': row.legacy_firestore_id or str(row.id),
        'org_id': org_legacy,
        'class_id': class_legacy,
        'assignment_id': assignment_legacy,
        'session_id': session_legacy,
        'student_uid': row.student_firebase_uid,
        'event_type': row.event_type,
        'turn_index': row.turn_index,
        'payload': row.payload,
        'created_at': row.created_at,
    }


# --- practice_session readers (parent UUID already resolved by the router) ----
#
# All four JOIN org/class/assignment ONLY to emit their store-invariant
# legacy_firestore_id; ordered started_at DESC to match the analytics surfaces.

_SESSION_SELECT = (
    select(
        PracticeSession,
        Organization.legacy_firestore_id,
        Class.legacy_firestore_id,
        Assignment.legacy_firestore_id,
    )
    .outerjoin(Organization, Organization.id == PracticeSession.org_id)
    .outerjoin(Class, Class.id == PracticeSession.class_id)
    .outerjoin(Assignment, Assignment.id == PracticeSession.assignment_id)
)


def _sessions(session: Any, stmt) -> list[dict[str, Any]]:
    return [
        _serialize_session(row, org_legacy, class_legacy, assignment_legacy)
        for row, org_legacy, class_legacy, assignment_legacy in session.execute(stmt).all()
    ]


def get_practice_session(session: Any, session_firestore_id: str) -> dict[str, Any] | None:
    """Point-get ONE practice session by its legacy Firestore id (full doc shape).

    The read-after-write dual of the dual-write: needed so the create/event routes
    (and chat.py's session-validation reads) can resolve a session that, under
    WRITE_FIRESTORE_ANALYTICS=0, exists ONLY in Postgres. Filters on the unique
    legacy_firestore_id (O(1)); returns None when absent (the ReadRouter maps None
    to `_FALLBACK` so a not-yet-migrated session falls open to Firestore — a 404 on
    the session-create read-back would block the student otherwise).
    """
    row = session.execute(
        _SESSION_SELECT.where(PracticeSession.legacy_firestore_id == session_firestore_id)
    ).first()
    if row is None:
        return None
    ps, org_legacy, class_legacy, assignment_legacy = row
    return _serialize_session(ps, org_legacy, class_legacy, assignment_legacy)


def list_assignment_practice_sessions(session: Any, assignment_uuid: Any) -> list[dict[str, Any]]:
    """All sessions for an assignment (assignment UUID resolved by the router)."""
    return _sessions(
        session,
        _SESSION_SELECT.where(PracticeSession.assignment_id == assignment_uuid)
        .order_by(PracticeSession.started_at.desc()),
    )


def list_student_assignment_practice_sessions(
    session: Any, assignment_uuid: Any, student_uid: str
) -> list[dict[str, Any]]:
    """One student's sessions on one assignment."""
    return _sessions(
        session,
        _SESSION_SELECT.where(PracticeSession.assignment_id == assignment_uuid)
        .where(PracticeSession.student_firebase_uid == student_uid)
        .order_by(PracticeSession.started_at.desc()),
    )


def list_class_practice_sessions(session: Any, class_uuid: Any) -> list[dict[str, Any]]:
    """All sessions for a class."""
    return _sessions(
        session,
        _SESSION_SELECT.where(PracticeSession.class_id == class_uuid)
        .order_by(PracticeSession.started_at.desc()),
    )


def list_student_class_practice_sessions(
    session: Any, class_uuid: Any, student_uid: str
) -> list[dict[str, Any]]:
    """One student's sessions in a class."""
    return _sessions(
        session,
        _SESSION_SELECT.where(PracticeSession.class_id == class_uuid)
        .where(PracticeSession.student_firebase_uid == student_uid)
        .order_by(PracticeSession.started_at.desc()),
    )


# --- learning_event readers ---------------------------------------------------
#
# JOIN all four parents (incl. practice_sessions) for legacy-id inversion; ordered
# created_at ASC to match the Firestore-fed analytics (chronological replay).

_EVENT_SELECT = (
    select(
        LearningEvent,
        Organization.legacy_firestore_id,
        Class.legacy_firestore_id,
        Assignment.legacy_firestore_id,
        PracticeSession.legacy_firestore_id,
    )
    .outerjoin(Organization, Organization.id == LearningEvent.org_id)
    .outerjoin(Class, Class.id == LearningEvent.class_id)
    .outerjoin(Assignment, Assignment.id == LearningEvent.assignment_id)
    .outerjoin(PracticeSession, PracticeSession.id == LearningEvent.session_id)
)


def _events(session: Any, stmt) -> list[dict[str, Any]]:
    return [
        _serialize_event(row, org_legacy, class_legacy, assignment_legacy, session_legacy)
        for row, org_legacy, class_legacy, assignment_legacy, session_legacy
        in session.execute(stmt).all()
    ]


def _normalize_event_types(event_types: Any) -> list[str]:
    """Mirror database._normalize_string_list EXACTLY so the SQL filter is the same
    set as the Firestore reader's Python filter: a non-list (incl. a bare string or
    tuple) is NO filter; strings are stripped; blanks / non-strings dropped; deduped."""
    if not isinstance(event_types, list):
        return []
    seen: set[str] = set()
    out: list[str] = []
    for value in event_types:
        if not isinstance(value, str):
            continue
        cleaned = value.strip()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        out.append(cleaned)
    return out


def list_assignment_learning_events(
    session: Any, assignment_uuid: Any, event_types: Any = None
) -> list[dict[str, Any]]:
    """All events for an assignment, optionally filtered to `event_types` (pushed
    into SQL — the Firestore reader filters in Python; SAME result set via the shared
    normalization). Empty/non-list event_types => no filter (all events)."""
    stmt = _EVENT_SELECT.where(LearningEvent.assignment_id == assignment_uuid)
    allowed = _normalize_event_types(event_types)
    if allowed:
        stmt = stmt.where(LearningEvent.event_type.in_(allowed))
    return _events(session, stmt.order_by(LearningEvent.created_at))


def list_session_learning_events(session: Any, session_uuid: Any) -> list[dict[str, Any]]:
    """All events for one practice session (session UUID resolved by the router)."""
    return _events(
        session,
        _EVENT_SELECT.where(LearningEvent.session_id == session_uuid)
        .order_by(LearningEvent.created_at),
    )


def list_student_class_learning_events(
    session: Any, class_uuid: Any, student_uid: str
) -> list[dict[str, Any]]:
    """One student's events in a class."""
    return _events(
        session,
        _EVENT_SELECT.where(LearningEvent.class_id == class_uuid)
        .where(LearningEvent.student_firebase_uid == student_uid)
        .order_by(LearningEvent.created_at),
    )

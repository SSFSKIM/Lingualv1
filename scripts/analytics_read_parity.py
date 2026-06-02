"""Operator script: SPLIT-PASS read-parity for the analytics cutover (Slice D/E gate).

ANALYTICS_MIGRATION.md §4.5. The live ReadRouter shadow already diffs the routed list
readers by id-SET (coverage). This offline tool is the deeper FIELD-level gate the read
FLIP requires (§5 Slice E prereq), run over the WHOLE term scope (stronger than a
sampled live soak — the same posture that caught Slice A's mapping_id):

  PASS 1 — session-summary metrics (convergence target: ZERO divergence).
    Per term session, diff the Firestore `session_summary` JSONB against the PG row's.
    The class/assignment analytics aggregates (total_student_turns, rubric_dimension_
    scores, ...) are derived from this blob, so per-session equality => aggregate
    equality. Any divergence here is a serialization/dual-write bug — hard gate.

  PASS 2 — event-derived (convergence target: per-session event-COUNT parity).
    Per term session, count(Firestore learning_events) vs count(PG). Replaces the old
    events_synced_at freshness predicate (§5b.4). Shortfall = a coexistence drop
    (§5b.6) not yet reconciled; surplus = an overcount. Either fails the gate.
    Pass 2 is meaningful ONLY after DUAL_WRITE_ANALYTICS_EVENTS is live + the event
    term-backfill (scripts/backfill_learning_events_term.py) has run; until then PG
    has no events and every session reports a shortfall (expected — don't flip).

The two passes are SEPARATE gates and must not be collapsed into one threshold.

Connection: Postgres from backend.db.sql.get_engine() (DATABASE_URL or
INSTANCE_CONNECTION_NAME + DB_* + DB_IAM_AUTH). Firestore via ADC. Read-only.

Usage:
  python3 -m scripts.analytics_read_parity --pass1 --term-start 2026-01-01
  python3 -m scripts.analytics_read_parity --pass2 --term-start 2026-01-01
  python3 -m scripts.analytics_read_parity --all   --term-start 2026-01-01
"""

from __future__ import annotations

import argparse
import datetime
import json
import logging
import sys
from typing import Any

logger = logging.getLogger('analytics_read_parity')


def _parse_term_start(value: str) -> datetime.datetime:
    dt = datetime.datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt


def _get_firestore_client():
    import firebase_admin
    from firebase_admin import firestore

    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    return firestore.client()


def _make_session():
    from sqlalchemy.orm import Session

    from backend.db.sql import get_engine, sql_enabled

    if not sql_enabled():
        raise SystemExit(
            'No Postgres target configured. Set DATABASE_URL (local) or '
            'INSTANCE_CONNECTION_NAME + DB_USER + DB_NAME (Cloud SQL).'
        )
    return Session(get_engine())


def _print_report(title: str, payload: dict) -> None:
    print(f'\n=== {title} ===')
    print(json.dumps(payload, indent=2, default=str))


def _term_sessions(db, term_start: datetime.datetime) -> dict[str, dict]:
    """Firestore practice_session docs (started_at >= term_start), keyed by id."""
    out: dict[str, dict] = {}
    for snap in (
        db.collection('practice_sessions').where('started_at', '>=', term_start).stream()
    ):
        out[snap.id] = snap.to_dict() or {}
    logger.info('term sessions (started_at >= %s): %d', term_start.date(), len(out))
    return out


def _pg_term_session_summaries(pg_session, term_start: datetime.datetime) -> dict[str, Any]:
    """PG practice_session (legacy_firestore_id -> session_summary) for the term.

    Scoped by the SAME predicate as the Firestore side (started_at >= term_start), so
    the id-set diff catches a PG-ONLY session (extra), not just a PG shortfall — a
    one-sided `legacy_firestore_id IN (firestore ids)` query would hide a surplus and
    let the gate false-pass (the same surplus footgun fixed in the Slice C backfill parity)."""
    from sqlalchemy import select

    from backend.db.models.practice import PracticeSession

    return {
        legacy: summary
        for legacy, summary in pg_session.execute(
            select(PracticeSession.legacy_firestore_id, PracticeSession.session_summary)
            .where(PracticeSession.started_at >= term_start)
        ).all()
    }


def _pass1(db, pg_session, term_start: datetime.datetime) -> dict:
    """Per-session session_summary field diff (Firestore vs PG). Zero-divergence gate.

    in_sync requires the id-sets to MATCH (no missing AND no extra) and every shared
    session's session_summary to be field-equal."""
    from backend.db.read_router import _diff_dict

    fs_sessions = _term_sessions(db, term_start)
    pg_summaries = _pg_term_session_summaries(pg_session, term_start)

    missing_in_pg = sorted(set(fs_sessions) - set(pg_summaries))
    extra_in_pg = sorted(set(pg_summaries) - set(fs_sessions))
    mismatched: list[dict] = []
    for sid in set(fs_sessions) & set(pg_summaries):
        # Clock-skew/derived noise is not part of session_summary; compare the blob whole.
        diff = _diff_dict(
            fs_sessions[sid].get('session_summary') or {}, pg_summaries[sid] or {}, frozenset()
        )
        if diff:
            mismatched.append({'session': sid, 'diff': diff})

    report = {
        'firestore_sessions': len(fs_sessions),
        'postgres_sessions': len(pg_summaries),
        'compared': len(set(fs_sessions) & set(pg_summaries)),
        'missing_in_postgres': missing_in_pg[:50],
        'missing_in_postgres_total': len(missing_in_pg),
        'extra_in_postgres': extra_in_pg[:50],
        'extra_in_postgres_total': len(extra_in_pg),
        'summary_mismatched': mismatched[:50],
        'summary_mismatched_total': len(mismatched),
        'in_sync': not missing_in_pg and not extra_in_pg and not mismatched,
    }
    _print_report('PASS 1 — session_summary parity (zero-divergence gate)', report)
    return report


def _pass2(db, pg_session, term_start: datetime.datetime) -> dict:
    """Per-session event COUNT parity (Firestore vs PG). Strict equality gate.

    Counts over the UNION of term sessions on both sides, so a PG-only session's
    events surface as a surplus (not silently dropped by a Firestore-keyed query)."""
    from sqlalchemy import func, select

    from backend.db.models.practice import LearningEvent, PracticeSession

    fs_sessions = _term_sessions(db, term_start)
    pg_counts = {
        sid: int(cnt)
        for sid, cnt in pg_session.execute(
            select(PracticeSession.legacy_firestore_id, func.count(LearningEvent.id))
            .join(LearningEvent, LearningEvent.session_id == PracticeSession.id)
            .where(PracticeSession.started_at >= term_start)
            .group_by(PracticeSession.legacy_firestore_id)
        ).all()
    }

    short: list[dict] = []
    surplus: list[dict] = []
    fs_total = 0
    for sid in set(fs_sessions) | set(pg_counts):
        fs_n = (
            sum(1 for _ in db.collection('learning_events').where('session_id', '==', sid).stream())
            if sid in fs_sessions else 0
        )
        fs_total += fs_n
        pg_n = pg_counts.get(sid, 0)
        if pg_n < fs_n:
            short.append({'session': sid, 'firestore': fs_n, 'postgres': pg_n})
        elif pg_n > fs_n:
            surplus.append({'session': sid, 'firestore': fs_n, 'postgres': pg_n})

    report = {
        'firestore_sessions': len(fs_sessions),
        'postgres_sessions': len(pg_counts),
        'firestore_event_total': fs_total,
        'postgres_event_total': sum(pg_counts.values()),
        'sessions_short_in_postgres': short[:50],
        'sessions_short_total': len(short),
        'sessions_surplus_in_postgres': surplus[:50],
        'sessions_surplus_total': len(surplus),
        'in_sync': not short and not surplus,
    }
    _print_report('PASS 2 — per-session event COUNT parity (strict equality gate)', report)
    return report


def run(mode: str, term_start: datetime.datetime) -> int:
    db = _get_firestore_client()
    pg_session = _make_session()
    try:
        ok = True
        if mode in ('pass1', 'all'):
            ok = _pass1(db, pg_session, term_start)['in_sync'] and ok
        if mode in ('pass2', 'all'):
            ok = _pass2(db, pg_session, term_start)['in_sync'] and ok
        return 0 if ok else 1
    finally:
        pg_session.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--pass1', action='store_true', help='session_summary field parity')
    group.add_argument('--pass2', action='store_true', help='per-session event COUNT parity')
    group.add_argument('--all', action='store_true', help='both passes')
    parser.add_argument(
        '--term-start',
        required=True,
        help='ISO date (YYYY-MM-DD): scope to sessions with started_at >= this date',
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format='[analytics_parity] %(message)s')
    term_start = _parse_term_start(args.term_start)
    mode = 'pass1' if args.pass1 else 'pass2' if args.pass2 else 'all'
    return run(mode, term_start)


if __name__ == '__main__':
    sys.exit(main())

"""Operator script: TERM-SCOPE backfill of learning_events Firestore -> Postgres.

MANDATORY before/alongside enabling DUAL_WRITE_ANALYTICS_EVENTS=1 (ANALYTICS_MIGRATION
§3.1/§3.3/§5b.4/§5b.6). The live per-turn shadow (shadow_write_turn) is fail-open and
silently drops events whenever a parent is unresolved or PG is briefly unhealthy
(§5b.6); the term-scope backfill + the per-session COUNT-parity gate (§3.4/§4.5 Pass 2)
is what makes PG complete before Firestore writes retire (Slice E).

Scope: learning_events whose SESSION is in the active term (sessions with
started_at >= --term-start). Run AFTER the chain backfill (Slice A assignments) and
scripts/backfill_practice_sessions_term.py (Slice B) so all four event FK parents
(org/class/assignment/session) resolve.

§3.3 PERFORMANCE CONTRACT — chunked bulk INSERT, NOT a SAVEPOINT-per-row loop. Events
are high-volume (hundreds per session); a per-row SAVEPOINT (3 pg8000 round-trips/row)
is explicitly prohibited here. Each chunk is ONE multi-row
`insert(LearningEvent).values([...]).on_conflict_do_nothing(index_elements=
['legacy_firestore_id'])` — genuinely idempotent, re-runnable.

§3.4/§4.5 PARITY — per-session COUNT diff, never a 600k-row id-set diff: for each term
session compare count(Firestore events) vs count(PG events). `in_sync` requires STRICT
per-session equality — a shortfall (PG<FS, a coexistence drop) AND a surplus (PG>FS, an
overcount) both fail the gate (the read-flip predicate is count(PG)==count(Firestore)).

Connection: Postgres from `backend.db.sql.get_engine()` (set DATABASE_URL or
INSTANCE_CONNECTION_NAME + DB_* + DB_IAM_AUTH). Firestore via ADC.

Usage:
  python3 -m scripts.backfill_learning_events_term --dry-run --term-start 2026-01-01
  python3 -m scripts.backfill_learning_events_term --write   --term-start 2026-01-01
  python3 -m scripts.backfill_learning_events_term --parity  --term-start 2026-01-01
"""

from __future__ import annotations

import argparse
import datetime
import json
import logging
import sys

logger = logging.getLogger('backfill_learning_events')

_CHUNK_SIZE = 2000


def _parse_term_start(value: str) -> datetime.datetime:
    """ISO date/datetime -> tz-aware UTC datetime (session started_at >= this)."""
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


def _term_session_ids(db, term_start: datetime.datetime) -> list[str]:
    """Firestore practice_session ids with started_at >= term_start (the event scope)."""
    ids = [
        snap.id
        for snap in db.collection('practice_sessions')
        .where('started_at', '>=', term_start)
        .stream()
    ]
    logger.info('term sessions (started_at >= %s): %d', term_start.date(), len(ids))
    return ids


def _events_for_session(db, session_id: str) -> list[dict]:
    """All learning_event docs for one session, each carrying its Firestore id.

    Scoped per-session (not a created_at sweep) so the parity COUNT compares PG and
    Firestore over exactly the same set — at beta this is a handful of point queries.
    """
    events: list[dict] = []
    for snap in (
        db.collection('learning_events').where('session_id', '==', session_id).stream()
    ):
        data = snap.to_dict() or {}
        data['id'] = snap.id
        events.append(data)
    return events


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


def _resolve_cached(pg_session, cache: dict, model, firestore_id):
    """resolve_legacy_id memoized per (model, firestore_id) — the 4 parents repeat
    across every event of a session, so resolve each distinct id once."""
    from backend.db.repository.resolution import resolve_legacy_id

    if not firestore_id:
        return None
    if firestore_id not in cache:
        cache[firestore_id] = resolve_legacy_id(pg_session, model, firestore_id)
    return cache[firestore_id]


def _build_rows(pg_session, events: list[dict], stats: dict) -> list[dict]:
    """Resolve FK parents (cached) and shape each event into a LearningEvent row.

    Events missing a Firestore id (can't dedupe) or with any unresolved parent are
    recorded under `errors` and skipped — the operator must run the sessions / Slice A
    backfill first if parents don't resolve.
    """
    from backend.db.models.assignment import Assignment
    from backend.db.models.org import Class, Organization
    from backend.db.models.practice import PracticeSession
    from backend.db.repository.normalization import coerce_jsonb

    caches: dict = {Organization: {}, Class: {}, Assignment: {}, PracticeSession: {}}
    rows: list[dict] = []
    for e in events:
        eid = e.get('id')
        if not eid:
            stats['errors'].append({'id': None, 'error': 'event missing Firestore id'})
            continue
        org_uuid = _resolve_cached(pg_session, caches[Organization], Organization, e.get('org_id'))
        class_uuid = _resolve_cached(pg_session, caches[Class], Class, e.get('class_id'))
        asg_uuid = _resolve_cached(pg_session, caches[Assignment], Assignment, e.get('assignment_id'))
        sess_uuid = _resolve_cached(
            pg_session, caches[PracticeSession], PracticeSession, e.get('session_id')
        )
        if None in (org_uuid, class_uuid, asg_uuid, sess_uuid):
            stats['errors'].append({
                'id': eid,
                'error': 'unresolved parent (run sessions backfill + Slice A first)',
            })
            continue
        rows.append({
            'legacy_firestore_id': eid,
            'org_id': org_uuid,
            'class_id': class_uuid,
            'assignment_id': asg_uuid,
            'session_id': sess_uuid,
            # Rename (not an FK): Firestore student_uid -> student_firebase_uid.
            'student_firebase_uid': e.get('student_uid') or '',
            'event_type': e.get('event_type'),
            'turn_index': e.get('turn_index'),
            'payload': coerce_jsonb(e.get('payload'), default={}),
            'created_at': e.get('created_at'),
        })
    return rows


def run(mode: str, term_start: datetime.datetime) -> int:
    from sqlalchemy import func, select
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    from backend.db.models.practice import LearningEvent, PracticeSession
    from backend.db.repository import backfill

    db = _get_firestore_client()
    session_ids = _term_session_ids(db, term_start)

    pg_session = _make_session()
    try:
        if mode == 'parity':
            # §3.4 / §4.5 per-session COUNT diff (NOT an id-set diff). The read-flip
            # predicate is STRICT per-session equality count(PG)==count(Firestore), so
            # BOTH a shortfall (PG < FS, a coexistence drop) AND a surplus (PG > FS, an
            # overcount → analytics would over-report) fail the gate. Unlike the Slice B
            # SESSIONS parity (whole-table PG vs term-scoped Firestore, where forward
            # dual-write legitimately adds out-of-scope PG rows), this counts the SAME
            # per-session scope on both sides, so a per-session surplus is a real divergence.
            pg_counts = {
                sid: int(cnt)
                for sid, cnt in pg_session.execute(
                    select(PracticeSession.legacy_firestore_id, func.count(LearningEvent.id))
                    .join(LearningEvent, LearningEvent.session_id == PracticeSession.id)
                    .where(PracticeSession.legacy_firestore_id.in_(session_ids))
                    .group_by(PracticeSession.legacy_firestore_id)
                ).all()
            }
            short: list[dict] = []
            surplus: list[dict] = []
            fs_total = 0
            for sid in session_ids:
                fs_n = len(_events_for_session(db, sid))
                fs_total += fs_n
                pg_n = pg_counts.get(sid, 0)
                if pg_n < fs_n:
                    short.append({'session': sid, 'firestore': fs_n, 'postgres': pg_n})
                elif pg_n > fs_n:
                    surplus.append({'session': sid, 'firestore': fs_n, 'postgres': pg_n})
            report = {
                'sessions': len(session_ids),
                'firestore_event_total': fs_total,
                'postgres_event_total': sum(pg_counts.values()),
                'sessions_short_in_postgres': short[:50],
                'sessions_short_total': len(short),
                'sessions_surplus_in_postgres': surplus[:50],
                'sessions_surplus_total': len(surplus),
                # Strict equality gate (§4.5 Pass 2): no session may diverge in EITHER
                # direction. Shortfall = coexistence drop; surplus = overcount.
                'in_sync': not short and not surplus,
            }
            _print_report('parity (per-session event COUNT)', report)
            return 0 if (not short and not surplus) else 1

        # dry-run / write: read every term session's events, resolve, chunk-insert.
        dry_run = mode == 'dry-run'
        # Keys must match backfill._empty_stats() — finish_import_run reads them.
        stats: dict = {'inserted': 0, 'updated': 0, 'skipped': 0, 'errors': [], 'warnings': []}

        all_events: list[dict] = []
        for sid in session_ids:
            all_events.extend(_events_for_session(db, sid))
        logger.info('read %d learning_event docs across %d sessions', len(all_events), len(session_ids))

        rows = _build_rows(pg_session, all_events, stats)

        if dry_run:
            # No writes: report would-be inserts (can't tell insert vs already-present
            # without touching the DB, so this is the upper bound the --write run dedupes).
            stats['inserted'] = len(rows)
            pg_session.rollback()
            _print_report('dry-run (no writes)', stats)
            return 0

        run_row = backfill.start_import_run(
            pg_session, source=f'learning_events_term:{term_start.date()}'
        )
        for i in range(0, len(rows), _CHUNK_SIZE):
            chunk = rows[i:i + _CHUNK_SIZE]
            result = pg_session.execute(
                pg_insert(LearningEvent)
                .values(chunk)
                .on_conflict_do_nothing(index_elements=['legacy_firestore_id'])
            )
            # rowcount = rows actually inserted this chunk; the rest already existed
            # (ON CONFLICT DO NOTHING). Fall back to the chunk size if the driver
            # reports -1/None for the count.
            rowcount = getattr(result, 'rowcount', None)
            stats['inserted'] += rowcount if isinstance(rowcount, int) and rowcount >= 0 else len(chunk)
        stats['skipped'] = len(rows) - stats['inserted']  # already-present (ON CONFLICT)

        backfill.finish_import_run(
            pg_session,
            run_row,
            {'learning_events': stats},
            finished_at=datetime.datetime.now(datetime.UTC),
        )
        pg_session.commit()
        _print_report('write (committed)', stats)
        return 1 if stats['errors'] else 0
    except Exception:
        pg_session.rollback()
        raise
    finally:
        pg_session.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--dry-run', action='store_true', help='report would-be result; no writes')
    group.add_argument('--write', action='store_true', help='chunked bulk insert + commit + ledger')
    group.add_argument('--parity', action='store_true', help='per-session event COUNT diff')
    parser.add_argument(
        '--term-start',
        required=True,
        help='ISO date (YYYY-MM-DD): include events of sessions with started_at >= this date',
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format='[backfill_events] %(message)s')
    term_start = _parse_term_start(args.term_start)
    mode = 'dry-run' if args.dry_run else 'write' if args.write else 'parity'
    return run(mode, term_start)


if __name__ == '__main__':
    sys.exit(main())

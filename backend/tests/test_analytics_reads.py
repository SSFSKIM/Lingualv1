"""Tier 1 (no DB): analytics read adapters + router gating (Slice D).

Verifies the practice_session / learning_event serializers' Firestore shape (FK
legacy-id inversion + student_firebase_uid->student_uid rename, full doc shape) and
the §4.4 two-flag routing (sessions also-gate on READ_PG_ASSIGNMENTS, events on
READ_PG_ANALYTICS_SESSIONS; the WEAKER mode wins), fail-open, and _FALLBACK on an
unresolved parent. The PG Session is stubbed so no engine is needed.
"""

import datetime
import os
import types
import unittest
import uuid
from unittest import mock

from backend.db import read_router
from backend.db.read_router import ReadRouter
from backend.db.repository import analytics_reads


# --- row + session fakes ------------------------------------------------------

def _make_session_row(**o):
    r = types.SimpleNamespace()
    r.id = o.get('id', uuid.uuid4())
    r.legacy_firestore_id = o.get('legacy_firestore_id', 'sess-1')
    r.student_firebase_uid = o.get('student_firebase_uid', 'stu-1')
    for k in ('mapping_snapshot', 'assignment_snapshot', 'curriculum_snapshot',
              'pedagogy_snapshot', 'class_snapshot', 'transcript_ref', 'cost_summary',
              'session_summary', 'analysis_state'):
        setattr(r, k, o.get(k, {}))
    r.modality = o.get('modality', 'hybrid')
    r.voice_enabled = o.get('voice_enabled', False)
    r.text_enabled = o.get('text_enabled', True)
    r.status = o.get('status', 'active')
    r.started_at = o.get('started_at', datetime.datetime(2026, 5, 1))
    r.ended_at = o.get('ended_at', None)
    r.prompt_version = o.get('prompt_version', 'v1')
    r.system_prompt_preview = o.get('system_prompt_preview', None)
    r.teacher_preview = o.get('teacher_preview', False)
    r.ui_language = o.get('ui_language', 'en')
    r.org_status_when_created = o.get('org_status_when_created', 'active')
    r.created_at = o.get('created_at', datetime.datetime(2026, 5, 1))
    r.updated_at = o.get('updated_at', datetime.datetime(2026, 5, 1))
    return r


def _make_event_row(**o):
    r = types.SimpleNamespace()
    r.id = o.get('id', uuid.uuid4())
    r.legacy_firestore_id = o.get('legacy_firestore_id', 'ev-1')
    r.student_firebase_uid = o.get('student_firebase_uid', 'stu-1')
    r.event_type = o.get('event_type', 'student.turn')
    r.turn_index = o.get('turn_index', 3)
    r.payload = o.get('payload', {'k': 'v'})
    r.created_at = o.get('created_at', datetime.datetime(2026, 5, 1))
    return r


class _SeqResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None


class _SeqSession:
    """Returns queued results in order, one per execute()."""

    def __init__(self, *results):
        self._results = list(results)

    def execute(self, _stmt):
        return self._results.pop(0)


# --- serializers --------------------------------------------------------------

class TestSessionSerializer(unittest.TestCase):
    def test_inverts_fks_to_legacy_ids_and_renames_uid(self):
        out = analytics_reads._serialize_session(
            _make_session_row(legacy_firestore_id='sess-9', student_firebase_uid='stu-9'),
            'org-fs', 'cls-fs', 'asg-fs')
        self.assertEqual(out['id'], 'sess-9')
        self.assertEqual(out['org_id'], 'org-fs')          # legacy id, not UUID
        self.assertEqual(out['class_id'], 'cls-fs')
        self.assertEqual(out['assignment_id'], 'asg-fs')
        self.assertEqual(out['student_uid'], 'stu-9')       # renamed back from student_firebase_uid
        self.assertNotIn('student_firebase_uid', out)
        # full doc shape the analytics layer reads:
        for k in ('session_summary', 'cost_summary', 'analysis_state', 'status',
                  'started_at', 'modality', 'curriculum_snapshot', 'teacher_preview'):
            self.assertIn(k, out)

    def test_list_reader_serializes_each_row(self):
        rows = [
            (_make_session_row(legacy_firestore_id='s1'), 'o', 'c', 'a'),
            (_make_session_row(legacy_firestore_id='s2'), 'o', 'c', 'a'),
        ]
        out = analytics_reads.list_assignment_practice_sessions(
            _SeqSession(_SeqResult(rows)), uuid.uuid4())
        self.assertEqual([r['id'] for r in out], ['s1', 's2'])
        self.assertEqual(out[0]['assignment_id'], 'a')


class TestEventSerializer(unittest.TestCase):
    def test_inverts_fks_incl_session_and_renames_uid(self):
        out = analytics_reads._serialize_event(
            _make_event_row(legacy_firestore_id='ev-9', student_firebase_uid='stu-9'),
            'org-fs', 'cls-fs', 'asg-fs', 'sess-fs')
        self.assertEqual(out['id'], 'ev-9')
        self.assertEqual(out['org_id'], 'org-fs')
        self.assertEqual(out['class_id'], 'cls-fs')
        self.assertEqual(out['assignment_id'], 'asg-fs')
        self.assertEqual(out['session_id'], 'sess-fs')      # session FK -> legacy id
        self.assertEqual(out['student_uid'], 'stu-9')
        self.assertEqual(out['event_type'], 'student.turn')
        self.assertEqual(out['turn_index'], 3)
        self.assertEqual(out['payload'], {'k': 'v'})

    def test_list_reader_serializes_each_row(self):
        rows = [
            (_make_event_row(legacy_firestore_id='e1'), 'o', 'c', 'a', 's'),
            (_make_event_row(legacy_firestore_id='e2'), 'o', 'c', 'a', 's'),
        ]
        out = analytics_reads.list_session_learning_events(
            _SeqSession(_SeqResult(rows)), uuid.uuid4())
        self.assertEqual([r['id'] for r in out], ['e1', 'e2'])
        self.assertEqual(out[0]['session_id'], 's')


# --- routing (§4.4 two-flag weaker-mode gate) ---------------------------------

class TestAnalyticsRouting(unittest.TestCase):
    _FLAGS = ('READ_PG_ANALYTICS_SESSIONS', 'READ_PG_ANALYTICS_EVENTS',
              'READ_PG_ASSIGNMENTS')

    def setUp(self):
        for f in self._FLAGS:
            os.environ.pop(f, None)
        self.addCleanup(lambda: [os.environ.pop(f, None) for f in self._FLAGS])
        read_router._shadow_stats.clear()
        self.addCleanup(read_router._shadow_stats.clear)

    def _fs(self):
        return types.SimpleNamespace(
            get_practice_session=lambda sid: {'id': 's-fs', 'sid': sid},
            list_assignment_practice_sessions=lambda aid: [{'id': 's-fs'}],
            list_student_assignment_practice_sessions=lambda aid, uid: [{'id': 's-fs', 'u': uid}],
            list_class_practice_sessions=lambda cid: [{'id': 's-fs'}],
            list_student_class_practice_sessions=lambda cid, uid: [{'id': 's-fs', 'u': uid}],
            list_assignment_learning_events=lambda aid, et=None: [{'id': 'e-fs', 'et': et}],
            list_session_learning_events=lambda sid: [{'id': 'e-fs'}],
            list_student_class_learning_events=lambda cid, uid: [{'id': 'e-fs', 'u': uid}],
        )

    def test_passthrough_when_all_flags_off(self):
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        self.assertEqual(router.list_assignment_practice_sessions('a1')[0]['id'], 's-fs')
        self.assertEqual(router.list_student_class_practice_sessions('c1', 'u1')[0]['u'], 'u1')
        self.assertEqual(router.list_assignment_learning_events('a1')[0]['id'], 'e-fs')
        self.assertEqual(router.list_session_learning_events('s1')[0]['id'], 'e-fs')

    def test_session_reader_serves_pg_when_both_flags_one(self):
        os.environ['READ_PG_ANALYTICS_SESSIONS'] = '1'
        os.environ['READ_PG_ASSIGNMENTS'] = '1'
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        with mock.patch.object(ReadRouter, '_pg_read', lambda self, pc, eng: [{'id': 's-pg'}]):
            self.assertEqual(router.list_class_practice_sessions('c1'), [{'id': 's-pg'}])

    def test_get_practice_session_passthrough_when_flags_off(self):
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        self.assertEqual(router.get_practice_session('s1')['sid'], 's1')

    def test_get_practice_session_serves_pg_when_flags_one(self):
        os.environ['READ_PG_ANALYTICS_SESSIONS'] = '1'
        os.environ['READ_PG_ASSIGNMENTS'] = '1'
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        with mock.patch.object(ReadRouter, '_pg_read', lambda self, pc, eng: {'id': 's-pg'}):
            self.assertEqual(router.get_practice_session('s1'), {'id': 's-pg'})

    def test_get_practice_session_fallback_to_firestore_when_pg_absent(self):
        # PG point-get returns None (session not in PG) -> _FALLBACK -> Firestore, NOT an
        # authoritative None/404 (would block the session-create read-back).
        os.environ['READ_PG_ANALYTICS_SESSIONS'] = '1'
        os.environ['READ_PG_ASSIGNMENTS'] = '1'
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        with mock.patch.object(ReadRouter, '_pg_read', lambda self, pc, eng: pc('SESSION')), \
                mock.patch('backend.db.repository.analytics_reads.get_practice_session',
                           return_value=None):
            out = router.get_practice_session('s1')
        self.assertEqual(out['id'], 's-fs')  # fell open

    def test_session_reader_weaker_flag_gates_to_firestore(self):
        # SESSIONS=1 but the also-gate ASSIGNMENTS is OFF -> weaker=off -> Firestore,
        # PG never touched (the §4.4 dependency: a session read inverts assignment_id).
        os.environ['READ_PG_ANALYTICS_SESSIONS'] = '1'  # ASSIGNMENTS left OFF
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        pg_called = []
        with mock.patch.object(ReadRouter, '_pg_read',
                               lambda self, pc, eng: pg_called.append(1) or [{'id': 's-pg'}]):
            out = router.list_assignment_practice_sessions('a1')
        self.assertEqual(out[0]['id'], 's-fs')
        self.assertEqual(pg_called, [])

    def test_session_reader_shadow_when_weaker_is_shadow(self):
        # weaker of (shadow, '1') is shadow -> Firestore authoritative + a PG compare.
        os.environ['READ_PG_ANALYTICS_SESSIONS'] = 'shadow'
        os.environ['READ_PG_ASSIGNMENTS'] = '1'
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        with mock.patch.object(ReadRouter, '_pg_read', lambda self, pc, eng: [{'id': 's-pg'}]):
            out = router.list_class_practice_sessions('c1')
        self.assertEqual(out[0]['id'], 's-fs')                      # Firestore still authoritative
        self.assertEqual(read_router._shadow_stats['READ_PG_ANALYTICS_SESSIONS'][0], 1)

    def test_event_reader_serves_pg_when_both_flags_one(self):
        # Event gate is the weaker of EVENTS, SESSIONS, AND ASSIGNMENTS (transitive
        # rollback safety) — all three must be '1' to serve PG.
        os.environ['READ_PG_ANALYTICS_EVENTS'] = '1'
        os.environ['READ_PG_ANALYTICS_SESSIONS'] = '1'
        os.environ['READ_PG_ASSIGNMENTS'] = '1'
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        with mock.patch.object(ReadRouter, '_pg_read', lambda self, pc, eng: [{'id': 'e-pg'}]):
            self.assertEqual(router.list_session_learning_events('s1'), [{'id': 'e-pg'}])

    def test_event_reader_gates_off_when_sessions_off(self):
        # EVENTS=1 but the upstream SESSIONS is OFF -> weaker=off -> Firestore. This is
        # the dormant-until-Slice-C guarantee: events can't serve PG before sessions do.
        os.environ['READ_PG_ANALYTICS_EVENTS'] = '1'
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        pg_called = []
        with mock.patch.object(ReadRouter, '_pg_read',
                               lambda self, pc, eng: pg_called.append(1) or [{'id': 'e-pg'}]):
            out = router.list_student_class_learning_events('c1', 'u1')
        self.assertEqual(out[0]['id'], 'e-fs')
        self.assertEqual(pg_called, [])

    def test_event_reader_gates_off_when_assignments_rolled_back(self):
        # EVENTS=1 + SESSIONS=1 but ASSIGNMENTS off -> transitive weaker gate = off ->
        # Firestore (the rollback-ordering safety: events never serve PG in a mixed-
        # store request when an upstream family is rolled back).
        os.environ['READ_PG_ANALYTICS_EVENTS'] = '1'
        os.environ['READ_PG_ANALYTICS_SESSIONS'] = '1'  # ASSIGNMENTS left OFF
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        pg_called = []
        with mock.patch.object(ReadRouter, '_pg_read',
                               lambda self, pc, eng: pg_called.append(1) or [{'id': 'e-pg'}]):
            out = router.list_assignment_learning_events('a1')
        self.assertEqual(out[0]['id'], 'e-fs')
        self.assertEqual(pg_called, [])

    def test_unresolved_parent_falls_open_to_firestore(self):
        # pg_call resolves the parent legacy->uuid; None -> _FALLBACK -> Firestore (not
        # an authoritative empty list that would blank a teacher's analytics).
        os.environ['READ_PG_ANALYTICS_SESSIONS'] = '1'
        os.environ['READ_PG_ASSIGNMENTS'] = '1'
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        # _pg_read runs the pg_call against a session whose resolve returns None.
        with mock.patch.object(ReadRouter, '_pg_read',
                               lambda self, pc, eng: pc(_SeqSession(_SeqResult([])))):
            out = router.list_assignment_practice_sessions('ghost-assignment')
        self.assertEqual(out[0]['id'], 's-fs')

    def test_event_type_filter_passed_through(self):
        os.environ['READ_PG_ANALYTICS_EVENTS'] = '1'
        os.environ['READ_PG_ANALYTICS_SESSIONS'] = '1'
        os.environ['READ_PG_ASSIGNMENTS'] = '1'
        router = ReadRouter(self._fs(), sql_engine=lambda: object())
        seen = {}

        def fake_pg_read(self, pc, eng):
            # Drive the pg_call with a stub whose resolve returns a uuid, then a row set;
            # capture that the adapter received the event_types filter via the fs mirror.
            return pc(_SeqSession(_SeqResult([uuid.uuid4()]), _SeqResult([])))

        with mock.patch.object(ReadRouter, '_pg_read', fake_pg_read):
            out = router.list_assignment_learning_events('a1', ['metric.context_tag_signal'])
        # PG side returned [] (empty rowset) authoritatively -> not _FALLBACK, served as PG.
        self.assertEqual(out, [])


if __name__ == '__main__':
    unittest.main()

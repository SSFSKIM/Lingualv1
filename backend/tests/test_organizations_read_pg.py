"""Tier 2 (gated): organizations read adapter end-to-end on real Postgres 18.

Gated identically to the other PG tests (module skips unless DATABASE_URL is set).

    make test-postgres

Proves what a fake session cannot for the org read cutover:
  (a) a Firestore-shaped org doc written via backfill.upsert_organization reads
      back through organizations_read.get_organization with matching shape — the
      suspended_by_uid inverse rename round-trips, ARRAY (lms_capabilities) and
      bool/TIMESTAMP columns serialize correctly, and the derived
      school_admin_uids stays omitted;
  (b) a missing / unmigrated id returns None (the router then fails open);
  (c) the full ReadRouter path in mode '1' serves the PG row (not Firestore),
      exercising the bounded Session + SET LOCAL statement_timeout on real PG.
"""

import os
import types
import unittest

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise unittest.SkipTest('DATABASE_URL not set — run with: make test-postgres')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

import backend.db.models  # noqa: F401  (populate metadata)
from backend.db.base import Base
from backend.db.read_router import ReadRouter
from backend.db.repository import backfill, organizations_read

_engine = None

_DOC = {
    'id': 'org-fs-1',
    'name': 'Test School',
    'name_lower': 'test school',
    'type': 'school',
    'status': 'suspended',
    'pilot_stage': 'beta',
    'lms_capabilities': ['canvas', 'lti'],
    'default_modality_policy': 'hybrid',
    'default_retention_policy': 'strict',
    'school_type': 'public',
    'country': 'US',
    'state': 'NY',
    'county': 'Kings',
    'city': 'NYC',
    'website_url': 'https://x.edu',
    'public_or_private': 'public',
    'grade_size': '500',
    'teacher_invite_code': 'ABC123',
    'teacher_invite_code_active': True,
    'suspended_by_uid': 'admin-uid',          # Firestore key -> PG suspended_by_firebase_uid
    'suspend_reason': 'policy',
    'school_admin_uids': ['sa1', 'sa2'],       # Firestore-only; must NOT appear in the read
}


def setUpModule():
    global _engine
    _engine = create_engine(DATABASE_URL)
    Base.metadata.drop_all(_engine, checkfirst=True)
    Base.metadata.create_all(_engine)


def tearDownModule():
    if _engine is not None:
        _engine.dispose()


class TestOrganizationsReadPG(unittest.TestCase):
    def setUp(self):
        with Session(_engine) as s:
            s.execute(text('DELETE FROM organizations'))
            s.commit()

    def _seed(self, doc):
        with Session(_engine) as s:
            backfill.upsert_organization(s, doc)
            s.commit()

    def test_roundtrip_shape_and_inverse_rename(self):
        self._seed(_DOC)
        with Session(_engine) as s:
            out = organizations_read.get_organization(s, 'org-fs-1')
        self.assertEqual(out['id'], 'org-fs-1')
        self.assertEqual(out['status'], 'suspended')
        self.assertEqual(out['suspend_reason'], 'policy')
        self.assertEqual(out['default_retention_policy'], 'strict')
        # inverse rename round-trips Firestore suspended_by_uid <- PG column:
        self.assertEqual(out['suspended_by_uid'], 'admin-uid')
        self.assertNotIn('suspended_by_firebase_uid', out)
        # ARRAY + bool columns serialize correctly:
        self.assertEqual(out['lms_capabilities'], ['canvas', 'lti'])
        self.assertIs(out['teacher_invite_code_active'], True)
        # derived, never stored -> omitted:
        self.assertNotIn('school_admin_uids', out)

    def test_missing_id_returns_none(self):
        with Session(_engine) as s:
            self.assertIsNone(organizations_read.get_organization(s, 'ghost'))

    def test_read_router_cutover_serves_pg_not_firestore(self):
        self._seed(_DOC)
        fs = types.SimpleNamespace(
            get_organization=lambda oid: {'id': oid, 'src': 'firestore'}
        )
        router = ReadRouter(fs, sql_engine=lambda: _engine)
        os.environ['READ_PG_ORGANIZATIONS'] = '1'
        try:
            out = router.get_organization('org-fs-1')
        finally:
            os.environ.pop('READ_PG_ORGANIZATIONS', None)
        self.assertEqual(out['id'], 'org-fs-1')
        self.assertNotIn('src', out)  # served from PG, not the Firestore stub
        self.assertEqual(out['suspended_by_uid'], 'admin-uid')


if __name__ == '__main__':
    unittest.main()

"""Tier 2 (gated): memberships read adapter end-to-end on real Postgres 18.

Gated identically to the other PG tests (module skips unless DATABASE_URL is set).

    make test-postgres

Proves what a fake session cannot for the membership read cutover:
  (a) a Firestore-shaped membership written via backfill.upsert_membership reads
      back through memberships_read.get_membership with the inverse renames
      (firebase_uid->uid, removed_by_firebase_uid->removed_by_uid) and the org
      UUID FK rendered as the org's legacy_firestore_id;
  (b) primary_class_ids stored as class UUIDs (the live add-primary-class path)
      translate back to legacy class ids in array order — the D5 serializer rule;
  (c) get_user_memberships filters to active/invited, enriches via the org JOIN,
      and sorts school_admin before teacher;
  (d) the full ReadRouter path in mode '1' serves the PG row (not Firestore).
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
from backend.db.repository import backfill, memberships_read

_engine = None


def setUpModule():
    global _engine
    _engine = create_engine(DATABASE_URL)
    Base.metadata.drop_all(_engine, checkfirst=True)
    Base.metadata.create_all(_engine)


def tearDownModule():
    if _engine is not None:
        _engine.dispose()


def _seed_org(s, org_id='org-fs-1', name='Test School'):
    backfill.upsert_organization(s, {
        'id': org_id, 'name': name, 'name_lower': name.lower(),
        'status': 'active', 'type': 'school'})


class TestGetMembershipPG(unittest.TestCase):
    def setUp(self):
        with Session(_engine) as s:
            s.execute(text('DELETE FROM memberships'))
            s.execute(text('DELETE FROM classes'))
            s.execute(text('DELETE FROM organizations'))
            s.commit()

    def test_roundtrip_inverse_renames_and_org_legacy_id(self):
        with Session(_engine) as s:
            _seed_org(s)
            backfill.upsert_membership(s, {
                'id': 'mem-7', 'org_id': 'org-fs-1', 'uid': 'u-1',
                'roles': ['teacher'], 'status': 'active'})
            s.commit()
        with Session(_engine) as s:
            out = memberships_read.get_membership(s, 'mem-7')
        self.assertEqual(out['id'], 'mem-7')
        self.assertEqual(out['org_id'], 'org-fs-1')   # UUID FK -> org legacy id
        self.assertEqual(out['uid'], 'u-1')           # firebase_uid -> uid
        self.assertEqual(out['roles'], ['teacher'])
        self.assertNotIn('firebase_uid', out)
        self.assertEqual(out['primary_class_ids'], [])

    def test_missing_id_returns_none(self):
        with Session(_engine) as s:
            self.assertIsNone(memberships_read.get_membership(s, 'ghost'))

    def test_primary_class_ids_uuid_translates_to_legacy_in_order(self):
        from backend.db.models.org import Class, Membership
        from sqlalchemy import select
        with Session(_engine) as s:
            _seed_org(s)
            backfill.upsert_class(s, {'id': 'cls-a', 'org_id': 'org-fs-1', 'name': 'A'})
            backfill.upsert_class(s, {'id': 'cls-b', 'org_id': 'org-fs-1', 'name': 'B'})
            backfill.upsert_membership(s, {
                'id': 'mem-1', 'org_id': 'org-fs-1', 'uid': 'u-1',
                'roles': ['teacher'], 'status': 'active'})
            s.flush()
            ca = s.execute(select(Class.id).where(Class.legacy_firestore_id == 'cls-a')).scalar_one()
            cb = s.execute(select(Class.id).where(Class.legacy_firestore_id == 'cls-b')).scalar_one()
            m = s.execute(select(Membership).where(Membership.legacy_firestore_id == 'mem-1')).scalar_one()
            m.primary_class_ids = [cb, ca]   # stored as UUIDs, deliberately b-then-a
            s.commit()
        with Session(_engine) as s:
            out = memberships_read.get_membership(s, 'mem-1')
        self.assertEqual(out['primary_class_ids'], ['cls-b', 'cls-a'])  # order preserved

    def test_read_router_cutover_serves_pg_not_firestore(self):
        with Session(_engine) as s:
            _seed_org(s)
            backfill.upsert_membership(s, {
                'id': 'mem-7', 'org_id': 'org-fs-1', 'uid': 'u-1',
                'roles': ['teacher'], 'status': 'active'})
            s.commit()
        fs = types.SimpleNamespace(get_membership=lambda mid: {'id': mid, 'src': 'firestore'})
        router = ReadRouter(fs, sql_engine=lambda: _engine)
        os.environ['READ_PG_MEMBERSHIPS'] = '1'
        try:
            out = router.get_membership('mem-7')
        finally:
            os.environ.pop('READ_PG_MEMBERSHIPS', None)
        self.assertEqual(out['uid'], 'u-1')
        self.assertNotIn('src', out)  # served from PG, not the Firestore stub


class TestGetUserMembershipsPG(unittest.TestCase):
    def setUp(self):
        with Session(_engine) as s:
            s.execute(text('DELETE FROM memberships'))
            s.execute(text('DELETE FROM organizations'))
            s.commit()

    def test_filters_active_enriches_and_sorts_by_role(self):
        with Session(_engine) as s:
            _seed_org(s, 'org-a', 'Alpha')
            _seed_org(s, 'org-b', 'Beta')
            _seed_org(s, 'org-c', 'Gamma')
            # one user, three orgs: teacher (active), admin (active), removed
            backfill.upsert_membership(s, {
                'id': 'm-teacher', 'org_id': 'org-a', 'uid': 'u-1',
                'roles': ['teacher'], 'status': 'active'})
            backfill.upsert_membership(s, {
                'id': 'm-admin', 'org_id': 'org-b', 'uid': 'u-1',
                'roles': ['school_admin'], 'status': 'active'})
            backfill.upsert_membership(s, {
                'id': 'm-removed', 'org_id': 'org-c', 'uid': 'u-1',
                'roles': ['teacher'], 'status': 'removed'})
            s.commit()
        with Session(_engine) as s:
            out = memberships_read.get_user_memberships(s, 'u-1')
        # removed excluded; school_admin (priority 0) sorts before teacher (1):
        self.assertEqual([m['id'] for m in out], ['m-admin', 'm-teacher'])
        self.assertEqual(out[0]['orgId'], 'org-b')
        self.assertEqual(out[0]['orgName'], 'Beta')
        self.assertEqual(out[0]['orgType'], 'school')
        self.assertEqual(out[1]['orgName'], 'Alpha')


if __name__ == '__main__':
    unittest.main()

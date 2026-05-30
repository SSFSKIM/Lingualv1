"""Tier 2 (gated): parent-chain dual-write end-to-end on real Postgres 18 (slice 2c-1).

Gated identically to the other PG tests (module skips unless DATABASE_URL is set).

    make test-postgres

Proves what a fake session cannot for the ORGANIZATION shadow:
  (a) a create lands the row keyed by legacy_firestore_id with correct flat columns,
  (b) the create is idempotent (no duplicate on re-run),
  (c) suspend -> restore round-trips status + the suspension fields through the
      targeted UPDATE without clobbering name/type, and
  (d) suspending an org not present in Postgres is a quiet no-op (fail-open).
"""

import os
import unittest

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise unittest.SkipTest('DATABASE_URL not set — run with: make test-postgres')

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

import backend.db.models  # noqa: F401  (populate metadata)
from backend.db import dual_write_school_chain as sc
from backend.db.base import Base
from backend.db.models.org import Organization

_engine = None
FLAG = 'DUAL_WRITE_SCHOOL_CHAIN'


def setUpModule():
    global _engine
    _engine = create_engine(DATABASE_URL)
    Base.metadata.drop_all(_engine, checkfirst=True)
    Base.metadata.create_all(_engine)


def tearDownModule():
    if _engine is not None:
        Base.metadata.drop_all(_engine, checkfirst=True)
        _engine.dispose()


def _org_data(name='Springfield High', status='active'):
    # Mirrors what database.create_organization builds (minus the SERVER_TIMESTAMP
    # sentinels, which the shadow strips and upsert_organization ignores anyway).
    return {
        'name': name,
        'name_lower': name.strip().lower(),
        'type': 'school',
        'status': status,
        'pilot_stage': 'beta',
        'default_modality_policy': 'hybrid',
        'default_retention_policy': 'standard_school',
        'lms_capabilities': [],
    }


class TestOrgShadowEndToEnd(unittest.TestCase):
    def setUp(self):
        self._orig = os.environ.get(FLAG)
        os.environ[FLAG] = '1'
        with Session(_engine) as s:
            s.query(Organization).delete()
            s.commit()

    def tearDown(self):
        if self._orig is None:
            os.environ.pop(FLAG, None)
        else:
            os.environ[FLAG] = self._orig

    def _provider(self):
        return lambda: _engine

    def _count(self, s):
        return s.execute(select(func.count()).select_from(Organization)).scalar_one()

    def _get(self, s, legacy_id='org1'):
        return s.execute(
            select(Organization).where(Organization.legacy_firestore_id == legacy_id)
        ).scalar_one()

    def test_create_lands_row(self):
        sc.shadow_create_organization(self._provider(), org_id='org1', org_data=_org_data())
        with Session(_engine) as s:
            self.assertEqual(self._count(s), 1)
            org = self._get(s)
            self.assertEqual(org.name, 'Springfield High')
            self.assertEqual(org.type, 'school')
            self.assertEqual(org.status, 'active')
            self.assertEqual(org.pilot_stage, 'beta')

    def test_create_is_idempotent(self):
        for _ in range(2):
            sc.shadow_create_organization(self._provider(), org_id='org1', org_data=_org_data())
        with Session(_engine) as s:
            self.assertEqual(self._count(s), 1)

    def test_suspend_then_restore_round_trip(self):
        sc.shadow_create_organization(self._provider(), org_id='org1', org_data=_org_data())
        sc.shadow_suspend_organization(
            self._provider(), org_id='org1', actor_uid='admin-1',
            reason='policy violation', suspended_until=None,
        )
        with Session(_engine) as s:
            org = self._get(s)
            self.assertEqual(org.status, 'suspended')
            self.assertEqual(org.suspended_by_firebase_uid, 'admin-1')
            self.assertEqual(org.suspend_reason, 'policy violation')
            self.assertIsNotNone(org.suspended_at)
            # Stable fields untouched by the targeted UPDATE.
            self.assertEqual(org.name, 'Springfield High')
            self.assertEqual(org.type, 'school')

        sc.shadow_restore_organization(self._provider(), org_id='org1', actor_uid='admin-2')
        with Session(_engine) as s:
            org = self._get(s)
            self.assertEqual(org.status, 'active')
            self.assertIsNone(org.suspended_at)
            self.assertIsNone(org.suspended_by_firebase_uid)
            self.assertIsNone(org.suspend_reason)
            self.assertEqual(org.restored_by_firebase_uid, 'admin-2')

    def test_suspend_unresolved_org_is_noop(self):
        # No org 'ghost' in PG -> 0 rows updated, no error.
        sc.shadow_suspend_organization(
            self._provider(), org_id='ghost', actor_uid='admin-1',
            reason='x', suspended_until=None,
        )
        with Session(_engine) as s:
            self.assertEqual(self._count(s), 0)

    def test_flag_off_writes_nothing(self):
        os.environ.pop(FLAG, None)
        sc.shadow_create_organization(self._provider(), org_id='org1', org_data=_org_data())
        with Session(_engine) as s:
            self.assertEqual(self._count(s), 0)


if __name__ == '__main__':
    unittest.main()

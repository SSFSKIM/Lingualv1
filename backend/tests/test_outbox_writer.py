import unittest
from unittest.mock import MagicMock, patch

from backend.services import outbox
from backend.services.outbox import (
    OUTBOX_EMAILS_COLLECTION,
    OutboxTemplate,
    enqueue_outbox_email,
)
import database


class OutboxConstantsTest(unittest.TestCase):
    def test_collection_name(self):
        self.assertEqual(outbox.OUTBOX_EMAILS_COLLECTION, 'outbox_emails')

    def test_template_enum_includes_school_request_to_lingual(self):
        self.assertEqual(
            outbox.OutboxTemplate.SCHOOL_REQUEST_TO_LINGUAL.value,
            'school_request_to_lingual',
        )

    def test_template_enum_is_exhaustive_for_v1(self):
        # v1 wires only one template; later plans add more.
        self.assertEqual(
            {t.value for t in outbox.OutboxTemplate},
            {'school_request_to_lingual'},
        )


class EnqueueOutboxEmailTest(unittest.TestCase):
    def test_writes_doc_with_expected_shape(self):
        db = MagicMock()
        doc_ref = MagicMock()
        db.collection.return_value.document.return_value = doc_ref

        enqueue_outbox_email(
            db=db,
            recipient_email='admin@lingual.app',
            recipient_name='Pat',
            template=OutboxTemplate.SCHOOL_REQUEST_TO_LINGUAL,
            template_data={'org_name': 'SF Friends School'},
            related_entity_type='school_request',
            related_entity_id='req-123',
            created_by_uid='uid-1',
        )

        db.collection.assert_called_once_with(OUTBOX_EMAILS_COLLECTION)
        args, _ = doc_ref.set.call_args
        payload = args[0]
        self.assertEqual(payload['recipient'], {'email': 'admin@lingual.app', 'name': 'Pat'})
        self.assertEqual(payload['template_id'], 'school_request_to_lingual')
        self.assertEqual(payload['template_data'], {'org_name': 'SF Friends School'})
        self.assertEqual(payload['status'], 'pending')
        self.assertEqual(payload['attempt_count'], 0)
        self.assertEqual(payload['related_entity'], {'type': 'school_request', 'id': 'req-123'})
        self.assertEqual(payload['created_by_uid'], 'uid-1')

    def test_rejects_invalid_recipient_email(self):
        db = MagicMock()
        with self.assertRaises(ValueError):
            enqueue_outbox_email(
                db=db,
                recipient_email='not-an-email',
                recipient_name=None,
                template=OutboxTemplate.SCHOOL_REQUEST_TO_LINGUAL,
                template_data={},
            )

    def test_uses_transaction_when_provided(self):
        db = MagicMock()
        tx = MagicMock()
        doc_ref = MagicMock()
        db.collection.return_value.document.return_value = doc_ref

        enqueue_outbox_email(
            db=db,
            transaction=tx,
            recipient_email='admin@lingual.app',
            recipient_name='Pat',
            template=OutboxTemplate.SCHOOL_REQUEST_TO_LINGUAL,
            template_data={},
        )

        tx.set.assert_called_once()
        doc_ref.set.assert_not_called()

    def test_omits_related_entity_when_not_provided(self):
        db = MagicMock()
        doc_ref = MagicMock()
        db.collection.return_value.document.return_value = doc_ref

        enqueue_outbox_email(
            db=db,
            recipient_email='admin@lingual.app',
            recipient_name=None,
            template=OutboxTemplate.SCHOOL_REQUEST_TO_LINGUAL,
            template_data={},
        )

        args, _ = doc_ref.set.call_args
        payload = args[0]
        self.assertNotIn('related_entity', payload)


class ListLingualAdminEmailsTest(unittest.TestCase):
    def _make_doc(self, uid, status, roles=None):
        """Build a mock Firestore document for a membership."""
        doc = MagicMock()
        doc.to_dict.return_value = {
            'uid': uid,
            'status': status,
            'roles': roles if roles is not None else ['lingual_admin'],
        }
        return doc

    def test_happy_path_active_included_revoked_excluded(self):
        """Active lingual_admin is returned; revoked one is excluded."""
        active_doc = self._make_doc('uid-a', 'active')
        revoked_doc = self._make_doc('uid-b', 'revoked')

        def fake_get_user(uid):
            users = {
                'uid-a': {'email': 'admin-a@lingual.app', 'name': 'Admin A', 'profile': {'display_name': 'Admin Alpha'}},
            }
            return users.get(uid)

        mock_collection = MagicMock()
        mock_collection.where.return_value.where.return_value.stream.return_value = [active_doc, revoked_doc]
        mock_collection.where.return_value.stream.return_value = [active_doc, revoked_doc]

        with patch.object(database, 'get_memberships_collection', return_value=mock_collection), \
             patch.object(database, 'get_user', side_effect=fake_get_user):
            result = database.list_lingual_admin_emails()

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['uid'], 'uid-a')
        self.assertEqual(result[0]['email'], 'admin-a@lingual.app')
        self.assertEqual(result[0]['name'], 'Admin Alpha')

    def test_empty_when_no_active_lingual_admins(self):
        """Returns empty list when there are no active lingual_admin memberships."""
        mock_collection = MagicMock()
        mock_collection.where.return_value.stream.return_value = []

        with patch.object(database, 'get_memberships_collection', return_value=mock_collection), \
             patch.object(database, 'get_user', return_value=None):
            result = database.list_lingual_admin_emails()

        self.assertEqual(result, [])

    def test_deduplicates_same_uid_across_multiple_memberships(self):
        """A uid appearing in two active lingual_admin memberships yields one entry."""
        doc1 = self._make_doc('uid-x', 'active')
        doc2 = self._make_doc('uid-x', 'active')

        def fake_get_user(uid):
            return {'email': 'x@lingual.app', 'name': 'X', 'profile': {}}

        mock_collection = MagicMock()
        mock_collection.where.return_value.stream.return_value = [doc1, doc2]

        with patch.object(database, 'get_memberships_collection', return_value=mock_collection), \
             patch.object(database, 'get_user', side_effect=fake_get_user):
            result = database.list_lingual_admin_emails()

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['uid'], 'uid-x')

    def test_result_sorted_by_uid(self):
        """Results are sorted alphabetically by uid for deterministic ordering."""
        doc_z = self._make_doc('uid-z', 'active')
        doc_a = self._make_doc('uid-a', 'active')

        def fake_get_user(uid):
            return {'email': f'{uid}@lingual.app', 'name': uid, 'profile': {}}

        mock_collection = MagicMock()
        mock_collection.where.return_value.stream.return_value = [doc_z, doc_a]

        with patch.object(database, 'get_memberships_collection', return_value=mock_collection), \
             patch.object(database, 'get_user', side_effect=fake_get_user):
            result = database.list_lingual_admin_emails()

        self.assertEqual([r['uid'] for r in result], ['uid-a', 'uid-z'])

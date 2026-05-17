import unittest
from unittest.mock import MagicMock

from backend.services import outbox
from backend.services.outbox import (
    OUTBOX_EMAILS_COLLECTION,
    OutboxTemplate,
    enqueue_outbox_email,
)


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

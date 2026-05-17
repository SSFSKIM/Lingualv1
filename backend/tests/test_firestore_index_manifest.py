import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
INDEXES_PATH = REPO_ROOT / "firestore.indexes.json"


class TestFirestoreIndexManifest(unittest.TestCase):
    def _load_indexes(self):
        payload = json.loads(INDEXES_PATH.read_text())
        return payload.get("indexes", [])

    def test_enrollments_student_uid_updated_at_index_exists(self):
        """The join-code fallback query needs student_uid + updated_at ordering."""
        indexes = self._load_indexes()

        for index in indexes:
            if index.get("collectionGroup") != "enrollments":
                continue

            fields = [
                (field.get("fieldPath"), field.get("order"))
                for field in index.get("fields", [])
            ]
            if fields == [
                ("student_uid", "ASCENDING"),
                ("updated_at", "DESCENDING"),
            ]:
                return

        self.fail(
            "firestore.indexes.json is missing the enrollments composite index "
            "for student_uid ASC + updated_at DESC"
        )


if __name__ == "__main__":
    unittest.main()

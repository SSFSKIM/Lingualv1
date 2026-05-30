#!/usr/bin/env python3
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from aggregate_pilot import _new_anchor_from_extraction  # noqa: E402
from process_nces import HEADER  # noqa: E402


class AggregatePilotTests(unittest.TestCase):
    def test_new_anchor_from_extraction_defaults_independent_school_fields(self):
        anchor = _new_anchor_from_extraction(
            {
                "school_name": "Example Academy",
                "state": "CO",
                "district": "independent",
                "county": "Denver County",
                "school_url": "https://example.edu",
                "faculty_page_url": "https://example.edu/faculty",
            },
            HEADER,
        )

        self.assertEqual(anchor["school_name"], "Example Academy")
        self.assertEqual(anchor["school_level"], "HS")
        self.assertEqual(anchor["school_type"], "independent")
        self.assertEqual(anchor["nces_school_type"], "Nonpublic")
        self.assertEqual(anchor["source_url"], "https://example.edu/faculty")
        self.assertEqual(anchor["outreach_status"], "not_started")
        self.assertEqual(anchor["sequence_step"], "0")
        self.assertEqual(anchor["unsubscribed"], "N")


if __name__ == "__main__":
    unittest.main()

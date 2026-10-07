from django.test import TestCase, Client
from django.core.cache import cache
from django.core.management import call_command
from unittest.mock import patch, MagicMock
from invites.views import normalize_roll, fetch_student
from invites.firestore_client import MockFirestoreClient, reset_client_for_testing
import tempfile
import os


class NormalizationTests(TestCase):
    def test_strip_and_uppercase(self):
        self.assertEqual(normalize_roll("  22a91a05xx  "), "22A91A05XX")
        self.assertEqual(normalize_roll("24a81a0501"), "24A81A0501")

    def test_hyphenated_roll(self):
        self.assertEqual(normalize_roll("cst-2026-01"), "CST-2026-01")

    def test_blank_and_invalid(self):
        self.assertEqual(normalize_roll(""), "")
        self.assertEqual(normalize_roll("   "), "")
        self.assertEqual(normalize_roll("invalid roll with spaces"), "")
        self.assertEqual(normalize_roll("special$#@char"), "")
        self.assertEqual(normalize_roll("A" * 25), "")  # Exceeds max length 20


class StudentLookupTests(TestCase):
    def setUp(self):
        cache.clear()
        self.mock_db = MockFirestoreClient()
        reset_client_for_testing(self.mock_db)
        # Prepopulate a test student
        self.mock_db.collection('students').document('22A91A0501').set({
            'roll_no': '22A91A0501',
            'name': 'AARAV SHARMA',
            'department': 'Dept of CSE & CST (IT)',
            'pass_no': 'NX26-0001',
        })
        self.client = Client()

    def tearDown(self):
        cache.clear()
        reset_client_for_testing()

    def test_student_found(self):
        response = self.client.get('/invite/', {'roll': '22a91a0501'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'AARAV SHARMA')
        self.assertContains(response, '22A91A0501')
        self.assertContains(response, 'NX26-0001')

    def test_student_not_found(self):
        response = self.client.get('/invite/', {'roll': 'UNKNOWN999'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Roll number not found – check and try again')

    def test_blank_roll_input(self):
        response = self.client.get('/invite/', {'roll': ''})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Please enter your roll number')

    def test_caching_behavior(self):
        # Fetch once to populate cache
        student_data, err = fetch_student('22A91A0501')
        self.assertIsNotNone(student_data)
        self.assertEqual(student_data['name'], 'AARAV SHARMA')

        # Directly modify underlying mock db; cache should still return Aarav Sharma
        self.mock_db.collection('students').document('22A91A0501').set({
            'roll_no': '22A91A0501',
            'name': 'MODIFIED NAME IN DB',
        })
        cached_data, _ = fetch_student('22A91A0501')
        self.assertEqual(cached_data['name'], 'AARAV SHARMA')

    def test_firestore_failure_handling(self):
        # Mock Firestore get throwing an Exception (timeout / network error)
        with patch.object(self.mock_db.collection('students'), 'document', side_effect=Exception("Connection timed out")):
            response = self.client.get('/invite/', {'roll': '22A91A0599'})
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, 'Please try again in a moment')


class RateLimitingTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()

    def tearDown(self):
        cache.clear()

    def test_rate_limiting_triggered(self):
        # Fire 30 requests
        for _ in range(30):
            response = self.client.get('/invite/', {'roll': 'TEST001'})
            self.assertIn(response.status_code, [200, 429])

        # 31st request should be rate-limited
        blocked_response = self.client.get('/invite/', {'roll': 'TEST001'})
        self.assertEqual(blocked_response.status_code, 429)
        self.assertContains(blocked_response, 'Too many requests', status_code=429)


class ImportCommandTests(TestCase):
    def setUp(self):
        self.mock_db = MockFirestoreClient()
        reset_client_for_testing(self.mock_db)

    def tearDown(self):
        reset_client_for_testing()

    def test_import_command_batching(self):
        csv_content = """roll_no,name,department
22A91A0501,Student One,Dept of CSE
22A91A0502,Student Two,Dept of CST (IT)
,Empty Roll,Dept of CSE
22A91A0501,Duplicate Student One,Dept of CSE
22A91A0503,Student Three,Dept of CSE & CST (IT)
"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(csv_content)
            temp_path = f.name

        try:
            call_command('import_students', temp_path, batch_size=2)
            # Verify imported records
            doc1 = self.mock_db.collection('students').document('22A91A0501').get()
            doc2 = self.mock_db.collection('students').document('22A91A0502').get()
            doc3 = self.mock_db.collection('students').document('22A91A0503').get()

            self.assertTrue(doc1.exists)
            self.assertEqual(doc1.to_dict()['name'], 'Student One')
            self.assertTrue(doc2.exists)
            self.assertEqual(doc2.to_dict()['name'], 'Student Two')
            self.assertTrue(doc3.exists)
            self.assertEqual(doc3.to_dict()['name'], 'Student Three')
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

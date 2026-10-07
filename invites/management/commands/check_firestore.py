import sys
from datetime import datetime, timezone
from django.core.management.base import BaseCommand
from django.conf import settings
from invites.firestore_client import get_firestore_client, is_mock_mode


class Command(BaseCommand):
    help = 'Tests Firestore connection by writing and reading a test document.'

    def handle(self, *args, **options):
        self.stdout.write("Testing Firebase Firestore connection...")
        try:
            db = get_firestore_client()
            if is_mock_mode():
                self.stdout.write(self.style.WARNING(
                    "STATUS: RUNNING IN MOCK MODE (No Firebase service account credentials configured)."
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    "STATUS: CONNECTED TO LIVE FIREBASE ADMIN SDK."
                ))

            collection_name = getattr(settings, 'FIRESTORE_COLLECTION', 'students')
            test_doc_id = "__connection_test__"
            doc_ref = db.collection(collection_name).document(test_doc_id)

            test_payload = {
                'roll_no': test_doc_id,
                'name': 'Connection Test Probe',
                'tested_at': datetime.now(timezone.utc).isoformat(),
                'status': 'OK',
            }

            self.stdout.write(f"Writing probe to collection '{collection_name}', doc '{test_doc_id}'...")
            doc_ref.set(test_payload, merge=True, timeout=5.0)

            self.stdout.write("Reading probe document back...")
            read_back = doc_ref.get(timeout=5.0)

            if read_back.exists and read_back.to_dict().get('status') == 'OK':
                self.stdout.write(self.style.SUCCESS("[OK] Verification Succeeded: Write and Read round-trip confirmed!"))
            else:
                self.stdout.write(self.style.ERROR("[FAIL] Verification Failed: Document could not be read back."))
                sys.exit(1)

        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"[FAIL] Firestore connection error: {exc}"))
            sys.exit(1)

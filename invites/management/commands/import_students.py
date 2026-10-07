import csv
import os
import sys
from datetime import datetime, timezone
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from invites.firestore_client import get_firestore_client, is_mock_mode
from invites.views import normalize_roll


class Command(BaseCommand):
    help = 'Imports students from a CSV file into Firebase Firestore.'

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str, help='Path to students.csv file')
        parser.add_argument(
            '--batch-size',
            type=int,
            default=500,
            help='Max operations per Firestore write batch (default 500)'
        )

    def handle(self, *args, **options):
        csv_path = options['csv_path']
        batch_limit = options['batch_size']

        if not os.path.isfile(csv_path):
            raise CommandError(f"CSV file not found at: {csv_path}")

        db = get_firestore_client()
        collection_name = getattr(settings, 'FIRESTORE_COLLECTION', 'students')
        coll_ref = db.collection(collection_name)

        if is_mock_mode():
            self.stdout.write(self.style.WARNING(
                "NOTE: Operating in MockFirestore mode (no live Firebase credentials supplied). "
                "Data is written to memory."
            ))

        self.stdout.write(f"Reading students from: {csv_path}")

        created_count = 0
        updated_count = 0
        skipped_count = 0
        errors = []

        seen_rolls = set()
        students_to_process = []

        try:
            with open(csv_path, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                # Normalize field names
                if not reader.fieldnames:
                    raise CommandError("CSV file appears to be empty or has no header row.")

                fields_map = {name.strip().lower(): name for name in reader.fieldnames}
                roll_key = fields_map.get('roll_no') or fields_map.get('roll') or fields_map.get('rollno')
                name_key = fields_map.get('name') or fields_map.get('student_name')
                dept_key = fields_map.get('department') or fields_map.get('dept')

                if not roll_key or not name_key:
                    raise CommandError(
                        f"CSV must contain 'roll_no' and 'name' columns. Found columns: {list(reader.fieldnames)}"
                    )

                for row_idx, row in enumerate(reader, start=2):
                    raw_roll = row.get(roll_key, '').strip()
                    raw_name = row.get(name_key, '').strip()
                    raw_dept = row.get(dept_key, '').strip() if dept_key else ''

                    if not raw_roll or not raw_name:
                        skipped_count += 1
                        continue

                    norm_roll = normalize_roll(raw_roll)
                    if not norm_roll:
                        self.stderr.write(f"Row {row_idx}: Invalid roll format '{raw_roll}' - skipped.")
                        skipped_count += 1
                        continue

                    if norm_roll in seen_rolls:
                        # Duplicate within file
                        skipped_count += 1
                        continue

                    seen_rolls.add(norm_roll)
                    students_to_process.append({
                        'roll_no': norm_roll,
                        'name': raw_name,
                        'department': raw_dept or 'Dept of CSE & CST (IT)',
                    })

        except Exception as e:
            raise CommandError(f"Error reading CSV file: {e}")

        total_valid = len(students_to_process)
        self.stdout.write(f"Found {total_valid} valid unique student entries. Writing in batches of {batch_limit}...")

        # Process in batches
        batch = db.batch()
        current_batch_ops = 0
        pass_seq = 1

        for idx, student in enumerate(students_to_process, start=1):
            roll = student['roll_no']
            doc_ref = coll_ref.document(roll)

            try:
                # Check if existing document to keep pass_no or know if created vs updated
                existing = doc_ref.get(timeout=5.0)
                now_iso = datetime.now(timezone.utc).isoformat()

                if existing.exists:
                    existing_data = existing.to_dict() or {}
                    pass_no = existing_data.get('pass_no') or f"NX26-{idx:04d}"
                    payload = {
                        'roll_no': roll,
                        'name': student['name'],
                        'department': student['department'],
                        'pass_no': pass_no,
                        'updated_at': now_iso,
                    }
                    updated_count += 1
                else:
                    pass_no = f"NX26-{idx:04d}"
                    payload = {
                        'roll_no': roll,
                        'name': student['name'],
                        'department': student['department'],
                        'pass_no': pass_no,
                        'created_at': now_iso,
                    }
                    created_count += 1

                batch.set(doc_ref, payload, merge=True)
                current_batch_ops += 1

                if current_batch_ops >= batch_limit:
                    batch.commit(timeout=10.0)
                    self.stdout.write(f"Committed batch of {current_batch_ops} records.")
                    batch = db.batch()
                    current_batch_ops = 0

            except Exception as err:
                error_msg = f"Failed to stage roll {roll}: {err}"
                errors.append(error_msg)
                self.stderr.write(error_msg)

        # Commit remaining ops
        if current_batch_ops > 0:
            try:
                batch.commit(timeout=10.0)
                self.stdout.write(f"Committed final batch of {current_batch_ops} records.")
            except Exception as err:
                errors.append(f"Failed to commit final batch: {err}")
                self.stderr.write(f"Failed to commit final batch: {err}")

        # Summary
        self.stdout.write("\n" + "=" * 40)
        self.stdout.write(self.style.SUCCESS("IMPORT SUMMARY:"))
        self.stdout.write(f"  Created: {created_count}")
        self.stdout.write(f"  Updated: {updated_count}")
        self.stdout.write(f"  Skipped (blank/invalid/duplicate): {skipped_count}")
        if errors:
            self.stdout.write(self.style.ERROR(f"  Errors encountered: {len(errors)}"))
            for err in errors[:5]:
                self.stdout.write(f"    - {err}")
        else:
            self.stdout.write(self.style.SUCCESS("  All valid records processed successfully!"))
        self.stdout.write("=" * 40 + "\n")

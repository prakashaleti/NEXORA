"""
Thread-safe singleton Firebase Firestore client for NEXORA.
Handles credentials loading, timeout limits, and local mock fallback.
"""

import json
import logging
import os
import threading
from typing import Any, Dict, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

_firestore_client = None
_client_lock = threading.Lock()
_is_mock_client = False


class MockDocumentSnapshot:
    """Mock document snapshot matching Google Cloud Firestore DocumentSnapshot API."""
    def __init__(self, doc_id: str, data: Optional[Dict[str, Any]]):
        self.id = doc_id
        self._data = data

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> Optional[Dict[str, Any]]:
        return dict(self._data) if self._data is not None else None


class MockDocumentReference:
    """Mock document reference matching Google Cloud Firestore DocumentReference API."""
    def __init__(self, collection: 'MockCollectionReference', doc_id: str):
        self.collection = collection
        self.id = doc_id

    def get(self, timeout: Optional[float] = 5.0) -> MockDocumentSnapshot:
        data = self.collection.store.get(self.id)
        return MockDocumentSnapshot(self.id, data)

    def set(self, data: Dict[str, Any], merge: bool = False, timeout: Optional[float] = 5.0):
        if merge and self.id in self.collection.store:
            current = dict(self.collection.store[self.id])
            current.update(data)
            self.collection.store[self.id] = current
        else:
            self.collection.store[self.id] = dict(data)


class MockBatch:
    """Mock batch matching Google Cloud Firestore WriteBatch API."""
    def __init__(self, client: 'MockFirestoreClient'):
        self.client = client
        self.operations = []

    def set(self, doc_ref: MockDocumentReference, data: Dict[str, Any], merge: bool = False):
        self.operations.append((doc_ref, data, merge))
        return self

    def commit(self, timeout: Optional[float] = 5.0):
        for doc_ref, data, merge in self.operations:
            doc_ref.set(data, merge=merge, timeout=timeout)
        self.operations.clear()


class MockCollectionReference:
    """Mock collection matching Google Cloud Firestore CollectionReference API."""
    def __init__(self, client: 'MockFirestoreClient', name: str):
        self.client = client
        self.name = name
        if name not in self.client._collections:
            self.client._collections[name] = {}
        self.store = self.client._collections[name]

    def document(self, doc_id: str) -> MockDocumentReference:
        return MockDocumentReference(self, doc_id)


class MockFirestoreClient:
    """In-memory mock Firestore client for offline testing and local dev."""
    def __init__(self):
        self._collections: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._collection_instances: Dict[str, MockCollectionReference] = {}

    def collection(self, name: str) -> MockCollectionReference:
        if name not in self._collection_instances:
            self._collection_instances[name] = MockCollectionReference(self, name)
        return self._collection_instances[name]

    def batch(self) -> MockBatch:
        return MockBatch(self)


def get_firestore_client():
    """
    Returns a lazily initialised singleton Firestore client.
    Thread-safe and supports both live Firebase Admin SDK and fallback mock mode.
    """
    global _firestore_client, _is_mock_client

    if _firestore_client is not None:
        return _firestore_client

    with _client_lock:
        if _firestore_client is not None:
            return _firestore_client

        # Check credentials from settings/environment
        cred_json = getattr(settings, 'FIREBASE_CREDENTIALS_JSON', '') or os.environ.get('FIREBASE_CREDENTIALS_JSON', '')
        cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', '') or os.environ.get('FIREBASE_CREDENTIALS_PATH', '')
        google_adc = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', '')

        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            cred = None
            if cred_json and cred_json.strip():
                try:
                    cred_dict = json.loads(cred_json)
                    cred = credentials.Certificate(cred_dict)
                    logger.info("Initializing Firebase Admin with FIREBASE_CREDENTIALS_JSON.")
                except Exception as e:
                    logger.error(f"Failed to parse FIREBASE_CREDENTIALS_JSON: {e}")

            elif cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                logger.info(f"Initializing Firebase Admin with certificate file: {cred_path}")

            elif google_adc and os.path.exists(google_adc):
                cred = credentials.Certificate(google_adc)
                logger.info(f"Initializing Firebase Admin with GOOGLE_APPLICATION_CREDENTIALS: {google_adc}")

            if cred is not None:
                if not firebase_admin._apps:
                    firebase_admin.initialize_app(cred)
                _firestore_client = firestore.client()
                _is_mock_client = False
                logger.info("Successfully connected to Firebase Firestore.")
                return _firestore_client
            else:
                logger.warning(
                    "No Firebase credentials provided (FIREBASE_CREDENTIALS_JSON / FIREBASE_CREDENTIALS_PATH). "
                    "Operating in development MockFirestoreClient mode."
                )
                _firestore_client = MockFirestoreClient()
                _is_mock_client = True
                return _firestore_client

        except Exception as err:
            logger.error(f"Error initializing Firebase Admin SDK ({err}). Falling back to MockFirestoreClient.")
            _firestore_client = MockFirestoreClient()
            _is_mock_client = True
            return _firestore_client


def is_mock_mode() -> bool:
    """Returns True if running in local mock mode."""
    global _is_mock_client
    return _is_mock_client


def reset_client_for_testing(custom_client=None):
    """Utility for unit tests to reset or inject a mock client."""
    global _firestore_client, _is_mock_client
    with _client_lock:
        _firestore_client = custom_client if custom_client is not None else MockFirestoreClient()
        _is_mock_client = (custom_client is None or isinstance(custom_client, MockFirestoreClient))
    return _firestore_client

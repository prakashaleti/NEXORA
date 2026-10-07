import logging
import re
from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from .firestore_client import get_firestore_client

logger = logging.getLogger(__name__)

ROLL_REGEX = re.compile(r'^[A-Z0-9\-]{1,20}$')
CACHE_TTL = 300  # 5 minutes
RATE_LIMIT_MAX = 30
RATE_LIMIT_WINDOW = 60  # seconds


def get_client_ip(request: HttpRequest) -> str:
    """Extract client IP address handling proxies safely."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip


def is_rate_limited(ip: str) -> bool:
    """Basic rate limiting: 30 requests/min per IP using Django cache."""
    cache_key = f"rl:{ip}"
    count = cache.get(cache_key, 0)
    if count >= RATE_LIMIT_MAX:
        return True
    cache.set(cache_key, count + 1, timeout=RATE_LIMIT_WINDOW)
    return False


def normalize_roll(raw_roll: str) -> str:
    """Normalise roll number: strip whitespace, convert to uppercase, validate pattern."""
    if not raw_roll:
        return ""
    cleaned = raw_roll.strip().upper()
    if not ROLL_REGEX.match(cleaned):
        return ""
    return cleaned


def fetch_student(roll_no: str):
    """
    Fetches student document from cache or Firestore.
    Returns: (student_data, error_code)
    error_code can be None, 'not_found', or 'service_unavailable'.
    """
    cache_key = f"student:{roll_no}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data, None

    try:
        db = get_firestore_client()
        collection_name = getattr(settings, 'FIRESTORE_COLLECTION', 'students')
        doc_ref = db.collection(collection_name).document(roll_no)
        doc = doc_ref.get(timeout=5.0)

        if doc.exists:
            data = doc.to_dict()
            # Ensure essential keys
            data.setdefault('roll_no', roll_no)
            data.setdefault('department', getattr(settings, 'EVENT', {}).get('DEPARTMENTS', 'Dept of CSE & CST (IT)'))
            if not data.get('pass_no'):
                # Fallback pass number if not set
                data['pass_no'] = f"NX26-{roll_no[-4:]}"
            cache.set(cache_key, data, timeout=CACHE_TTL)
            return data, None
        else:
            return None, 'not_found'

    except Exception as exc:
        logger.error(f"Firestore error fetching student '{roll_no}': {exc}", exc_info=True)
        return None, 'service_unavailable'


def home_view(request: HttpRequest) -> HttpResponse:
    """Renders the Home & Intro view with invitation search form."""
    return render(request, 'invites/home.html', {
        'page_title': 'NEXORA – Freshers Party 2K26',
    })


def invite_view(request: HttpRequest) -> HttpResponse:
    """
    Renders the official NEXORA invitation card page.
    Uses optional GET parameter: /invite/?roll=XXXX
    """
    ip = get_client_ip(request)
    if is_rate_limited(ip):
        return render(request, 'invites/invite.html', {
            'error_message': 'Too many requests. Please slow down and wait a minute before trying again.',
            'error_type': 'rate_limit',
            'roll_query': '',
            'student': None,
        }, status=429)

    raw_roll = request.GET.get('roll', '')
    student_data = None
    if raw_roll:
        normalized_roll = normalize_roll(raw_roll)
        if normalized_roll:
            student_data, _ = fetch_student(normalized_roll)

    return render(request, 'invites/invite.html', {
        'student': student_data,
        'roll_query': raw_roll.strip() if raw_roll else '',
        'error_message': None,
    })



def poster_view(request: HttpRequest) -> HttpResponse:
    """Renders the static Freshers Party 2K26 invitation poster page."""
    return render(request, 'invites/poster.html', {
        'page_title': 'Freshers Party 2K26 – NEXORA Invitation',
    })


def admin_view(request: HttpRequest) -> HttpResponse:
    """Renders the Firebase-protected Admin Management Portal."""
    return render(request, 'invites/admin.html')


def pass_image_view(request: HttpRequest) -> HttpResponse:
    """
    Renders and streams the official NEXORA VIP invitation pass image.
    Uses the user-uploaded template with student details imprinted.
    """
    raw_roll = request.GET.get('roll', '')
    normalized_roll = normalize_roll(raw_roll)
    name = request.GET.get('name', '').strip()
    dept = request.GET.get('dept', '').strip()
    if normalized_roll and not name:
        student_data, _ = fetch_student(normalized_roll)
        if student_data:
            name = student_data.get('name', '')
            dept = student_data.get('department', '')

    from .pass_generator import generate_pass_image
    buf = generate_pass_image(name, normalized_roll, dept)

    response = HttpResponse(buf.getvalue(), content_type='image/png')
    if request.GET.get('download', '0') in ['1', 'true', 'True']:
        filename = f"NEXORA_2K26_Invite_{normalized_roll}.png" if normalized_roll else "Freshers_Party_Invitation_NEXORA_2K26.png"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

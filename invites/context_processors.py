from django.conf import settings

def event_details(request):
    """Exposes the event configuration to all templates."""
    return {
        'EVENT': getattr(settings, 'EVENT', {}),
        'DEBUG': getattr(settings, 'DEBUG', False),
    }

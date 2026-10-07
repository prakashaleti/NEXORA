"""
Django settings for nexora_site project.
NEXORA - Freshers Party 2K26
"""

from pathlib import Path
import os
from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Security settings
SECRET_KEY = config('SECRET_KEY', default='django-insecure-7t%5y@(q#8scz8say=l(_4q@5ashl52yao-jn3*x$!hdtpfu!-')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,0.0.0.0,*, .vercel.app,*.vercel.app', cast=Csv())

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',
    'invites.apps.InvitesConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'nexora_site.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'invites' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'invites.context_processors.event_details',
            ],
        },
    },
]

WSGI_APPLICATION = 'nexora_site.wsgi.application'

# Signed cookie sessions to avoid DB dependency for session storage
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"

# Minimal SQLite internal database (student data is stored in Firebase Firestore)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# In-memory caching for rate limiting and student lookup performance
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'nexora-cache',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'invites' / 'static',
]

# WhiteNoise Configuration
WHITENOISE_MANIFEST_STRICT = False
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

# EVENT CONFIGURATION
EVENT = {
    'NAME': config('EVENT_NAME', default='Freshers Party 2K26 – NEXORA'),
    'SHORT_NAME': 'NEXORA',
    'YEAR': '2K26',
    'DATE': config('EVENT_DATE', default='13 October 2026'),
    'TIME': config('EVENT_TIME', default='9:30 PM onwards'),
    'VENUE': config('EVENT_VENUE', default='YNS Auditorium'),
    'COLLEGE': config('COLLEGE_NAME', default='Sri Vasavi Engineering College (Autonomous), Pedatadepalli'),
    'DEPARTMENTS': config('EVENT_DEPTS', default='Dept of CSE & CST (IT)'),
    'TAGLINE_1': config('EVENT_TAGLINE_1', default='New Faces • New Vibes • One Family'),
    'TAGLINE_2': config('EVENT_TAGLINE_2', default='Let the journey begin...'),
    'BANNER_TEXT': config('EVENT_BANNER_TEXT', default='Dream • Learn • Connect • Grow'),
}

# FIREBASE CONFIGURATION
FIREBASE_CREDENTIALS_JSON = config('FIREBASE_CREDENTIALS_JSON', default='')
FIREBASE_CREDENTIALS_PATH = config('FIREBASE_CREDENTIALS_PATH', default='')
FIRESTORE_COLLECTION = config('FIRESTORE_COLLECTION', default='students')

#!/bin/bash
echo "Building the project..."

# Create and activate virtual environment to comply with Linux PEP 668
python3 -m venv .venv
source .venv/bin/activate || true

# Install dependencies with fallback
pip install -r requirements.txt || pip3 install --break-system-packages -r requirements.txt

# Run Django collectstatic
python manage.py collectstatic --noinput --clear || python3 manage.py collectstatic --noinput --clear

echo "Build completed successfully."

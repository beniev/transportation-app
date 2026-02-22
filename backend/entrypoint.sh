#!/bin/bash
set -e

echo "=== Auto-generating any missing migrations ==="
python manage.py makemigrations --noinput 2>&1

echo "=== Running migrations ==="
python manage.py migrate --noinput 2>&1

echo "=== Seeding item catalog ==="
python manage.py seed_item_catalog 2>&1 || echo "Warning: seed_item_catalog failed, continuing..."

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput 2>&1 || echo "Warning: collectstatic failed, continuing..."

echo "=== Starting Gunicorn on port ${PORT:-8000} ==="
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 2 \
    --timeout 120 \
    --log-level info \
    --access-logfile - \
    --error-logfile -

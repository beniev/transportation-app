"""
Celery configuration for transportation app.
"""
import os
from celery import Celery

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('transportation_app')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule (periodic tasks)
app.conf.beat_schedule = {
    'send-booking-reminders': {
        'task': 'apps.notifications.tasks.send_booking_reminders',
        'schedule': 3600.0,  # Every hour
    },
    'aggregate-daily-analytics': {
        'task': 'apps.analytics.tasks.aggregate_daily_analytics',
        'schedule': 86400.0,  # Every 24 hours
    },
    'check-subscription-expiry': {
        'task': 'apps.payments.tasks.check_subscription_expiry',
        'schedule': 86400.0,  # Every 24 hours
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

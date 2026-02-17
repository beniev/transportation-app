"""
URL configuration for the notifications app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    NotificationTypeViewSet,
    NotificationPreferenceViewSet,
    NotificationViewSet,
    SendTestNotificationView
)

router = DefaultRouter()
router.register(r'types', NotificationTypeViewSet, basename='notification-type')
router.register(r'preferences', NotificationPreferenceViewSet, basename='notification-preference')
router.register(r'', NotificationViewSet, basename='notification')

app_name = 'notifications'

urlpatterns = [
    path('', include(router.urls)),
    path('test/', SendTestNotificationView.as_view(), name='test-notification'),
]

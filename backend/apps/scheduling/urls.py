"""
URL configuration for the scheduling app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    WeeklyAvailabilityViewSet,
    BlockedDateViewSet,
    TimeSlotViewSet,
    BookingViewSet,
    CalendarView,
    PublicAvailabilityView,
    ICalExportView
)

router = DefaultRouter()
router.register(r'weekly-availability', WeeklyAvailabilityViewSet, basename='weekly-availability')
router.register(r'blocked-dates', BlockedDateViewSet, basename='blocked-date')
router.register(r'time-slots', TimeSlotViewSet, basename='time-slot')
router.register(r'bookings', BookingViewSet, basename='booking')

app_name = 'scheduling'

urlpatterns = [
    path('', include(router.urls)),
    path('calendar/', CalendarView.as_view(), name='calendar'),
    path('movers/<uuid:mover_id>/availability/', PublicAvailabilityView.as_view(), name='public-availability'),
    path('export/ical/', ICalExportView.as_view(), name='ical-export'),
]

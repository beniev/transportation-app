"""
URL configuration for the analytics app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    DashboardView,
    RevenueView,
    OrderStatisticsView,
    CustomerStatisticsView,
    PopularItemsView,
    DailyAnalyticsViewSet,
    MonthlyAnalyticsViewSet,
    ExportView,
    AnalyticsComparisonView
)

router = DefaultRouter()
router.register(r'daily', DailyAnalyticsViewSet, basename='daily-analytics')
router.register(r'monthly', MonthlyAnalyticsViewSet, basename='monthly-analytics')

app_name = 'analytics'

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('revenue/', RevenueView.as_view(), name='revenue'),
    path('orders/', OrderStatisticsView.as_view(), name='order-stats'),
    path('customers/', CustomerStatisticsView.as_view(), name='customer-stats'),
    path('popular-items/', PopularItemsView.as_view(), name='popular-items'),
    path('export/', ExportView.as_view(), name='export'),
    path('compare/', AnalyticsComparisonView.as_view(), name='compare'),
]

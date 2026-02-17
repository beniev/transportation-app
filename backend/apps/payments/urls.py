"""
URL configuration for the payments app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    SubscriptionPlanViewSet,
    SubscriptionViewSet,
    PaymentMethodViewSet,
    PaymentViewSet,
    CouponView,
    PaymentWebhookView
)

router = DefaultRouter()
router.register(r'plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'subscription', SubscriptionViewSet, basename='subscription')
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'payments', PaymentViewSet, basename='payment')

app_name = 'payments'

urlpatterns = [
    path('', include(router.urls)),
    path('coupons/validate/', CouponView.as_view(), name='validate-coupon'),
    path('webhook/', PaymentWebhookView.as_view(), name='payment-webhook'),
]

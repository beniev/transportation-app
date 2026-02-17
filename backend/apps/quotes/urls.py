"""
URL configuration for the quotes app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from .views import QuoteTemplateViewSet, QuoteViewSet, QuoteItemViewSet, PublicQuoteView

# Main router
router = DefaultRouter()
router.register(r'templates', QuoteTemplateViewSet, basename='quote-template')
router.register(r'quotes', QuoteViewSet, basename='quote')
router.register(r'public', PublicQuoteView, basename='public-quote')

# Nested router for quote items
quotes_router = routers.NestedDefaultRouter(router, r'quotes', lookup='quote')
quotes_router.register(r'items', QuoteItemViewSet, basename='quote-items')

app_name = 'quotes'

urlpatterns = [
    path('', include(router.urls)),
    path('', include(quotes_router.urls)),
]

"""
URL configuration for transportation app.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/movers/', include('apps.movers.urls')),
    path('api/v1/orders/', include('apps.orders.urls')),
    path('api/v1/ai/', include('apps.ai_integration.urls')),
    path('api/v1/quotes/', include('apps.quotes.urls')),
    path('api/v1/scheduling/', include('apps.scheduling.urls')),
    path('api/v1/payments/', include('apps.payments.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),

    # allauth URLs for social auth
    path('accounts/', include('allauth.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

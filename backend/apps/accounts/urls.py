"""
URL configuration for the accounts app.
"""
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from dj_rest_auth.views import (
    LoginView,
    LogoutView,
    PasswordResetView,
    PasswordResetConfirmView,
)
from dj_rest_auth.registration.views import VerifyEmailView

from .views import (
    CustomRegisterView,
    UserProfileView,
    MoverProfileView,
    CustomerProfileView,
    RequestPhoneVerificationView,
    VerifyPhoneView,
    ChangePasswordView,
    PublicMoverProfileView,
    MoverListView,
    GoogleAuthView,
    # Admin views
    AdminMoverListView,
    AdminMoverDetailView,
    AdminMoverApproveView,
    AdminMoverRejectView,
    AdminMoverSuspendView,
    # Onboarding views
    OnboardingStatusView,
    OnboardingCompleteView,
    OnboardingStepView,
)

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('register/', CustomRegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Password Reset
    path('password/reset/', PasswordResetView.as_view(), name='password_reset'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('password/change/', ChangePasswordView.as_view(), name='password_change'),

    # Email Verification
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),

    # Phone Verification
    path('phone/request-verification/', RequestPhoneVerificationView.as_view(), name='request_phone_verification'),
    path('phone/verify/', VerifyPhoneView.as_view(), name='verify_phone'),

    # User Profile
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('profile/mover/', MoverProfileView.as_view(), name='mover_profile'),
    path('profile/customer/', CustomerProfileView.as_view(), name='customer_profile'),

    # Public Mover Profiles
    path('movers/', MoverListView.as_view(), name='mover_list'),
    path('movers/<uuid:id>/', PublicMoverProfileView.as_view(), name='mover_detail'),

    # Social Auth (handled by allauth)
    path('social/', include('allauth.socialaccount.urls')),

    # Google OAuth for SPA
    path('google/', GoogleAuthView.as_view(), name='google_auth'),

    # Admin: Mover Management
    path('admin/movers/', AdminMoverListView.as_view(), name='admin_mover_list'),
    path('admin/movers/<uuid:id>/', AdminMoverDetailView.as_view(), name='admin_mover_detail'),
    path('admin/movers/<uuid:id>/approve/', AdminMoverApproveView.as_view(), name='admin_mover_approve'),
    path('admin/movers/<uuid:id>/reject/', AdminMoverRejectView.as_view(), name='admin_mover_reject'),
    path('admin/movers/<uuid:id>/suspend/', AdminMoverSuspendView.as_view(), name='admin_mover_suspend'),

    # Onboarding
    path('onboarding/status/', OnboardingStatusView.as_view(), name='onboarding_status'),
    path('onboarding/complete/', OnboardingCompleteView.as_view(), name='onboarding_complete'),
    path('onboarding/step/', OnboardingStepView.as_view(), name='onboarding_step'),
]

"""
Views for the accounts app.
"""
import random
import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from dj_rest_auth.views import LoginView
from dj_rest_auth.registration.views import RegisterView
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .models import MoverProfile, CustomerProfile
from .serializers import (
    UserSerializer,
    MoverProfileSerializer,
    CustomerProfileSerializer,
    CustomRegisterSerializer,
    VerifyPhoneSerializer,
    RequestVerificationSerializer,
    ChangePasswordSerializer,
    UpdateUserSerializer,
    AdminMoverProfileSerializer,
    MoverApprovalSerializer,
)

logger = logging.getLogger(__name__)

User = get_user_model()


class CustomRegisterView(RegisterView):
    """Custom registration view with user type support."""
    serializer_class = CustomRegisterSerializer


class GoogleAuthView(APIView):
    """Handle Google OAuth authentication for SPA."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)

        credential = request.data.get('credential')
        user_type = request.data.get('user_type')  # None if not provided (login), 'customer'/'mover' if provided (register)
        logger.info(f"GoogleAuthView: user_type from request = {user_type}")

        if not credential:
            return Response(
                {'error': 'Google credential is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Verify the Google ID token
            google_client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')

            if not google_client_id:
                # Fallback to SOCIALACCOUNT_PROVIDERS
                google_client_id = settings.SOCIALACCOUNT_PROVIDERS.get('google', {}).get('APP', {}).get('client_id', '')

            if not google_client_id:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"GOOGLE_OAUTH_CLIENT_ID not found in settings")
                return Response(
                    {'error': 'Google OAuth not configured. Please set GOOGLE_OAUTH_CLIENT_ID in .env'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            idinfo = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                google_client_id
            )

            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')
            google_id = idinfo.get('sub')

            if not email:
                return Response(
                    {'error': 'Email not provided by Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get or create user
            # For new users: use provided user_type or default to 'customer'
            effective_user_type = user_type or 'customer'

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'user_type': effective_user_type,
                    'email_verified': True,  # Google already verified email
                }
            )

            if created:
                # Create appropriate profile for new user
                if effective_user_type == 'mover':
                    MoverProfile.objects.create(
                        user=user,
                        company_name=f"{first_name} {last_name}",
                        company_name_he=f"{first_name} {last_name}",
                    )
                else:
                    CustomerProfile.objects.create(user=user)
                logger.info(f"GoogleAuthView: Created new {effective_user_type} user: {email}")
            else:
                # Existing user — update name if missing
                update_fields = []
                if not user.first_name and first_name:
                    user.first_name = first_name
                    update_fields.append('first_name')
                if not user.last_name and last_name:
                    user.last_name = last_name
                    update_fields.append('last_name')

                # Only switch role if user_type was EXPLICITLY provided (from Register page)
                # When user_type is None (from Login page), keep existing role
                if user_type and user.user_type != user_type:
                    old_type = user.user_type
                    user.user_type = user_type
                    update_fields.append('user_type')

                    # Delete old profile and create new one
                    if old_type == 'mover' and hasattr(user, 'mover_profile'):
                        user.mover_profile.delete()
                    elif old_type == 'customer' and hasattr(user, 'customer_profile'):
                        user.customer_profile.delete()

                    # Create new profile for the new role
                    if user_type == 'mover':
                        MoverProfile.objects.get_or_create(
                            user=user,
                            defaults={
                                'company_name': f"{user.first_name} {user.last_name}".strip() or email.split('@')[0],
                                'company_name_he': f"{user.first_name} {user.last_name}".strip() or email.split('@')[0],
                            }
                        )
                    else:
                        CustomerProfile.objects.get_or_create(user=user)

                    logger.info(f"GoogleAuthView: User {email} switched from {old_type} to {user_type}")

                if update_fields:
                    user.save(update_fields=update_fields)

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            logger.info(f"GoogleAuthView: Final user state - email={user.email}, user_type={user.user_type}, is_mover={user.is_mover}")

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_mover': user.is_mover,
                    'is_customer': user.is_customer,
                }
            })

        except ValueError as e:
            return Response(
                {'error': f'Invalid Google token: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get and update current user's profile."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class MoverProfileView(generics.RetrieveUpdateAPIView):
    """Get and update mover's profile."""
    serializer_class = MoverProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.mover_profile

    def get_queryset(self):
        return MoverProfile.objects.filter(user=self.request.user)


class CustomerProfileView(generics.RetrieveUpdateAPIView):
    """Get and update customer's profile."""
    serializer_class = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.customer_profile

    def get_queryset(self):
        return CustomerProfile.objects.filter(user=self.request.user)


class RequestPhoneVerificationView(APIView):
    """Request phone verification code. Works for both customers and movers."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_profile(self, user):
        """Get the appropriate profile for verification."""
        if user.is_customer and hasattr(user, 'customer_profile'):
            return user.customer_profile
        elif user.is_mover and hasattr(user, 'mover_profile'):
            return user.mover_profile
        return None

    def post(self, request):
        serializer = RequestVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data['phone']
        user = request.user

        # Update user's phone
        user.phone = phone
        user.save(update_fields=['phone'])

        profile = self._get_profile(user)
        if not profile:
            return Response(
                {'error': 'Phone verification not available for this user type'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not profile.can_request_verification():
            return Response(
                {'error': 'Too many verification attempts. Please try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        profile.verification_code = code
        profile.verification_code_expires = timezone.now() + timedelta(minutes=10)
        profile.verification_attempts += 1
        profile.save()

        # Send SMS via SMS4Free
        from .sms_service import send_verification_code
        sms_sent = send_verification_code(phone, code)
        logger.info(f"Verification code for {phone}: {'sent' if sms_sent else 'FAILED'}")

        return Response({
            'message': 'Verification code sent',
            'expires_in': 600,  # 10 minutes
            'sms_sent': sms_sent,
        })


class VerifyPhoneView(APIView):
    """Verify phone with code. Works for both customers and movers."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_profile(self, user):
        """Get the appropriate profile for verification."""
        if user.is_customer and hasattr(user, 'customer_profile'):
            return user.customer_profile
        elif user.is_mover and hasattr(user, 'mover_profile'):
            return user.mover_profile
        return None

    def post(self, request):
        serializer = VerifyPhoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']
        user = request.user

        profile = self._get_profile(user)
        if not profile:
            return Response(
                {'error': 'Phone verification not available for this user type'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if code expired
        if profile.verification_code_expires and timezone.now() > profile.verification_code_expires:
            return Response(
                {'error': 'Verification code expired'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check code
        if profile.verification_code != code:
            if hasattr(profile, 'spam_score'):
                profile.spam_score += 1
            profile.save()
            return Response(
                {'error': 'Invalid verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark as verified
        user.phone_verified = True
        user.save(update_fields=['phone_verified'])

        profile.verification_code = ''
        profile.verification_code_expires = None
        profile.verification_attempts = 0
        profile.save()

        return Response({'message': 'Phone verified successfully'})


class ChangePasswordView(APIView):
    """Change user's password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'message': 'Password changed successfully'})


class PublicMoverProfileView(generics.RetrieveAPIView):
    """Public view for mover profiles."""
    serializer_class = MoverProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = MoverProfile.objects.filter(is_active=True, is_verified=True)
    lookup_field = 'id'


class MoverListView(generics.ListAPIView):
    """List all active movers."""
    serializer_class = MoverProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = MoverProfile.objects.filter(is_active=True)
    filterset_fields = ['city', 'is_verified']
    search_fields = ['company_name', 'company_name_he', 'city']
    ordering_fields = ['rating', 'completed_orders', 'created_at']


# ──────────────────────────────────────────────
# Admin Permission
# ──────────────────────────────────────────────

class IsAdmin(permissions.BasePermission):
    """Permission for admin-only access."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.user_type == 'admin'
        )


# ──────────────────────────────────────────────
# Admin Mover Management Views
# ──────────────────────────────────────────────

class AdminMoverListView(generics.ListAPIView):
    """List movers for admin review. Filter by ?status=pending."""
    serializer_class = AdminMoverProfileSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = MoverProfile.objects.select_related('user').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(verification_status=status_filter)
        return qs


class AdminMoverDetailView(generics.RetrieveAPIView):
    """Admin view: single mover detail."""
    serializer_class = AdminMoverProfileSerializer
    permission_classes = [IsAdmin]
    queryset = MoverProfile.objects.select_related('user')
    lookup_field = 'id'


class AdminMoverApproveView(APIView):
    """Admin: approve a mover."""
    permission_classes = [IsAdmin]

    def post(self, request, id):
        mover = get_object_or_404(MoverProfile, id=id)
        mover.verification_status = MoverProfile.VerificationStatus.APPROVED
        mover.verified_at = timezone.now()
        mover.rejection_reason = ''
        mover.save()
        logger.info(f"Mover {mover.company_name} (id={mover.id}) approved by {request.user.email}")
        return Response(AdminMoverProfileSerializer(mover).data)


class AdminMoverRejectView(APIView):
    """Admin: reject a mover."""
    permission_classes = [IsAdmin]

    def post(self, request, id):
        serializer = MoverApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mover = get_object_or_404(MoverProfile, id=id)
        mover.verification_status = MoverProfile.VerificationStatus.REJECTED
        mover.rejection_reason = serializer.validated_data.get('rejection_reason', '')
        mover.verified_at = None
        mover.save()
        logger.info(f"Mover {mover.company_name} (id={mover.id}) rejected by {request.user.email}")
        return Response(AdminMoverProfileSerializer(mover).data)


class AdminMoverSuspendView(APIView):
    """Admin: suspend an already-approved mover."""
    permission_classes = [IsAdmin]

    def post(self, request, id):
        serializer = MoverApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mover = get_object_or_404(MoverProfile, id=id)
        mover.verification_status = MoverProfile.VerificationStatus.SUSPENDED
        mover.rejection_reason = serializer.validated_data.get('rejection_reason', '')
        mover.save()
        logger.info(f"Mover {mover.company_name} (id={mover.id}) suspended by {request.user.email}")
        return Response(AdminMoverProfileSerializer(mover).data)


# ──────────────────────────────────────────────
# Onboarding Views
# ──────────────────────────────────────────────

class OnboardingStatusView(APIView):
    """Get mover onboarding status."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_mover or not hasattr(request.user, 'mover_profile'):
            return Response({'error': 'Not a mover'}, status=status.HTTP_400_BAD_REQUEST)
        profile = request.user.mover_profile
        return Response({
            'onboarding_completed': profile.onboarding_completed,
            'onboarding_step': profile.onboarding_step,
            'verification_status': profile.verification_status,
            'phone_verified': request.user.phone_verified,
        })


class OnboardingCompleteView(APIView):
    """Mark onboarding as complete."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_mover or not hasattr(request.user, 'mover_profile'):
            return Response({'error': 'Not a mover'}, status=status.HTTP_400_BAD_REQUEST)
        profile = request.user.mover_profile
        profile.onboarding_completed = True
        profile.onboarding_step = 4
        profile.save(update_fields=['onboarding_completed', 'onboarding_step'])
        return Response({'message': 'Onboarding completed', 'onboarding_completed': True})


class OnboardingStepView(APIView):
    """Update current onboarding step."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_mover or not hasattr(request.user, 'mover_profile'):
            return Response({'error': 'Not a mover'}, status=status.HTTP_400_BAD_REQUEST)
        step = request.data.get('step', 0)
        profile = request.user.mover_profile
        profile.onboarding_step = step
        profile.save(update_fields=['onboarding_step'])
        return Response({'onboarding_step': step})

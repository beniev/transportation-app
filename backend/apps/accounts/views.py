"""
Views for the accounts app.
"""
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
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
)

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
        user_type = request.data.get('user_type', 'customer')  # 'customer' or 'mover'
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
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'user_type': user_type,  # 'mover' or 'customer'
                    'email_verified': True,  # Google already verified email
                }
            )

            if created:
                # Create appropriate profile for new user
                if user_type == 'mover':
                    MoverProfile.objects.create(
                        user=user,
                        company_name=f"{first_name} {last_name}",
                        company_name_he=f"{first_name} {last_name}",
                    )
                else:
                    CustomerProfile.objects.create(user=user)
            else:
                # Update user info from Google
                update_fields = []
                if not user.first_name and first_name:
                    user.first_name = first_name
                    update_fields.append('first_name')
                if not user.last_name and last_name:
                    user.last_name = last_name
                    update_fields.append('last_name')

                # If user_type was explicitly provided and is different, switch role
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
    """Request phone verification code."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RequestVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data['phone']
        user = request.user

        # Update user's phone
        user.phone = phone
        user.save()

        # Generate verification code
        if user.is_customer and hasattr(user, 'customer_profile'):
            profile = user.customer_profile

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

            # TODO: Send SMS via Twilio
            # sms_service.send(phone, f"Your verification code is: {code}")

            return Response({
                'message': 'Verification code sent',
                'expires_in': 600  # 10 minutes
            })

        return Response(
            {'error': 'Phone verification not available for this user type'},
            status=status.HTTP_400_BAD_REQUEST
        )


class VerifyPhoneView(APIView):
    """Verify phone with code."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = VerifyPhoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']
        user = request.user

        if not user.is_customer or not hasattr(user, 'customer_profile'):
            return Response(
                {'error': 'Phone verification not available for this user type'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile = user.customer_profile

        # Check if code expired
        if profile.verification_code_expires and timezone.now() > profile.verification_code_expires:
            return Response(
                {'error': 'Verification code expired'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check code
        if profile.verification_code != code:
            profile.spam_score += 1
            profile.save()
            return Response(
                {'error': 'Invalid verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark as verified
        user.phone_verified = True
        user.save()

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

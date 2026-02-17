"""
Serializers for the accounts app.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from dj_rest_auth.registration.serializers import RegisterSerializer

from .models import MoverProfile, CustomerProfile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'user_type', 'preferred_language', 'email_verified',
            'phone_verified', 'date_joined'
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'email_verified', 'phone_verified']


class MoverProfileSerializer(serializers.ModelSerializer):
    """Serializer for MoverProfile model."""
    user = UserSerializer(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = MoverProfile
        fields = [
            'id', 'user', 'email', 'full_name', 'company_name', 'company_name_he',
            'license_number', 'tax_id', 'address', 'city', 'service_areas',
            'base_latitude', 'base_longitude', 'service_radius_km',
            'logo', 'website', 'description', 'description_he',
            'is_verified', 'rating', 'total_reviews', 'completed_orders',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_verified', 'rating', 'total_reviews',
            'completed_orders', 'created_at', 'updated_at'
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name()


class CustomerProfileSerializer(serializers.ModelSerializer):
    """Serializer for CustomerProfile model."""
    user = UserSerializer(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            'id', 'user', 'email', 'full_name', 'is_verified',
            'total_orders', 'default_address', 'default_city',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_orders', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.user.get_full_name()

    def get_is_verified(self, obj):
        return obj.is_verified()


class CustomRegisterSerializer(RegisterSerializer):
    """
    Custom registration serializer with user type and additional fields.
    """
    username = None  # We don't use username
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    user_type = serializers.ChoiceField(
        choices=User.UserType.choices,
        default=User.UserType.CUSTOMER
    )
    preferred_language = serializers.ChoiceField(
        choices=User.Language.choices,
        default=User.Language.HEBREW
    )
    # Mover-specific fields
    company_name = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        """Validate that movers provide a company name."""
        data = super().validate(data)
        if data.get('user_type') == User.UserType.MOVER:
            if not data.get('company_name'):
                raise serializers.ValidationError({
                    'company_name': 'Company name is required for movers.'
                })
        return data

    def get_cleaned_data(self):
        """Get cleaned data for user creation."""
        data = super().get_cleaned_data()
        data.update({
            'first_name': self.validated_data.get('first_name', ''),
            'last_name': self.validated_data.get('last_name', ''),
            'phone': self.validated_data.get('phone', ''),
            'user_type': self.validated_data.get('user_type', User.UserType.CUSTOMER),
            'preferred_language': self.validated_data.get('preferred_language', User.Language.HEBREW),
        })
        return data

    def custom_signup(self, request, user):
        """
        Custom signup to save additional fields.
        This is called by allauth after the user is created.
        """
        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.phone = self.validated_data.get('phone', '')
        user.user_type = self.validated_data.get('user_type', User.UserType.CUSTOMER)
        user.preferred_language = self.validated_data.get('preferred_language', User.Language.HEBREW)
        user.save()

        # Update mover profile with company name if provided
        if user.user_type == User.UserType.MOVER:
            company_name = self.validated_data.get('company_name', '')
            if company_name and hasattr(user, 'mover_profile'):
                user.mover_profile.company_name = company_name
                user.mover_profile.save()

    def save(self, request):
        """Save user and update mover profile if applicable."""
        user = super().save(request)
        return user


class VerifyPhoneSerializer(serializers.Serializer):
    """Serializer for phone verification."""
    code = serializers.CharField(max_length=6, min_length=6)


class RequestVerificationSerializer(serializers.Serializer):
    """Serializer for requesting phone verification."""
    phone = serializers.CharField(max_length=20)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class UpdateUserSerializer(serializers.ModelSerializer):
    """Serializer for updating user details."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'preferred_language']

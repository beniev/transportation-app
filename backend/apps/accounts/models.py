"""
User and profile models for the transportation app.
Supports both movers and customers with different profile types.
"""
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from decimal import Decimal

from apps.core.models import TimeStampedModel


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError(_('Email is required'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('user_type', User.UserType.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """
    Custom user model using email as the unique identifier.
    Supports different user types: mover, customer, and admin.
    """

    class UserType(models.TextChoices):
        MOVER = 'mover', _('Mover')
        CUSTOMER = 'customer', _('Customer')
        ADMIN = 'admin', _('Admin')

    class Language(models.TextChoices):
        HEBREW = 'he', _('Hebrew')
        ENGLISH = 'en', _('English')

    email = models.EmailField(
        _('email address'),
        unique=True
    )
    first_name = models.CharField(
        _('first name'),
        max_length=150,
        blank=True
    )
    last_name = models.CharField(
        _('last name'),
        max_length=150,
        blank=True
    )
    phone = models.CharField(
        _('phone number'),
        max_length=20,
        blank=True
    )
    user_type = models.CharField(
        _('user type'),
        max_length=20,
        choices=UserType.choices,
        default=UserType.CUSTOMER
    )
    preferred_language = models.CharField(
        _('preferred language'),
        max_length=2,
        choices=Language.choices,
        default=Language.HEBREW
    )
    is_staff = models.BooleanField(
        _('staff status'),
        default=False
    )
    is_active = models.BooleanField(
        _('active'),
        default=True
    )
    email_verified = models.BooleanField(
        _('email verified'),
        default=False
    )
    phone_verified = models.BooleanField(
        _('phone verified'),
        default=False
    )
    date_joined = models.DateTimeField(
        _('date joined'),
        default=timezone.now
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def __str__(self):
        return self.email

    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f'{self.first_name} {self.last_name}'.strip()
        return full_name or self.email

    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name or self.email.split('@')[0]

    @property
    def is_mover(self) -> bool:
        """Check if user is a mover."""
        return self.user_type == self.UserType.MOVER

    @property
    def is_customer(self) -> bool:
        """Check if user is a customer."""
        return self.user_type == self.UserType.CUSTOMER


class MoverProfile(TimeStampedModel):
    """
    Extended profile for movers.
    Contains business information and settings.
    """

    class VerificationStatus(models.TextChoices):
        PENDING = 'pending', _('Pending')
        APPROVED = 'approved', _('Approved')
        REJECTED = 'rejected', _('Rejected')
        SUSPENDED = 'suspended', _('Suspended')

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='mover_profile'
    )
    company_name = models.CharField(
        _('company name'),
        max_length=255
    )
    company_name_he = models.CharField(
        _('company name (Hebrew)'),
        max_length=255,
        blank=True
    )
    license_number = models.CharField(
        _('license number'),
        max_length=50,
        blank=True
    )
    tax_id = models.CharField(
        _('tax ID'),
        max_length=20,
        blank=True
    )
    address = models.TextField(
        _('address'),
        blank=True
    )
    city = models.CharField(
        _('city'),
        max_length=100,
        blank=True
    )
    service_areas = models.JSONField(
        _('service areas'),
        default=list,
        help_text=_('List of cities/regions the mover serves (legacy)')
    )
    base_latitude = models.DecimalField(
        _('base latitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        help_text=_('Latitude of mover base location')
    )
    base_longitude = models.DecimalField(
        _('base longitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        help_text=_('Longitude of mover base location')
    )
    service_radius_km = models.DecimalField(
        _('service radius (km)'),
        max_digits=6,
        decimal_places=1,
        default=Decimal('50.0'),
        help_text=_('Maximum radius in km from base location for pickup')
    )
    logo = models.ImageField(
        _('logo'),
        upload_to='mover_logos/',
        blank=True,
        null=True
    )
    website = models.URLField(
        _('website'),
        blank=True
    )
    facebook_url = models.URLField(
        _('Facebook URL'),
        blank=True,
    )
    description = models.TextField(
        _('description'),
        blank=True
    )
    description_he = models.TextField(
        _('description (Hebrew)'),
        blank=True
    )

    # Verification / Approval
    is_verified = models.BooleanField(
        _('verified'),
        default=False,
        help_text=_('Admin verified business — synced from verification_status')
    )
    verification_status = models.CharField(
        _('verification status'),
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    rejection_reason = models.TextField(
        _('rejection reason'),
        blank=True,
    )
    verified_at = models.DateTimeField(
        _('verified at'),
        null=True,
        blank=True,
    )

    # Stats
    rating = models.DecimalField(
        _('rating'),
        max_digits=3,
        decimal_places=2,
        default=0.00
    )
    total_reviews = models.IntegerField(
        _('total reviews'),
        default=0
    )
    completed_orders = models.IntegerField(
        _('completed orders'),
        default=0
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_('Mover is accepting new orders')
    )

    # Phone verification (for onboarding)
    verification_code = models.CharField(
        _('verification code'),
        max_length=6,
        blank=True,
    )
    verification_code_expires = models.DateTimeField(
        _('verification code expires'),
        null=True,
        blank=True,
    )
    verification_attempts = models.IntegerField(
        _('verification attempts'),
        default=0,
    )

    # Onboarding
    onboarding_completed = models.BooleanField(
        _('onboarding completed'),
        default=False,
    )
    onboarding_step = models.IntegerField(
        _('onboarding step'),
        default=0,
        help_text=_('0=not started, 1=pricing, 2=service area, 3=phone, 4=complete'),
    )

    class Meta:
        db_table = 'mover_profiles'
        verbose_name = _('mover profile')
        verbose_name_plural = _('mover profiles')

    def __str__(self):
        return self.company_name

    def save(self, *args, **kwargs):
        # Sync is_verified with verification_status
        self.is_verified = (self.verification_status == self.VerificationStatus.APPROVED)
        super().save(*args, **kwargs)

    def get_company_name(self, language: str = 'en') -> str:
        """Get company name in the specified language."""
        if language == 'he' and self.company_name_he:
            return self.company_name_he
        return self.company_name

    def can_request_verification(self) -> bool:
        """Check if mover can request new verification code."""
        if self.verification_attempts >= 5:
            return False
        if self.verification_code_expires:
            return timezone.now() > self.verification_code_expires
        return True

    def update_rating(self):
        """Recalculate average rating from all reviews."""
        from apps.orders.models import Review
        from django.db.models import Avg, Count
        stats = Review.objects.filter(mover=self).aggregate(
            avg_rating=Avg('rating'),
            count=Count('id'),
        )
        self.rating = Decimal(str(stats['avg_rating'] or 0)).quantize(Decimal('0.01'))
        self.total_reviews = stats['count']
        self.save(update_fields=['rating', 'total_reviews'])


class CustomerProfile(TimeStampedModel):
    """
    Extended profile for customers.
    Contains verification and anti-spam measures.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='customer_profile'
    )
    # Verification
    verification_code = models.CharField(
        _('verification code'),
        max_length=6,
        blank=True
    )
    verification_code_expires = models.DateTimeField(
        _('verification code expires'),
        null=True,
        blank=True
    )
    verification_attempts = models.IntegerField(
        _('verification attempts'),
        default=0
    )
    # Anti-spam
    spam_score = models.IntegerField(
        _('spam score'),
        default=0,
        help_text=_('Higher score = more likely spam')
    )
    total_orders = models.IntegerField(
        _('total orders'),
        default=0
    )
    # Preferences
    default_address = models.TextField(
        _('default address'),
        blank=True
    )
    default_city = models.CharField(
        _('default city'),
        max_length=100,
        blank=True
    )

    class Meta:
        db_table = 'customer_profiles'
        verbose_name = _('customer profile')
        verbose_name_plural = _('customer profiles')

    def __str__(self):
        return f"Customer: {self.user.email}"

    def is_verified(self) -> bool:
        """Check if customer is verified (phone verified)."""
        return self.user.phone_verified

    def can_request_verification(self) -> bool:
        """Check if customer can request new verification code."""
        if self.verification_attempts >= 5:
            return False
        if self.verification_code_expires:
            return timezone.now() > self.verification_code_expires
        return True

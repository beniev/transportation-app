"""
Models for the payments app.
Handles subscription plans, subscriptions, and payment transactions.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from decimal import Decimal

from apps.core.models import TimeStampedModel


class SubscriptionPlan(TimeStampedModel):
    """
    Available subscription plans for movers.
    Freemium model with Free, Basic, and Pro tiers.
    """

    class PlanType(models.TextChoices):
        FREE = 'free', _('Free')
        BASIC = 'basic', _('Basic')
        PRO = 'pro', _('Pro')
        ENTERPRISE = 'enterprise', _('Enterprise')

    name = models.CharField(
        _('plan name'),
        max_length=50
    )
    name_he = models.CharField(
        _('plan name (Hebrew)'),
        max_length=50
    )
    plan_type = models.CharField(
        _('plan type'),
        max_length=20,
        choices=PlanType.choices,
        unique=True
    )
    description = models.TextField(
        _('description'),
        blank=True
    )
    description_he = models.TextField(
        _('description (Hebrew)'),
        blank=True
    )

    # Pricing
    price_monthly = models.DecimalField(
        _('monthly price'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    price_yearly = models.DecimalField(
        _('yearly price'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Discounted yearly price')
    )
    currency = models.CharField(
        _('currency'),
        max_length=3,
        default='ILS'
    )

    # Limits
    max_orders_per_month = models.PositiveIntegerField(
        _('max orders per month'),
        null=True,
        blank=True,
        help_text=_('Leave empty for unlimited')
    )
    max_quotes_per_month = models.PositiveIntegerField(
        _('max quotes per month'),
        null=True,
        blank=True
    )

    # Feature flags
    has_ai_parsing = models.BooleanField(
        _('AI item parsing'),
        default=False
    )
    has_ai_images = models.BooleanField(
        _('AI image analysis'),
        default=False
    )
    has_digital_signatures = models.BooleanField(
        _('digital signatures'),
        default=False
    )
    has_sms_notifications = models.BooleanField(
        _('SMS notifications'),
        default=False
    )
    has_advanced_analytics = models.BooleanField(
        _('advanced analytics'),
        default=False
    )
    has_priority_support = models.BooleanField(
        _('priority support'),
        default=False
    )
    has_custom_branding = models.BooleanField(
        _('custom branding'),
        default=False
    )
    has_api_access = models.BooleanField(
        _('API access'),
        default=False
    )

    # Status
    is_active = models.BooleanField(
        _('is active'),
        default=True
    )
    is_popular = models.BooleanField(
        _('is popular'),
        default=False,
        help_text=_('Highlight this plan as popular')
    )
    display_order = models.PositiveIntegerField(
        _('display order'),
        default=0
    )

    class Meta:
        db_table = 'subscription_plans'
        verbose_name = _('subscription plan')
        verbose_name_plural = _('subscription plans')
        ordering = ['display_order']

    def __str__(self):
        return f"{self.name} (₪{self.price_monthly}/month)"

    @property
    def yearly_savings(self):
        """Calculate yearly savings compared to monthly."""
        monthly_total = self.price_monthly * 12
        return monthly_total - self.price_yearly

    @property
    def yearly_discount_percent(self):
        """Calculate yearly discount percentage."""
        if self.price_monthly <= 0:
            return 0
        monthly_total = self.price_monthly * 12
        if monthly_total <= 0:
            return 0
        return int(((monthly_total - self.price_yearly) / monthly_total) * 100)


class Subscription(TimeStampedModel):
    """
    Mover's active subscription.
    """

    class Status(models.TextChoices):
        ACTIVE = 'active', _('Active')
        TRIALING = 'trialing', _('Trialing')
        PAST_DUE = 'past_due', _('Past Due')
        CANCELLED = 'cancelled', _('Cancelled')
        EXPIRED = 'expired', _('Expired')

    class BillingCycle(models.TextChoices):
        MONTHLY = 'monthly', _('Monthly')
        YEARLY = 'yearly', _('Yearly')

    mover = models.OneToOneField(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='subscription',
        verbose_name=_('mover')
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        verbose_name=_('plan')
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    billing_cycle = models.CharField(
        _('billing cycle'),
        max_length=10,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY
    )

    # Dates
    started_at = models.DateTimeField(
        _('started at'),
        auto_now_add=True
    )
    current_period_start = models.DateTimeField(
        _('current period start')
    )
    current_period_end = models.DateTimeField(
        _('current period end')
    )
    trial_end = models.DateTimeField(
        _('trial end'),
        null=True,
        blank=True
    )
    cancelled_at = models.DateTimeField(
        _('cancelled at'),
        null=True,
        blank=True
    )

    # External payment provider
    external_subscription_id = models.CharField(
        _('external subscription ID'),
        max_length=255,
        blank=True,
        help_text=_('ID from payment provider (Stripe, Tranzila, etc.)')
    )
    external_customer_id = models.CharField(
        _('external customer ID'),
        max_length=255,
        blank=True
    )

    # Usage tracking
    orders_used_this_month = models.PositiveIntegerField(
        _('orders used this month'),
        default=0
    )
    quotes_used_this_month = models.PositiveIntegerField(
        _('quotes used this month'),
        default=0
    )
    usage_reset_date = models.DateField(
        _('usage reset date'),
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'subscriptions'
        verbose_name = _('subscription')
        verbose_name_plural = _('subscriptions')

    def __str__(self):
        return f"{self.mover.company_name} - {self.plan.name}"

    @property
    def is_active(self):
        """Check if subscription is currently active."""
        return self.status in [self.Status.ACTIVE, self.Status.TRIALING]

    @property
    def is_trialing(self):
        """Check if subscription is in trial period."""
        return self.status == self.Status.TRIALING

    def can_create_order(self):
        """Check if mover can create more orders."""
        if not self.is_active:
            return False
        if self.plan.max_orders_per_month is None:
            return True
        return self.orders_used_this_month < self.plan.max_orders_per_month

    def can_create_quote(self):
        """Check if mover can create more quotes."""
        if not self.is_active:
            return False
        if self.plan.max_quotes_per_month is None:
            return True
        return self.quotes_used_this_month < self.plan.max_quotes_per_month

    def has_feature(self, feature_name: str) -> bool:
        """Check if subscription includes a specific feature."""
        feature_map = {
            'ai_parsing': self.plan.has_ai_parsing,
            'ai_images': self.plan.has_ai_images,
            'digital_signatures': self.plan.has_digital_signatures,
            'sms_notifications': self.plan.has_sms_notifications,
            'advanced_analytics': self.plan.has_advanced_analytics,
            'priority_support': self.plan.has_priority_support,
            'custom_branding': self.plan.has_custom_branding,
            'api_access': self.plan.has_api_access,
        }
        return self.is_active and feature_map.get(feature_name, False)

    def increment_order_usage(self):
        """Increment order usage counter."""
        self.orders_used_this_month += 1
        self.save(update_fields=['orders_used_this_month'])

    def increment_quote_usage(self):
        """Increment quote usage counter."""
        self.quotes_used_this_month += 1
        self.save(update_fields=['quotes_used_this_month'])

    def reset_usage(self):
        """Reset monthly usage counters."""
        self.orders_used_this_month = 0
        self.quotes_used_this_month = 0
        self.usage_reset_date = None
        self.save(update_fields=[
            'orders_used_this_month',
            'quotes_used_this_month',
            'usage_reset_date'
        ])


class Payment(TimeStampedModel):
    """
    Payment transaction record.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        PROCESSING = 'processing', _('Processing')
        COMPLETED = 'completed', _('Completed')
        FAILED = 'failed', _('Failed')
        REFUNDED = 'refunded', _('Refunded')
        PARTIALLY_REFUNDED = 'partially_refunded', _('Partially Refunded')

    class PaymentType(models.TextChoices):
        SUBSCRIPTION = 'subscription', _('Subscription')
        ONE_TIME = 'one_time', _('One Time')
        REFUND = 'refund', _('Refund')

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name=_('subscription')
    )
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name=_('mover')
    )

    # Payment details
    amount = models.DecimalField(
        _('amount'),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    currency = models.CharField(
        _('currency'),
        max_length=3,
        default='ILS'
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    payment_type = models.CharField(
        _('payment type'),
        max_length=20,
        choices=PaymentType.choices,
        default=PaymentType.SUBSCRIPTION
    )

    # Payment method
    payment_method = models.CharField(
        _('payment method'),
        max_length=50,
        blank=True,
        help_text=_('e.g., credit_card, bank_transfer')
    )
    last_four_digits = models.CharField(
        _('last 4 digits'),
        max_length=4,
        blank=True
    )
    card_brand = models.CharField(
        _('card brand'),
        max_length=20,
        blank=True
    )

    # External provider
    external_payment_id = models.CharField(
        _('external payment ID'),
        max_length=255,
        blank=True
    )
    external_invoice_id = models.CharField(
        _('external invoice ID'),
        max_length=255,
        blank=True
    )

    # Billing info
    billing_email = models.EmailField(
        _('billing email'),
        blank=True
    )
    billing_name = models.CharField(
        _('billing name'),
        max_length=255,
        blank=True
    )

    # Description
    description = models.CharField(
        _('description'),
        max_length=255,
        blank=True
    )

    # Dates
    paid_at = models.DateTimeField(
        _('paid at'),
        null=True,
        blank=True
    )
    refunded_at = models.DateTimeField(
        _('refunded at'),
        null=True,
        blank=True
    )

    # Refund details
    refund_amount = models.DecimalField(
        _('refund amount'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    refund_reason = models.TextField(
        _('refund reason'),
        blank=True
    )

    # Error handling
    error_message = models.TextField(
        _('error message'),
        blank=True
    )
    error_code = models.CharField(
        _('error code'),
        max_length=50,
        blank=True
    )

    # Invoice
    invoice_number = models.CharField(
        _('invoice number'),
        max_length=50,
        unique=True,
        null=True,
        blank=True
    )
    invoice_pdf = models.FileField(
        _('invoice PDF'),
        upload_to='payments/invoices/',
        blank=True,
        null=True
    )

    class Meta:
        db_table = 'payments'
        verbose_name = _('payment')
        verbose_name_plural = _('payments')
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id} - ₪{self.amount} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.invoice_number and self.status == self.Status.COMPLETED:
            # Generate invoice number
            import datetime
            today = datetime.date.today()
            prefix = f"INV{today.strftime('%Y%m')}"
            last_payment = Payment.objects.filter(
                invoice_number__startswith=prefix
            ).order_by('-invoice_number').first()

            if last_payment and last_payment.invoice_number:
                last_num = int(last_payment.invoice_number[-5:])
                new_num = last_num + 1
            else:
                new_num = 1

            self.invoice_number = f"{prefix}{new_num:05d}"

        super().save(*args, **kwargs)


class PaymentMethod(TimeStampedModel):
    """
    Saved payment methods for movers.
    """

    class MethodType(models.TextChoices):
        CREDIT_CARD = 'credit_card', _('Credit Card')
        DEBIT_CARD = 'debit_card', _('Debit Card')
        BANK_TRANSFER = 'bank_transfer', _('Bank Transfer')

    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='payment_methods',
        verbose_name=_('mover')
    )
    method_type = models.CharField(
        _('method type'),
        max_length=20,
        choices=MethodType.choices,
        default=MethodType.CREDIT_CARD
    )
    is_default = models.BooleanField(
        _('is default'),
        default=False
    )

    # Card details (tokenized)
    last_four_digits = models.CharField(
        _('last 4 digits'),
        max_length=4
    )
    card_brand = models.CharField(
        _('card brand'),
        max_length=20,
        blank=True
    )
    expiry_month = models.PositiveIntegerField(
        _('expiry month'),
        null=True,
        blank=True
    )
    expiry_year = models.PositiveIntegerField(
        _('expiry year'),
        null=True,
        blank=True
    )

    # External token
    external_token = models.CharField(
        _('external token'),
        max_length=255,
        help_text=_('Tokenized card from payment provider')
    )
    external_payment_method_id = models.CharField(
        _('external payment method ID'),
        max_length=255,
        blank=True
    )

    # Billing address
    billing_name = models.CharField(
        _('billing name'),
        max_length=255,
        blank=True
    )
    billing_email = models.EmailField(
        _('billing email'),
        blank=True
    )

    class Meta:
        db_table = 'payment_methods'
        verbose_name = _('payment method')
        verbose_name_plural = _('payment methods')

    def __str__(self):
        return f"{self.card_brand} ****{self.last_four_digits}"

    def save(self, *args, **kwargs):
        # Ensure only one default per mover
        if self.is_default:
            PaymentMethod.objects.filter(
                mover=self.mover,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        """Check if card is expired."""
        if not self.expiry_month or not self.expiry_year:
            return False
        import datetime
        today = datetime.date.today()
        expiry = datetime.date(self.expiry_year, self.expiry_month, 1)
        return expiry < today


class Coupon(TimeStampedModel):
    """
    Discount coupons for subscriptions.
    """

    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', _('Percentage')
        FIXED = 'fixed', _('Fixed Amount')

    code = models.CharField(
        _('coupon code'),
        max_length=50,
        unique=True
    )
    description = models.CharField(
        _('description'),
        max_length=255,
        blank=True
    )
    discount_type = models.CharField(
        _('discount type'),
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE
    )
    discount_value = models.DecimalField(
        _('discount value'),
        max_digits=10,
        decimal_places=2,
        help_text=_('Percentage (0-100) or fixed amount')
    )

    # Validity
    valid_from = models.DateTimeField(
        _('valid from')
    )
    valid_until = models.DateTimeField(
        _('valid until')
    )
    max_uses = models.PositiveIntegerField(
        _('max uses'),
        null=True,
        blank=True,
        help_text=_('Leave empty for unlimited')
    )
    times_used = models.PositiveIntegerField(
        _('times used'),
        default=0
    )

    # Restrictions
    applicable_plans = models.ManyToManyField(
        SubscriptionPlan,
        blank=True,
        related_name='coupons',
        verbose_name=_('applicable plans'),
        help_text=_('Leave empty for all plans')
    )
    first_time_only = models.BooleanField(
        _('first time subscribers only'),
        default=False
    )

    is_active = models.BooleanField(
        _('is active'),
        default=True
    )

    class Meta:
        db_table = 'coupons'
        verbose_name = _('coupon')
        verbose_name_plural = _('coupons')

    def __str__(self):
        if self.discount_type == self.DiscountType.PERCENTAGE:
            return f"{self.code} ({self.discount_value}% off)"
        return f"{self.code} (₪{self.discount_value} off)"

    @property
    def is_valid(self):
        """Check if coupon is currently valid."""
        from django.utils import timezone
        now = timezone.now()
        if not self.is_active:
            return False
        if now < self.valid_from or now > self.valid_until:
            return False
        if self.max_uses and self.times_used >= self.max_uses:
            return False
        return True

    def calculate_discount(self, original_price: Decimal) -> Decimal:
        """Calculate discount amount."""
        if self.discount_type == self.DiscountType.PERCENTAGE:
            return (original_price * self.discount_value / 100).quantize(Decimal('0.01'))
        return min(self.discount_value, original_price)

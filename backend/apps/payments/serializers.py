"""
Serializers for the payments app.
"""
from rest_framework import serializers
from django.utils import timezone

from .models import SubscriptionPlan, Subscription, Payment, PaymentMethod, Coupon


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans."""

    yearly_savings = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    yearly_discount_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'name_he', 'plan_type',
            'description', 'description_he',
            'price_monthly', 'price_yearly', 'currency',
            'max_orders_per_month', 'max_quotes_per_month',
            'has_ai_parsing', 'has_ai_images', 'has_digital_signatures',
            'has_sms_notifications', 'has_advanced_analytics',
            'has_priority_support', 'has_custom_branding', 'has_api_access',
            'is_active', 'is_popular', 'display_order',
            'yearly_savings', 'yearly_discount_percent'
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscriptions."""

    plan = SubscriptionPlanSerializer(read_only=True)
    plan_id = serializers.UUIDField(write_only=True, required=False)
    is_active = serializers.BooleanField(read_only=True)
    is_trialing = serializers.BooleanField(read_only=True)
    can_create_order = serializers.SerializerMethodField()
    can_create_quote = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'plan_id', 'status', 'billing_cycle',
            'started_at', 'current_period_start', 'current_period_end',
            'trial_end', 'cancelled_at',
            'orders_used_this_month', 'quotes_used_this_month',
            'is_active', 'is_trialing',
            'can_create_order', 'can_create_quote',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'started_at',
            'current_period_start', 'current_period_end',
            'trial_end', 'cancelled_at',
            'orders_used_this_month', 'quotes_used_this_month',
            'created_at', 'updated_at'
        ]

    def get_can_create_order(self, obj):
        return obj.can_create_order()

    def get_can_create_quote(self, obj):
        return obj.can_create_quote()


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for payment methods."""

    is_expired = serializers.BooleanField(read_only=True)
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'method_type', 'is_default',
            'last_four_digits', 'card_brand',
            'expiry_month', 'expiry_year',
            'billing_name', 'billing_email',
            'is_expired', 'display_name',
            'created_at'
        ]
        read_only_fields = [
            'id', 'last_four_digits', 'card_brand',
            'expiry_month', 'expiry_year',
            'created_at'
        ]

    def get_display_name(self, obj):
        return f"{obj.card_brand} ****{obj.last_four_digits}"


class PaymentMethodCreateSerializer(serializers.Serializer):
    """Serializer for creating payment methods."""

    card_number = serializers.CharField(max_length=19)
    expiry_month = serializers.IntegerField(min_value=1, max_value=12)
    expiry_year = serializers.IntegerField(min_value=2024)
    cvv = serializers.CharField(max_length=4, min_length=3)
    holder_name = serializers.CharField(max_length=255)
    is_default = serializers.BooleanField(default=True)
    billing_email = serializers.EmailField(required=False)

    def validate_card_number(self, value):
        # Remove spaces and dashes
        value = value.replace(' ', '').replace('-', '')
        if not value.isdigit():
            raise serializers.ValidationError("Invalid card number")
        if len(value) < 13 or len(value) > 19:
            raise serializers.ValidationError("Invalid card number length")
        return value

    def validate_expiry_year(self, value):
        current_year = timezone.now().year
        if value < current_year:
            raise serializers.ValidationError("Card has expired")
        if value > current_year + 20:
            raise serializers.ValidationError("Invalid expiry year")
        return value

    def validate(self, data):
        # Check if card is not expired
        current_date = timezone.now()
        expiry_month = data['expiry_month']
        expiry_year = data['expiry_year']

        if expiry_year == current_date.year and expiry_month < current_date.month:
            raise serializers.ValidationError("Card has expired")

        return data


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payments."""

    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'currency', 'status', 'payment_type',
            'payment_method', 'last_four_digits', 'card_brand',
            'description', 'invoice_number',
            'paid_at', 'refunded_at', 'refund_amount',
            'created_at'
        ]


class PaymentHistorySerializer(serializers.ModelSerializer):
    """Lightweight serializer for payment history."""

    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'currency', 'status',
            'description', 'invoice_number', 'paid_at', 'created_at'
        ]


class CouponSerializer(serializers.ModelSerializer):
    """Serializer for coupons."""

    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Coupon
        fields = [
            'code', 'description', 'discount_type', 'discount_value',
            'valid_from', 'valid_until', 'is_valid'
        ]


class ValidateCouponSerializer(serializers.Serializer):
    """Serializer for validating coupon codes."""

    code = serializers.CharField(max_length=50)
    plan_id = serializers.UUIDField(required=False)

    def validate_code(self, value):
        try:
            coupon = Coupon.objects.get(code=value.upper())
            if not coupon.is_valid:
                raise serializers.ValidationError("Coupon is not valid or has expired")
            return value.upper()
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Invalid coupon code")


class SubscribeSerializer(serializers.Serializer):
    """Serializer for subscription requests."""

    plan_id = serializers.UUIDField()
    billing_cycle = serializers.ChoiceField(
        choices=['monthly', 'yearly'],
        default='monthly'
    )
    payment_method_id = serializers.UUIDField(required=False)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate_plan_id(self, value):
        try:
            plan = SubscriptionPlan.objects.get(id=value, is_active=True)
            if plan.plan_type == SubscriptionPlan.PlanType.FREE:
                raise serializers.ValidationError("Cannot subscribe to free plan")
            return value
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Plan not found")


class ChangePlanSerializer(serializers.Serializer):
    """Serializer for plan changes."""

    plan_id = serializers.UUIDField()
    billing_cycle = serializers.ChoiceField(
        choices=['monthly', 'yearly'],
        required=False
    )

    def validate_plan_id(self, value):
        try:
            SubscriptionPlan.objects.get(id=value, is_active=True)
            return value
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Plan not found")


class CancelSubscriptionSerializer(serializers.Serializer):
    """Serializer for subscription cancellation."""

    immediate = serializers.BooleanField(default=False)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class UsageStatsSerializer(serializers.Serializer):
    """Serializer for usage statistics."""

    orders_used = serializers.IntegerField()
    orders_limit = serializers.IntegerField(allow_null=True)
    orders_remaining = serializers.IntegerField(allow_null=True)
    quotes_used = serializers.IntegerField()
    quotes_limit = serializers.IntegerField(allow_null=True)
    quotes_remaining = serializers.IntegerField(allow_null=True)
    period_end = serializers.CharField()

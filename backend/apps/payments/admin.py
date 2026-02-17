"""
Admin configuration for the payments app.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import SubscriptionPlan, Subscription, Payment, PaymentMethod, Coupon


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'plan_type', 'price_monthly', 'price_yearly',
        'max_orders_per_month', 'is_active', 'is_popular', 'display_order'
    ]
    list_filter = ['plan_type', 'is_active', 'is_popular']
    list_editable = ['display_order', 'is_active', 'is_popular']
    search_fields = ['name', 'name_he']
    ordering = ['display_order']

    fieldsets = (
        (None, {
            'fields': ('name', 'name_he', 'plan_type', 'description', 'description_he')
        }),
        ('Pricing', {
            'fields': ('price_monthly', 'price_yearly', 'currency')
        }),
        ('Limits', {
            'fields': ('max_orders_per_month', 'max_quotes_per_month')
        }),
        ('Features', {
            'fields': (
                'has_ai_parsing', 'has_ai_images', 'has_digital_signatures',
                'has_sms_notifications', 'has_advanced_analytics',
                'has_priority_support', 'has_custom_branding', 'has_api_access'
            )
        }),
        ('Display', {
            'fields': ('is_active', 'is_popular', 'display_order')
        }),
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'mover', 'plan', 'status', 'billing_cycle',
        'current_period_end', 'orders_used_this_month', 'created_at'
    ]
    list_filter = ['status', 'billing_cycle', 'plan']
    search_fields = ['mover__company_name', 'mover__user__email']
    readonly_fields = [
        'started_at', 'cancelled_at',
        'orders_used_this_month', 'quotes_used_this_month',
        'created_at', 'updated_at'
    ]
    raw_id_fields = ['mover', 'plan']

    fieldsets = (
        (None, {
            'fields': ('mover', 'plan', 'status', 'billing_cycle')
        }),
        ('Period', {
            'fields': (
                'started_at', 'current_period_start', 'current_period_end',
                'trial_end', 'cancelled_at'
            )
        }),
        ('External IDs', {
            'fields': ('external_subscription_id', 'external_customer_id'),
            'classes': ('collapse',)
        }),
        ('Usage', {
            'fields': (
                'orders_used_this_month', 'quotes_used_this_month',
                'usage_reset_date'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'mover', 'amount', 'currency', 'status',
        'payment_type', 'invoice_number', 'paid_at', 'created_at'
    ]
    list_filter = ['status', 'payment_type', 'currency', 'created_at']
    search_fields = [
        'mover__company_name', 'invoice_number',
        'external_payment_id', 'billing_email'
    ]
    readonly_fields = [
        'invoice_number', 'paid_at', 'refunded_at',
        'created_at', 'updated_at'
    ]
    raw_id_fields = ['mover', 'subscription']

    fieldsets = (
        (None, {
            'fields': ('mover', 'subscription', 'status', 'payment_type')
        }),
        ('Amount', {
            'fields': ('amount', 'currency', 'description')
        }),
        ('Payment Method', {
            'fields': ('payment_method', 'last_four_digits', 'card_brand')
        }),
        ('External IDs', {
            'fields': ('external_payment_id', 'external_invoice_id'),
            'classes': ('collapse',)
        }),
        ('Billing', {
            'fields': ('billing_email', 'billing_name')
        }),
        ('Dates', {
            'fields': ('paid_at', 'refunded_at')
        }),
        ('Refund', {
            'fields': ('refund_amount', 'refund_reason'),
            'classes': ('collapse',)
        }),
        ('Errors', {
            'fields': ('error_message', 'error_code'),
            'classes': ('collapse',)
        }),
        ('Invoice', {
            'fields': ('invoice_number', 'invoice_pdf')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = [
        'mover', 'method_type', 'card_brand', 'last_four_digits',
        'expiry_display', 'is_default', 'created_at'
    ]
    list_filter = ['method_type', 'card_brand', 'is_default']
    search_fields = ['mover__company_name', 'billing_name', 'billing_email']
    readonly_fields = [
        'external_token', 'external_payment_method_id',
        'created_at', 'updated_at'
    ]
    raw_id_fields = ['mover']

    def expiry_display(self, obj):
        if obj.expiry_month and obj.expiry_year:
            return f"{obj.expiry_month:02d}/{obj.expiry_year}"
        return '-'
    expiry_display.short_description = 'Expiry'


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'discount_display', 'valid_from', 'valid_until',
        'usage_display', 'is_active', 'is_valid'
    ]
    list_filter = ['discount_type', 'is_active', 'first_time_only']
    search_fields = ['code', 'description']
    filter_horizontal = ['applicable_plans']
    readonly_fields = ['times_used']

    fieldsets = (
        (None, {
            'fields': ('code', 'description', 'is_active')
        }),
        ('Discount', {
            'fields': ('discount_type', 'discount_value')
        }),
        ('Validity', {
            'fields': ('valid_from', 'valid_until', 'max_uses', 'times_used')
        }),
        ('Restrictions', {
            'fields': ('applicable_plans', 'first_time_only')
        }),
    )

    def discount_display(self, obj):
        if obj.discount_type == Coupon.DiscountType.PERCENTAGE:
            return f"{obj.discount_value}%"
        return f"₪{obj.discount_value}"
    discount_display.short_description = 'Discount'

    def usage_display(self, obj):
        if obj.max_uses:
            return f"{obj.times_used}/{obj.max_uses}"
        return f"{obj.times_used}/∞"
    usage_display.short_description = 'Usage'

    def is_valid(self, obj):
        return obj.is_valid
    is_valid.boolean = True

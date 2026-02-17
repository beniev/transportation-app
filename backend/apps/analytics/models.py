"""
Models for the analytics app.
Tracks events and aggregated statistics for movers.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from decimal import Decimal

from apps.core.models import TimeStampedModel


class AnalyticsEvent(TimeStampedModel):
    """
    Individual analytics events for tracking user actions.
    """

    class EventType(models.TextChoices):
        # Order events
        ORDER_CREATED = 'order_created', _('Order Created')
        ORDER_APPROVED = 'order_approved', _('Order Approved')
        ORDER_COMPLETED = 'order_completed', _('Order Completed')
        ORDER_CANCELLED = 'order_cancelled', _('Order Cancelled')

        # Quote events
        QUOTE_CREATED = 'quote_created', _('Quote Created')
        QUOTE_SENT = 'quote_sent', _('Quote Sent')
        QUOTE_VIEWED = 'quote_viewed', _('Quote Viewed')
        QUOTE_ACCEPTED = 'quote_accepted', _('Quote Accepted')
        QUOTE_REJECTED = 'quote_rejected', _('Quote Rejected')

        # Booking events
        BOOKING_CREATED = 'booking_created', _('Booking Created')
        BOOKING_CONFIRMED = 'booking_confirmed', _('Booking Confirmed')
        BOOKING_COMPLETED = 'booking_completed', _('Booking Completed')
        BOOKING_CANCELLED = 'booking_cancelled', _('Booking Cancelled')

        # Payment events
        PAYMENT_RECEIVED = 'payment_received', _('Payment Received')
        PAYMENT_FAILED = 'payment_failed', _('Payment Failed')
        SUBSCRIPTION_STARTED = 'subscription_started', _('Subscription Started')
        SUBSCRIPTION_RENEWED = 'subscription_renewed', _('Subscription Renewed')
        SUBSCRIPTION_CANCELLED = 'subscription_cancelled', _('Subscription Cancelled')

        # AI events
        AI_PARSING_USED = 'ai_parsing_used', _('AI Parsing Used')
        AI_IMAGE_ANALYZED = 'ai_image_analyzed', _('AI Image Analyzed')

        # User events
        USER_REGISTERED = 'user_registered', _('User Registered')
        USER_LOGIN = 'user_login', _('User Login')

    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='analytics_events',
        verbose_name=_('mover')
    )
    event_type = models.CharField(
        _('event type'),
        max_length=50,
        choices=EventType.choices
    )

    # Related object
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    object_id = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )
    related_object = GenericForeignKey('content_type', 'object_id')

    # Event data
    value = models.DecimalField(
        _('value'),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Monetary value if applicable')
    )
    metadata = models.JSONField(
        _('metadata'),
        default=dict,
        blank=True
    )

    # Timestamp for event (can be different from created_at)
    event_date = models.DateField(
        _('event date'),
        db_index=True
    )
    event_time = models.TimeField(
        _('event time')
    )

    class Meta:
        db_table = 'analytics_events'
        verbose_name = _('analytics event')
        verbose_name_plural = _('analytics events')
        ordering = ['-event_date', '-event_time']
        indexes = [
            models.Index(fields=['mover', 'event_type']),
            models.Index(fields=['mover', 'event_date']),
        ]

    def __str__(self):
        return f"{self.event_type} - {self.mover.company_name} - {self.event_date}"


class DailyAnalytics(TimeStampedModel):
    """
    Pre-aggregated daily analytics for faster dashboard loading.
    """
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='daily_analytics',
        verbose_name=_('mover')
    )
    date = models.DateField(
        _('date'),
        db_index=True
    )

    # Order metrics
    orders_received = models.PositiveIntegerField(
        _('orders received'),
        default=0
    )
    orders_approved = models.PositiveIntegerField(
        _('orders approved'),
        default=0
    )
    orders_completed = models.PositiveIntegerField(
        _('orders completed'),
        default=0
    )
    orders_cancelled = models.PositiveIntegerField(
        _('orders cancelled'),
        default=0
    )

    # Quote metrics
    quotes_sent = models.PositiveIntegerField(
        _('quotes sent'),
        default=0
    )
    quotes_accepted = models.PositiveIntegerField(
        _('quotes accepted'),
        default=0
    )
    quotes_rejected = models.PositiveIntegerField(
        _('quotes rejected'),
        default=0
    )

    # Revenue metrics
    total_revenue = models.DecimalField(
        _('total revenue'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_quote_value = models.DecimalField(
        _('total quote value'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )

    # Booking metrics
    bookings_created = models.PositiveIntegerField(
        _('bookings created'),
        default=0
    )
    bookings_completed = models.PositiveIntegerField(
        _('bookings completed'),
        default=0
    )

    # AI usage
    ai_parsing_count = models.PositiveIntegerField(
        _('AI parsing count'),
        default=0
    )
    ai_image_count = models.PositiveIntegerField(
        _('AI image count'),
        default=0
    )

    # Conversion rates (calculated)
    quote_acceptance_rate = models.DecimalField(
        _('quote acceptance rate'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    order_completion_rate = models.DecimalField(
        _('order completion rate'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'daily_analytics'
        verbose_name = _('daily analytics')
        verbose_name_plural = _('daily analytics')
        unique_together = ['mover', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.mover.company_name} - {self.date}"

    def calculate_rates(self):
        """Calculate conversion rates."""
        # Quote acceptance rate
        total_quotes = self.quotes_sent
        if total_quotes > 0:
            self.quote_acceptance_rate = (
                Decimal(str(self.quotes_accepted)) / Decimal(str(total_quotes)) * 100
            )
        else:
            self.quote_acceptance_rate = None

        # Order completion rate
        total_orders = self.orders_received
        if total_orders > 0:
            self.order_completion_rate = (
                Decimal(str(self.orders_completed)) / Decimal(str(total_orders)) * 100
            )
        else:
            self.order_completion_rate = None


class MonthlyAnalytics(TimeStampedModel):
    """
    Pre-aggregated monthly analytics for reports.
    """
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='monthly_analytics',
        verbose_name=_('mover')
    )
    year = models.PositiveIntegerField(
        _('year')
    )
    month = models.PositiveIntegerField(
        _('month')
    )

    # Order metrics
    total_orders = models.PositiveIntegerField(
        _('total orders'),
        default=0
    )
    completed_orders = models.PositiveIntegerField(
        _('completed orders'),
        default=0
    )

    # Revenue
    total_revenue = models.DecimalField(
        _('total revenue'),
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00')
    )
    average_order_value = models.DecimalField(
        _('average order value'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    # Quote metrics
    total_quotes = models.PositiveIntegerField(
        _('total quotes'),
        default=0
    )
    accepted_quotes = models.PositiveIntegerField(
        _('accepted quotes'),
        default=0
    )
    quote_acceptance_rate = models.DecimalField(
        _('quote acceptance rate'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )

    # Customer metrics
    new_customers = models.PositiveIntegerField(
        _('new customers'),
        default=0
    )
    repeat_customers = models.PositiveIntegerField(
        _('repeat customers'),
        default=0
    )

    # AI usage
    ai_requests = models.PositiveIntegerField(
        _('AI requests'),
        default=0
    )

    class Meta:
        db_table = 'monthly_analytics'
        verbose_name = _('monthly analytics')
        verbose_name_plural = _('monthly analytics')
        unique_together = ['mover', 'year', 'month']
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.mover.company_name} - {self.year}/{self.month:02d}"


class PopularItem(TimeStampedModel):
    """
    Tracks popular item types for analytics.
    """
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='popular_items',
        verbose_name=_('mover')
    )
    item_type = models.ForeignKey(
        'movers.ItemType',
        on_delete=models.CASCADE,
        related_name='popularity_stats',
        verbose_name=_('item type')
    )
    period_start = models.DateField(
        _('period start')
    )
    period_end = models.DateField(
        _('period end')
    )
    order_count = models.PositiveIntegerField(
        _('order count'),
        default=0
    )
    total_quantity = models.PositiveIntegerField(
        _('total quantity'),
        default=0
    )
    total_revenue = models.DecimalField(
        _('total revenue'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )

    class Meta:
        db_table = 'popular_items'
        verbose_name = _('popular item')
        verbose_name_plural = _('popular items')
        ordering = ['-order_count']

    def __str__(self):
        return f"{self.item_type.name_en} - {self.order_count} orders"

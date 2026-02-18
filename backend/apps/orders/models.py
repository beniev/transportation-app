"""
Models for the orders app.
Contains Order, OrderItem, and Review models.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

from apps.core.models import TimeStampedModel


class Order(TimeStampedModel):
    """
    Main order model.
    Represents a moving order from a customer to a mover.
    """

    class Status(models.TextChoices):
        DRAFT = 'draft', _('Draft')
        PENDING = 'pending', _('Pending')
        COMPARING = 'comparing', _('Comparing')
        QUOTED = 'quoted', _('Quoted')
        APPROVED = 'approved', _('Approved')
        SCHEDULED = 'scheduled', _('Scheduled')
        IN_PROGRESS = 'in_progress', _('In Progress')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')
        REJECTED = 'rejected', _('Rejected')

    # Relationships
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name=_('mover'),
        null=True,
        blank=True
    )
    customer = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name=_('customer')
    )

    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )

    # Customer's original description (for AI processing)
    original_description = models.TextField(
        _('original description'),
        help_text=_('Customer\'s free-text description of items to move'),
        blank=True,
        default=''
    )

    # Origin location
    origin_address = models.TextField(
        _('origin address')
    )
    origin_city = models.CharField(
        _('origin city'),
        max_length=100
    )
    origin_floor = models.IntegerField(
        _('origin floor'),
        default=0
    )
    origin_has_elevator = models.BooleanField(
        _('origin has elevator'),
        default=False
    )
    origin_building_floors = models.IntegerField(
        _('origin building floors'),
        default=1
    )
    origin_distance_to_truck = models.IntegerField(
        _('origin distance to truck (m)'),
        default=0,
        help_text=_('Distance from building entrance to truck parking in meters')
    )
    origin_coordinates = models.JSONField(
        _('origin coordinates'),
        default=dict,
        blank=True,
        help_text=_('{"lat": 0.0, "lng": 0.0}')
    )

    # Destination location
    destination_address = models.TextField(
        _('destination address')
    )
    destination_city = models.CharField(
        _('destination city'),
        max_length=100
    )
    destination_floor = models.IntegerField(
        _('destination floor'),
        default=0
    )
    destination_has_elevator = models.BooleanField(
        _('destination has elevator'),
        default=False
    )
    destination_building_floors = models.IntegerField(
        _('destination building floors'),
        default=1
    )
    destination_distance_to_truck = models.IntegerField(
        _('destination distance to truck (m)'),
        default=0
    )
    destination_coordinates = models.JSONField(
        _('destination coordinates'),
        default=dict,
        blank=True
    )

    # Travel distance
    distance_km = models.DecimalField(
        _('distance (km)'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Distance between origin and destination')
    )
    estimated_duration_minutes = models.IntegerField(
        _('estimated travel duration (minutes)'),
        default=0
    )

    # Scheduling
    class DateFlexibility(models.TextChoices):
        SPECIFIC = 'specific', _('Specific Date')
        RANGE = 'range', _('Date Range')

    date_flexibility = models.CharField(
        _('date flexibility'),
        max_length=20,
        choices=DateFlexibility.choices,
        default=DateFlexibility.SPECIFIC,
        help_text=_('Whether customer wants a specific date or a date range')
    )
    preferred_date = models.DateField(
        _('preferred date'),
        null=True,
        blank=True
    )
    preferred_date_end = models.DateField(
        _('preferred date end'),
        null=True,
        blank=True,
        help_text=_('End date for date range preference. Only used when date_flexibility is "range".')
    )
    preferred_time_slot = models.CharField(
        _('preferred time slot'),
        max_length=50,
        blank=True,
        help_text=_('e.g., "morning", "afternoon", "08:00-12:00"')
    )
    scheduled_date = models.DateField(
        _('scheduled date'),
        null=True,
        blank=True
    )
    scheduled_time = models.TimeField(
        _('scheduled time'),
        null=True,
        blank=True
    )

    # Pricing breakdown
    items_subtotal = models.DecimalField(
        _('items subtotal'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    origin_floor_surcharge = models.DecimalField(
        _('origin floor surcharge'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    destination_floor_surcharge = models.DecimalField(
        _('destination floor surcharge'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    distance_surcharge = models.DecimalField(
        _('distance surcharge'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Surcharge for distance from truck to building')
    )
    travel_cost = models.DecimalField(
        _('travel cost'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Cost for travel between locations')
    )
    seasonal_adjustment = models.DecimalField(
        _('seasonal adjustment'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    day_of_week_adjustment = models.DecimalField(
        _('day of week adjustment'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Weekend/Friday surcharge')
    )
    discount = models.DecimalField(
        _('discount'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_price = models.DecimalField(
        _('total price'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )

    # Images
    images = models.JSONField(
        _('images'),
        default=list,
        help_text=_('List of image URLs')
    )

    # Notes
    customer_notes = models.TextField(
        _('customer notes'),
        blank=True
    )
    mover_notes = models.TextField(
        _('mover notes'),
        blank=True
    )
    internal_notes = models.TextField(
        _('internal notes'),
        blank=True,
        help_text=_('Private notes for admin/mover')
    )

    # AI processing
    ai_processed = models.BooleanField(
        _('AI processed'),
        default=False
    )
    ai_processing_data = models.JSONField(
        _('AI processing data'),
        default=dict,
        blank=True
    )

    class Meta:
        db_table = 'orders'
        verbose_name = _('order')
        verbose_name_plural = _('orders')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['mover', 'status']),
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['scheduled_date']),
            models.Index(fields=['preferred_date', 'preferred_date_end']),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        super().clean()
        if self.date_flexibility == self.DateFlexibility.RANGE:
            if self.preferred_date and self.preferred_date_end:
                if self.preferred_date_end < self.preferred_date:
                    raise ValidationError(
                        {'preferred_date_end': _('End date must be after start date.')}
                    )
                if (self.preferred_date_end - self.preferred_date).days > 30:
                    raise ValidationError(
                        {'preferred_date_end': _('Date range cannot exceed 30 days.')}
                    )

    @property
    def preferred_date_display(self):
        """Return a human-readable date preference string."""
        if not self.preferred_date:
            return None
        if self.date_flexibility == self.DateFlexibility.RANGE and self.preferred_date_end:
            return f"{self.preferred_date.isoformat()} - {self.preferred_date_end.isoformat()}"
        return self.preferred_date.isoformat()

    def __str__(self):
        return f"Order {self.id} - {self.customer.email} -> {self.mover.company_name}"

    def calculate_total(self):
        """Calculate total price from all components."""
        self.total_price = (
            self.items_subtotal +
            self.origin_floor_surcharge +
            self.destination_floor_surcharge +
            self.distance_surcharge +
            self.travel_cost +
            self.seasonal_adjustment +
            self.day_of_week_adjustment -
            self.discount
        )
        return self.total_price


class OrderItem(TimeStampedModel):
    """
    Individual items within an order.
    Can be linked to an ItemType or be custom.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('order')
    )
    item_type = models.ForeignKey(
        'movers.ItemType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items',
        verbose_name=_('item type')
    )

    # Item details (can differ from item_type)
    name = models.CharField(
        _('name'),
        max_length=255
    )
    name_he = models.CharField(
        _('name (Hebrew)'),
        max_length=255,
        blank=True
    )
    description = models.TextField(
        _('description'),
        blank=True
    )
    quantity = models.PositiveIntegerField(
        _('quantity'),
        default=1
    )

    # Item requirements
    requires_assembly = models.BooleanField(
        _('requires assembly'),
        default=False
    )
    requires_disassembly = models.BooleanField(
        _('requires disassembly'),
        default=False
    )
    requires_special_handling = models.BooleanField(
        _('requires special handling'),
        default=False
    )
    is_fragile = models.BooleanField(
        _('is fragile'),
        default=False
    )

    # Room location
    room_name = models.CharField(
        _('room name'),
        max_length=100,
        blank=True,
        help_text=_('e.g., "Living Room", "Bedroom 1"')
    )
    room_floor = models.IntegerField(
        _('room floor'),
        default=0,
        help_text=_('Floor within the building')
    )

    # Pricing
    unit_price = models.DecimalField(
        _('unit price'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    assembly_cost = models.DecimalField(
        _('assembly cost'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    disassembly_cost = models.DecimalField(
        _('disassembly cost'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    special_handling_cost = models.DecimalField(
        _('special handling cost'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_price = models.DecimalField(
        _('total price'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )

    # AI analysis
    ai_confidence = models.DecimalField(
        _('AI confidence'),
        max_digits=4,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('AI confidence score (0-1)')
    )
    ai_needs_clarification = models.BooleanField(
        _('needs clarification'),
        default=False
    )
    ai_clarification_question = models.TextField(
        _('clarification question'),
        blank=True
    )
    ai_matched_item_type = models.BooleanField(
        _('matched to item type'),
        default=False,
        help_text=_('Whether AI matched this to a known item type')
    )

    class Meta:
        db_table = 'order_items'
        verbose_name = _('order item')
        verbose_name_plural = _('order items')
        ordering = ['room_name', 'name']

    def __str__(self):
        return f"{self.quantity}x {self.name}"

    def calculate_total(self):
        """Calculate total price for this item."""
        self.total_price = (
            (self.unit_price * self.quantity) +
            self.assembly_cost +
            self.disassembly_cost +
            self.special_handling_cost
        )
        return self.total_price


class OrderImage(TimeStampedModel):
    """
    Images attached to an order.
    Can be analyzed by AI.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='order_images',
        verbose_name=_('order')
    )
    image_url = models.URLField(
        _('image URL')
    )
    filename = models.CharField(
        _('filename'),
        max_length=255
    )
    room_name = models.CharField(
        _('room name'),
        max_length=100,
        blank=True
    )
    description = models.TextField(
        _('description'),
        blank=True
    )

    # AI analysis
    ai_analyzed = models.BooleanField(
        _('AI analyzed'),
        default=False
    )
    ai_analysis = models.JSONField(
        _('AI analysis'),
        default=dict,
        blank=True
    )

    class Meta:
        db_table = 'order_images'
        verbose_name = _('order image')
        verbose_name_plural = _('order images')

    def __str__(self):
        return f"Image for Order {self.order_id}"


class AIConversation(TimeStampedModel):
    """
    Track AI clarifying questions and answers.
    """

    class MessageType(models.TextChoices):
        QUESTION = 'question', _('Question')
        ANSWER = 'answer', _('Answer')
        ANALYSIS = 'analysis', _('Analysis')
        SYSTEM = 'system', _('System')

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='ai_conversations',
        verbose_name=_('order')
    )
    message_type = models.CharField(
        _('message type'),
        max_length=20,
        choices=MessageType.choices
    )
    content = models.TextField(
        _('content')
    )
    content_he = models.TextField(
        _('content (Hebrew)'),
        blank=True
    )
    metadata = models.JSONField(
        _('metadata'),
        default=dict,
        blank=True,
        help_text=_('Additional structured data')
    )
    related_item = models.ForeignKey(
        OrderItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_conversations',
        verbose_name=_('related item')
    )

    class Meta:
        db_table = 'ai_conversations'
        verbose_name = _('AI conversation')
        verbose_name_plural = _('AI conversations')
        ordering = ['created_at']

    def __str__(self):
        return f"{self.message_type}: {self.content[:50]}..."


class OrderComparison(TimeStampedModel):
    """
    Stores the result of auto-comparing prices from multiple movers for an order.
    One per order.
    """

    class Status(models.TextChoices):
        GENERATING = 'generating', _('Generating')
        READY = 'ready', _('Ready')
        SELECTED = 'selected', _('Selected')
        EXPIRED = 'expired', _('Expired')
        FAILED = 'failed', _('Failed')

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='comparison',
        verbose_name=_('order')
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.GENERATING
    )
    total_eligible_movers = models.PositiveIntegerField(
        _('total eligible movers'),
        default=0
    )
    total_priced_movers = models.PositiveIntegerField(
        _('total priced movers'),
        default=0
    )
    selected_entry = models.ForeignKey(
        'ComparisonEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name=_('selected entry')
    )
    expires_at = models.DateTimeField(
        _('expires at'),
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'order_comparisons'
        verbose_name = _('order comparison')
        verbose_name_plural = _('order comparisons')

    def __str__(self):
        return f"Comparison for Order {self.order_id} - {self.status}"


class ComparisonEntry(TimeStampedModel):
    """
    One entry per eligible mover in an order comparison.
    Contains the calculated price and denormalized mover info.
    """

    class Status(models.TextChoices):
        CALCULATED = 'calculated', _('Calculated')
        FALLBACK = 'fallback', _('Fallback')
        ERROR = 'error', _('Error')
        SELECTED = 'selected', _('Selected')
        REJECTED = 'rejected', _('Rejected')

    comparison = models.ForeignKey(
        OrderComparison,
        on_delete=models.CASCADE,
        related_name='entries',
        verbose_name=_('comparison')
    )
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='comparison_entries',
        verbose_name=_('mover')
    )
    rank = models.PositiveIntegerField(
        _('rank'),
        default=0
    )
    total_price = models.DecimalField(
        _('total price'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    pricing_breakdown = models.JSONField(
        _('pricing breakdown'),
        default=dict,
        help_text=_('Full pricing snapshot from PriceAnalyzerService')
    )

    # Denormalized mover snapshots
    mover_company_name = models.CharField(
        _('company name'),
        max_length=255
    )
    mover_company_name_he = models.CharField(
        _('company name (Hebrew)'),
        max_length=255,
        blank=True
    )
    mover_rating = models.DecimalField(
        _('rating'),
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.00')
    )
    mover_total_reviews = models.IntegerField(
        _('total reviews'),
        default=0
    )
    mover_completed_orders = models.IntegerField(
        _('completed orders'),
        default=0
    )
    mover_is_verified = models.BooleanField(
        _('is verified'),
        default=False
    )
    mover_logo_url = models.URLField(
        _('logo URL'),
        blank=True
    )

    used_custom_pricing = models.BooleanField(
        _('used custom pricing'),
        default=False,
        help_text=_('Whether this mover has custom pricing set up')
    )

    quote = models.OneToOneField(
        'quotes.Quote',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='comparison_entry',
        verbose_name=_('quote')
    )

    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.CALCULATED
    )

    class Meta:
        db_table = 'comparison_entries'
        verbose_name = _('comparison entry')
        verbose_name_plural = _('comparison entries')
        ordering = ['rank']

    def __str__(self):
        return f"#{self.rank} {self.mover_company_name} - ₪{self.total_price}"


class Review(TimeStampedModel):
    """
    Customer review for a completed order.
    One review per order. Auto-updates mover average rating on save.
    """
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='review',
        verbose_name=_('order'),
    )
    customer = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='reviews_given',
        verbose_name=_('customer'),
    )
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name=_('mover'),
    )
    rating = models.PositiveIntegerField(
        _('rating'),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    text = models.TextField(
        _('review text'),
        blank=True,
    )

    class Meta:
        db_table = 'reviews'
        verbose_name = _('review')
        verbose_name_plural = _('reviews')
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.customer.email} - {self.rating}★"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-update mover's aggregate rating
        self.mover.update_rating()

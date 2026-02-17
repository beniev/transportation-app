"""
Models for the movers app.
Contains item categories, types, and pricing.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

from apps.core.models import TimeStampedModel, TranslatableModel


class ItemCategory(TranslatableModel, TimeStampedModel):
    """
    Categories for moving items.
    Examples: Furniture, Electronics, Appliances, etc.
    """
    icon = models.CharField(
        _('icon'),
        max_length=50,
        blank=True,
        help_text=_('Icon identifier (e.g., "sofa", "tv")')
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name=_('parent category')
    )
    display_order = models.IntegerField(
        _('display order'),
        default=0
    )
    is_active = models.BooleanField(
        _('active'),
        default=True
    )

    class Meta:
        db_table = 'item_categories'
        verbose_name = _('item category')
        verbose_name_plural = _('item categories')
        ordering = ['display_order', 'name_en']

    def __str__(self):
        return self.name_en


class ItemAttribute(TranslatableModel, TimeStampedModel):
    """
    Attributes that vary by category.
    Examples: door_count, bed_size, sofa_type, etc.
    """
    class InputType(models.TextChoices):
        SELECT = 'select', _('Select')
        NUMBER = 'number', _('Number')
        BOOLEAN = 'boolean', _('Boolean')

    code = models.CharField(
        _('code'),
        max_length=50,
        unique=True,
        help_text=_('Unique identifier (e.g., "door_count", "bed_size")')
    )
    input_type = models.CharField(
        _('input type'),
        max_length=20,
        choices=InputType.choices,
        default=InputType.SELECT
    )
    question_en = models.CharField(
        _('question (English)'),
        max_length=255,
        help_text=_('Question to ask user (e.g., "How many doors?")')
    )
    question_he = models.CharField(
        _('question (Hebrew)'),
        max_length=255,
        help_text=_('Question in Hebrew (e.g., "כמה דלתות לארון?")')
    )
    display_order = models.IntegerField(
        _('display order'),
        default=0
    )
    is_active = models.BooleanField(
        _('active'),
        default=True
    )

    class Meta:
        db_table = 'item_attributes'
        verbose_name = _('item attribute')
        verbose_name_plural = _('item attributes')
        ordering = ['display_order', 'code']

    def __str__(self):
        return f"{self.code}: {self.name_en}"

    def get_question(self, language: str = 'en') -> str:
        if language == 'he':
            return self.question_he or self.question_en
        return self.question_en or self.question_he


class ItemAttributeOption(TranslatableModel, TimeStampedModel):
    """
    Options for item attributes.
    Examples: For door_count: 2, 3, 4, 5, 6
    """
    attribute = models.ForeignKey(
        ItemAttribute,
        on_delete=models.CASCADE,
        related_name='options',
        verbose_name=_('attribute')
    )
    value = models.CharField(
        _('value'),
        max_length=50,
        help_text=_('The actual value stored (e.g., "2", "3", "large")')
    )
    display_order = models.IntegerField(
        _('display order'),
        default=0
    )
    is_active = models.BooleanField(
        _('active'),
        default=True
    )

    class Meta:
        db_table = 'item_attribute_options'
        verbose_name = _('item attribute option')
        verbose_name_plural = _('item attribute options')
        ordering = ['attribute', 'display_order', 'value']
        unique_together = ['attribute', 'value']

    def __str__(self):
        return f"{self.attribute.code}: {self.value} ({self.name_en})"


class ItemCategoryAttribute(TimeStampedModel):
    """
    Links attributes to categories.
    Defines which attributes are relevant for each category.
    """
    category = models.ForeignKey(
        ItemCategory,
        on_delete=models.CASCADE,
        related_name='category_attributes',
        verbose_name=_('category')
    )
    attribute = models.ForeignKey(
        ItemAttribute,
        on_delete=models.CASCADE,
        related_name='category_links',
        verbose_name=_('attribute')
    )
    is_required = models.BooleanField(
        _('required'),
        default=True,
        help_text=_('Whether this attribute must be specified for items in this category')
    )
    display_order = models.IntegerField(
        _('display order'),
        default=0
    )

    class Meta:
        db_table = 'item_category_attributes'
        verbose_name = _('category attribute')
        verbose_name_plural = _('category attributes')
        ordering = ['category', 'display_order']
        unique_together = ['category', 'attribute']

    def __str__(self):
        return f"{self.category.name_en} - {self.attribute.code}"


class ItemTypeAttribute(TimeStampedModel):
    """
    Links attributes to specific generic item types.
    Defines which attributes are relevant for clarifying a specific item.
    This takes precedence over category-level attributes.
    """
    item_type = models.ForeignKey(
        'ItemType',
        on_delete=models.CASCADE,
        related_name='item_attributes',
        verbose_name=_('item type'),
        limit_choices_to={'is_generic': True}
    )
    attribute = models.ForeignKey(
        ItemAttribute,
        on_delete=models.CASCADE,
        related_name='item_type_links',
        verbose_name=_('attribute')
    )
    is_required = models.BooleanField(
        _('required'),
        default=True,
        help_text=_('Whether this attribute must be specified')
    )
    display_order = models.IntegerField(
        _('display order'),
        default=0
    )

    class Meta:
        db_table = 'item_type_attributes'
        verbose_name = _('item type attribute')
        verbose_name_plural = _('item type attributes')
        ordering = ['item_type', 'display_order']
        unique_together = ['item_type', 'attribute']

    def __str__(self):
        return f"{self.item_type.name_en} - {self.attribute.code}"


class ItemType(TranslatableModel, TimeStampedModel):
    """
    Specific item types within categories.
    Examples: Sofa (2-seater), Refrigerator (large), etc.

    Can be generic (requiring clarification) or specific variants.
    Generic items have is_generic=True and variants have parent_type set.
    """

    class WeightClass(models.TextChoices):
        LIGHT = 'light', _('Light')
        MEDIUM = 'medium', _('Medium')
        HEAVY = 'heavy', _('Heavy')
        EXTRA_HEAVY = 'extra_heavy', _('Extra Heavy')

    category = models.ForeignKey(
        ItemCategory,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('category')
    )
    icon = models.CharField(
        _('icon'),
        max_length=50,
        blank=True
    )

    # Variant system fields
    parent_type = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='variants',
        verbose_name=_('parent type'),
        help_text=_('For variants, the generic parent item')
    )
    attribute_values = models.JSONField(
        _('attribute values'),
        default=dict,
        blank=True,
        help_text=_('For variants, the attribute values (e.g., {"door_count": "3"})')
    )
    is_generic = models.BooleanField(
        _('is generic'),
        default=False,
        help_text=_('Whether this item requires clarification to resolve to a specific variant')
    )
    is_custom = models.BooleanField(
        _('is custom'),
        default=False,
        help_text=_('Whether this is a custom item not in the standard catalog')
    )

    # Pricing fields
    default_base_price = models.DecimalField(
        _('default base price'),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_('Default price in ILS')
    )
    default_assembly_price = models.DecimalField(
        _('default assembly price'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    default_disassembly_price = models.DecimalField(
        _('default disassembly price'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    default_special_handling_price = models.DecimalField(
        _('default special handling price'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    requires_assembly = models.BooleanField(
        _('typically requires assembly'),
        default=False
    )
    requires_special_handling = models.BooleanField(
        _('typically requires special handling'),
        default=False
    )
    is_fragile = models.BooleanField(
        _('typically fragile'),
        default=False
    )
    weight_class = models.CharField(
        _('weight class'),
        max_length=20,
        choices=WeightClass.choices,
        default=WeightClass.MEDIUM
    )
    average_dimensions = models.JSONField(
        _('average dimensions'),
        default=dict,
        blank=True,
        help_text=_('Average dimensions in cm: {"length": 0, "width": 0, "height": 0}')
    )
    display_order = models.IntegerField(
        _('display order'),
        default=0
    )
    is_active = models.BooleanField(
        _('active'),
        default=True
    )

    class Meta:
        db_table = 'item_types'
        verbose_name = _('item type')
        verbose_name_plural = _('item types')
        ordering = ['category', 'display_order', 'name_en']

    def __str__(self):
        return f"{self.category.name_en} - {self.name_en}"

    def get_variants(self):
        """Returns all specific variants of this generic item."""
        if self.is_generic:
            return self.variants.filter(is_active=True)
        return ItemType.objects.none()

    def get_clarification_attributes(self):
        """
        Returns attributes needed to clarify this generic item.
        Prefers item-type-specific attributes over category-level attributes.
        """
        if not self.is_generic:
            return []

        # First check for item-type-specific attributes
        item_attrs = self.item_attributes.filter(
            attribute__is_active=True
        ).select_related('attribute').order_by('display_order')

        if item_attrs.exists():
            return item_attrs

        # Fall back to category-level attributes (legacy behavior)
        return self.category.category_attributes.filter(
            is_required=True,
            attribute__is_active=True
        ).select_related('attribute').order_by('display_order')


class MoverPricing(TimeStampedModel):
    """
    Mover's custom pricing for each item type.
    Movers can override default prices for items.
    """
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='pricing',
        verbose_name=_('mover')
    )
    item_type = models.ForeignKey(
        ItemType,
        on_delete=models.CASCADE,
        related_name='mover_prices',
        verbose_name=_('item type')
    )
    base_price = models.DecimalField(
        _('base price'),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_('Price per unit in ILS')
    )
    assembly_price = models.DecimalField(
        _('assembly price'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    disassembly_price = models.DecimalField(
        _('disassembly price'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    special_handling_price = models.DecimalField(
        _('special handling price'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_('Whether this item is offered by the mover')
    )

    class Meta:
        db_table = 'mover_pricing'
        verbose_name = _('mover pricing')
        verbose_name_plural = _('mover pricing')
        unique_together = ['mover', 'item_type']
        ordering = ['item_type__category', 'item_type__display_order']

    def __str__(self):
        return f"{self.mover.company_name} - {self.item_type.name_en}: {self.base_price} ILS"


class PricingFactors(TimeStampedModel):
    """
    Global pricing factors for a mover.
    These affect the final price calculation.
    """
    mover = models.OneToOneField(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='pricing_factors',
        verbose_name=_('mover')
    )

    # Floor surcharges
    floor_surcharge_percent = models.DecimalField(
        _('floor surcharge (%)'),
        max_digits=5,
        decimal_places=2,
        default=Decimal('5.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text=_('Additional percentage per floor (e.g., 5% per floor)')
    )
    ground_floor_number = models.IntegerField(
        _('ground floor number'),
        default=0,
        help_text=_('Which floor is considered ground (0 or 1)')
    )

    # Elevator discount
    elevator_discount_percent = models.DecimalField(
        _('elevator discount (%)'),
        max_digits=5,
        decimal_places=2,
        default=Decimal('50.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text=_('Discount on floor surcharge if elevator available')
    )

    # Distance from truck to building
    distance_surcharge_percent = models.DecimalField(
        _('distance surcharge (%)'),
        max_digits=5,
        decimal_places=2,
        default=Decimal('5.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text=_('Percentage of items subtotal charged per 10 meters from truck to building')
    )

    # Travel distance between locations
    travel_distance_per_km = models.DecimalField(
        _('travel cost per km'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('5.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_('Cost per kilometer between origin and destination')
    )
    minimum_travel_charge = models.DecimalField(
        _('minimum travel charge'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('50.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    # Seasonal pricing
    peak_season_multiplier = models.DecimalField(
        _('peak season multiplier'),
        max_digits=4,
        decimal_places=2,
        default=Decimal('1.25'),
        validators=[MinValueValidator(Decimal('1.00')), MaxValueValidator(Decimal('3.00'))],
        help_text=_('Price multiplier for peak season (July-August)')
    )
    peak_months = models.JSONField(
        _('peak months'),
        default=list,
        help_text=_('List of peak month numbers [7, 8] for July-August')
    )

    # Weekend/Holiday surcharges
    weekend_surcharge_percent = models.DecimalField(
        _('weekend surcharge (%)'),
        max_digits=5,
        decimal_places=2,
        default=Decimal('15.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    friday_surcharge_percent = models.DecimalField(
        _('Friday surcharge (%)'),
        max_digits=5,
        decimal_places=2,
        default=Decimal('10.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )

    # Minimum order
    minimum_order_amount = models.DecimalField(
        _('minimum order amount'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('200.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    # Working hours
    early_morning_surcharge_percent = models.DecimalField(
        _('early morning surcharge (%)'),
        max_digits=5,
        decimal_places=2,
        default=Decimal('10.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_('Surcharge for orders before 8 AM')
    )
    evening_surcharge_percent = models.DecimalField(
        _('evening surcharge (%)'),
        max_digits=5,
        decimal_places=2,
        default=Decimal('15.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_('Surcharge for orders after 6 PM')
    )

    class Meta:
        db_table = 'pricing_factors'
        verbose_name = _('pricing factors')
        verbose_name_plural = _('pricing factors')

    def __str__(self):
        return f"Pricing factors for {self.mover.company_name}"

    def save(self, *args, **kwargs):
        # Set default peak months if not set
        if not self.peak_months:
            self.peak_months = [7, 8]  # July, August
        super().save(*args, **kwargs)


class ItemTypeSuggestion(TimeStampedModel):
    """
    Suggestions for new item types.
    Can be auto-generated when a customer enters an unknown item,
    or manually suggested by movers.
    Admin can approve and add to the main catalog.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        APPROVED = 'approved', _('Approved')
        REJECTED = 'rejected', _('Rejected')

    class Source(models.TextChoices):
        MOVER = 'mover', _('Mover')
        AUTO = 'auto', _('Auto-detected from order')

    suggested_by = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='item_suggestions',
        verbose_name=_('suggested by')
    )
    source = models.CharField(
        _('source'),
        max_length=20,
        choices=Source.choices,
        default=Source.AUTO,
    )
    occurrence_count = models.PositiveIntegerField(
        _('occurrence count'),
        default=1,
        help_text=_('How many times this item was requested by customers')
    )
    name_en = models.CharField(
        _('name (English)'),
        max_length=100
    )
    name_he = models.CharField(
        _('name (Hebrew)'),
        max_length=100
    )
    description_en = models.TextField(
        _('description (English)'),
        blank=True
    )
    description_he = models.TextField(
        _('description (Hebrew)'),
        blank=True
    )
    category = models.ForeignKey(
        ItemCategory,
        on_delete=models.CASCADE,
        related_name='suggestions',
        verbose_name=_('category')
    )
    suggested_price = models.DecimalField(
        _('suggested price'),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_('Suggested base price in ILS')
    )
    weight_class = models.CharField(
        _('weight class'),
        max_length=20,
        choices=ItemType.WeightClass.choices,
        default=ItemType.WeightClass.MEDIUM
    )
    requires_assembly = models.BooleanField(
        _('requires assembly'),
        default=False
    )
    is_fragile = models.BooleanField(
        _('is fragile'),
        default=False
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    admin_notes = models.TextField(
        _('admin notes'),
        blank=True,
        help_text=_('Notes from admin about the decision')
    )
    created_item = models.ForeignKey(
        ItemType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_suggestion',
        verbose_name=_('created item'),
        help_text=_('The item type created from this suggestion (if approved)')
    )

    class Meta:
        db_table = 'item_type_suggestions'
        verbose_name = _('item type suggestion')
        verbose_name_plural = _('item type suggestions')
        ordering = ['-created_at']

    def __str__(self):
        if self.suggested_by:
            return f"{self.name_en} (suggested by {self.suggested_by.company_name})"
        return f"{self.name_en} (auto-detected, x{self.occurrence_count})"

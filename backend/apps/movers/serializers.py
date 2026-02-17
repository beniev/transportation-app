"""
Serializers for the movers app.
"""
from rest_framework import serializers
from .models import (
    ItemCategory, ItemType, ItemAttribute, ItemAttributeOption,
    ItemTypeAttribute, MoverPricing, PricingFactors, ItemTypeSuggestion,
)


class ItemCategorySerializer(serializers.ModelSerializer):
    """Serializer for ItemCategory model."""
    children = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = ItemCategory
        fields = [
            'id', 'name_en', 'name_he', 'description_en', 'description_he',
            'icon', 'parent', 'display_order', 'is_active', 'children', 'item_count'
        ]

    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return ItemCategorySerializer(children, many=True).data

    def get_item_count(self, obj):
        return obj.items.filter(is_active=True).count()


class ItemTypeSerializer(serializers.ModelSerializer):
    """Serializer for ItemType model."""
    category_name = serializers.CharField(source='category.name_en', read_only=True)
    category_name_he = serializers.CharField(source='category.name_he', read_only=True)

    class Meta:
        model = ItemType
        fields = [
            'id', 'name_en', 'name_he', 'description_en', 'description_he',
            'category', 'category_name', 'category_name_he', 'icon',
            'default_base_price', 'default_assembly_price', 'default_disassembly_price',
            'default_special_handling_price', 'requires_assembly', 'requires_special_handling',
            'is_fragile', 'weight_class', 'average_dimensions', 'display_order', 'is_active',
            # Variant system fields
            'parent_type', 'attribute_values', 'is_generic', 'is_custom'
        ]


class MoverPricingSerializer(serializers.ModelSerializer):
    """Serializer for MoverPricing model."""
    item_type_name = serializers.CharField(source='item_type.name_en', read_only=True)
    item_type_name_he = serializers.CharField(source='item_type.name_he', read_only=True)
    category_name = serializers.CharField(source='item_type.category.name_en', read_only=True)
    category_name_he = serializers.CharField(source='item_type.category.name_he', read_only=True)

    class Meta:
        model = MoverPricing
        fields = [
            'id', 'item_type', 'item_type_name', 'item_type_name_he',
            'category_name', 'category_name_he',
            'base_price', 'assembly_price', 'disassembly_price',
            'special_handling_price', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MoverPricingBulkSerializer(serializers.Serializer):
    """Serializer for bulk updating mover pricing."""
    pricing = MoverPricingSerializer(many=True)

    def create(self, validated_data):
        mover = self.context['mover']
        pricing_data = validated_data.get('pricing', [])
        created_updated = []

        for item_data in pricing_data:
            item_type = item_data.pop('item_type')
            pricing, created = MoverPricing.objects.update_or_create(
                mover=mover,
                item_type=item_type,
                defaults=item_data
            )
            created_updated.append(pricing)

        return created_updated


class PricingFactorsSerializer(serializers.ModelSerializer):
    """Serializer for PricingFactors model."""

    class Meta:
        model = PricingFactors
        fields = [
            'id', 'floor_surcharge_percent', 'ground_floor_number',
            'elevator_discount_percent', 'distance_surcharge_percent',
            'travel_distance_per_km', 'minimum_travel_charge',
            'peak_season_multiplier', 'peak_months',
            'weekend_surcharge_percent', 'friday_surcharge_percent',
            'minimum_order_amount', 'early_morning_surcharge_percent',
            'evening_surcharge_percent', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ItemTypeWithMoverPricingSerializer(serializers.ModelSerializer):
    """
    Serializer for ItemType with optional mover-specific pricing.
    Shows default prices or mover's custom prices if available.
    """
    category_name = serializers.CharField(source='category.name_en', read_only=True)
    mover_pricing = serializers.SerializerMethodField()
    effective_base_price = serializers.SerializerMethodField()
    effective_assembly_price = serializers.SerializerMethodField()
    effective_disassembly_price = serializers.SerializerMethodField()
    effective_special_handling_price = serializers.SerializerMethodField()

    class Meta:
        model = ItemType
        fields = [
            'id', 'name_en', 'name_he', 'description_en', 'description_he',
            'category', 'category_name', 'icon',
            'default_base_price', 'default_assembly_price', 'default_disassembly_price',
            'default_special_handling_price', 'requires_assembly', 'requires_special_handling',
            'is_fragile', 'weight_class', 'mover_pricing',
            'effective_base_price', 'effective_assembly_price',
            'effective_disassembly_price', 'effective_special_handling_price'
        ]

    def get_mover_pricing(self, obj):
        mover = self.context.get('mover')
        if mover:
            try:
                pricing = MoverPricing.objects.get(mover=mover, item_type=obj)
                return MoverPricingSerializer(pricing).data
            except MoverPricing.DoesNotExist:
                return None
        return None

    def get_effective_base_price(self, obj):
        mover = self.context.get('mover')
        if mover:
            try:
                pricing = MoverPricing.objects.get(mover=mover, item_type=obj)
                return str(pricing.base_price)
            except MoverPricing.DoesNotExist:
                pass
        return str(obj.default_base_price)

    def get_effective_assembly_price(self, obj):
        mover = self.context.get('mover')
        if mover:
            try:
                pricing = MoverPricing.objects.get(mover=mover, item_type=obj)
                return str(pricing.assembly_price)
            except MoverPricing.DoesNotExist:
                pass
        return str(obj.default_assembly_price)

    def get_effective_disassembly_price(self, obj):
        mover = self.context.get('mover')
        if mover:
            try:
                pricing = MoverPricing.objects.get(mover=mover, item_type=obj)
                return str(pricing.disassembly_price)
            except MoverPricing.DoesNotExist:
                pass
        return str(obj.default_disassembly_price)

    def get_effective_special_handling_price(self, obj):
        mover = self.context.get('mover')
        if mover:
            try:
                pricing = MoverPricing.objects.get(mover=mover, item_type=obj)
                return str(pricing.special_handling_price)
            except MoverPricing.DoesNotExist:
                pass
        return str(obj.default_special_handling_price)


# ===== Admin Serializers =====

class AdminItemAttributeOptionSerializer(serializers.ModelSerializer):
    """Read-only serializer for attribute options."""
    class Meta:
        model = ItemAttributeOption
        fields = ['id', 'value', 'name_en', 'name_he', 'display_order']


class AdminItemAttributeSerializer(serializers.ModelSerializer):
    """Read-only serializer for attributes with their options."""
    options = AdminItemAttributeOptionSerializer(many=True, read_only=True)

    class Meta:
        model = ItemAttribute
        fields = [
            'id', 'code', 'name_en', 'name_he', 'input_type',
            'question_en', 'question_he', 'display_order', 'options'
        ]


class AdminItemTypeVariantSerializer(serializers.ModelSerializer):
    """Compact serializer for variants shown under a generic item."""
    class Meta:
        model = ItemType
        fields = [
            'id', 'name_en', 'name_he', 'attribute_values',
            'default_base_price', 'weight_class', 'is_active',
        ]


class AdminItemTypeSerializer(serializers.ModelSerializer):
    """Full admin serializer for item types with variants."""
    category_name = serializers.CharField(source='category.name_en', read_only=True)
    category_name_he = serializers.CharField(source='category.name_he', read_only=True)
    variants = serializers.SerializerMethodField()
    variant_count = serializers.SerializerMethodField()

    class Meta:
        model = ItemType
        fields = [
            'id', 'name_en', 'name_he', 'description_en', 'description_he',
            'category', 'category_name', 'category_name_he', 'icon',
            'default_base_price', 'default_assembly_price', 'default_disassembly_price',
            'default_special_handling_price', 'requires_assembly', 'requires_special_handling',
            'is_fragile', 'weight_class', 'average_dimensions', 'display_order', 'is_active',
            'parent_type', 'attribute_values', 'is_generic', 'is_custom',
            'variants', 'variant_count',
        ]
        read_only_fields = ['id']

    def get_variants(self, obj):
        if obj.is_generic:
            variants = obj.variants.filter(is_active=True).order_by('display_order', 'name_en')
            return AdminItemTypeVariantSerializer(variants, many=True).data
        return []

    def get_variant_count(self, obj):
        if obj.is_generic:
            return obj.variants.filter(is_active=True).count()
        return 0


class AdminItemCategorySerializer(serializers.ModelSerializer):
    """Admin serializer for categories with counts."""
    item_count = serializers.SerializerMethodField()
    generic_count = serializers.SerializerMethodField()
    variant_count = serializers.SerializerMethodField()

    class Meta:
        model = ItemCategory
        fields = [
            'id', 'name_en', 'name_he', 'description_en', 'description_he',
            'icon', 'parent', 'display_order', 'is_active',
            'item_count', 'generic_count', 'variant_count',
        ]
        read_only_fields = ['id']

    def get_item_count(self, obj):
        return obj.items.filter(is_active=True, parent_type__isnull=True).count()

    def get_generic_count(self, obj):
        return obj.items.filter(is_active=True, is_generic=True).count()

    def get_variant_count(self, obj):
        return obj.items.filter(is_active=True, parent_type__isnull=False).count()


# ===== Suggestion Serializers =====

class AdminSuggestionSerializer(serializers.ModelSerializer):
    """Serializer for item type suggestions in admin view."""
    category_name = serializers.CharField(source='category.name_en', read_only=True)
    category_name_he = serializers.CharField(source='category.name_he', read_only=True)
    suggested_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ItemTypeSuggestion
        fields = [
            'id', 'name_en', 'name_he', 'description_en', 'description_he',
            'category', 'category_name', 'category_name_he',
            'suggested_price', 'weight_class',
            'requires_assembly', 'is_fragile',
            'status', 'source', 'occurrence_count',
            'suggested_by', 'suggested_by_name',
            'admin_notes', 'created_item',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_item']

    def get_suggested_by_name(self, obj):
        if obj.suggested_by:
            return obj.suggested_by.company_name
        return None


class ApproveSuggestionSerializer(serializers.Serializer):
    """Serializer for approving a suggestion and creating an item."""
    default_base_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False,
        help_text='Override the suggested price. Uses suggested_price if not provided.'
    )
    weight_class = serializers.ChoiceField(
        choices=ItemType.WeightClass.choices, required=False,
        help_text='Override the weight class. Uses suggestion weight_class if not provided.'
    )
    admin_notes = serializers.CharField(required=False, allow_blank=True)

"""
Serializers for the orders app.
"""
from decimal import Decimal
from rest_framework import serializers
from apps.core.utils import haversine_distance, extract_coordinates
from .models import Order, OrderItem, OrderImage, AIConversation, OrderComparison, ComparisonEntry, Review


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for OrderItem model."""
    item_type_name = serializers.CharField(source='item_type.name_en', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'item_type', 'item_type_name', 'name', 'name_he', 'description',
            'quantity', 'requires_assembly', 'requires_disassembly',
            'requires_special_handling', 'is_fragile', 'room_name', 'room_floor',
            'unit_price', 'assembly_cost', 'disassembly_cost', 'special_handling_cost',
            'total_price', 'ai_confidence', 'ai_needs_clarification',
            'ai_clarification_question', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_price', 'created_at', 'updated_at']


class OrderImageSerializer(serializers.ModelSerializer):
    """Serializer for OrderImage model."""

    class Meta:
        model = OrderImage
        fields = [
            'id', 'image_url', 'filename', 'room_name', 'description',
            'ai_analyzed', 'ai_analysis', 'created_at'
        ]
        read_only_fields = ['id', 'ai_analyzed', 'ai_analysis', 'created_at']


class AIConversationSerializer(serializers.ModelSerializer):
    """Serializer for AIConversation model."""

    class Meta:
        model = AIConversation
        fields = [
            'id', 'message_type', 'content', 'content_he',
            'metadata', 'related_item', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class OrderListSerializer(serializers.ModelSerializer):
    """Serializer for Order list view (minimal data)."""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_email = serializers.EmailField(source='customer.email', read_only=True)
    mover_name = serializers.CharField(source='mover.company_name', read_only=True)
    items_count = serializers.SerializerMethodField()
    preferred_date_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'customer_name', 'customer_email', 'mover_name',
            'origin_city', 'destination_city',
            'date_flexibility', 'preferred_date', 'preferred_date_end',
            'preferred_date_display', 'preferred_time_slot',
            'scheduled_date', 'scheduled_time',
            'total_price', 'items_count', 'created_at'
        ]

    def get_items_count(self, obj):
        return obj.items.count()

    def get_preferred_date_display(self, obj):
        return obj.preferred_date_display


class OrderDetailSerializer(serializers.ModelSerializer):
    """Serializer for Order detail view (full data)."""
    items = OrderItemSerializer(many=True, read_only=True)
    order_images = OrderImageSerializer(many=True, read_only=True)
    ai_conversations = AIConversationSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_email = serializers.EmailField(source='customer.email', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    mover_name = serializers.CharField(source='mover.company_name', read_only=True)
    preferred_date_display = serializers.SerializerMethodField()

    def get_preferred_date_display(self, obj):
        return obj.preferred_date_display

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'customer_name', 'customer_email', 'customer_phone',
            'mover_name', 'original_description',
            # Origin
            'origin_address', 'origin_city', 'origin_floor', 'origin_has_elevator',
            'origin_building_floors', 'origin_distance_to_truck', 'origin_coordinates',
            # Destination
            'destination_address', 'destination_city', 'destination_floor',
            'destination_has_elevator', 'destination_building_floors',
            'destination_distance_to_truck', 'destination_coordinates',
            # Distance & scheduling
            'distance_km', 'estimated_duration_minutes',
            'date_flexibility', 'preferred_date', 'preferred_date_end',
            'preferred_date_display', 'preferred_time_slot',
            'scheduled_date', 'scheduled_time',
            # Pricing
            'items_subtotal', 'origin_floor_surcharge', 'destination_floor_surcharge',
            'distance_surcharge', 'travel_cost', 'seasonal_adjustment',
            'day_of_week_adjustment', 'discount', 'total_price',
            # Notes
            'customer_notes', 'mover_notes',
            # AI
            'ai_processed', 'ai_processing_data',
            # Related
            'items', 'order_images', 'ai_conversations',
            # Timestamps
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'ai_processed', 'ai_processing_data',
            'created_at', 'updated_at'
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new order."""
    items = OrderItemSerializer(many=True, required=False)
    free_text_description = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )

    class Meta:
        model = Order
        fields = [
            'id',  # Important: include ID in response
            'mover', 'original_description', 'free_text_description',
            # Origin
            'origin_address', 'origin_city', 'origin_floor', 'origin_has_elevator',
            'origin_building_floors', 'origin_distance_to_truck',
            # Destination
            'origin_coordinates',
            # Destination
            'destination_address', 'destination_city', 'destination_floor',
            'destination_has_elevator', 'destination_building_floors',
            'destination_distance_to_truck',
            'destination_coordinates',
            # Scheduling
            'date_flexibility', 'preferred_date', 'preferred_date_end', 'preferred_time_slot',
            # Notes
            'customer_notes',
            # Items
            'items',
            # Status
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at']
        extra_kwargs = {
            'mover': {'required': False, 'allow_null': True},
            'original_description': {'required': False, 'allow_blank': True},
            'origin_address': {'required': False, 'allow_blank': True},
            'origin_city': {'required': False, 'allow_blank': True},
            'destination_address': {'required': False, 'allow_blank': True},
            'destination_city': {'required': False, 'allow_blank': True},
            'origin_coordinates': {'required': False},
            'destination_coordinates': {'required': False},
            'date_flexibility': {'required': False},
            'preferred_date_end': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        flexibility = data.get('date_flexibility', 'specific')
        if flexibility == 'range':
            if not data.get('preferred_date'):
                raise serializers.ValidationError(
                    {'preferred_date': 'Start date is required for date range.'}
                )
            if not data.get('preferred_date_end'):
                raise serializers.ValidationError(
                    {'preferred_date_end': 'End date is required for date range.'}
                )
            if data['preferred_date_end'] < data['preferred_date']:
                raise serializers.ValidationError(
                    {'preferred_date_end': 'End date must be after start date.'}
                )
            if (data['preferred_date_end'] - data['preferred_date']).days > 30:
                raise serializers.ValidationError(
                    {'preferred_date_end': 'Date range cannot exceed 30 days.'}
                )
        elif flexibility == 'specific':
            data['preferred_date_end'] = None
        return data

    def create(self, validated_data):
        # Map free_text_description to original_description
        if 'free_text_description' in validated_data:
            validated_data['original_description'] = validated_data.pop('free_text_description')

        # Auto-compute distance_km from coordinates if both are provided
        origin_coords = extract_coordinates(validated_data.get('origin_coordinates'))
        dest_coords = extract_coordinates(validated_data.get('destination_coordinates'))
        if origin_coords and dest_coords:
            distance = haversine_distance(
                origin_coords[0], origin_coords[1],
                dest_coords[0], dest_coords[1],
            )
            validated_data['distance_km'] = Decimal(str(round(distance, 2)))

        items_data = validated_data.pop('items', [])
        order = Order.objects.create(**validated_data)

        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)

        return order


class OrderUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating an order (mover)."""

    class Meta:
        model = Order
        fields = [
            'status', 'scheduled_date', 'scheduled_time', 'mover_notes',
            'items_subtotal', 'origin_floor_surcharge', 'destination_floor_surcharge',
            'distance_surcharge', 'travel_cost', 'seasonal_adjustment',
            'day_of_week_adjustment', 'discount', 'total_price'
        ]


class OrderStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating order status."""
    status = serializers.ChoiceField(choices=Order.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True)


class OrderScheduleSerializer(serializers.Serializer):
    """Serializer for scheduling an order."""
    date = serializers.DateField()
    time = serializers.TimeField()
    notes = serializers.CharField(required=False, allow_blank=True)


class ComparisonEntrySerializer(serializers.ModelSerializer):
    """Read-only serializer for a single comparison entry."""

    class Meta:
        model = ComparisonEntry
        fields = [
            'id', 'mover', 'rank', 'total_price', 'pricing_breakdown',
            'mover_company_name', 'mover_company_name_he',
            'mover_rating', 'mover_total_reviews', 'mover_completed_orders',
            'mover_is_verified', 'mover_logo_url',
            'used_custom_pricing', 'status', 'created_at',
        ]
        read_only_fields = fields


class OrderComparisonSerializer(serializers.ModelSerializer):
    """Read-only serializer for order comparison with nested entries."""
    entries = ComparisonEntrySerializer(many=True, read_only=True)

    class Meta:
        model = OrderComparison
        fields = [
            'id', 'order', 'status', 'total_eligible_movers',
            'total_priced_movers', 'selected_entry', 'expires_at',
            'entries', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class SelectMoverSerializer(serializers.Serializer):
    """Serializer for selecting a mover from comparison."""
    entry_id = serializers.UUIDField()


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for reviews."""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'order', 'customer', 'customer_name', 'mover',
            'rating', 'text', 'created_at',
        ]
        read_only_fields = ['id', 'order', 'customer', 'mover', 'created_at']


class ReviewCreateSerializer(serializers.Serializer):
    """Serializer for creating a review."""
    rating = serializers.IntegerField(min_value=1, max_value=5)
    text = serializers.CharField(required=False, allow_blank=True, default='')

"""
Serializers for the scheduling app.
"""
from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, timedelta

from .models import WeeklyAvailability, BlockedDate, Booking, TimeSlot, BookingReminder


class WeeklyAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for weekly availability."""

    day_name = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = WeeklyAvailability
        fields = [
            'id', 'day_of_week', 'day_name', 'is_available',
            'start_time', 'end_time', 'max_bookings',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['mover'] = self.context['request'].user.mover_profile
        return super().create(validated_data)


class BlockedDateSerializer(serializers.ModelSerializer):
    """Serializer for blocked dates."""

    class Meta:
        model = BlockedDate
        fields = [
            'id', 'date', 'block_type', 'start_time', 'end_time',
            'reason', 'is_recurring_yearly',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        if data.get('block_type') == BlockedDate.BlockType.PARTIAL:
            if not data.get('start_time') or not data.get('end_time'):
                raise serializers.ValidationError(
                    "Start and end times are required for partial day blocks"
                )
            if data['start_time'] >= data['end_time']:
                raise serializers.ValidationError(
                    "Start time must be before end time"
                )
        return data

    def create(self, validated_data):
        validated_data['mover'] = self.context['request'].user.mover_profile
        return super().create(validated_data)


class TimeSlotSerializer(serializers.ModelSerializer):
    """Serializer for time slots."""

    class Meta:
        model = TimeSlot
        fields = [
            'id', 'name', 'name_he', 'start_time', 'end_time',
            'is_active', 'display_order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['mover'] = self.context['request'].user.mover_profile
        return super().create(validated_data)


class BookingReminderSerializer(serializers.ModelSerializer):
    """Serializer for booking reminders."""

    class Meta:
        model = BookingReminder
        fields = [
            'id', 'reminder_type', 'scheduled_for',
            'sent', 'sent_at', 'recipient',
            'created_at'
        ]
        read_only_fields = ['id', 'sent', 'sent_at', 'created_at']


class BookingListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for booking lists."""

    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.CharField(
        source='order.customer.user.phone',
        read_only=True
    )
    origin_address = serializers.CharField(
        source='order.origin_address',
        read_only=True
    )
    destination_address = serializers.CharField(
        source='order.destination_address',
        read_only=True
    )
    order_total = serializers.DecimalField(
        source='order.total_price',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Booking
        fields = [
            'id', 'order', 'scheduled_date',
            'scheduled_start_time', 'scheduled_end_time',
            'estimated_duration_hours', 'status',
            'customer_name', 'customer_phone',
            'origin_address', 'destination_address',
            'order_total', 'crew_size',
            'customer_confirmed',
            'created_at'
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        customer = obj.order.customer
        name = f"{customer.user.first_name} {customer.user.last_name}".strip()
        return name or customer.user.email


class BookingDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single booking view."""

    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(
        source='order.customer.user.email',
        read_only=True
    )
    customer_phone = serializers.CharField(
        source='order.customer.user.phone',
        read_only=True
    )
    origin_address = serializers.CharField(
        source='order.origin_address',
        read_only=True
    )
    origin_floor = serializers.IntegerField(
        source='order.origin_floor',
        read_only=True
    )
    origin_has_elevator = serializers.BooleanField(
        source='order.origin_has_elevator',
        read_only=True
    )
    destination_address = serializers.CharField(
        source='order.destination_address',
        read_only=True
    )
    destination_floor = serializers.IntegerField(
        source='order.destination_floor',
        read_only=True
    )
    destination_has_elevator = serializers.BooleanField(
        source='order.destination_has_elevator',
        read_only=True
    )
    order_total = serializers.DecimalField(
        source='order.total_price',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    special_instructions = serializers.CharField(
        source='order.special_instructions',
        read_only=True
    )
    reminders = BookingReminderSerializer(many=True, read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'order', 'mover',
            'scheduled_date', 'scheduled_start_time', 'scheduled_end_time',
            'estimated_duration_hours', 'duration_minutes',
            'status',
            'actual_start_time', 'actual_end_time',
            'crew_size', 'crew_notes',
            'customer_confirmed', 'customer_confirmed_at',
            'reminder_sent', 'reminder_sent_at',
            'cancelled_at', 'cancellation_reason', 'cancelled_by',
            'customer_name', 'customer_email', 'customer_phone',
            'origin_address', 'origin_floor', 'origin_has_elevator',
            'destination_address', 'destination_floor', 'destination_has_elevator',
            'order_total', 'special_instructions',
            'reminders',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order', 'mover',
            'customer_confirmed_at', 'reminder_sent', 'reminder_sent_at',
            'cancelled_at', 'cancelled_by',
            'created_at', 'updated_at'
        ]

    def get_customer_name(self, obj):
        customer = obj.order.customer
        name = f"{customer.user.first_name} {customer.user.last_name}".strip()
        return name or customer.user.email


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bookings."""

    class Meta:
        model = Booking
        fields = [
            'order', 'scheduled_date', 'scheduled_start_time',
            'estimated_duration_hours', 'crew_size', 'crew_notes'
        ]

    def validate_order(self, value):
        request = self.context.get('request')
        if request and hasattr(request.user, 'mover_profile'):
            if value.mover != request.user.mover_profile:
                raise serializers.ValidationError("Order does not belong to you")

            # Check if order already has a booking
            if hasattr(value, 'booking') and value.booking:
                raise serializers.ValidationError(
                    "Order already has a booking. Cancel existing booking first."
                )
        return value

    def validate_scheduled_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Cannot book dates in the past")
        return value

    def create(self, validated_data):
        from .services.calendar_service import CalendarService

        order = validated_data['order']
        mover = order.mover

        calendar = CalendarService(mover)

        booking, error = calendar.book_slot(
            order=order,
            scheduled_date=validated_data['scheduled_date'],
            start_time=validated_data['scheduled_start_time'],
            duration_hours=float(validated_data.get('estimated_duration_hours', 2)),
            crew_size=validated_data.get('crew_size', 2)
        )

        if error:
            raise serializers.ValidationError(error)

        if validated_data.get('crew_notes'):
            booking.crew_notes = validated_data['crew_notes']
            booking.save()

        return booking


class BookingRescheduleSerializer(serializers.Serializer):
    """Serializer for rescheduling a booking."""

    scheduled_date = serializers.DateField()
    scheduled_start_time = serializers.TimeField()
    notify_customer = serializers.BooleanField(default=True)

    def validate_scheduled_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Cannot reschedule to a date in the past")
        return value


class BookingCancelSerializer(serializers.Serializer):
    """Serializer for cancelling a booking."""

    reason = serializers.CharField(required=False, allow_blank=True)
    notify_customer = serializers.BooleanField(default=True)


class AvailableDatesSerializer(serializers.Serializer):
    """Serializer for available dates query."""

    start_date = serializers.DateField()
    end_date = serializers.DateField()
    duration_hours = serializers.FloatField(default=2, min_value=0.5, max_value=12)

    def validate(self, data):
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Start date must be before end date")
        if data['start_date'] < timezone.now().date():
            data['start_date'] = timezone.now().date()
        # Limit range to 3 months
        max_range = timedelta(days=90)
        if data['end_date'] - data['start_date'] > max_range:
            data['end_date'] = data['start_date'] + max_range
        return data


class MonthOverviewSerializer(serializers.Serializer):
    """Serializer for month overview query."""

    year = serializers.IntegerField(min_value=2020, max_value=2100)
    month = serializers.IntegerField(min_value=1, max_value=12)


class DailyScheduleSerializer(serializers.Serializer):
    """Serializer for daily schedule query."""

    date = serializers.DateField()

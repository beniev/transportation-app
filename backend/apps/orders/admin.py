"""
Admin configuration for the orders app.
"""
from django.contrib import admin
from .models import Order, OrderItem, OrderImage, AIConversation, OrderComparison, ComparisonEntry


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['total_price', 'ai_confidence']


class OrderImageInline(admin.TabularInline):
    model = OrderImage
    extra = 0
    readonly_fields = ['ai_analyzed']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'customer', 'mover', 'status', 'origin_city', 'destination_city',
        'scheduled_date', 'total_price', 'created_at'
    ]
    list_filter = ['status', 'origin_city', 'destination_city', 'scheduled_date']
    search_fields = ['customer__email', 'mover__company_name', 'origin_address', 'destination_address']
    readonly_fields = ['created_at', 'updated_at', 'ai_processed']
    inlines = [OrderItemInline, OrderImageInline]
    ordering = ['-created_at']

    fieldsets = (
        ('General', {
            'fields': ('customer', 'mover', 'status', 'original_description')
        }),
        ('Origin', {
            'fields': (
                'origin_address', 'origin_city', 'origin_floor',
                'origin_has_elevator', 'origin_building_floors', 'origin_distance_to_truck'
            )
        }),
        ('Destination', {
            'fields': (
                'destination_address', 'destination_city', 'destination_floor',
                'destination_has_elevator', 'destination_building_floors', 'destination_distance_to_truck'
            )
        }),
        ('Distance & Scheduling', {
            'fields': (
                'distance_km', 'estimated_duration_minutes',
                'preferred_date', 'preferred_time_slot', 'scheduled_date', 'scheduled_time'
            )
        }),
        ('Pricing', {
            'fields': (
                'items_subtotal', 'origin_floor_surcharge', 'destination_floor_surcharge',
                'distance_surcharge', 'travel_cost', 'seasonal_adjustment',
                'day_of_week_adjustment', 'discount', 'total_price'
            )
        }),
        ('Notes', {
            'fields': ('customer_notes', 'mover_notes', 'internal_notes')
        }),
        ('AI Processing', {
            'fields': ('ai_processed', 'ai_processing_data'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'order', 'quantity', 'unit_price', 'total_price', 'ai_confidence']
    list_filter = ['requires_assembly', 'is_fragile', 'ai_needs_clarification']
    search_fields = ['name', 'order__id']


@admin.register(AIConversation)
class AIConversationAdmin(admin.ModelAdmin):
    list_display = ['order', 'message_type', 'content', 'created_at']
    list_filter = ['message_type']
    search_fields = ['content', 'order__id']


class ComparisonEntryInline(admin.TabularInline):
    model = ComparisonEntry
    extra = 0
    readonly_fields = [
        'mover', 'rank', 'total_price', 'mover_company_name',
        'mover_rating', 'mover_is_verified', 'used_custom_pricing', 'status',
    ]


@admin.register(OrderComparison)
class OrderComparisonAdmin(admin.ModelAdmin):
    list_display = [
        'order', 'status', 'total_eligible_movers', 'total_priced_movers',
        'expires_at', 'created_at',
    ]
    list_filter = ['status']
    search_fields = ['order__id']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [ComparisonEntryInline]

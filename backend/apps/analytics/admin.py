"""
Admin configuration for the analytics app.
"""
from django.contrib import admin
from .models import AnalyticsEvent, DailyAnalytics, MonthlyAnalytics, PopularItem


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = [
        'mover', 'event_type', 'value',
        'event_date', 'event_time', 'created_at'
    ]
    list_filter = ['event_type', 'event_date']
    search_fields = ['mover__company_name']
    date_hierarchy = 'event_date'
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['mover']


@admin.register(DailyAnalytics)
class DailyAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'mover', 'date',
        'orders_received', 'orders_completed',
        'total_revenue', 'quotes_sent', 'quotes_accepted'
    ]
    list_filter = ['date']
    search_fields = ['mover__company_name']
    date_hierarchy = 'date'
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['mover']

    fieldsets = (
        (None, {
            'fields': ('mover', 'date')
        }),
        ('Orders', {
            'fields': (
                'orders_received', 'orders_approved',
                'orders_completed', 'orders_cancelled'
            )
        }),
        ('Quotes', {
            'fields': ('quotes_sent', 'quotes_accepted', 'quotes_rejected')
        }),
        ('Revenue', {
            'fields': ('total_revenue', 'total_quote_value')
        }),
        ('Bookings', {
            'fields': ('bookings_created', 'bookings_completed')
        }),
        ('AI Usage', {
            'fields': ('ai_parsing_count', 'ai_image_count')
        }),
        ('Rates', {
            'fields': ('quote_acceptance_rate', 'order_completion_rate')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MonthlyAnalytics)
class MonthlyAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'mover', 'year', 'month',
        'total_orders', 'completed_orders',
        'total_revenue', 'quote_acceptance_rate'
    ]
    list_filter = ['year', 'month']
    search_fields = ['mover__company_name']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['mover']

    fieldsets = (
        (None, {
            'fields': ('mover', 'year', 'month')
        }),
        ('Orders', {
            'fields': ('total_orders', 'completed_orders')
        }),
        ('Revenue', {
            'fields': ('total_revenue', 'average_order_value')
        }),
        ('Quotes', {
            'fields': ('total_quotes', 'accepted_quotes', 'quote_acceptance_rate')
        }),
        ('Customers', {
            'fields': ('new_customers', 'repeat_customers')
        }),
        ('AI', {
            'fields': ('ai_requests',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PopularItem)
class PopularItemAdmin(admin.ModelAdmin):
    list_display = [
        'mover', 'item_type',
        'order_count', 'total_quantity', 'total_revenue',
        'period_start', 'period_end'
    ]
    list_filter = ['period_start', 'period_end']
    search_fields = ['mover__company_name', 'item_type__name_en']
    raw_id_fields = ['mover', 'item_type']

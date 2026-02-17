"""
Admin configuration for the scheduling app.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import WeeklyAvailability, BlockedDate, Booking, TimeSlot, BookingReminder


@admin.register(WeeklyAvailability)
class WeeklyAvailabilityAdmin(admin.ModelAdmin):
    list_display = [
        'mover', 'day_of_week', 'is_available',
        'start_time', 'end_time', 'max_bookings'
    ]
    list_filter = ['is_available', 'day_of_week']
    search_fields = ['mover__company_name']
    ordering = ['mover', 'day_of_week']


@admin.register(BlockedDate)
class BlockedDateAdmin(admin.ModelAdmin):
    list_display = [
        'mover', 'date', 'block_type',
        'start_time', 'end_time', 'reason', 'is_recurring_yearly'
    ]
    list_filter = ['block_type', 'is_recurring_yearly', 'date']
    search_fields = ['mover__company_name', 'reason']
    date_hierarchy = 'date'
    ordering = ['-date']


class BookingReminderInline(admin.TabularInline):
    model = BookingReminder
    extra = 0
    readonly_fields = ['sent', 'sent_at']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'order', 'mover', 'scheduled_date', 'scheduled_start_time',
        'status', 'crew_size', 'customer_confirmed', 'created_at'
    ]
    list_filter = ['status', 'customer_confirmed', 'scheduled_date']
    search_fields = [
        'order__id', 'mover__company_name',
        'order__customer__user__email'
    ]
    date_hierarchy = 'scheduled_date'
    ordering = ['scheduled_date', 'scheduled_start_time']
    readonly_fields = [
        'created_at', 'updated_at',
        'cancelled_at', 'customer_confirmed_at',
        'reminder_sent_at'
    ]
    inlines = [BookingReminderInline]

    fieldsets = (
        (None, {
            'fields': ('order', 'mover', 'status')
        }),
        ('Schedule', {
            'fields': (
                'scheduled_date', 'scheduled_start_time', 'scheduled_end_time',
                'estimated_duration_hours'
            )
        }),
        ('Actual Times', {
            'fields': ('actual_start_time', 'actual_end_time'),
            'classes': ('collapse',)
        }),
        ('Crew', {
            'fields': ('crew_size', 'crew_notes')
        }),
        ('Customer Confirmation', {
            'fields': ('customer_confirmed', 'customer_confirmed_at')
        }),
        ('Reminders', {
            'fields': ('reminder_sent', 'reminder_sent_at'),
            'classes': ('collapse',)
        }),
        ('Cancellation', {
            'fields': ('cancelled_at', 'cancellation_reason', 'cancelled_by'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'order', 'mover', 'order__customer__user'
        )


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = [
        'mover', 'name', 'name_he',
        'start_time', 'end_time', 'is_active', 'display_order'
    ]
    list_filter = ['is_active']
    search_fields = ['mover__company_name', 'name']
    ordering = ['mover', 'display_order']


@admin.register(BookingReminder)
class BookingReminderAdmin(admin.ModelAdmin):
    list_display = [
        'booking', 'reminder_type', 'scheduled_for',
        'sent', 'sent_at', 'recipient'
    ]
    list_filter = ['reminder_type', 'sent', 'scheduled_for']
    search_fields = ['booking__order__id', 'recipient']
    date_hierarchy = 'scheduled_for'
    readonly_fields = ['sent', 'sent_at']

"""
Admin configuration for the notifications app.
"""
from django.contrib import admin
from .models import NotificationType, NotificationPreference, Notification, EmailLog, SMSLog


@admin.register(NotificationType)
class NotificationTypeAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'name', 'default_email', 'default_sms', 'default_push',
        'is_critical', 'is_active'
    ]
    list_filter = ['is_critical', 'is_active', 'default_email', 'default_sms']
    search_fields = ['code', 'name', 'name_he']
    list_editable = ['is_active']

    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'name_he', 'description')
        }),
        ('Defaults', {
            'fields': ('default_email', 'default_sms', 'default_push')
        }),
        ('Templates', {
            'fields': ('email_template', 'sms_template'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('is_critical', 'is_active')
        }),
    )


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'notification_type',
        'email_enabled', 'sms_enabled', 'push_enabled'
    ]
    list_filter = ['email_enabled', 'sms_enabled', 'push_enabled']
    search_fields = ['user__email', 'notification_type__code']
    raw_id_fields = ['user', 'notification_type']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'title', 'priority',
        'is_read', 'read_at', 'created_at'
    ]
    list_filter = ['priority', 'is_read', 'created_at']
    search_fields = ['user__email', 'title', 'message']
    readonly_fields = ['created_at', 'updated_at', 'read_at']
    raw_id_fields = ['user', 'notification_type']

    fieldsets = (
        (None, {
            'fields': ('user', 'notification_type', 'priority')
        }),
        ('Content', {
            'fields': ('title', 'title_he', 'message', 'message_he')
        }),
        ('Related Object', {
            'fields': ('content_type', 'object_id', 'action_url'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_read', 'read_at')
        }),
        ('Data', {
            'fields': ('data',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = [
        'to_email', 'subject', 'status',
        'sent_at', 'delivered_at', 'opened_at', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['to_email', 'subject']
    readonly_fields = [
        'sent_at', 'delivered_at', 'opened_at',
        'created_at', 'updated_at'
    ]
    raw_id_fields = ['user', 'notification_type']

    fieldsets = (
        (None, {
            'fields': ('user', 'notification_type', 'status')
        }),
        ('Email Details', {
            'fields': ('to_email', 'from_email', 'subject')
        }),
        ('Content', {
            'fields': ('body_html', 'body_text'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('sent_at', 'delivered_at', 'opened_at')
        }),
        ('External', {
            'fields': ('external_message_id',),
            'classes': ('collapse',)
        }),
        ('Errors', {
            'fields': ('error_message', 'retry_count'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = [
        'to_phone', 'message_preview', 'status',
        'segments', 'cost', 'sent_at', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['to_phone', 'message']
    readonly_fields = [
        'sent_at', 'delivered_at',
        'created_at', 'updated_at'
    ]
    raw_id_fields = ['user', 'notification_type']

    def message_preview(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Message'

    fieldsets = (
        (None, {
            'fields': ('user', 'notification_type', 'status')
        }),
        ('SMS Details', {
            'fields': ('to_phone', 'from_phone', 'message')
        }),
        ('Tracking', {
            'fields': ('sent_at', 'delivered_at', 'segments', 'cost')
        }),
        ('External', {
            'fields': ('external_message_id',),
            'classes': ('collapse',)
        }),
        ('Errors', {
            'fields': ('error_message', 'error_code'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

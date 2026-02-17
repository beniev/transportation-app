"""
Models for the notifications app.
Handles notifications, email/SMS preferences, and notification history.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

from apps.core.models import TimeStampedModel


class NotificationType(TimeStampedModel):
    """
    Types of notifications that can be sent.
    """
    code = models.CharField(
        _('code'),
        max_length=50,
        unique=True,
        help_text=_('e.g., order_created, quote_sent, booking_reminder')
    )
    name = models.CharField(
        _('name'),
        max_length=100
    )
    name_he = models.CharField(
        _('name (Hebrew)'),
        max_length=100
    )
    description = models.TextField(
        _('description'),
        blank=True
    )

    # Default settings
    default_email = models.BooleanField(
        _('email by default'),
        default=True
    )
    default_sms = models.BooleanField(
        _('SMS by default'),
        default=False
    )
    default_push = models.BooleanField(
        _('push by default'),
        default=True
    )

    # Template references
    email_template = models.CharField(
        _('email template'),
        max_length=100,
        blank=True,
        help_text=_('Template name for email')
    )
    sms_template = models.CharField(
        _('SMS template'),
        max_length=100,
        blank=True
    )

    # Settings
    is_critical = models.BooleanField(
        _('is critical'),
        default=False,
        help_text=_('Critical notifications cannot be disabled')
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True
    )

    class Meta:
        db_table = 'notification_types'
        verbose_name = _('notification type')
        verbose_name_plural = _('notification types')

    def __str__(self):
        return self.name


class NotificationPreference(TimeStampedModel):
    """
    User preferences for notification channels.
    """
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notification_preferences',
        verbose_name=_('user')
    )
    notification_type = models.ForeignKey(
        NotificationType,
        on_delete=models.CASCADE,
        related_name='preferences',
        verbose_name=_('notification type')
    )
    email_enabled = models.BooleanField(
        _('email enabled'),
        default=True
    )
    sms_enabled = models.BooleanField(
        _('SMS enabled'),
        default=False
    )
    push_enabled = models.BooleanField(
        _('push enabled'),
        default=True
    )

    class Meta:
        db_table = 'notification_preferences'
        verbose_name = _('notification preference')
        verbose_name_plural = _('notification preferences')
        unique_together = ['user', 'notification_type']

    def __str__(self):
        return f"{self.user.email} - {self.notification_type.code}"


class Notification(TimeStampedModel):
    """
    In-app notification for users.
    """

    class Priority(models.TextChoices):
        LOW = 'low', _('Low')
        NORMAL = 'normal', _('Normal')
        HIGH = 'high', _('High')
        URGENT = 'urgent', _('Urgent')

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_('user')
    )
    notification_type = models.ForeignKey(
        NotificationType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name=_('notification type')
    )

    # Content
    title = models.CharField(
        _('title'),
        max_length=255
    )
    title_he = models.CharField(
        _('title (Hebrew)'),
        max_length=255,
        blank=True
    )
    message = models.TextField(
        _('message')
    )
    message_he = models.TextField(
        _('message (Hebrew)'),
        blank=True
    )

    # Related object (optional)
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

    # Link
    action_url = models.CharField(
        _('action URL'),
        max_length=500,
        blank=True,
        help_text=_('URL to navigate when notification is clicked')
    )

    # Status
    priority = models.CharField(
        _('priority'),
        max_length=10,
        choices=Priority.choices,
        default=Priority.NORMAL
    )
    is_read = models.BooleanField(
        _('is read'),
        default=False
    )
    read_at = models.DateTimeField(
        _('read at'),
        null=True,
        blank=True
    )

    # Metadata
    data = models.JSONField(
        _('additional data'),
        default=dict,
        blank=True
    )

    class Meta:
        db_table = 'notifications'
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.email}"

    def mark_as_read(self):
        """Mark notification as read."""
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class EmailLog(TimeStampedModel):
    """
    Log of sent emails.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        SENT = 'sent', _('Sent')
        DELIVERED = 'delivered', _('Delivered')
        BOUNCED = 'bounced', _('Bounced')
        FAILED = 'failed', _('Failed')
        OPENED = 'opened', _('Opened')
        CLICKED = 'clicked', _('Clicked')

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs',
        verbose_name=_('user')
    )
    notification_type = models.ForeignKey(
        NotificationType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs',
        verbose_name=_('notification type')
    )

    # Email details
    to_email = models.EmailField(
        _('to email')
    )
    from_email = models.EmailField(
        _('from email')
    )
    subject = models.CharField(
        _('subject'),
        max_length=255
    )
    body_html = models.TextField(
        _('HTML body'),
        blank=True
    )
    body_text = models.TextField(
        _('text body'),
        blank=True
    )

    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    sent_at = models.DateTimeField(
        _('sent at'),
        null=True,
        blank=True
    )
    delivered_at = models.DateTimeField(
        _('delivered at'),
        null=True,
        blank=True
    )
    opened_at = models.DateTimeField(
        _('opened at'),
        null=True,
        blank=True
    )

    # External IDs
    external_message_id = models.CharField(
        _('external message ID'),
        max_length=255,
        blank=True
    )

    # Error tracking
    error_message = models.TextField(
        _('error message'),
        blank=True
    )
    retry_count = models.PositiveIntegerField(
        _('retry count'),
        default=0
    )

    class Meta:
        db_table = 'email_logs'
        verbose_name = _('email log')
        verbose_name_plural = _('email logs')
        ordering = ['-created_at']

    def __str__(self):
        return f"Email to {self.to_email}: {self.subject}"


class SMSLog(TimeStampedModel):
    """
    Log of sent SMS messages.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        SENT = 'sent', _('Sent')
        DELIVERED = 'delivered', _('Delivered')
        FAILED = 'failed', _('Failed')

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sms_logs',
        verbose_name=_('user')
    )
    notification_type = models.ForeignKey(
        NotificationType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sms_logs',
        verbose_name=_('notification type')
    )

    # SMS details
    to_phone = models.CharField(
        _('to phone'),
        max_length=20
    )
    from_phone = models.CharField(
        _('from phone'),
        max_length=20,
        blank=True
    )
    message = models.TextField(
        _('message')
    )

    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    sent_at = models.DateTimeField(
        _('sent at'),
        null=True,
        blank=True
    )
    delivered_at = models.DateTimeField(
        _('delivered at'),
        null=True,
        blank=True
    )

    # External IDs
    external_message_id = models.CharField(
        _('external message ID'),
        max_length=255,
        blank=True
    )

    # Cost tracking
    segments = models.PositiveIntegerField(
        _('segments'),
        default=1
    )
    cost = models.DecimalField(
        _('cost'),
        max_digits=6,
        decimal_places=4,
        null=True,
        blank=True
    )

    # Error tracking
    error_message = models.TextField(
        _('error message'),
        blank=True
    )
    error_code = models.CharField(
        _('error code'),
        max_length=50,
        blank=True
    )

    class Meta:
        db_table = 'sms_logs'
        verbose_name = _('SMS log')
        verbose_name_plural = _('SMS logs')
        ordering = ['-created_at']

    def __str__(self):
        return f"SMS to {self.to_phone}: {self.message[:50]}"

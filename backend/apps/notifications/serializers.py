"""
Serializers for the notifications app.
"""
from rest_framework import serializers

from .models import NotificationType, NotificationPreference, Notification, EmailLog, SMSLog


class NotificationTypeSerializer(serializers.ModelSerializer):
    """Serializer for notification types."""

    class Meta:
        model = NotificationType
        fields = [
            'id', 'code', 'name', 'name_he', 'description',
            'default_email', 'default_sms', 'default_push',
            'is_critical'
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for notification preferences."""

    notification_type = NotificationTypeSerializer(read_only=True)
    notification_type_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'notification_type', 'notification_type_id',
            'email_enabled', 'sms_enabled', 'push_enabled',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications."""

    notification_type_code = serializers.CharField(
        source='notification_type.code',
        read_only=True
    )
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type_code',
            'title', 'title_he', 'message', 'message_he',
            'action_url', 'priority',
            'is_read', 'read_at',
            'data', 'created_at', 'time_ago'
        ]
        read_only_fields = fields

    def get_time_ago(self, obj):
        """Get human-readable time ago string."""
        from django.utils import timezone
        from django.utils.timesince import timesince

        now = timezone.now()
        diff = now - obj.created_at

        if diff.days == 0:
            if diff.seconds < 60:
                return 'just now'
            elif diff.seconds < 3600:
                minutes = diff.seconds // 60
                return f'{minutes}m ago'
            else:
                hours = diff.seconds // 3600
                return f'{hours}h ago'
        elif diff.days == 1:
            return 'yesterday'
        elif diff.days < 7:
            return f'{diff.days}d ago'
        else:
            return obj.created_at.strftime('%d/%m/%Y')


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for notification lists."""

    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'title_he',
            'action_url', 'priority',
            'is_read', 'created_at'
        ]


class MarkAsReadSerializer(serializers.Serializer):
    """Serializer for marking notifications as read."""

    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text="List of notification IDs to mark as read. Empty for all."
    )


class UnreadCountSerializer(serializers.Serializer):
    """Serializer for unread count response."""

    count = serializers.IntegerField()


class BulkPreferenceUpdateSerializer(serializers.Serializer):
    """Serializer for bulk updating preferences."""

    preferences = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of preference updates"
    )

    def validate_preferences(self, value):
        for pref in value:
            if 'notification_type_id' not in pref:
                raise serializers.ValidationError(
                    "Each preference must have notification_type_id"
                )
        return value


class EmailLogSerializer(serializers.ModelSerializer):
    """Serializer for email logs."""

    class Meta:
        model = EmailLog
        fields = [
            'id', 'to_email', 'subject',
            'status', 'sent_at', 'delivered_at', 'opened_at',
            'error_message', 'created_at'
        ]


class SMSLogSerializer(serializers.ModelSerializer):
    """Serializer for SMS logs."""

    class Meta:
        model = SMSLog
        fields = [
            'id', 'to_phone', 'message',
            'status', 'sent_at', 'delivered_at',
            'segments', 'cost',
            'error_message', 'created_at'
        ]

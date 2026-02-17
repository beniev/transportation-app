"""
Views for the notifications app.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NotificationType, NotificationPreference, Notification
from .serializers import (
    NotificationTypeSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
    NotificationListSerializer,
    MarkAsReadSerializer,
    UnreadCountSerializer,
    BulkPreferenceUpdateSerializer
)
from .services.notification_manager import NotificationManager


class NotificationTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing notification types.
    """
    queryset = NotificationType.objects.filter(is_active=True)
    serializer_class = NotificationTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification preferences.
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return NotificationPreference.objects.filter(
            user=self.request.user
        ).select_related('notification_type')

    @action(detail=False, methods=['get'])
    def all_with_defaults(self, request):
        """
        Get all notification types with user's preferences.
        Returns defaults for types without explicit preferences.
        """
        notification_types = NotificationType.objects.filter(is_active=True)
        user_prefs = {
            pref.notification_type_id: pref
            for pref in self.get_queryset()
        }

        result = []
        for nt in notification_types:
            if nt.id in user_prefs:
                pref = user_prefs[nt.id]
                result.append({
                    'notification_type': NotificationTypeSerializer(nt).data,
                    'email_enabled': pref.email_enabled,
                    'sms_enabled': pref.sms_enabled,
                    'push_enabled': pref.push_enabled,
                    'is_default': False
                })
            else:
                result.append({
                    'notification_type': NotificationTypeSerializer(nt).data,
                    'email_enabled': nt.default_email,
                    'sms_enabled': nt.default_sms,
                    'push_enabled': nt.default_push,
                    'is_default': True
                })

        return Response(result)

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update notification preferences."""
        serializer = BulkPreferenceUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for pref_data in serializer.validated_data['preferences']:
            NotificationPreference.objects.update_or_create(
                user=request.user,
                notification_type_id=pref_data['notification_type_id'],
                defaults={
                    'email_enabled': pref_data.get('email_enabled', True),
                    'sms_enabled': pref_data.get('sms_enabled', False),
                    'push_enabled': pref_data.get('push_enabled', True)
                }
            )

        return Response({'status': 'Preferences updated'})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and managing notifications.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(
            user=self.request.user
        ).select_related('notification_type')

        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return NotificationListSerializer
        return NotificationSerializer

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        manager = NotificationManager()
        count = manager.get_unread_count(request.user)
        serializer = UnreadCountSerializer({'count': count})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        notification.mark_as_read()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        """Mark multiple notifications as read."""
        serializer = MarkAsReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        manager = NotificationManager()
        notification_ids = serializer.validated_data.get('notification_ids')

        if notification_ids:
            manager.mark_as_read(request.user, notification_ids)
        else:
            manager.mark_all_as_read(request.user)

        return Response({'status': 'Notifications marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        manager = NotificationManager()
        manager.mark_all_as_read(request.user)
        return Response({'status': 'All notifications marked as read'})

    @action(detail=False, methods=['delete'])
    def delete_all_read(self, request):
        """Delete all read notifications."""
        deleted_count, _ = Notification.objects.filter(
            user=request.user,
            is_read=True
        ).delete()
        return Response({'deleted': deleted_count})


class SendTestNotificationView(APIView):
    """
    API view for sending test notifications (admin only).
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        """Send a test notification to current user."""
        manager = NotificationManager()

        notification = manager.send(
            user=request.user,
            notification_code='test',
            title='Test Notification',
            message='This is a test notification.',
            title_he='התראת בדיקה',
            message_he='זוהי התראת בדיקה.',
            priority='normal',
            force_email=request.data.get('send_email', False),
            force_sms=request.data.get('send_sms', False)
        )

        return Response(NotificationSerializer(notification).data)

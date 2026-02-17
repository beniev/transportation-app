"""
Notification manager service.
Orchestrates sending notifications across different channels.
"""
import logging
from typing import Dict, Optional, List
from django.contrib.contenttypes.models import ContentType

from ..models import Notification, NotificationType, NotificationPreference
from .email_service import EmailService
from .sms_service import SMSService

logger = logging.getLogger(__name__)


class NotificationManager:
    """
    Central service for managing and sending notifications.
    Respects user preferences and subscription features.
    """

    def __init__(self):
        self.email_service = EmailService()
        self.sms_service = SMSService()

    def send(
        self,
        user,
        notification_code: str,
        title: str,
        message: str,
        title_he: str = '',
        message_he: str = '',
        related_object=None,
        action_url: str = '',
        data: Dict = None,
        priority: str = 'normal',
        force_email: bool = False,
        force_sms: bool = False,
        email_template: str = None,
        email_context: Dict = None,
        sms_message: str = None
    ) -> Notification:
        """
        Send a notification to a user.

        Args:
            user: The user to notify
            notification_code: The notification type code
            title: Notification title (English)
            message: Notification message (English)
            title_he: Optional Hebrew title
            message_he: Optional Hebrew message
            related_object: Optional related Django model instance
            action_url: URL to navigate when clicked
            data: Additional data to store
            priority: low, normal, high, urgent
            force_email: Send email regardless of preferences
            force_sms: Send SMS regardless of preferences
            email_template: Custom email template name
            email_context: Custom email context
            sms_message: Custom SMS message

        Returns:
            The created Notification instance
        """
        # Get notification type
        try:
            notification_type = NotificationType.objects.get(
                code=notification_code,
                is_active=True
            )
        except NotificationType.DoesNotExist:
            notification_type = None
            logger.warning(f"Notification type not found: {notification_code}")

        # Create in-app notification
        notification = self._create_notification(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            title_he=title_he,
            message_he=message_he,
            related_object=related_object,
            action_url=action_url,
            data=data or {},
            priority=priority
        )

        # Get user preferences
        should_email, should_sms = self._get_channel_preferences(
            user, notification_type, force_email, force_sms
        )

        # Send email if enabled
        if should_email:
            self._send_email_notification(
                user=user,
                notification=notification,
                notification_type=notification_type,
                template=email_template,
                context=email_context
            )

        # Send SMS if enabled
        if should_sms:
            self._send_sms_notification(
                user=user,
                notification=notification,
                notification_type=notification_type,
                custom_message=sms_message
            )

        return notification

    def _create_notification(
        self,
        user,
        notification_type,
        title: str,
        message: str,
        title_he: str,
        message_he: str,
        related_object,
        action_url: str,
        data: Dict,
        priority: str
    ) -> Notification:
        """Create an in-app notification."""
        # Get content type for related object
        content_type = None
        object_id = None
        if related_object:
            content_type = ContentType.objects.get_for_model(related_object)
            object_id = str(related_object.pk)

        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            title_he=title_he,
            message=message,
            message_he=message_he,
            content_type=content_type,
            object_id=object_id,
            action_url=action_url,
            priority=priority,
            data=data
        )

        logger.info(f"Created notification for {user.email}: {title}")
        return notification

    def _get_channel_preferences(
        self,
        user,
        notification_type: NotificationType,
        force_email: bool,
        force_sms: bool
    ) -> tuple:
        """
        Determine which channels to use based on preferences and features.

        Returns:
            Tuple of (should_email, should_sms)
        """
        should_email = force_email
        should_sms = force_sms

        if notification_type:
            # Check if it's a critical notification (always send)
            if notification_type.is_critical:
                should_email = True
                should_sms = notification_type.default_sms
            else:
                # Check user preferences
                try:
                    pref = NotificationPreference.objects.get(
                        user=user,
                        notification_type=notification_type
                    )
                    should_email = should_email or pref.email_enabled
                    should_sms = should_sms or pref.sms_enabled
                except NotificationPreference.DoesNotExist:
                    # Use defaults
                    should_email = should_email or notification_type.default_email
                    should_sms = should_sms or notification_type.default_sms

        # Check if user has SMS feature (premium)
        if should_sms:
            if hasattr(user, 'mover_profile'):
                try:
                    subscription = user.mover_profile.subscription
                    if not subscription.has_feature('sms_notifications'):
                        should_sms = False
                except:
                    should_sms = False

        return should_email, should_sms

    def _send_email_notification(
        self,
        user,
        notification: Notification,
        notification_type: NotificationType,
        template: str,
        context: Dict
    ):
        """Send email notification."""
        try:
            template_name = template
            if not template_name and notification_type:
                template_name = notification_type.email_template

            if not template_name:
                template_name = 'notification'

            email_context = context or {}
            email_context.update({
                'user': user,
                'notification': notification,
                'title': notification.title_he if user.preferred_language == 'he' else notification.title,
                'message': notification.message_he if user.preferred_language == 'he' else notification.message,
                'action_url': notification.action_url
            })

            self.email_service.send(
                to_email=user.email,
                subject=notification.title_he if user.preferred_language == 'he' else notification.title,
                template_name=template_name,
                context=email_context,
                user=user,
                notification_type=notification_type
            )

        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")

    def _send_sms_notification(
        self,
        user,
        notification: Notification,
        notification_type: NotificationType,
        custom_message: str
    ):
        """Send SMS notification."""
        if not user.phone:
            logger.warning(f"No phone number for user {user.email}")
            return

        try:
            message = custom_message
            if not message:
                # Build message from notification
                title = notification.title_he if user.preferred_language == 'he' else notification.title
                body = notification.message_he if user.preferred_language == 'he' else notification.message

                # Truncate for SMS
                message = f"{title}\n{body[:120]}"
                if notification.action_url:
                    message += f"\n{notification.action_url}"

            self.sms_service.send(
                to_phone=user.phone,
                message=message[:160],  # SMS limit
                user=user,
                notification_type=notification_type
            )

        except Exception as e:
            logger.error(f"Failed to send SMS notification: {e}")

    # Bulk notification methods

    def notify_mover_new_order(self, order):
        """Notify mover of a new order."""
        return self.send(
            user=order.mover.user,
            notification_code='order_created',
            title='New Order Received',
            message=f'New order from {order.customer.user.get_full_name() or order.customer.user.email}',
            title_he='התקבלה הזמנה חדשה',
            message_he=f'הזמנה חדשה מ-{order.customer.user.get_full_name() or order.customer.user.email}',
            related_object=order,
            action_url=f'/mover/orders/{order.id}',
            priority='high'
        )

    def notify_customer_quote_sent(self, quote):
        """Notify customer that a quote was sent."""
        return self.send(
            user=quote.order.customer.user,
            notification_code='quote_sent',
            title=f'Quote from {quote.order.mover.company_name}',
            message=f'You received a quote for ₪{quote.total_amount:,.0f}',
            title_he=f'הצעת מחיר מ-{quote.order.mover.company_name}',
            message_he=f'קיבלת הצעת מחיר בסך ₪{quote.total_amount:,.0f}',
            related_object=quote,
            action_url=f'/quotes/{quote.quote_number}',
            priority='high'
        )

    def notify_booking_confirmed(self, booking):
        """Notify customer that booking was confirmed."""
        return self.send(
            user=booking.order.customer.user,
            notification_code='booking_confirmed',
            title='Booking Confirmed',
            message=f'Your moving is scheduled for {booking.scheduled_date}',
            title_he='ההזמנה אושרה',
            message_he=f'ההובלה נקבעה לתאריך {booking.scheduled_date.strftime("%d/%m/%Y")}',
            related_object=booking,
            action_url=f'/orders/{booking.order.id}',
            priority='high'
        )

    def notify_booking_reminder(self, booking):
        """Send booking reminder to customer."""
        return self.send(
            user=booking.order.customer.user,
            notification_code='booking_reminder',
            title='Moving Tomorrow',
            message=f'Reminder: Your moving is scheduled for tomorrow at {booking.scheduled_start_time}',
            title_he='הובלה מחר',
            message_he=f'תזכורת: ההובלה שלך מחר בשעה {booking.scheduled_start_time.strftime("%H:%M")}',
            related_object=booking,
            action_url=f'/orders/{booking.order.id}',
            priority='high',
            force_sms=True
        )

    def notify_payment_received(self, payment):
        """Notify mover of payment received."""
        return self.send(
            user=payment.mover.user,
            notification_code='payment_received',
            title='Payment Received',
            message=f'Payment of ₪{payment.amount:,.0f} received',
            title_he='תשלום התקבל',
            message_he=f'התקבל תשלום בסך ₪{payment.amount:,.0f}',
            related_object=payment,
            action_url=f'/mover/payments/{payment.id}',
            priority='normal'
        )

    def mark_as_read(self, user, notification_ids: List[str]):
        """Mark notifications as read."""
        from django.utils import timezone
        Notification.objects.filter(
            user=user,
            id__in=notification_ids,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())

    def mark_all_as_read(self, user):
        """Mark all user notifications as read."""
        from django.utils import timezone
        Notification.objects.filter(
            user=user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())

    def get_unread_count(self, user) -> int:
        """Get count of unread notifications."""
        return Notification.objects.filter(
            user=user,
            is_read=False
        ).count()

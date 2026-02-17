"""
SMS service for sending text messages.
Uses Twilio as the provider.
"""
import logging
from typing import Optional
from dataclasses import dataclass

from django.conf import settings
from django.utils import timezone

from ..models import SMSLog, NotificationType

logger = logging.getLogger(__name__)


@dataclass
class SMSResult:
    """Result of an SMS send operation."""
    success: bool
    message_id: Optional[str] = None
    segments: int = 1
    error_message: Optional[str] = None
    error_code: Optional[str] = None


class SMSService:
    """
    Service for sending SMS messages via Twilio.
    """

    def __init__(self):
        self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
        self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
        self.from_phone = getattr(settings, 'TWILIO_PHONE_NUMBER', '')
        self.enabled = bool(self.account_sid and self.auth_token)

        if self.enabled:
            from twilio.rest import Client
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None

    def send(
        self,
        to_phone: str,
        message: str,
        user=None,
        notification_type: NotificationType = None
    ) -> SMSResult:
        """
        Send an SMS message.

        Args:
            to_phone: Recipient phone number (with country code)
            message: Message text
            user: Optional user object for logging
            notification_type: Optional notification type for logging

        Returns:
            SMSResult with success status and message ID
        """
        # Normalize phone number
        to_phone = self._normalize_phone(to_phone)

        # Create log entry
        sms_log = SMSLog.objects.create(
            user=user,
            notification_type=notification_type,
            to_phone=to_phone,
            from_phone=self.from_phone,
            message=message,
            status=SMSLog.Status.PENDING
        )

        if not self.enabled:
            # SMS is disabled - log only
            logger.warning(f"SMS disabled. Would send to {to_phone}: {message}")
            sms_log.status = SMSLog.Status.FAILED
            sms_log.error_message = "SMS service not configured"
            sms_log.save()
            return SMSResult(
                success=False,
                error_message="SMS service not configured"
            )

        try:
            # Send via Twilio
            twilio_message = self.client.messages.create(
                body=message,
                from_=self.from_phone,
                to=to_phone
            )

            # Update log
            sms_log.status = SMSLog.Status.SENT
            sms_log.sent_at = timezone.now()
            sms_log.external_message_id = twilio_message.sid
            sms_log.segments = twilio_message.num_segments or 1
            sms_log.save()

            logger.info(f"SMS sent to {to_phone}: {message[:50]}...")

            return SMSResult(
                success=True,
                message_id=twilio_message.sid,
                segments=twilio_message.num_segments or 1
            )

        except Exception as e:
            logger.error(f"Failed to send SMS to {to_phone}: {e}")

            sms_log.status = SMSLog.Status.FAILED
            sms_log.error_message = str(e)
            if hasattr(e, 'code'):
                sms_log.error_code = str(e.code)
            sms_log.save()

            return SMSResult(
                success=False,
                error_message=str(e),
                error_code=str(getattr(e, 'code', ''))
            )

    def _normalize_phone(self, phone: str) -> str:
        """
        Normalize phone number to international format.
        Assumes Israeli numbers if no country code.
        """
        # Remove spaces, dashes, parentheses
        phone = ''.join(c for c in phone if c.isdigit() or c == '+')

        # If starts with 0, assume Israeli number
        if phone.startswith('0'):
            phone = '+972' + phone[1:]
        # If doesn't start with +, assume Israeli
        elif not phone.startswith('+'):
            phone = '+972' + phone

        return phone

    # Predefined SMS methods for common notifications

    def send_verification_code(self, phone: str, code: str, user=None) -> SMSResult:
        """Send verification code via SMS."""
        message = f"קוד האימות שלך הוא: {code}\nתוקף הקוד: 10 דקות"
        return self.send(to_phone=phone, message=message, user=user)

    def send_order_notification(self, mover_phone: str, order, user=None) -> SMSResult:
        """Notify mover of new order via SMS."""
        customer_name = order.customer.user.get_full_name() or 'לקוח'
        message = (
            f"הזמנה חדשה התקבלה!\n"
            f"לקוח: {customer_name}\n"
            f"מ: {order.origin_address[:30]}...\n"
            f"אל: {order.destination_address[:30]}..."
        )
        return self.send(to_phone=mover_phone, message=message, user=user)

    def send_booking_reminder(self, customer_phone: str, booking, user=None) -> SMSResult:
        """Send booking reminder to customer."""
        message = (
            f"תזכורת: הובלה מחר {booking.scheduled_date.strftime('%d/%m')}\n"
            f"שעה: {booking.scheduled_start_time.strftime('%H:%M')}\n"
            f"מוביל: {booking.mover.company_name}\n"
            f"טלפון: {booking.mover.user.phone}"
        )
        return self.send(to_phone=customer_phone, message=message, user=user)

    def send_booking_confirmation(self, customer_phone: str, booking, user=None) -> SMSResult:
        """Send booking confirmation to customer."""
        message = (
            f"ההובלה אושרה!\n"
            f"תאריך: {booking.scheduled_date.strftime('%d/%m/%Y')}\n"
            f"שעה: {booking.scheduled_start_time.strftime('%H:%M')}\n"
            f"מוביל: {booking.mover.company_name}"
        )
        return self.send(to_phone=customer_phone, message=message, user=user)

    def send_quote_notification(self, customer_phone: str, quote, user=None) -> SMSResult:
        """Notify customer of new quote."""
        message = (
            f"התקבלה הצעת מחיר חדשה!\n"
            f"מוביל: {quote.order.mover.company_name}\n"
            f"סכום: ₪{quote.total_amount:,.0f}\n"
            f"לצפייה: {settings.FRONTEND_URL}/quotes/{quote.quote_number}"
        )
        return self.send(to_phone=customer_phone, message=message, user=user)

    def send_mover_on_the_way(self, customer_phone: str, booking, user=None) -> SMSResult:
        """Notify customer that mover is on the way."""
        message = (
            f"המוביל יצא לדרך!\n"
            f"זמן הגעה משוער: {booking.scheduled_start_time.strftime('%H:%M')}\n"
            f"טלפון המוביל: {booking.mover.user.phone}"
        )
        return self.send(to_phone=customer_phone, message=message, user=user)

    def send_payment_confirmation(self, mover_phone: str, payment, user=None) -> SMSResult:
        """Send payment confirmation to mover."""
        message = (
            f"תשלום התקבל!\n"
            f"סכום: ₪{payment.amount:,.0f}\n"
            f"חשבונית: #{payment.invoice_number}"
        )
        return self.send(to_phone=mover_phone, message=message, user=user)

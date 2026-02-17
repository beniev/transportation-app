"""
Email service for sending transactional emails.
Supports SendGrid and AWS SES.
"""
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from ..models import EmailLog, NotificationType

logger = logging.getLogger(__name__)


@dataclass
class EmailResult:
    """Result of an email send operation."""
    success: bool
    message_id: Optional[str] = None
    error_message: Optional[str] = None


class EmailService:
    """
    Service for sending transactional emails.
    """

    def __init__(self):
        self.from_email = settings.DEFAULT_FROM_EMAIL
        self.provider = getattr(settings, 'EMAIL_PROVIDER', 'django')

    def send(
        self,
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict,
        user=None,
        notification_type: NotificationType = None,
        attachments: List = None,
        reply_to: str = None
    ) -> EmailResult:
        """
        Send a transactional email.

        Args:
            to_email: Recipient email address
            subject: Email subject
            template_name: Name of the email template (without extension)
            context: Template context variables
            user: Optional user object for logging
            notification_type: Optional notification type for logging
            attachments: Optional list of (filename, content, mimetype) tuples
            reply_to: Optional reply-to address

        Returns:
            EmailResult with success status and message ID
        """
        try:
            # Render templates
            html_content = render_to_string(
                f'emails/{template_name}.html',
                context
            )
            text_content = render_to_string(
                f'emails/{template_name}.txt',
                context
            )

            # Create email log entry
            email_log = EmailLog.objects.create(
                user=user,
                notification_type=notification_type,
                to_email=to_email,
                from_email=self.from_email,
                subject=subject,
                body_html=html_content,
                body_text=text_content,
                status=EmailLog.Status.PENDING
            )

            # Build email
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=self.from_email,
                to=[to_email],
                reply_to=[reply_to] if reply_to else None
            )
            email.attach_alternative(html_content, 'text/html')

            # Add attachments
            if attachments:
                for filename, content, mimetype in attachments:
                    email.attach(filename, content, mimetype)

            # Send
            email.send(fail_silently=False)

            # Update log
            email_log.status = EmailLog.Status.SENT
            email_log.sent_at = timezone.now()
            email_log.save()

            logger.info(f"Email sent to {to_email}: {subject}")

            return EmailResult(
                success=True,
                message_id=str(email_log.id)
            )

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")

            # Update log with error
            if 'email_log' in locals():
                email_log.status = EmailLog.Status.FAILED
                email_log.error_message = str(e)
                email_log.save()

            return EmailResult(
                success=False,
                error_message=str(e)
            )

    def send_simple(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: str = None,
        user=None
    ) -> EmailResult:
        """
        Send a simple email without template.
        """
        try:
            email_log = EmailLog.objects.create(
                user=user,
                to_email=to_email,
                from_email=self.from_email,
                subject=subject,
                body_text=body_text,
                body_html=body_html or '',
                status=EmailLog.Status.PENDING
            )

            email = EmailMultiAlternatives(
                subject=subject,
                body=body_text,
                from_email=self.from_email,
                to=[to_email]
            )

            if body_html:
                email.attach_alternative(body_html, 'text/html')

            email.send(fail_silently=False)

            email_log.status = EmailLog.Status.SENT
            email_log.sent_at = timezone.now()
            email_log.save()

            return EmailResult(success=True, message_id=str(email_log.id))

        except Exception as e:
            logger.error(f"Failed to send simple email to {to_email}: {e}")
            return EmailResult(success=False, error_message=str(e))

    # Predefined email methods for common notifications

    def send_welcome_email(self, user, is_mover: bool = False) -> EmailResult:
        """Send welcome email to new user."""
        context = {
            'user': user,
            'is_mover': is_mover,
            'app_name': 'MoverApp',
            'support_email': settings.SUPPORT_EMAIL if hasattr(settings, 'SUPPORT_EMAIL') else self.from_email
        }
        return self.send(
            to_email=user.email,
            subject='ברוכים הבאים ל-MoverApp' if user.preferred_language == 'he' else 'Welcome to MoverApp',
            template_name='welcome',
            context=context,
            user=user
        )

    def send_order_created(self, order) -> EmailResult:
        """Send order creation notification to mover."""
        mover_user = order.mover.user
        context = {
            'order': order,
            'customer_name': order.customer.user.get_full_name() or order.customer.user.email,
            'origin': order.origin_address,
            'destination': order.destination_address,
            'dashboard_url': f"{settings.FRONTEND_URL}/mover/orders/{order.id}"
        }
        return self.send(
            to_email=mover_user.email,
            subject=f'הזמנה חדשה התקבלה' if mover_user.preferred_language == 'he' else 'New Order Received',
            template_name='order_created',
            context=context,
            user=mover_user
        )

    def send_quote_to_customer(self, quote) -> EmailResult:
        """Send quote to customer."""
        customer_user = quote.order.customer.user
        context = {
            'quote': quote,
            'mover_name': quote.order.mover.company_name,
            'total_amount': quote.total_amount,
            'valid_until': quote.valid_until,
            'quote_url': f"{settings.FRONTEND_URL}/quotes/{quote.quote_number}"
        }
        return self.send(
            to_email=customer_user.email,
            subject=f'הצעת מחיר מ-{quote.order.mover.company_name}',
            template_name='quote_sent',
            context=context,
            user=customer_user,
            attachments=[(
                f'quote_{quote.quote_number}.pdf',
                quote.pdf_file.read() if quote.pdf_file else b'',
                'application/pdf'
            )] if quote.pdf_file else None
        )

    def send_booking_confirmation(self, booking) -> EmailResult:
        """Send booking confirmation to customer."""
        customer_user = booking.order.customer.user
        context = {
            'booking': booking,
            'mover_name': booking.mover.company_name,
            'scheduled_date': booking.scheduled_date,
            'scheduled_time': booking.scheduled_start_time,
            'origin': booking.order.origin_address,
            'destination': booking.order.destination_address
        }
        return self.send(
            to_email=customer_user.email,
            subject='אישור הזמנת הובלה' if customer_user.preferred_language == 'he' else 'Moving Booking Confirmed',
            template_name='booking_confirmation',
            context=context,
            user=customer_user
        )

    def send_booking_reminder(self, booking) -> EmailResult:
        """Send booking reminder to customer."""
        customer_user = booking.order.customer.user
        context = {
            'booking': booking,
            'mover_name': booking.mover.company_name,
            'mover_phone': booking.mover.user.phone,
            'scheduled_date': booking.scheduled_date,
            'scheduled_time': booking.scheduled_start_time,
            'origin': booking.order.origin_address,
            'destination': booking.order.destination_address
        }
        return self.send(
            to_email=customer_user.email,
            subject='תזכורת: הובלה מחר' if customer_user.preferred_language == 'he' else 'Reminder: Moving Tomorrow',
            template_name='booking_reminder',
            context=context,
            user=customer_user
        )

    def send_payment_receipt(self, payment) -> EmailResult:
        """Send payment receipt."""
        mover_user = payment.mover.user
        context = {
            'payment': payment,
            'amount': payment.amount,
            'currency': payment.currency,
            'invoice_number': payment.invoice_number,
            'paid_at': payment.paid_at
        }
        return self.send(
            to_email=mover_user.email,
            subject=f'קבלה #{payment.invoice_number}' if mover_user.preferred_language == 'he' else f'Receipt #{payment.invoice_number}',
            template_name='payment_receipt',
            context=context,
            user=mover_user,
            attachments=[(
                f'invoice_{payment.invoice_number}.pdf',
                payment.invoice_pdf.read() if payment.invoice_pdf else b'',
                'application/pdf'
            )] if payment.invoice_pdf else None
        )

    def send_password_reset(self, user, reset_url: str) -> EmailResult:
        """Send password reset email."""
        context = {
            'user': user,
            'reset_url': reset_url,
            'valid_hours': 24
        }
        return self.send(
            to_email=user.email,
            subject='איפוס סיסמה' if user.preferred_language == 'he' else 'Password Reset',
            template_name='password_reset',
            context=context,
            user=user
        )

    def send_verification_code(self, user, code: str) -> EmailResult:
        """Send verification code email."""
        context = {
            'user': user,
            'code': code,
            'valid_minutes': 10
        }
        return self.send(
            to_email=user.email,
            subject='קוד אימות' if user.preferred_language == 'he' else 'Verification Code',
            template_name='verification_code',
            context=context,
            user=user
        )

"""
SMS service using SMS4Free API for sending verification codes.
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_sms(recipient: str, message: str) -> bool:
    """
    Send an SMS via SMS4Free API.
    Returns True on success, False on failure.
    """
    key = getattr(settings, 'SMS4FREE_KEY', '')
    user = getattr(settings, 'SMS4FREE_USER', '')
    password = getattr(settings, 'SMS4FREE_PASS', '')
    sender = getattr(settings, 'SMS4FREE_SENDER', 'MoversIL')

    if not all([key, user, password]):
        logger.warning("SMS4Free credentials not configured, skipping SMS send")
        return False

    # Clean phone number — remove spaces, dashes, leading +
    phone = recipient.replace(' ', '').replace('-', '')
    if phone.startswith('+972'):
        phone = '0' + phone[4:]
    elif phone.startswith('972'):
        phone = '0' + phone[3:]

    url = 'https://api.sms4free.co.il/ApiSMS/v2/SendSMS'
    payload = {
        'key': key,
        'user': user,
        'pass': password,
        'sender': sender,
        'recipient': phone,
        'msg': message,
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        result = response.text.strip()
        logger.info(f"SMS4Free response for {phone}: {result}")

        # SMS4Free returns a positive number on success
        if result.isdigit() and int(result) > 0:
            return True
        else:
            logger.error(f"SMS4Free error: {result}")
            return False
    except Exception as e:
        logger.error(f"SMS send failed: {e}")
        return False


def send_verification_code(phone: str, code: str) -> bool:
    """Send a verification code via SMS."""
    message = f"קוד האימות שלך: {code}"
    return send_sms(phone, message)

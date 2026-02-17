"""
Payment gateway service.
Abstract interface for payment processing with support for multiple providers.
"""
import logging
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Dict, Optional, Tuple
from dataclasses import dataclass

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@dataclass
class PaymentResult:
    """Result of a payment operation."""
    success: bool
    transaction_id: Optional[str] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    raw_response: Optional[Dict] = None


@dataclass
class TokenResult:
    """Result of a tokenization operation."""
    success: bool
    token: Optional[str] = None
    last_four: Optional[str] = None
    card_brand: Optional[str] = None
    expiry_month: Optional[int] = None
    expiry_year: Optional[int] = None
    error_message: Optional[str] = None


class PaymentGatewayBase(ABC):
    """Abstract base class for payment gateways."""

    @abstractmethod
    def charge(
        self,
        amount: Decimal,
        currency: str,
        token: str,
        description: str = '',
        metadata: Dict = None
    ) -> PaymentResult:
        """Process a payment charge."""
        pass

    @abstractmethod
    def refund(
        self,
        transaction_id: str,
        amount: Optional[Decimal] = None,
        reason: str = ''
    ) -> PaymentResult:
        """Process a refund."""
        pass

    @abstractmethod
    def tokenize_card(
        self,
        card_number: str,
        expiry_month: int,
        expiry_year: int,
        cvv: str,
        holder_name: str = ''
    ) -> TokenResult:
        """Tokenize a credit card."""
        pass

    @abstractmethod
    def create_subscription(
        self,
        customer_id: str,
        plan_id: str,
        payment_method_token: str
    ) -> PaymentResult:
        """Create a recurring subscription."""
        pass

    @abstractmethod
    def cancel_subscription(
        self,
        subscription_id: str
    ) -> PaymentResult:
        """Cancel a subscription."""
        pass


class TranzilaGateway(PaymentGatewayBase):
    """
    Tranzila payment gateway implementation.
    Popular in Israel for credit card processing.
    """

    def __init__(self):
        self.terminal_name = getattr(settings, 'TRANZILA_TERMINAL', '')
        self.api_url = 'https://secure5.tranzila.com/cgi-bin/tranzila71.cgi'

    def charge(
        self,
        amount: Decimal,
        currency: str,
        token: str,
        description: str = '',
        metadata: Dict = None
    ) -> PaymentResult:
        """Process a payment with Tranzila."""
        # NOTE: This is a placeholder implementation
        # In production, you would use Tranzila's actual API

        try:
            # Tranzila expects amount in agorot (cents)
            amount_cents = int(amount * 100)

            # Build request parameters
            params = {
                'supplier': self.terminal_name,
                'TranzilaTK': token,
                'sum': amount_cents,
                'currency': '1' if currency == 'ILS' else '2',  # 1=ILS, 2=USD
                'cred_type': '1',  # Regular transaction
            }

            # In production: Make actual API call
            # response = requests.post(self.api_url, data=params)

            # Placeholder success response
            logger.info(f"Tranzila charge: {amount} {currency} with token {token[:8]}...")

            return PaymentResult(
                success=True,
                transaction_id=f"TRZ_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                raw_response={'status': 'approved'}
            )

        except Exception as e:
            logger.error(f"Tranzila charge error: {e}")
            return PaymentResult(
                success=False,
                error_message=str(e),
                error_code='GATEWAY_ERROR'
            )

    def refund(
        self,
        transaction_id: str,
        amount: Optional[Decimal] = None,
        reason: str = ''
    ) -> PaymentResult:
        """Process a refund with Tranzila."""
        try:
            logger.info(f"Tranzila refund: {transaction_id}, amount: {amount}")

            return PaymentResult(
                success=True,
                transaction_id=f"TRZ_REF_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                raw_response={'status': 'refunded'}
            )

        except Exception as e:
            logger.error(f"Tranzila refund error: {e}")
            return PaymentResult(
                success=False,
                error_message=str(e),
                error_code='REFUND_ERROR'
            )

    def tokenize_card(
        self,
        card_number: str,
        expiry_month: int,
        expiry_year: int,
        cvv: str,
        holder_name: str = ''
    ) -> TokenResult:
        """Tokenize a card with Tranzila."""
        try:
            # In production: Call Tranzila's tokenization API
            last_four = card_number[-4:]

            # Detect card brand
            card_brand = self._detect_card_brand(card_number)

            # Generate mock token
            import hashlib
            token = hashlib.sha256(
                f"{card_number}{expiry_month}{expiry_year}".encode()
            ).hexdigest()[:32]

            logger.info(f"Tranzila tokenize: ****{last_four}")

            return TokenResult(
                success=True,
                token=token,
                last_four=last_four,
                card_brand=card_brand,
                expiry_month=expiry_month,
                expiry_year=expiry_year
            )

        except Exception as e:
            logger.error(f"Tranzila tokenize error: {e}")
            return TokenResult(
                success=False,
                error_message=str(e)
            )

    def create_subscription(
        self,
        customer_id: str,
        plan_id: str,
        payment_method_token: str
    ) -> PaymentResult:
        """Create a recurring subscription."""
        try:
            logger.info(f"Tranzila subscription: customer={customer_id}, plan={plan_id}")

            return PaymentResult(
                success=True,
                transaction_id=f"TRZ_SUB_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                raw_response={'status': 'active'}
            )

        except Exception as e:
            logger.error(f"Tranzila subscription error: {e}")
            return PaymentResult(
                success=False,
                error_message=str(e),
                error_code='SUBSCRIPTION_ERROR'
            )

    def cancel_subscription(
        self,
        subscription_id: str
    ) -> PaymentResult:
        """Cancel a subscription."""
        try:
            logger.info(f"Tranzila cancel subscription: {subscription_id}")

            return PaymentResult(
                success=True,
                transaction_id=subscription_id,
                raw_response={'status': 'cancelled'}
            )

        except Exception as e:
            logger.error(f"Tranzila cancel error: {e}")
            return PaymentResult(
                success=False,
                error_message=str(e),
                error_code='CANCEL_ERROR'
            )

    def _detect_card_brand(self, card_number: str) -> str:
        """Detect card brand from number."""
        card_number = card_number.replace(' ', '').replace('-', '')

        if card_number.startswith('4'):
            return 'Visa'
        elif card_number.startswith(('51', '52', '53', '54', '55')):
            return 'Mastercard'
        elif card_number.startswith(('34', '37')):
            return 'Amex'
        elif card_number.startswith('6011'):
            return 'Discover'
        elif card_number.startswith(('2131', '1800')):
            return 'JCB'
        else:
            return 'Unknown'


class StripeGateway(PaymentGatewayBase):
    """
    Stripe payment gateway implementation.
    Alternative international payment processor.
    """

    def __init__(self):
        import stripe
        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        self.stripe = stripe

    def charge(
        self,
        amount: Decimal,
        currency: str,
        token: str,
        description: str = '',
        metadata: Dict = None
    ) -> PaymentResult:
        """Process a payment with Stripe."""
        try:
            amount_cents = int(amount * 100)

            payment_intent = self.stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency.lower(),
                payment_method=token,
                description=description,
                metadata=metadata or {},
                confirm=True
            )

            return PaymentResult(
                success=payment_intent.status == 'succeeded',
                transaction_id=payment_intent.id,
                raw_response=payment_intent.to_dict()
            )

        except self.stripe.error.CardError as e:
            return PaymentResult(
                success=False,
                error_message=e.user_message,
                error_code=e.code
            )
        except Exception as e:
            logger.error(f"Stripe charge error: {e}")
            return PaymentResult(
                success=False,
                error_message=str(e),
                error_code='GATEWAY_ERROR'
            )

    def refund(
        self,
        transaction_id: str,
        amount: Optional[Decimal] = None,
        reason: str = ''
    ) -> PaymentResult:
        """Process a refund with Stripe."""
        try:
            refund_params = {
                'payment_intent': transaction_id,
                'reason': 'requested_by_customer'
            }
            if amount:
                refund_params['amount'] = int(amount * 100)

            refund = self.stripe.Refund.create(**refund_params)

            return PaymentResult(
                success=refund.status == 'succeeded',
                transaction_id=refund.id,
                raw_response=refund.to_dict()
            )

        except Exception as e:
            logger.error(f"Stripe refund error: {e}")
            return PaymentResult(
                success=False,
                error_message=str(e),
                error_code='REFUND_ERROR'
            )

    def tokenize_card(
        self,
        card_number: str,
        expiry_month: int,
        expiry_year: int,
        cvv: str,
        holder_name: str = ''
    ) -> TokenResult:
        """
        Tokenize a card with Stripe.
        Note: In production, use Stripe Elements on frontend.
        """
        try:
            # Create payment method
            payment_method = self.stripe.PaymentMethod.create(
                type='card',
                card={
                    'number': card_number,
                    'exp_month': expiry_month,
                    'exp_year': expiry_year,
                    'cvc': cvv,
                },
            )

            return TokenResult(
                success=True,
                token=payment_method.id,
                last_four=payment_method.card.last4,
                card_brand=payment_method.card.brand.title(),
                expiry_month=payment_method.card.exp_month,
                expiry_year=payment_method.card.exp_year
            )

        except Exception as e:
            logger.error(f"Stripe tokenize error: {e}")
            return TokenResult(
                success=False,
                error_message=str(e)
            )

    def create_subscription(
        self,
        customer_id: str,
        plan_id: str,
        payment_method_token: str
    ) -> PaymentResult:
        """Create a recurring subscription with Stripe."""
        try:
            subscription = self.stripe.Subscription.create(
                customer=customer_id,
                items=[{'price': plan_id}],
                default_payment_method=payment_method_token
            )

            return PaymentResult(
                success=subscription.status == 'active',
                transaction_id=subscription.id,
                raw_response=subscription.to_dict()
            )

        except Exception as e:
            logger.error(f"Stripe subscription error: {e}")
            return PaymentResult(
                success=False,
                error_message=str(e),
                error_code='SUBSCRIPTION_ERROR'
            )

    def cancel_subscription(
        self,
        subscription_id: str
    ) -> PaymentResult:
        """Cancel a Stripe subscription."""
        try:
            subscription = self.stripe.Subscription.delete(subscription_id)

            return PaymentResult(
                success=True,
                transaction_id=subscription.id,
                raw_response=subscription.to_dict()
            )

        except Exception as e:
            logger.error(f"Stripe cancel error: {e}")
            return PaymentResult(
                success=False,
                error_message=str(e),
                error_code='CANCEL_ERROR'
            )


class PaymentGateway:
    """
    Main payment gateway factory.
    Selects appropriate gateway based on configuration.
    """

    @staticmethod
    def get_gateway() -> PaymentGatewayBase:
        """Get the configured payment gateway."""
        gateway_type = getattr(settings, 'PAYMENT_GATEWAY', 'tranzila')

        if gateway_type == 'stripe':
            return StripeGateway()
        else:
            return TranzilaGateway()

    @classmethod
    def charge(cls, *args, **kwargs) -> PaymentResult:
        """Convenience method for charging."""
        return cls.get_gateway().charge(*args, **kwargs)

    @classmethod
    def refund(cls, *args, **kwargs) -> PaymentResult:
        """Convenience method for refunds."""
        return cls.get_gateway().refund(*args, **kwargs)

    @classmethod
    def tokenize_card(cls, *args, **kwargs) -> TokenResult:
        """Convenience method for tokenization."""
        return cls.get_gateway().tokenize_card(*args, **kwargs)

    @classmethod
    def create_subscription(cls, *args, **kwargs) -> PaymentResult:
        """Convenience method for creating subscriptions."""
        return cls.get_gateway().create_subscription(*args, **kwargs)

    @classmethod
    def cancel_subscription(cls, *args, **kwargs) -> PaymentResult:
        """Convenience method for cancelling subscriptions."""
        return cls.get_gateway().cancel_subscription(*args, **kwargs)

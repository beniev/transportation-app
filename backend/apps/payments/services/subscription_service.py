"""
Subscription management service.
Handles subscription lifecycle, upgrades, downgrades, and renewals.
"""
import logging
from datetime import timedelta
from decimal import Decimal
from typing import Optional, Tuple

from django.utils import timezone
from django.db import transaction

from ..models import SubscriptionPlan, Subscription, Payment, PaymentMethod, Coupon
from .payment_gateway import PaymentGateway

logger = logging.getLogger(__name__)


class SubscriptionService:
    """
    Service for managing mover subscriptions.
    """

    # Trial period in days
    TRIAL_DAYS = 14

    def __init__(self, mover):
        self.mover = mover

    def get_current_subscription(self) -> Optional[Subscription]:
        """Get mover's current subscription."""
        try:
            return self.mover.subscription
        except Subscription.DoesNotExist:
            return None

    def create_free_subscription(self) -> Subscription:
        """Create a free subscription for new movers."""
        free_plan = SubscriptionPlan.objects.get(plan_type=SubscriptionPlan.PlanType.FREE)

        now = timezone.now()
        period_end = now + timedelta(days=365 * 100)  # Essentially forever

        subscription = Subscription.objects.create(
            mover=self.mover,
            plan=free_plan,
            status=Subscription.Status.ACTIVE,
            billing_cycle=Subscription.BillingCycle.MONTHLY,
            current_period_start=now,
            current_period_end=period_end
        )

        logger.info(f"Created free subscription for {self.mover.company_name}")
        return subscription

    def start_trial(self, plan: SubscriptionPlan) -> Subscription:
        """Start a trial subscription for a paid plan."""
        now = timezone.now()
        trial_end = now + timedelta(days=self.TRIAL_DAYS)

        # Check if mover already had a trial
        existing = self.get_current_subscription()
        if existing and existing.trial_end:
            raise ValueError("Mover has already used their trial")

        if existing:
            existing.delete()

        subscription = Subscription.objects.create(
            mover=self.mover,
            plan=plan,
            status=Subscription.Status.TRIALING,
            billing_cycle=Subscription.BillingCycle.MONTHLY,
            current_period_start=now,
            current_period_end=trial_end,
            trial_end=trial_end
        )

        logger.info(f"Started trial for {self.mover.company_name} on plan {plan.name}")
        return subscription

    @transaction.atomic
    def subscribe(
        self,
        plan: SubscriptionPlan,
        billing_cycle: str = 'monthly',
        payment_method: PaymentMethod = None,
        coupon_code: str = None
    ) -> Tuple[Subscription, Optional[Payment]]:
        """
        Subscribe mover to a paid plan.

        Returns:
            Tuple of (Subscription, Payment or None)
        """
        now = timezone.now()

        # Calculate period end based on billing cycle
        if billing_cycle == 'yearly':
            period_end = now + timedelta(days=365)
            amount = plan.price_yearly
        else:
            period_end = now + timedelta(days=30)
            amount = plan.price_monthly

        # Apply coupon if provided
        discount = Decimal('0.00')
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code.upper())
                if coupon.is_valid:
                    if coupon.first_time_only:
                        # Check if mover had any paid subscription before
                        has_previous = Subscription.objects.filter(
                            mover=self.mover,
                            plan__plan_type__in=[
                                SubscriptionPlan.PlanType.BASIC,
                                SubscriptionPlan.PlanType.PRO
                            ]
                        ).exists()
                        if not has_previous:
                            discount = coupon.calculate_discount(amount)
                            coupon.times_used += 1
                            coupon.save()
                    else:
                        discount = coupon.calculate_discount(amount)
                        coupon.times_used += 1
                        coupon.save()
            except Coupon.DoesNotExist:
                pass

        final_amount = amount - discount

        # Get or create payment method
        if not payment_method:
            payment_method = PaymentMethod.objects.filter(
                mover=self.mover,
                is_default=True
            ).first()

        if not payment_method and final_amount > 0:
            raise ValueError("Payment method required for paid subscription")

        # Process payment if amount > 0
        payment = None
        if final_amount > 0:
            result = PaymentGateway.charge(
                amount=final_amount,
                currency=plan.currency,
                token=payment_method.external_token,
                description=f"Subscription to {plan.name}",
                metadata={
                    'mover_id': str(self.mover.id),
                    'plan_id': str(plan.id),
                    'billing_cycle': billing_cycle
                }
            )

            if not result.success:
                raise ValueError(f"Payment failed: {result.error_message}")

            payment = Payment.objects.create(
                subscription=None,  # Will update after subscription created
                mover=self.mover,
                amount=final_amount,
                currency=plan.currency,
                status=Payment.Status.COMPLETED,
                payment_type=Payment.PaymentType.SUBSCRIPTION,
                payment_method='credit_card',
                last_four_digits=payment_method.last_four_digits,
                card_brand=payment_method.card_brand,
                external_payment_id=result.transaction_id,
                billing_email=self.mover.user.email,
                billing_name=self.mover.company_name,
                description=f"Subscription to {plan.name}",
                paid_at=now
            )

        # Create or update subscription
        existing = self.get_current_subscription()
        if existing:
            existing.plan = plan
            existing.status = Subscription.Status.ACTIVE
            existing.billing_cycle = billing_cycle
            existing.current_period_start = now
            existing.current_period_end = period_end
            existing.cancelled_at = None
            existing.save()
            subscription = existing
        else:
            subscription = Subscription.objects.create(
                mover=self.mover,
                plan=plan,
                status=Subscription.Status.ACTIVE,
                billing_cycle=billing_cycle,
                current_period_start=now,
                current_period_end=period_end
            )

        # Update payment with subscription
        if payment:
            payment.subscription = subscription
            payment.save()

        logger.info(
            f"Subscribed {self.mover.company_name} to {plan.name} "
            f"({billing_cycle}), amount: {final_amount}"
        )

        return subscription, payment

    @transaction.atomic
    def change_plan(
        self,
        new_plan: SubscriptionPlan,
        billing_cycle: str = None
    ) -> Tuple[Subscription, Optional[Payment]]:
        """
        Change to a different plan (upgrade/downgrade).
        Prorates charges for upgrades.
        """
        subscription = self.get_current_subscription()
        if not subscription:
            raise ValueError("No active subscription found")

        old_plan = subscription.plan
        billing_cycle = billing_cycle or subscription.billing_cycle

        # If downgrading, apply at end of current period
        if new_plan.price_monthly < old_plan.price_monthly:
            subscription.plan = new_plan
            subscription.save()
            logger.info(f"Scheduled downgrade to {new_plan.name} for {self.mover.company_name}")
            return subscription, None

        # For upgrades, calculate prorated amount
        now = timezone.now()
        days_remaining = (subscription.current_period_end - now).days
        total_days = 30 if subscription.billing_cycle == 'monthly' else 365

        if days_remaining <= 0:
            # Period expired, charge full amount
            proration_ratio = Decimal('1.0')
        else:
            proration_ratio = Decimal(str(days_remaining)) / Decimal(str(total_days))

        old_price = old_plan.price_monthly if billing_cycle == 'monthly' else old_plan.price_yearly
        new_price = new_plan.price_monthly if billing_cycle == 'monthly' else new_plan.price_yearly

        price_diff = new_price - old_price
        prorated_amount = (price_diff * proration_ratio).quantize(Decimal('0.01'))

        payment = None
        if prorated_amount > 0:
            # Get default payment method
            payment_method = PaymentMethod.objects.filter(
                mover=self.mover,
                is_default=True
            ).first()

            if not payment_method:
                raise ValueError("Payment method required for upgrade")

            result = PaymentGateway.charge(
                amount=prorated_amount,
                currency=new_plan.currency,
                token=payment_method.external_token,
                description=f"Upgrade to {new_plan.name} (prorated)",
                metadata={
                    'mover_id': str(self.mover.id),
                    'old_plan_id': str(old_plan.id),
                    'new_plan_id': str(new_plan.id)
                }
            )

            if not result.success:
                raise ValueError(f"Payment failed: {result.error_message}")

            payment = Payment.objects.create(
                subscription=subscription,
                mover=self.mover,
                amount=prorated_amount,
                currency=new_plan.currency,
                status=Payment.Status.COMPLETED,
                payment_type=Payment.PaymentType.SUBSCRIPTION,
                payment_method='credit_card',
                last_four_digits=payment_method.last_four_digits,
                card_brand=payment_method.card_brand,
                external_payment_id=result.transaction_id,
                billing_email=self.mover.user.email,
                billing_name=self.mover.company_name,
                description=f"Upgrade from {old_plan.name} to {new_plan.name}",
                paid_at=now
            )

        # Update subscription
        subscription.plan = new_plan
        subscription.billing_cycle = billing_cycle
        subscription.save()

        logger.info(
            f"Upgraded {self.mover.company_name} from {old_plan.name} to {new_plan.name}"
        )

        return subscription, payment

    def cancel(self, immediate: bool = False, reason: str = '') -> Subscription:
        """
        Cancel subscription.
        By default, cancellation takes effect at end of billing period.
        """
        subscription = self.get_current_subscription()
        if not subscription:
            raise ValueError("No active subscription found")

        now = timezone.now()
        subscription.cancelled_at = now

        if immediate:
            subscription.status = Subscription.Status.CANCELLED
            subscription.current_period_end = now
        else:
            # Will be cancelled at period end
            pass

        subscription.save()

        # Cancel with payment provider if external subscription exists
        if subscription.external_subscription_id:
            PaymentGateway.cancel_subscription(subscription.external_subscription_id)

        logger.info(
            f"Cancelled subscription for {self.mover.company_name}, "
            f"immediate={immediate}, reason={reason}"
        )

        return subscription

    def reactivate(self) -> Subscription:
        """Reactivate a cancelled subscription before period end."""
        subscription = self.get_current_subscription()
        if not subscription:
            raise ValueError("No subscription found")

        if subscription.status == Subscription.Status.CANCELLED:
            raise ValueError("Cannot reactivate fully cancelled subscription")

        if not subscription.cancelled_at:
            raise ValueError("Subscription is not scheduled for cancellation")

        subscription.cancelled_at = None
        subscription.save()

        logger.info(f"Reactivated subscription for {self.mover.company_name}")
        return subscription

    @transaction.atomic
    def renew(self) -> Tuple[Subscription, Payment]:
        """
        Renew subscription for another period.
        Called by scheduled task or webhook.
        """
        subscription = self.get_current_subscription()
        if not subscription:
            raise ValueError("No subscription found")

        if subscription.cancelled_at:
            subscription.status = Subscription.Status.CANCELLED
            subscription.save()
            raise ValueError("Subscription was cancelled")

        plan = subscription.plan
        now = timezone.now()

        # Calculate amount based on billing cycle
        if subscription.billing_cycle == 'yearly':
            amount = plan.price_yearly
            period_days = 365
        else:
            amount = plan.price_monthly
            period_days = 30

        # Get payment method
        payment_method = PaymentMethod.objects.filter(
            mover=self.mover,
            is_default=True
        ).first()

        if not payment_method:
            subscription.status = Subscription.Status.PAST_DUE
            subscription.save()
            raise ValueError("No payment method available for renewal")

        # Process payment
        result = PaymentGateway.charge(
            amount=amount,
            currency=plan.currency,
            token=payment_method.external_token,
            description=f"Subscription renewal: {plan.name}",
            metadata={
                'mover_id': str(self.mover.id),
                'plan_id': str(plan.id),
                'renewal': True
            }
        )

        if not result.success:
            subscription.status = Subscription.Status.PAST_DUE
            subscription.save()
            raise ValueError(f"Renewal payment failed: {result.error_message}")

        # Create payment record
        payment = Payment.objects.create(
            subscription=subscription,
            mover=self.mover,
            amount=amount,
            currency=plan.currency,
            status=Payment.Status.COMPLETED,
            payment_type=Payment.PaymentType.SUBSCRIPTION,
            payment_method='credit_card',
            last_four_digits=payment_method.last_four_digits,
            card_brand=payment_method.card_brand,
            external_payment_id=result.transaction_id,
            billing_email=self.mover.user.email,
            billing_name=self.mover.company_name,
            description=f"Subscription renewal: {plan.name}",
            paid_at=now
        )

        # Update subscription period
        subscription.current_period_start = now
        subscription.current_period_end = now + timedelta(days=period_days)
        subscription.status = Subscription.Status.ACTIVE
        subscription.reset_usage()
        subscription.save()

        logger.info(f"Renewed subscription for {self.mover.company_name}")

        return subscription, payment

    def check_feature(self, feature_name: str) -> bool:
        """Check if mover has access to a feature."""
        subscription = self.get_current_subscription()
        if not subscription:
            return False
        return subscription.has_feature(feature_name)

    def get_usage_stats(self) -> dict:
        """Get current usage statistics."""
        subscription = self.get_current_subscription()
        if not subscription:
            return {}

        return {
            'orders_used': subscription.orders_used_this_month,
            'orders_limit': subscription.plan.max_orders_per_month,
            'orders_remaining': (
                None if subscription.plan.max_orders_per_month is None
                else max(0, subscription.plan.max_orders_per_month - subscription.orders_used_this_month)
            ),
            'quotes_used': subscription.quotes_used_this_month,
            'quotes_limit': subscription.plan.max_quotes_per_month,
            'quotes_remaining': (
                None if subscription.plan.max_quotes_per_month is None
                else max(0, subscription.plan.max_quotes_per_month - subscription.quotes_used_this_month)
            ),
            'period_end': subscription.current_period_end.isoformat()
        }

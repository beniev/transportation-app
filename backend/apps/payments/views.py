"""
Views for the payments app.
"""
import json
import logging

from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsMover
from .models import SubscriptionPlan, Subscription, Payment, PaymentMethod, Coupon
from .serializers import (
    SubscriptionPlanSerializer,
    SubscriptionSerializer,
    PaymentMethodSerializer,
    PaymentMethodCreateSerializer,
    PaymentSerializer,
    PaymentHistorySerializer,
    CouponSerializer,
    ValidateCouponSerializer,
    SubscribeSerializer,
    ChangePlanSerializer,
    CancelSubscriptionSerializer,
    UsageStatsSerializer
)
from .services.subscription_service import SubscriptionService
from .services.payment_gateway import PaymentGateway

logger = logging.getLogger(__name__)


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing subscription plans.
    Public access - no authentication required.
    """
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'])
    def compare(self, request):
        """Get all plans with comparison data."""
        plans = self.get_queryset()
        serializer = self.get_serializer(plans, many=True)

        # Build feature comparison matrix
        features = [
            {'key': 'max_orders_per_month', 'name': 'Monthly Orders', 'name_he': 'הזמנות בחודש'},
            {'key': 'max_quotes_per_month', 'name': 'Monthly Quotes', 'name_he': 'הצעות מחיר בחודש'},
            {'key': 'has_ai_parsing', 'name': 'AI Item Parsing', 'name_he': 'פירסור AI'},
            {'key': 'has_ai_images', 'name': 'AI Image Analysis', 'name_he': 'ניתוח תמונות'},
            {'key': 'has_digital_signatures', 'name': 'Digital Signatures', 'name_he': 'חתימות דיגיטליות'},
            {'key': 'has_sms_notifications', 'name': 'SMS Notifications', 'name_he': 'התראות SMS'},
            {'key': 'has_advanced_analytics', 'name': 'Advanced Analytics', 'name_he': 'אנליטיקה מתקדמת'},
            {'key': 'has_priority_support', 'name': 'Priority Support', 'name_he': 'תמיכה עדיפה'},
            {'key': 'has_custom_branding', 'name': 'Custom Branding', 'name_he': 'מיתוג מותאם'},
            {'key': 'has_api_access', 'name': 'API Access', 'name_he': 'גישת API'},
        ]

        return Response({
            'plans': serializer.data,
            'features': features
        })


class SubscriptionViewSet(viewsets.GenericViewSet):
    """
    ViewSet for managing subscriptions.
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get_queryset(self):
        return Subscription.objects.filter(mover=self.request.user.mover_profile)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current subscription."""
        service = SubscriptionService(request.user.mover_profile)
        subscription = service.get_current_subscription()

        if not subscription:
            return Response(
                {'detail': 'No active subscription'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def subscribe(self, request):
        """Subscribe to a plan."""
        serializer = SubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = get_object_or_404(
            SubscriptionPlan,
            id=serializer.validated_data['plan_id']
        )

        payment_method = None
        if serializer.validated_data.get('payment_method_id'):
            payment_method = get_object_or_404(
                PaymentMethod,
                id=serializer.validated_data['payment_method_id'],
                mover=request.user.mover_profile
            )

        service = SubscriptionService(request.user.mover_profile)

        try:
            subscription, payment = service.subscribe(
                plan=plan,
                billing_cycle=serializer.validated_data['billing_cycle'],
                payment_method=payment_method,
                coupon_code=serializer.validated_data.get('coupon_code')
            )

            return Response({
                'subscription': SubscriptionSerializer(subscription).data,
                'payment': PaymentSerializer(payment).data if payment else None
            })

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def start_trial(self, request):
        """Start a trial subscription."""
        plan_id = request.data.get('plan_id')
        plan = get_object_or_404(SubscriptionPlan, id=plan_id)

        service = SubscriptionService(request.user.mover_profile)

        try:
            subscription = service.start_trial(plan)
            return Response(SubscriptionSerializer(subscription).data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def change_plan(self, request):
        """Change subscription plan."""
        serializer = ChangePlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = get_object_or_404(
            SubscriptionPlan,
            id=serializer.validated_data['plan_id']
        )

        service = SubscriptionService(request.user.mover_profile)

        try:
            subscription, payment = service.change_plan(
                new_plan=plan,
                billing_cycle=serializer.validated_data.get('billing_cycle')
            )

            return Response({
                'subscription': SubscriptionSerializer(subscription).data,
                'payment': PaymentSerializer(payment).data if payment else None
            })

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def cancel(self, request):
        """Cancel subscription."""
        serializer = CancelSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = SubscriptionService(request.user.mover_profile)

        try:
            subscription = service.cancel(
                immediate=serializer.validated_data.get('immediate', False),
                reason=serializer.validated_data.get('reason', '')
            )
            return Response(SubscriptionSerializer(subscription).data)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def reactivate(self, request):
        """Reactivate cancelled subscription."""
        service = SubscriptionService(request.user.mover_profile)

        try:
            subscription = service.reactivate()
            return Response(SubscriptionSerializer(subscription).data)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def usage(self, request):
        """Get current usage statistics."""
        service = SubscriptionService(request.user.mover_profile)
        stats = service.get_usage_stats()

        if not stats:
            return Response(
                {'detail': 'No active subscription'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = UsageStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def check_feature(self, request):
        """Check if a specific feature is available."""
        feature = request.query_params.get('feature')
        if not feature:
            return Response(
                {'error': 'Feature parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = SubscriptionService(request.user.mover_profile)
        has_feature = service.check_feature(feature)

        return Response({
            'feature': feature,
            'available': has_feature
        })


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing payment methods.
    """
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get_queryset(self):
        return PaymentMethod.objects.filter(mover=self.request.user.mover_profile)

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentMethodCreateSerializer
        return PaymentMethodSerializer

    def create(self, request):
        """Add a new payment method."""
        serializer = PaymentMethodCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # Tokenize card with payment gateway
        result = PaymentGateway.tokenize_card(
            card_number=data['card_number'],
            expiry_month=data['expiry_month'],
            expiry_year=data['expiry_year'],
            cvv=data['cvv'],
            holder_name=data['holder_name']
        )

        if not result.success:
            return Response(
                {'error': result.error_message or 'Failed to process card'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create payment method record
        payment_method = PaymentMethod.objects.create(
            mover=request.user.mover_profile,
            method_type=PaymentMethod.MethodType.CREDIT_CARD,
            is_default=data.get('is_default', True),
            last_four_digits=result.last_four,
            card_brand=result.card_brand,
            expiry_month=result.expiry_month,
            expiry_year=result.expiry_year,
            external_token=result.token,
            billing_name=data['holder_name'],
            billing_email=data.get('billing_email', request.user.email)
        )

        return Response(
            PaymentMethodSerializer(payment_method).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set a payment method as default."""
        payment_method = self.get_object()
        payment_method.is_default = True
        payment_method.save()

        return Response(PaymentMethodSerializer(payment_method).data)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing payment history.
    """
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get_queryset(self):
        return Payment.objects.filter(
            mover=self.request.user.mover_profile
        ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return PaymentHistorySerializer
        return PaymentSerializer

    @action(detail=True, methods=['get'])
    def invoice(self, request, pk=None):
        """Download invoice PDF."""
        payment = self.get_object()

        if not payment.invoice_pdf:
            return Response(
                {'error': 'Invoice not available'},
                status=status.HTTP_404_NOT_FOUND
            )

        response = HttpResponse(
            payment.invoice_pdf.read(),
            content_type='application/pdf'
        )
        response['Content-Disposition'] = (
            f'attachment; filename="invoice_{payment.invoice_number}.pdf"'
        )
        return response

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get payment summary statistics."""
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncMonth

        payments = self.get_queryset().filter(
            status=Payment.Status.COMPLETED
        )

        # Total spent
        total = payments.aggregate(total=Sum('amount'))['total'] or 0

        # Monthly breakdown (last 12 months)
        monthly = payments.annotate(
            month=TruncMonth('paid_at')
        ).values('month').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-month')[:12]

        return Response({
            'total_spent': total,
            'total_payments': payments.count(),
            'monthly_breakdown': list(monthly)
        })


class CouponView(APIView):
    """
    API view for coupon validation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Validate a coupon code."""
        serializer = ValidateCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']
        coupon = get_object_or_404(Coupon, code=code)

        # Check plan restrictions if plan_id provided
        plan_id = serializer.validated_data.get('plan_id')
        if plan_id and coupon.applicable_plans.exists():
            if not coupon.applicable_plans.filter(id=plan_id).exists():
                return Response(
                    {'error': 'Coupon not valid for selected plan'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Check first time restriction
        if coupon.first_time_only and hasattr(request.user, 'mover_profile'):
            has_previous = Subscription.objects.filter(
                mover=request.user.mover_profile,
                plan__plan_type__in=[
                    SubscriptionPlan.PlanType.BASIC,
                    SubscriptionPlan.PlanType.PRO
                ]
            ).exists()
            if has_previous:
                return Response(
                    {'error': 'Coupon only valid for first-time subscribers'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(CouponSerializer(coupon).data)


@method_decorator(csrf_exempt, name='dispatch')
class PaymentWebhookView(APIView):
    """
    Webhook endpoint for payment provider callbacks.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Handle payment provider webhook."""
        # Verify webhook signature (implementation depends on provider)
        # For Stripe: stripe.Webhook.construct_event(...)
        # For Tranzila: custom verification

        try:
            payload = json.loads(request.body)
            event_type = payload.get('type', payload.get('event_type'))

            logger.info(f"Payment webhook received: {event_type}")

            if event_type in ['payment_intent.succeeded', 'charge.succeeded']:
                self._handle_payment_success(payload)

            elif event_type in ['payment_intent.payment_failed', 'charge.failed']:
                self._handle_payment_failure(payload)

            elif event_type in ['customer.subscription.updated']:
                self._handle_subscription_update(payload)

            elif event_type in ['customer.subscription.deleted']:
                self._handle_subscription_cancelled(payload)

            elif event_type in ['invoice.payment_failed']:
                self._handle_invoice_failed(payload)

            return Response({'status': 'received'})

        except Exception as e:
            logger.error(f"Webhook processing error: {e}")
            return Response(
                {'error': 'Webhook processing failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _handle_payment_success(self, payload):
        """Handle successful payment."""
        # Update payment record status
        pass

    def _handle_payment_failure(self, payload):
        """Handle failed payment."""
        # Update payment record, notify mover
        pass

    def _handle_subscription_update(self, payload):
        """Handle subscription update."""
        pass

    def _handle_subscription_cancelled(self, payload):
        """Handle subscription cancellation."""
        pass

    def _handle_invoice_failed(self, payload):
        """Handle failed invoice payment."""
        # Mark subscription as past_due
        pass

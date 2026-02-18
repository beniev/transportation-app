"""
Views for the orders app.
"""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404

from .models import Order, OrderItem, OrderImage, OrderComparison, Review
from .serializers import (
    OrderListSerializer,
    OrderDetailSerializer,
    OrderCreateSerializer,
    OrderUpdateSerializer,
    OrderItemSerializer,
    OrderImageSerializer,
    OrderStatusUpdateSerializer,
    OrderScheduleSerializer,
    OrderComparisonSerializer,
    SelectMoverSerializer,
    ReviewSerializer,
    ReviewCreateSerializer,
)
from .services.comparison_service import ComparisonService


class IsMover(permissions.BasePermission):
    """Permission for mover-only access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_mover


class IsCustomer(permissions.BasePermission):
    """Permission for customer-only access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_customer


class IsOrderParticipant(permissions.BasePermission):
    """Permission for order participant (mover or customer)."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_mover:
            # Mover can access their own orders or unassigned orders
            if obj.mover is None:
                return True  # Available order
            return obj.mover.user == request.user
        return obj.customer == request.user


# Order List Views

class MoverOrderListView(generics.ListAPIView):
    """List all orders for the mover."""
    serializer_class = OrderListSerializer
    permission_classes = [IsMover]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'origin_city', 'destination_city']

    def get_queryset(self):
        return Order.objects.filter(
            mover=self.request.user.mover_profile
        ).select_related('customer', 'mover')


class CustomerOrderListView(generics.ListAPIView):
    """List all orders for the customer."""
    serializer_class = OrderListSerializer
    permission_classes = [IsCustomer]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']

    def get_queryset(self):
        return Order.objects.filter(
            customer=self.request.user
        ).select_related('customer', 'mover')


class AvailableOrdersView(generics.ListAPIView):
    """List all available orders (unassigned) for movers to claim."""
    serializer_class = OrderListSerializer
    permission_classes = [IsMover]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['origin_city', 'destination_city']

    def get_queryset(self):
        # Show orders without a mover assigned, in draft or pending status
        return Order.objects.filter(
            mover__isnull=True,
            status__in=[Order.Status.DRAFT, Order.Status.PENDING]
        ).select_related('customer').order_by('-created_at')


class ClaimOrderView(APIView):
    """Claim an available order (mover only)."""
    permission_classes = [IsMover]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)

        # Check if order is available
        if order.mover is not None:
            return Response(
                {'error': 'הזמנה זו כבר נתפסה על ידי מוביל אחר'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.status not in [Order.Status.DRAFT, Order.Status.PENDING]:
            return Response(
                {'error': 'לא ניתן לקבל הזמנה זו'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Assign the order to this mover
        order.mover = request.user.mover_profile
        order.status = Order.Status.PENDING
        order.save()

        return Response(OrderDetailSerializer(order).data)


# Order CRUD Views

class OrderCreateView(generics.CreateAPIView):
    """Create a new order."""
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user, status=Order.Status.DRAFT)


class OrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete an order."""
    permission_classes = [permissions.IsAuthenticated, IsOrderParticipant]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return OrderUpdateSerializer
        return OrderDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_mover:
            # Movers can see their orders and unassigned orders
            from django.db.models import Q
            return Order.objects.filter(
                Q(mover=user.mover_profile) | Q(mover__isnull=True)
            )
        return Order.objects.filter(customer=user)


# Order Status Actions

class OrderApproveView(APIView):
    """Approve an order (mover only)."""
    permission_classes = [IsMover]

    def post(self, request, pk):
        order = get_object_or_404(
            Order,
            pk=pk,
            mover=request.user.mover_profile
        )

        if order.status not in [Order.Status.PENDING, Order.Status.QUOTED]:
            return Response(
                {'error': 'Order cannot be approved in current state'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = Order.Status.APPROVED
        if request.data.get('notes'):
            order.mover_notes = request.data['notes']
        order.save()

        return Response(OrderDetailSerializer(order).data)


class OrderRejectView(APIView):
    """Reject an order (mover only)."""
    permission_classes = [IsMover]

    def post(self, request, pk):
        order = get_object_or_404(
            Order,
            pk=pk,
            mover=request.user.mover_profile
        )

        if order.status not in [Order.Status.PENDING, Order.Status.QUOTED]:
            return Response(
                {'error': 'Order cannot be rejected in current state'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = Order.Status.REJECTED
        if request.data.get('notes'):
            order.mover_notes = request.data['notes']
        order.save()

        return Response(OrderDetailSerializer(order).data)


class OrderScheduleView(APIView):
    """Schedule an order (mover only)."""
    permission_classes = [IsMover]

    def post(self, request, pk):
        order = get_object_or_404(
            Order,
            pk=pk,
            mover=request.user.mover_profile
        )

        if order.status != Order.Status.APPROVED:
            return Response(
                {'error': 'Only approved orders can be scheduled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = OrderScheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order.scheduled_date = serializer.validated_data['date']
        order.scheduled_time = serializer.validated_data['time']
        order.status = Order.Status.SCHEDULED
        if serializer.validated_data.get('notes'):
            order.mover_notes = serializer.validated_data['notes']
        order.save()

        # TODO: Create booking and send calendar invite

        return Response(OrderDetailSerializer(order).data)


class OrderCompleteView(APIView):
    """Mark an order as completed (mover only)."""
    permission_classes = [IsMover]

    def post(self, request, pk):
        order = get_object_or_404(
            Order,
            pk=pk,
            mover=request.user.mover_profile
        )

        if order.status not in [Order.Status.SCHEDULED, Order.Status.IN_PROGRESS]:
            return Response(
                {'error': 'Order cannot be completed in current state'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = Order.Status.COMPLETED
        order.save()

        # Update mover stats
        mover = order.mover
        mover.completed_orders += 1
        mover.save()

        return Response(OrderDetailSerializer(order).data)


class OrderCancelView(APIView):
    """Cancel an order (customer or mover)."""
    permission_classes = [permissions.IsAuthenticated, IsOrderParticipant]

    def post(self, request, pk):
        user = request.user
        if user.is_mover:
            order = get_object_or_404(Order, pk=pk, mover=user.mover_profile)
        else:
            order = get_object_or_404(Order, pk=pk, customer=user)

        if order.status in [Order.Status.COMPLETED, Order.Status.CANCELLED]:
            return Response(
                {'error': 'Order cannot be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = Order.Status.CANCELLED
        if request.data.get('notes'):
            if user.is_mover:
                order.mover_notes = request.data['notes']
            else:
                order.customer_notes = request.data['notes']
        order.save()

        return Response(OrderDetailSerializer(order).data)


class SubmitOrderView(APIView):
    """Submit a draft order for review."""
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        order = get_object_or_404(
            Order,
            pk=pk,
            customer=request.user
        )

        if order.status != Order.Status.DRAFT:
            return Response(
                {'error': 'Only draft orders can be submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = Order.Status.PENDING
        order.save()

        # Auto-generate price comparisons
        comparison_data = {}
        try:
            service = ComparisonService(order)
            comparison = service.generate_comparisons()
            comparison_data = {
                'comparison_status': comparison.status,
                'comparison_count': comparison.total_priced_movers,
            }
        except Exception:
            # Order still works even if comparison fails
            pass

        response_data = OrderDetailSerializer(order).data
        response_data.update(comparison_data)
        return Response(response_data)


# Order Items

class OrderItemListView(generics.ListCreateAPIView):
    """List or create order items."""
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrderParticipant]

    def get_queryset(self):
        order_id = self.kwargs.get('order_pk')
        return OrderItem.objects.filter(order_id=order_id)

    def perform_create(self, serializer):
        order_id = self.kwargs.get('order_pk')
        order = get_object_or_404(Order, pk=order_id)
        serializer.save(order=order)


class OrderItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete an order item."""
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrderParticipant]
    lookup_url_kwarg = 'item_pk'

    def get_queryset(self):
        order_id = self.kwargs.get('order_pk')
        return OrderItem.objects.filter(order_id=order_id)


# Order Images

class OrderImageListView(generics.ListCreateAPIView):
    """List or create order images."""
    serializer_class = OrderImageSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrderParticipant]

    def get_queryset(self):
        order_id = self.kwargs.get('order_pk')
        return OrderImage.objects.filter(order_id=order_id)

    def perform_create(self, serializer):
        order_id = self.kwargs.get('order_pk')
        order = get_object_or_404(Order, pk=order_id)
        serializer.save(order=order)


class OrderImageDeleteView(generics.DestroyAPIView):
    """Delete an order image."""
    serializer_class = OrderImageSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrderParticipant]
    lookup_url_kwarg = 'image_pk'

    def get_queryset(self):
        order_id = self.kwargs.get('order_pk')
        return OrderImage.objects.filter(order_id=order_id)


# Comparison Views

class OrderComparisonView(APIView):
    """Get comparison results for an order."""
    permission_classes = [IsCustomer]

    def get(self, request, pk):
        order = get_object_or_404(Order, pk=pk, customer=request.user)
        try:
            comparison = order.comparison
        except OrderComparison.DoesNotExist:
            return Response(
                {'error': 'No comparison found for this order'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(OrderComparisonSerializer(comparison).data)


class GenerateComparisonView(APIView):
    """Trigger (re)generation of price comparisons."""
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, customer=request.user)

        if order.status not in [Order.Status.PENDING, Order.Status.COMPARING]:
            return Response(
                {'error': 'Comparisons can only be generated for pending orders'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = ComparisonService(order)
        comparison = service.generate_comparisons()
        return Response(OrderComparisonSerializer(comparison).data)


class SelectMoverView(APIView):
    """Customer selects a mover from the comparison."""
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, customer=request.user)

        if order.status != Order.Status.COMPARING:
            return Response(
                {'error': 'Order is not in comparing state'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SelectMoverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ComparisonService(order)
        try:
            entry = service.select_mover(serializer.validated_data['entry_id'])
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(OrderDetailSerializer(order).data)


class RequestManualQuoteView(APIView):
    """Fallback to manual quote flow - reverts order to PENDING."""
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, customer=request.user)

        if order.status not in [Order.Status.COMPARING, Order.Status.PENDING]:
            return Response(
                {'error': 'Cannot request manual quote in current state'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = Order.Status.PENDING
        order.save(update_fields=['status'])

        return Response(OrderDetailSerializer(order).data)


# ──────────────────────────────────────────────
# Review Views
# ──────────────────────────────────────────────

class CreateReviewView(APIView):
    """Customer creates a review for a completed order."""
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, customer=request.user)

        if order.status != Order.Status.COMPLETED:
            return Response(
                {'error': 'Can only review completed orders'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not order.mover:
            return Response(
                {'error': 'Order has no mover assigned'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(order, 'review'):
            return Response(
                {'error': 'Review already exists for this order'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review = Review.objects.create(
            order=order,
            customer=request.user,
            mover=order.mover,
            rating=serializer.validated_data['rating'],
            text=serializer.validated_data.get('text', ''),
        )

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    def get(self, request, pk):
        """Get the review for an order (if exists)."""
        order = get_object_or_404(Order, pk=pk, customer=request.user)
        try:
            review = order.review
        except Review.DoesNotExist:
            return Response(
                {'error': 'No review for this order'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ReviewSerializer(review).data)


class MoverReviewsView(generics.ListAPIView):
    """List all reviews for a mover (public)."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        mover_id = self.kwargs['mover_id']
        return Review.objects.filter(mover_id=mover_id).select_related('customer')

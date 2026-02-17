"""
Views for the scheduling app.
"""
from datetime import date, timedelta

from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsMover, IsCustomer
from apps.accounts.models import MoverProfile
from .models import WeeklyAvailability, BlockedDate, Booking, TimeSlot, BookingReminder
from .serializers import (
    WeeklyAvailabilitySerializer,
    BlockedDateSerializer,
    TimeSlotSerializer,
    BookingListSerializer,
    BookingDetailSerializer,
    BookingCreateSerializer,
    BookingRescheduleSerializer,
    BookingCancelSerializer,
    AvailableDatesSerializer,
    MonthOverviewSerializer,
    DailyScheduleSerializer,
    BookingReminderSerializer
)
from .services.calendar_service import CalendarService
from .services.ical_generator import ICalGenerator


class WeeklyAvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing weekly availability schedule.
    """
    serializer_class = WeeklyAvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get_queryset(self):
        return WeeklyAvailability.objects.filter(
            mover=self.request.user.mover_profile
        )

    @action(detail=False, methods=['post'])
    def initialize_defaults(self, request):
        """Initialize default weekly schedule."""
        calendar = CalendarService(request.user.mover_profile)
        calendar.initialize_default_schedule()
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Update multiple days at once."""
        days = request.data.get('days', [])

        for day_data in days:
            day_of_week = day_data.get('day_of_week')
            if day_of_week is not None:
                WeeklyAvailability.objects.update_or_create(
                    mover=request.user.mover_profile,
                    day_of_week=day_of_week,
                    defaults={
                        'is_available': day_data.get('is_available', True),
                        'start_time': day_data.get('start_time', '08:00'),
                        'end_time': day_data.get('end_time', '18:00'),
                        'max_bookings': day_data.get('max_bookings', 3)
                    }
                )

        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class BlockedDateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing blocked dates.
    """
    serializer_class = BlockedDateSerializer
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get_queryset(self):
        queryset = BlockedDate.objects.filter(
            mover=self.request.user.mover_profile
        )

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple blocked dates at once."""
        dates = request.data.get('dates', [])
        created = []

        for date_str in dates:
            blocked, was_created = BlockedDate.objects.get_or_create(
                mover=request.user.mover_profile,
                date=date_str,
                defaults={
                    'block_type': request.data.get('block_type', 'full_day'),
                    'reason': request.data.get('reason', '')
                }
            )
            if was_created:
                created.append(blocked)

        serializer = self.get_serializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        """Delete multiple blocked dates."""
        dates = request.data.get('dates', [])
        deleted_count, _ = BlockedDate.objects.filter(
            mover=request.user.mover_profile,
            date__in=dates
        ).delete()
        return Response({'deleted': deleted_count})


class TimeSlotViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing time slots.
    """
    serializer_class = TimeSlotSerializer
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get_queryset(self):
        return TimeSlot.objects.filter(
            mover=self.request.user.mover_profile
        )

    @action(detail=False, methods=['post'])
    def initialize_defaults(self, request):
        """Initialize default time slots."""
        calendar = CalendarService(request.user.mover_profile)
        calendar.initialize_default_time_slots()
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder time slots."""
        slot_ids = request.data.get('slot_ids', [])
        for idx, slot_id in enumerate(slot_ids):
            TimeSlot.objects.filter(
                id=slot_id,
                mover=request.user.mover_profile
            ).update(display_order=idx)
        return Response({'status': 'Slots reordered'})


class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing bookings.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if hasattr(user, 'mover_profile'):
            queryset = Booking.objects.filter(mover=user.mover_profile)
        elif hasattr(user, 'customer_profile'):
            queryset = Booking.objects.filter(order__customer=user.customer_profile)
        else:
            return Booking.objects.none()

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        status_filter = self.request.query_params.get('status')

        if start_date:
            queryset = queryset.filter(scheduled_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(scheduled_date__lte=end_date)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.select_related('order', 'order__customer__user')

    def get_serializer_class(self):
        if self.action == 'list':
            return BookingListSerializer
        elif self.action == 'create':
            return BookingCreateSerializer
        return BookingDetailSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsMover()]
        return super().get_permissions()

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm a booking."""
        booking = self.get_object()

        if booking.status != Booking.Status.TENTATIVE:
            return Response(
                {'error': 'Only tentative bookings can be confirmed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = Booking.Status.CONFIRMED
        booking.save()

        # Update order status
        booking.order.status = 'scheduled'
        booking.order.scheduled_date = booking.scheduled_date
        booking.order.save()

        serializer = BookingDetailSerializer(booking, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start a booking (mark as in progress)."""
        booking = self.get_object()

        if booking.status != Booking.Status.CONFIRMED:
            return Response(
                {'error': 'Only confirmed bookings can be started'},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = Booking.Status.IN_PROGRESS
        booking.actual_start_time = timezone.now().time()
        booking.save()

        # Update order status
        booking.order.status = 'in_progress'
        booking.order.save()

        serializer = BookingDetailSerializer(booking, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete a booking."""
        booking = self.get_object()

        if booking.status != Booking.Status.IN_PROGRESS:
            return Response(
                {'error': 'Only in-progress bookings can be completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = Booking.Status.COMPLETED
        booking.actual_end_time = timezone.now().time()
        booking.save()

        # Update order status
        booking.order.status = 'completed'
        booking.order.save()

        serializer = BookingDetailSerializer(booking, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a booking."""
        booking = self.get_object()

        serializer = BookingCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if booking.status in [Booking.Status.COMPLETED, Booking.Status.CANCELLED]:
            return Response(
                {'error': 'Booking cannot be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = Booking.Status.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.cancellation_reason = serializer.validated_data.get('reason', '')
        booking.cancelled_by = request.user
        booking.save()

        # Update order status
        booking.order.status = 'pending'
        booking.order.scheduled_date = None
        booking.order.save()

        # TODO: Send notification if notify_customer is True

        return Response({'status': 'Booking cancelled'})

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """Reschedule a booking."""
        booking = self.get_object()

        serializer = BookingRescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_date = serializer.validated_data['scheduled_date']
        new_time = serializer.validated_data['scheduled_start_time']

        # Check availability
        calendar = CalendarService(booking.mover)

        # Calculate new end time
        from datetime import datetime, timedelta
        end_dt = datetime.combine(new_date, new_time) + timedelta(
            hours=float(booking.estimated_duration_hours)
        )

        if not calendar._is_slot_available(new_date, new_time, end_dt.time()):
            return Response(
                {'error': 'Selected time slot is not available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update booking
        booking.scheduled_date = new_date
        booking.scheduled_start_time = new_time
        booking.scheduled_end_time = end_dt.time()
        booking.save()

        # Update order
        booking.order.scheduled_date = new_date
        booking.order.save()

        # TODO: Send notification if notify_customer is True

        detail_serializer = BookingDetailSerializer(booking, context={'request': request})
        return Response(detail_serializer.data)

    @action(detail=True, methods=['post'])
    def customer_confirm(self, request, pk=None):
        """Customer confirms the booking."""
        booking = self.get_object()

        booking.customer_confirmed = True
        booking.customer_confirmed_at = timezone.now()
        booking.save()

        return Response({'status': 'Booking confirmed by customer'})

    @action(detail=True, methods=['get'])
    def ical(self, request, pk=None):
        """Download iCal file for a booking."""
        booking = self.get_object()

        generator = ICalGenerator()
        ical_content = generator.generate_single_booking(booking)

        response = HttpResponse(ical_content, content_type='text/calendar')
        response['Content-Disposition'] = f'attachment; filename="booking_{booking.id}.ics"'
        return response


class CalendarView(APIView):
    """
    API view for calendar-related operations.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get calendar data based on query params."""
        view_type = request.query_params.get('view', 'month')

        if not hasattr(request.user, 'mover_profile'):
            return Response(
                {'error': 'Only movers can access calendar'},
                status=status.HTTP_403_FORBIDDEN
            )

        calendar = CalendarService(request.user.mover_profile)

        if view_type == 'month':
            serializer = MonthOverviewSerializer(data=request.query_params)
            serializer.is_valid(raise_exception=True)

            data = calendar.get_month_overview(
                serializer.validated_data['year'],
                serializer.validated_data['month']
            )
            return Response(data)

        elif view_type == 'day':
            serializer = DailyScheduleSerializer(data=request.query_params)
            serializer.is_valid(raise_exception=True)

            data = calendar.get_daily_schedule(serializer.validated_data['date'])
            return Response(data)

        elif view_type == 'available':
            serializer = AvailableDatesSerializer(data=request.query_params)
            serializer.is_valid(raise_exception=True)

            data = calendar.get_available_dates(
                serializer.validated_data['start_date'],
                serializer.validated_data['end_date'],
                serializer.validated_data.get('duration_hours', 2)
            )
            return Response(data)

        return Response(
            {'error': 'Invalid view type'},
            status=status.HTTP_400_BAD_REQUEST
        )


class PublicAvailabilityView(APIView):
    """
    Public endpoint for checking mover availability.
    Used by customers when scheduling.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, mover_id):
        """Get available dates for a mover."""
        mover = get_object_or_404(MoverProfile, id=mover_id)

        serializer = AvailableDatesSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        calendar = CalendarService(mover)
        available_dates = calendar.get_available_dates(
            serializer.validated_data['start_date'],
            serializer.validated_data['end_date'],
            serializer.validated_data.get('duration_hours', 2)
        )

        return Response({
            'mover_id': str(mover.id),
            'mover_name': mover.company_name,
            'dates': available_dates
        })


class ICalExportView(APIView):
    """
    Export calendar as iCal file.
    """
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get(self, request):
        """Export bookings as iCal."""
        mover = request.user.mover_profile

        # Get date range from query params
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if start_date:
            start_date = date.fromisoformat(start_date)
        else:
            start_date = timezone.now().date()

        if end_date:
            end_date = date.fromisoformat(end_date)
        else:
            end_date = start_date + timedelta(days=90)

        ical_content = ICalGenerator.create_for_mover(mover, start_date, end_date)

        response = HttpResponse(ical_content, content_type='text/calendar')
        response['Content-Disposition'] = f'attachment; filename="{mover.company_name}_bookings.ics"'
        return response

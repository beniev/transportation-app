"""
Calendar service for managing mover availability and bookings.
"""
from datetime import date, datetime, time, timedelta
from typing import List, Dict, Optional, Tuple
from decimal import Decimal

from django.db.models import Q, Count
from django.utils import timezone

from ..models import WeeklyAvailability, BlockedDate, Booking, TimeSlot


class CalendarService:
    """
    Service for managing mover calendar and availability.
    """

    def __init__(self, mover):
        self.mover = mover

    def get_available_dates(
        self,
        start_date: date,
        end_date: date,
        duration_hours: float = 2
    ) -> List[Dict]:
        """
        Get list of available dates within a range.

        Returns:
            List of dicts with date and available time slots
        """
        available_dates = []
        current_date = start_date

        while current_date <= end_date:
            availability = self.get_date_availability(current_date)

            if availability['is_available']:
                available_slots = self.get_available_slots(
                    current_date,
                    duration_hours
                )
                if available_slots:
                    available_dates.append({
                        'date': current_date.isoformat(),
                        'day_of_week': current_date.weekday(),
                        'slots': available_slots,
                        'remaining_capacity': availability['remaining_capacity']
                    })

            current_date += timedelta(days=1)

        return available_dates

    def get_date_availability(self, check_date: date) -> Dict:
        """
        Check if a specific date is available.

        Returns:
            Dict with availability info
        """
        # Check for full day blocks
        blocked = BlockedDate.objects.filter(
            mover=self.mover,
            date=check_date,
            block_type=BlockedDate.BlockType.FULL_DAY
        ).exists()

        # Check recurring yearly blocks
        if not blocked:
            blocked = BlockedDate.objects.filter(
                mover=self.mover,
                date__month=check_date.month,
                date__day=check_date.day,
                is_recurring_yearly=True,
                block_type=BlockedDate.BlockType.FULL_DAY
            ).exists()

        if blocked:
            return {
                'is_available': False,
                'reason': 'blocked',
                'remaining_capacity': 0
            }

        # Check weekly availability
        # In Israel, Sunday = 0, so we need to adjust Python's weekday (Monday = 0)
        # Python: Monday=0, Sunday=6
        # Our model: Sunday=0, Saturday=6
        python_weekday = check_date.weekday()
        # Convert: Python Monday(0) -> Our Monday(1), Python Sunday(6) -> Our Sunday(0)
        day_of_week = (python_weekday + 1) % 7

        try:
            weekly = WeeklyAvailability.objects.get(
                mover=self.mover,
                day_of_week=day_of_week
            )
            if not weekly.is_available:
                return {
                    'is_available': False,
                    'reason': 'not_working_day',
                    'remaining_capacity': 0
                }

            # Count existing bookings
            existing_bookings = Booking.objects.filter(
                mover=self.mover,
                scheduled_date=check_date,
                status__in=[
                    Booking.Status.TENTATIVE,
                    Booking.Status.CONFIRMED,
                    Booking.Status.IN_PROGRESS
                ]
            ).count()

            remaining = weekly.max_bookings - existing_bookings

            return {
                'is_available': remaining > 0,
                'reason': 'available' if remaining > 0 else 'fully_booked',
                'remaining_capacity': max(0, remaining),
                'start_time': weekly.start_time.isoformat(),
                'end_time': weekly.end_time.isoformat(),
                'max_bookings': weekly.max_bookings
            }

        except WeeklyAvailability.DoesNotExist:
            # No weekly availability set - default to not available
            return {
                'is_available': False,
                'reason': 'no_schedule',
                'remaining_capacity': 0
            }

    def get_available_slots(
        self,
        check_date: date,
        duration_hours: float = 2
    ) -> List[Dict]:
        """
        Get available time slots for a specific date.

        Returns:
            List of available time slot dicts
        """
        availability = self.get_date_availability(check_date)
        if not availability['is_available']:
            return []

        slots = []

        # Get predefined time slots
        time_slots = TimeSlot.objects.filter(
            mover=self.mover,
            is_active=True
        )

        if time_slots.exists():
            # Use predefined slots
            for slot in time_slots:
                if self._is_slot_available(check_date, slot.start_time, slot.end_time):
                    slots.append({
                        'id': str(slot.id),
                        'name': slot.name,
                        'name_he': slot.name_he,
                        'start_time': slot.start_time.isoformat(),
                        'end_time': slot.end_time.isoformat()
                    })
        else:
            # Generate slots based on weekly availability
            start_time = time.fromisoformat(availability['start_time'])
            end_time = time.fromisoformat(availability['end_time'])

            # Generate 2-hour slots
            current_time = start_time
            slot_duration = timedelta(hours=duration_hours)

            while True:
                slot_end_dt = datetime.combine(check_date, current_time) + slot_duration
                slot_end = slot_end_dt.time()

                if slot_end > end_time:
                    break

                if self._is_slot_available(check_date, current_time, slot_end):
                    slots.append({
                        'start_time': current_time.isoformat(),
                        'end_time': slot_end.isoformat()
                    })

                current_time = slot_end

        return slots

    def _is_slot_available(
        self,
        check_date: date,
        start_time: time,
        end_time: time
    ) -> bool:
        """Check if a specific time slot is available."""
        # Check partial day blocks
        partial_blocks = BlockedDate.objects.filter(
            mover=self.mover,
            date=check_date,
            block_type=BlockedDate.BlockType.PARTIAL
        )

        for block in partial_blocks:
            # Check for overlap
            if (start_time < block.end_time and end_time > block.start_time):
                return False

        # Check existing bookings
        existing = Booking.objects.filter(
            mover=self.mover,
            scheduled_date=check_date,
            status__in=[
                Booking.Status.TENTATIVE,
                Booking.Status.CONFIRMED,
                Booking.Status.IN_PROGRESS
            ]
        )

        for booking in existing:
            booking_end = booking.scheduled_end_time or (
                datetime.combine(check_date, booking.scheduled_start_time) +
                timedelta(hours=float(booking.estimated_duration_hours))
            ).time()

            # Check for overlap
            if (start_time < booking_end and end_time > booking.scheduled_start_time):
                return False

        return True

    def book_slot(
        self,
        order,
        scheduled_date: date,
        start_time: time,
        duration_hours: float = 2,
        crew_size: int = 2
    ) -> Tuple[Optional[Booking], Optional[str]]:
        """
        Book a time slot for an order.

        Returns:
            Tuple of (Booking, error_message)
        """
        # Calculate end time
        end_datetime = datetime.combine(scheduled_date, start_time) + timedelta(hours=duration_hours)
        end_time = end_datetime.time()

        # Verify availability
        if not self._is_slot_available(scheduled_date, start_time, end_time):
            return None, "Selected time slot is not available"

        # Check date availability
        date_availability = self.get_date_availability(scheduled_date)
        if not date_availability['is_available']:
            return None, f"Date not available: {date_availability['reason']}"

        # Create booking
        booking = Booking.objects.create(
            order=order,
            mover=self.mover,
            scheduled_date=scheduled_date,
            scheduled_start_time=start_time,
            scheduled_end_time=end_time,
            estimated_duration_hours=Decimal(str(duration_hours)),
            crew_size=crew_size,
            status=Booking.Status.TENTATIVE
        )

        return booking, None

    def get_bookings_for_period(
        self,
        start_date: date,
        end_date: date,
        include_cancelled: bool = False
    ) -> List[Booking]:
        """Get all bookings for a date range."""
        queryset = Booking.objects.filter(
            mover=self.mover,
            scheduled_date__gte=start_date,
            scheduled_date__lte=end_date
        ).select_related('order', 'order__customer__user')

        if not include_cancelled:
            queryset = queryset.exclude(status=Booking.Status.CANCELLED)

        return list(queryset)

    def get_daily_schedule(self, check_date: date) -> Dict:
        """
        Get complete schedule for a specific date.

        Returns:
            Dict with date info, availability, and bookings
        """
        availability = self.get_date_availability(check_date)
        bookings = self.get_bookings_for_period(check_date, check_date)

        blocked_times = BlockedDate.objects.filter(
            mover=self.mover,
            date=check_date,
            block_type=BlockedDate.BlockType.PARTIAL
        ).values('start_time', 'end_time', 'reason')

        return {
            'date': check_date.isoformat(),
            'day_of_week': check_date.weekday(),
            'availability': availability,
            'bookings': [
                {
                    'id': str(b.id),
                    'order_id': str(b.order.id),
                    'customer_name': b.order.customer.user.get_full_name(),
                    'start_time': b.scheduled_start_time.isoformat(),
                    'end_time': b.scheduled_end_time.isoformat() if b.scheduled_end_time else None,
                    'duration_hours': float(b.estimated_duration_hours),
                    'status': b.status,
                    'origin': b.order.origin_address,
                    'destination': b.order.destination_address
                }
                for b in bookings
            ],
            'blocked_times': list(blocked_times)
        }

    def get_month_overview(self, year: int, month: int) -> List[Dict]:
        """
        Get availability overview for an entire month.

        Returns:
            List of daily availability summaries
        """
        from calendar import monthrange

        _, last_day = monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        # Get all bookings for the month
        bookings = Booking.objects.filter(
            mover=self.mover,
            scheduled_date__gte=start_date,
            scheduled_date__lte=end_date
        ).exclude(
            status=Booking.Status.CANCELLED
        ).values('scheduled_date').annotate(
            booking_count=Count('id')
        )

        booking_counts = {b['scheduled_date']: b['booking_count'] for b in bookings}

        # Get all blocked dates for the month
        blocked = set(
            BlockedDate.objects.filter(
                mover=self.mover,
                date__gte=start_date,
                date__lte=end_date,
                block_type=BlockedDate.BlockType.FULL_DAY
            ).values_list('date', flat=True)
        )

        # Get weekly availability
        weekly = {
            w.day_of_week: w
            for w in WeeklyAvailability.objects.filter(mover=self.mover)
        }

        days = []
        current = start_date

        while current <= end_date:
            python_weekday = current.weekday()
            day_of_week = (python_weekday + 1) % 7

            if current in blocked:
                status = 'blocked'
                capacity = 0
            elif day_of_week in weekly and weekly[day_of_week].is_available:
                max_bookings = weekly[day_of_week].max_bookings
                current_bookings = booking_counts.get(current, 0)
                capacity = max_bookings - current_bookings

                if capacity <= 0:
                    status = 'full'
                elif capacity < max_bookings:
                    status = 'partial'
                else:
                    status = 'available'
            else:
                status = 'unavailable'
                capacity = 0

            days.append({
                'date': current.isoformat(),
                'day': current.day,
                'status': status,
                'remaining_capacity': capacity,
                'booking_count': booking_counts.get(current, 0)
            })

            current += timedelta(days=1)

        return days

    def initialize_default_schedule(self):
        """
        Initialize default weekly schedule for a new mover.
        Sets Sunday-Thursday 08:00-18:00, Friday 08:00-14:00.
        """
        defaults = [
            (0, True, time(8, 0), time(18, 0)),   # Sunday
            (1, True, time(8, 0), time(18, 0)),   # Monday
            (2, True, time(8, 0), time(18, 0)),   # Tuesday
            (3, True, time(8, 0), time(18, 0)),   # Wednesday
            (4, True, time(8, 0), time(18, 0)),   # Thursday
            (5, True, time(8, 0), time(14, 0)),   # Friday
            (6, False, time(8, 0), time(18, 0)),  # Saturday
        ]

        for day, is_available, start, end in defaults:
            WeeklyAvailability.objects.get_or_create(
                mover=self.mover,
                day_of_week=day,
                defaults={
                    'is_available': is_available,
                    'start_time': start,
                    'end_time': end,
                    'max_bookings': 3
                }
            )

    def initialize_default_time_slots(self):
        """
        Initialize default time slots for a mover.
        """
        defaults = [
            ('Morning', 'בוקר', time(8, 0), time(12, 0), 0),
            ('Afternoon', 'צהריים', time(12, 0), time(16, 0), 1),
            ('Evening', 'ערב', time(16, 0), time(20, 0), 2),
        ]

        for name, name_he, start, end, order in defaults:
            TimeSlot.objects.get_or_create(
                mover=self.mover,
                name=name,
                defaults={
                    'name_he': name_he,
                    'start_time': start,
                    'end_time': end,
                    'display_order': order
                }
            )

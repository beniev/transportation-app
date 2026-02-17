"""
iCal generator for creating calendar files.
"""
from datetime import datetime, date, time, timedelta
from typing import List, Optional
import uuid

from django.conf import settings
from django.utils import timezone


class ICalGenerator:
    """
    Generates iCal (.ics) files for bookings and schedules.
    """

    PRODID = '-//MoverApp//Scheduling//EN'
    VERSION = '2.0'
    CALSCALE = 'GREGORIAN'
    METHOD = 'PUBLISH'

    def __init__(self, calendar_name: str = 'Moving Bookings'):
        self.calendar_name = calendar_name
        self.events = []

    def add_booking(self, booking) -> None:
        """
        Add a booking as a calendar event.
        """
        # Build datetime objects
        start_dt = timezone.make_aware(
            datetime.combine(booking.scheduled_date, booking.scheduled_start_time)
        )

        if booking.scheduled_end_time:
            end_dt = timezone.make_aware(
                datetime.combine(booking.scheduled_date, booking.scheduled_end_time)
            )
        else:
            end_dt = start_dt + timedelta(hours=float(booking.estimated_duration_hours))

        # Build location
        location = f"{booking.order.origin_address} → {booking.order.destination_address}"

        # Build description
        customer = booking.order.customer
        customer_name = f"{customer.user.first_name} {customer.user.last_name}".strip()
        if not customer_name:
            customer_name = customer.user.email

        description_lines = [
            f"Customer: {customer_name}",
            f"Phone: {customer.user.phone or 'N/A'}",
            f"Email: {customer.user.email}",
            "",
            f"From: {booking.order.origin_address}",
            f"Floor: {booking.order.origin_floor or 0}",
            f"Elevator: {'Yes' if booking.order.origin_has_elevator else 'No'}",
            "",
            f"To: {booking.order.destination_address}",
            f"Floor: {booking.order.destination_floor or 0}",
            f"Elevator: {'Yes' if booking.order.destination_has_elevator else 'No'}",
            "",
            f"Crew Size: {booking.crew_size}",
            f"Status: {booking.get_status_display()}",
        ]

        if booking.crew_notes:
            description_lines.extend(["", f"Notes: {booking.crew_notes}"])

        if booking.order.special_instructions:
            description_lines.extend(["", f"Special Instructions: {booking.order.special_instructions}"])

        description = "\\n".join(description_lines)

        # Build summary
        summary = f"Moving: {customer_name} - {booking.order.origin_address[:30]}..."

        self.events.append({
            'uid': str(booking.id),
            'start': start_dt,
            'end': end_dt,
            'summary': summary,
            'description': description,
            'location': location,
            'status': self._map_status(booking.status),
            'created': booking.created_at,
            'modified': booking.updated_at
        })

    def add_blocked_date(self, blocked: 'BlockedDate') -> None:
        """
        Add a blocked date as an all-day event or partial block.
        """
        if blocked.block_type == 'full_day':
            # All-day event
            start_dt = datetime.combine(blocked.date, time(0, 0))
            end_dt = start_dt + timedelta(days=1)
            all_day = True
        else:
            # Partial day block
            start_dt = timezone.make_aware(
                datetime.combine(blocked.date, blocked.start_time)
            )
            end_dt = timezone.make_aware(
                datetime.combine(blocked.date, blocked.end_time)
            )
            all_day = False

        summary = f"Blocked: {blocked.reason or 'Unavailable'}"

        self.events.append({
            'uid': str(blocked.id),
            'start': start_dt,
            'end': end_dt,
            'summary': summary,
            'description': blocked.reason or '',
            'location': '',
            'status': 'CONFIRMED',
            'all_day': all_day,
            'created': blocked.created_at,
            'modified': blocked.updated_at
        })

    def _map_status(self, booking_status: str) -> str:
        """Map booking status to iCal status."""
        status_map = {
            'tentative': 'TENTATIVE',
            'confirmed': 'CONFIRMED',
            'in_progress': 'CONFIRMED',
            'completed': 'CONFIRMED',
            'cancelled': 'CANCELLED',
            'no_show': 'CANCELLED'
        }
        return status_map.get(booking_status, 'TENTATIVE')

    def _format_datetime(self, dt: datetime, all_day: bool = False) -> str:
        """Format datetime for iCal."""
        if all_day:
            return dt.strftime('%Y%m%d')
        # Convert to UTC
        if timezone.is_aware(dt):
            dt = dt.astimezone(timezone.utc)
        return dt.strftime('%Y%m%dT%H%M%SZ')

    def _escape_text(self, text: str) -> str:
        """Escape special characters in text for iCal."""
        if not text:
            return ''
        text = text.replace('\\', '\\\\')
        text = text.replace(';', '\\;')
        text = text.replace(',', '\\,')
        return text

    def _fold_line(self, line: str) -> str:
        """Fold long lines according to iCal spec (max 75 chars)."""
        if len(line) <= 75:
            return line

        result = []
        while len(line) > 75:
            result.append(line[:75])
            line = ' ' + line[75:]
        result.append(line)
        return '\r\n'.join(result)

    def generate(self) -> str:
        """
        Generate the iCal file content.

        Returns:
            String containing the iCal file content
        """
        lines = [
            'BEGIN:VCALENDAR',
            f'PRODID:{self.PRODID}',
            f'VERSION:{self.VERSION}',
            f'CALSCALE:{self.CALSCALE}',
            f'METHOD:{self.METHOD}',
            f'X-WR-CALNAME:{self._escape_text(self.calendar_name)}',
        ]

        for event in self.events:
            all_day = event.get('all_day', False)

            lines.extend([
                'BEGIN:VEVENT',
                f'UID:{event["uid"]}@moverapp',
                f'DTSTAMP:{self._format_datetime(timezone.now())}',
            ])

            if all_day:
                lines.append(f'DTSTART;VALUE=DATE:{self._format_datetime(event["start"], True)}')
                lines.append(f'DTEND;VALUE=DATE:{self._format_datetime(event["end"], True)}')
            else:
                lines.append(f'DTSTART:{self._format_datetime(event["start"])}')
                lines.append(f'DTEND:{self._format_datetime(event["end"])}')

            lines.extend([
                f'SUMMARY:{self._escape_text(event["summary"])}',
                f'DESCRIPTION:{self._escape_text(event["description"])}',
                f'LOCATION:{self._escape_text(event["location"])}',
                f'STATUS:{event["status"]}',
                f'CREATED:{self._format_datetime(event["created"])}',
                f'LAST-MODIFIED:{self._format_datetime(event["modified"])}',
                'END:VEVENT'
            ])

        lines.append('END:VCALENDAR')

        # Fold long lines and join with CRLF
        folded_lines = [self._fold_line(line) for line in lines]
        return '\r\n'.join(folded_lines)

    def generate_single_booking(self, booking) -> str:
        """
        Generate iCal for a single booking.

        Returns:
            String containing the iCal file content for one booking
        """
        self.events = []
        self.add_booking(booking)
        return self.generate()

    @classmethod
    def create_for_mover(cls, mover, start_date: date, end_date: date) -> str:
        """
        Create iCal file for all mover bookings in a date range.
        """
        from ..models import Booking, BlockedDate

        generator = cls(calendar_name=f"{mover.company_name} - Bookings")

        # Add bookings
        bookings = Booking.objects.filter(
            mover=mover,
            scheduled_date__gte=start_date,
            scheduled_date__lte=end_date
        ).exclude(
            status=Booking.Status.CANCELLED
        ).select_related('order', 'order__customer__user')

        for booking in bookings:
            generator.add_booking(booking)

        # Add blocked dates
        blocked_dates = BlockedDate.objects.filter(
            mover=mover,
            date__gte=start_date,
            date__lte=end_date
        )

        for blocked in blocked_dates:
            generator.add_blocked_date(blocked)

        return generator.generate()

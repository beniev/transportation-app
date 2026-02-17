"""
Models for the scheduling app.
Handles mover availability, calendar management, and bookings.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from datetime import time, timedelta

from apps.core.models import TimeStampedModel


class WeeklyAvailability(TimeStampedModel):
    """
    Weekly recurring availability schedule for movers.
    Defines standard working hours for each day of the week.
    """

    class DayOfWeek(models.IntegerChoices):
        SUNDAY = 0, _('Sunday')
        MONDAY = 1, _('Monday')
        TUESDAY = 2, _('Tuesday')
        WEDNESDAY = 3, _('Wednesday')
        THURSDAY = 4, _('Thursday')
        FRIDAY = 5, _('Friday')
        SATURDAY = 6, _('Saturday')

    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='weekly_availability',
        verbose_name=_('mover')
    )
    day_of_week = models.IntegerField(
        _('day of week'),
        choices=DayOfWeek.choices
    )
    is_available = models.BooleanField(
        _('is available'),
        default=True
    )
    start_time = models.TimeField(
        _('start time'),
        default=time(8, 0)
    )
    end_time = models.TimeField(
        _('end time'),
        default=time(18, 0)
    )
    max_bookings = models.PositiveIntegerField(
        _('maximum bookings'),
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text=_('Maximum number of bookings allowed for this day')
    )

    class Meta:
        db_table = 'weekly_availability'
        verbose_name = _('weekly availability')
        verbose_name_plural = _('weekly availabilities')
        unique_together = ['mover', 'day_of_week']
        ordering = ['day_of_week']

    def __str__(self):
        day_name = self.get_day_of_week_display()
        if self.is_available:
            return f"{self.mover.company_name} - {day_name}: {self.start_time}-{self.end_time}"
        return f"{self.mover.company_name} - {day_name}: Not available"

    def clean(self):
        if self.is_available and self.start_time >= self.end_time:
            raise ValidationError(_('Start time must be before end time'))


class BlockedDate(TimeStampedModel):
    """
    Dates blocked by the mover (holidays, vacations, etc.).
    """

    class BlockType(models.TextChoices):
        FULL_DAY = 'full_day', _('Full Day')
        PARTIAL = 'partial', _('Partial Day')

    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='blocked_dates',
        verbose_name=_('mover')
    )
    date = models.DateField(
        _('date')
    )
    block_type = models.CharField(
        _('block type'),
        max_length=20,
        choices=BlockType.choices,
        default=BlockType.FULL_DAY
    )
    start_time = models.TimeField(
        _('start time'),
        null=True,
        blank=True,
        help_text=_('Required for partial day blocks')
    )
    end_time = models.TimeField(
        _('end time'),
        null=True,
        blank=True,
        help_text=_('Required for partial day blocks')
    )
    reason = models.CharField(
        _('reason'),
        max_length=255,
        blank=True
    )
    is_recurring_yearly = models.BooleanField(
        _('recurring yearly'),
        default=False,
        help_text=_('Block this date every year (e.g., holidays)')
    )

    class Meta:
        db_table = 'blocked_dates'
        verbose_name = _('blocked date')
        verbose_name_plural = _('blocked dates')
        ordering = ['date']

    def __str__(self):
        if self.block_type == self.BlockType.PARTIAL:
            return f"{self.mover.company_name} - {self.date}: {self.start_time}-{self.end_time}"
        return f"{self.mover.company_name} - {self.date}: Blocked"

    def clean(self):
        if self.block_type == self.BlockType.PARTIAL:
            if not self.start_time or not self.end_time:
                raise ValidationError(
                    _('Start and end times are required for partial day blocks')
                )
            if self.start_time >= self.end_time:
                raise ValidationError(_('Start time must be before end time'))


class Booking(TimeStampedModel):
    """
    A scheduled booking for an order.
    Links orders to specific dates and times.
    """

    class Status(models.TextChoices):
        TENTATIVE = 'tentative', _('Tentative')
        CONFIRMED = 'confirmed', _('Confirmed')
        IN_PROGRESS = 'in_progress', _('In Progress')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')
        NO_SHOW = 'no_show', _('No Show')

    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='booking',
        verbose_name=_('order')
    )
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='bookings',
        verbose_name=_('mover')
    )

    # Scheduled date and time
    scheduled_date = models.DateField(
        _('scheduled date')
    )
    scheduled_start_time = models.TimeField(
        _('scheduled start time')
    )
    scheduled_end_time = models.TimeField(
        _('scheduled end time'),
        null=True,
        blank=True,
        help_text=_('Estimated end time')
    )
    estimated_duration_hours = models.DecimalField(
        _('estimated duration (hours)'),
        max_digits=4,
        decimal_places=1,
        default=2,
        validators=[MinValueValidator(0.5)]
    )

    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.TENTATIVE
    )

    # Actual times (filled during/after service)
    actual_start_time = models.TimeField(
        _('actual start time'),
        null=True,
        blank=True
    )
    actual_end_time = models.TimeField(
        _('actual end time'),
        null=True,
        blank=True
    )

    # Crew assignment
    crew_size = models.PositiveIntegerField(
        _('crew size'),
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    crew_notes = models.TextField(
        _('crew notes'),
        blank=True,
        help_text=_('Internal notes for the crew')
    )

    # Customer confirmation
    customer_confirmed = models.BooleanField(
        _('customer confirmed'),
        default=False
    )
    customer_confirmed_at = models.DateTimeField(
        _('customer confirmed at'),
        null=True,
        blank=True
    )

    # Reminders
    reminder_sent = models.BooleanField(
        _('reminder sent'),
        default=False
    )
    reminder_sent_at = models.DateTimeField(
        _('reminder sent at'),
        null=True,
        blank=True
    )

    # Cancellation
    cancelled_at = models.DateTimeField(
        _('cancelled at'),
        null=True,
        blank=True
    )
    cancellation_reason = models.TextField(
        _('cancellation reason'),
        blank=True
    )
    cancelled_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_bookings',
        verbose_name=_('cancelled by')
    )

    class Meta:
        db_table = 'bookings'
        verbose_name = _('booking')
        verbose_name_plural = _('bookings')
        ordering = ['scheduled_date', 'scheduled_start_time']
        indexes = [
            models.Index(fields=['mover', 'scheduled_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Booking {self.order.id} - {self.scheduled_date} {self.scheduled_start_time}"

    def clean(self):
        if self.scheduled_end_time and self.scheduled_start_time >= self.scheduled_end_time:
            raise ValidationError(_('Start time must be before end time'))

    @property
    def duration_minutes(self):
        """Calculate duration in minutes from start to end time."""
        if self.scheduled_end_time:
            start_delta = timedelta(
                hours=self.scheduled_start_time.hour,
                minutes=self.scheduled_start_time.minute
            )
            end_delta = timedelta(
                hours=self.scheduled_end_time.hour,
                minutes=self.scheduled_end_time.minute
            )
            return int((end_delta - start_delta).total_seconds() / 60)
        return int(float(self.estimated_duration_hours) * 60)


class TimeSlot(TimeStampedModel):
    """
    Predefined time slots for scheduling.
    Movers can enable/disable specific slots.
    """
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='time_slots',
        verbose_name=_('mover')
    )
    name = models.CharField(
        _('slot name'),
        max_length=50,
        help_text=_('e.g., "Morning", "Afternoon", "Evening"')
    )
    name_he = models.CharField(
        _('slot name (Hebrew)'),
        max_length=50,
        blank=True
    )
    start_time = models.TimeField(
        _('start time')
    )
    end_time = models.TimeField(
        _('end time')
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True
    )
    display_order = models.PositiveIntegerField(
        _('display order'),
        default=0
    )

    class Meta:
        db_table = 'time_slots'
        verbose_name = _('time slot')
        verbose_name_plural = _('time slots')
        ordering = ['display_order', 'start_time']

    def __str__(self):
        return f"{self.name}: {self.start_time}-{self.end_time}"


class BookingReminder(TimeStampedModel):
    """
    Scheduled reminders for bookings.
    """

    class ReminderType(models.TextChoices):
        EMAIL = 'email', _('Email')
        SMS = 'sms', _('SMS')
        BOTH = 'both', _('Both')

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='reminders',
        verbose_name=_('booking')
    )
    reminder_type = models.CharField(
        _('reminder type'),
        max_length=10,
        choices=ReminderType.choices,
        default=ReminderType.EMAIL
    )
    scheduled_for = models.DateTimeField(
        _('scheduled for')
    )
    sent = models.BooleanField(
        _('sent'),
        default=False
    )
    sent_at = models.DateTimeField(
        _('sent at'),
        null=True,
        blank=True
    )
    recipient = models.CharField(
        _('recipient'),
        max_length=255,
        help_text=_('Email or phone number')
    )

    class Meta:
        db_table = 'booking_reminders'
        verbose_name = _('booking reminder')
        verbose_name_plural = _('booking reminders')
        ordering = ['scheduled_for']

    def __str__(self):
        return f"Reminder for {self.booking} at {self.scheduled_for}"

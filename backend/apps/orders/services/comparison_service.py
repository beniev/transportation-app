"""
Service for generating mover price comparisons for an order.
Finds eligible movers, calculates prices, and stores ranked results.
"""
import logging
from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from django.db.models import Count, Q

from apps.accounts.models import MoverProfile
from apps.orders.models import Order, OrderComparison, ComparisonEntry
from apps.scheduling.models import WeeklyAvailability, BlockedDate, Booking
from apps.ai_integration.services.price_analyzer import PriceAnalyzerService
from apps.quotes.models import Quote
from apps.core.utils import haversine_distance, extract_coordinates

logger = logging.getLogger(__name__)


class ComparisonService:
    """
    Generates price comparisons from all eligible movers for a given order.
    """

    COMPARISON_EXPIRY_HOURS = 48

    def __init__(self, order: Order):
        self.order = order

    def generate_comparisons(self) -> OrderComparison:
        """
        Main entry point. Find eligible movers, calculate prices,
        store entries ranked by price, and set order status to COMPARING.
        """
        # Create or reset comparison
        comparison, created = OrderComparison.objects.update_or_create(
            order=self.order,
            defaults={
                'status': OrderComparison.Status.GENERATING,
                'expires_at': timezone.now() + timedelta(hours=self.COMPARISON_EXPIRY_HOURS),
            }
        )

        if not created:
            comparison.entries.all().delete()

        # Find eligible movers
        eligible_movers = self._find_eligible_movers()
        comparison.total_eligible_movers = len(eligible_movers)

        if not eligible_movers:
            comparison.status = OrderComparison.Status.READY
            comparison.total_priced_movers = 0
            comparison.save()
            return comparison

        # Calculate price for each mover
        entries = []
        for mover in eligible_movers:
            try:
                entry_data = self._calculate_mover_price(mover)
                entry = ComparisonEntry(
                    comparison=comparison,
                    mover=mover,
                    total_price=entry_data['total_price'],
                    pricing_breakdown=entry_data['pricing_breakdown'],
                    mover_company_name=mover.company_name,
                    mover_company_name_he=mover.company_name_he or '',
                    mover_rating=mover.rating,
                    mover_total_reviews=mover.total_reviews,
                    mover_completed_orders=mover.completed_orders,
                    mover_is_verified=mover.is_verified,
                    mover_logo_url=mover.logo.url if mover.logo else '',
                    used_custom_pricing=entry_data['used_custom_pricing'],
                    status=ComparisonEntry.Status.CALCULATED,
                )
                entries.append(entry)
            except Exception as e:
                logger.error(
                    f"Error calculating price for mover {mover.id}: {e}",
                    exc_info=True
                )

        # Sort by price and assign ranks
        entries.sort(key=lambda e: e.total_price)
        for rank, entry in enumerate(entries, start=1):
            entry.rank = rank

        # Bulk create all entries
        ComparisonEntry.objects.bulk_create(entries)

        comparison.total_priced_movers = len(entries)
        comparison.status = OrderComparison.Status.READY
        comparison.save()

        # Update order status
        self.order.status = Order.Status.COMPARING
        self.order.save(update_fields=['status'])

        return comparison

    def _find_eligible_movers(self):
        """
        Filter MoverProfile by:
        1. Radius check: if mover has base coordinates AND order has origin coordinates,
           the order origin must be within the mover's service_radius_km (Haversine).
        2. Fallback: if either lacks coordinates, fall back to legacy city-name matching
           (service_areas contains order's origin city, case-insensitive).
        3. is_active=True
        4. Available on preferred_date (if set)
        """
        origin_city = self.order.origin_city.strip()

        # Extract order origin coordinates for radius check
        order_origin_coords = extract_coordinates(self.order.origin_coordinates)

        # Get all active movers
        movers = MoverProfile.objects.filter(is_active=True).select_related('user')

        eligible = []
        for mover in movers:
            # --- Service area check ---
            mover_has_coords = (
                mover.base_latitude is not None and
                mover.base_longitude is not None
            )

            if mover_has_coords and order_origin_coords:
                # Radius-based check: order origin must be within mover's radius
                distance = haversine_distance(
                    float(mover.base_latitude), float(mover.base_longitude),
                    order_origin_coords[0], order_origin_coords[1],
                )
                if distance > float(mover.service_radius_km):
                    continue
            else:
                # Fallback: legacy city-name matching (origin only)
                service_areas_lower = [
                    area.lower() for area in (mover.service_areas or [])
                ]
                if origin_city.lower() not in service_areas_lower:
                    continue

            # Check availability on preferred date(s)
            if self.order.preferred_date:
                if self.order.date_flexibility == 'range' and self.order.preferred_date_end:
                    # Range mode: mover is eligible if available on ANY day in range
                    if not self._is_mover_available_in_range(
                        mover, self.order.preferred_date, self.order.preferred_date_end
                    ):
                        continue
                else:
                    # Specific date mode: check single date
                    if not self._is_mover_available(mover, self.order.preferred_date):
                        continue

            eligible.append(mover)

        return eligible

    def _is_mover_available_in_range(self, mover, start_date, end_date):
        """
        Check if mover is available on at least one day within the date range.
        Returns True if available on any day, False if unavailable on all days.
        """
        from datetime import timedelta
        current_date = start_date
        while current_date <= end_date:
            if self._is_mover_available(mover, current_date):
                return True
            current_date += timedelta(days=1)
        return False

    def _is_mover_available(self, mover, date):
        """
        Check if mover is available on a given date.
        Checks WeeklyAvailability, BlockedDate, and booking count.
        """
        # Convert Python weekday (Monday=0) to app weekday (Sunday=0)
        python_weekday = date.weekday()
        app_weekday = (python_weekday + 1) % 7

        # Check weekly availability
        try:
            weekly = WeeklyAvailability.objects.get(
                mover=mover,
                day_of_week=app_weekday
            )
            if not weekly.is_available:
                return False
            max_bookings = weekly.max_bookings
        except WeeklyAvailability.DoesNotExist:
            # No schedule set for this day - assume available with default max
            max_bookings = 3

        # Check blocked dates (full day)
        is_blocked = BlockedDate.objects.filter(
            mover=mover,
            date=date,
            block_type=BlockedDate.BlockType.FULL_DAY
        ).exists()

        if is_blocked:
            return False

        # Check booking count vs max_bookings
        booking_count = Booking.objects.filter(
            mover=mover,
            scheduled_date=date,
            status__in=[
                Booking.Status.TENTATIVE,
                Booking.Status.CONFIRMED,
                Booking.Status.IN_PROGRESS,
            ]
        ).count()

        return booking_count < max_bookings

    def _calculate_mover_price(self, mover):
        """
        Use PriceAnalyzerService to calculate the order total for a mover.
        Returns a dict ready for ComparisonEntry creation.
        """
        from apps.movers.models import MoverPricing

        analyzer = PriceAnalyzerService(str(mover.id))

        # Build items list from order items
        items = []
        for item in self.order.items.all():
            items.append({
                'item_type_id': str(item.item_type_id) if item.item_type_id else None,
                'name': item.name,
                'quantity': item.quantity,
                'requires_assembly': item.requires_assembly,
                'requires_disassembly': item.requires_disassembly,
                'requires_special_handling': item.requires_special_handling,
            })

        result = analyzer.calculate_order_total(
            items=items,
            origin_floor=self.order.origin_floor,
            origin_has_elevator=self.order.origin_has_elevator,
            origin_distance_to_truck=self.order.origin_distance_to_truck,
            destination_floor=self.order.destination_floor,
            destination_has_elevator=self.order.destination_has_elevator,
            destination_distance_to_truck=self.order.destination_distance_to_truck,
            distance_km=self.order.distance_km,
            order_date=self.order.preferred_date,
        )

        # Check if mover has any custom pricing set up
        has_custom_pricing = MoverPricing.objects.filter(
            mover=mover,
            is_active=True
        ).exists()

        # Convert Decimal values to strings for JSON serialization
        serializable_breakdown = {}
        for key, value in result.items():
            if isinstance(value, Decimal):
                serializable_breakdown[key] = str(value)
            elif isinstance(value, list):
                serializable_breakdown[key] = [
                    {k: str(v) if isinstance(v, Decimal) else v for k, v in item.items()}
                    if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                serializable_breakdown[key] = value

        return {
            'total_price': result['total'],
            'pricing_breakdown': serializable_breakdown,
            'used_custom_pricing': has_custom_pricing,
        }

    def select_mover(self, entry_id):
        """
        Customer selects a mover from the comparison.
        Assigns mover to order, creates a Quote, updates statuses.
        """
        try:
            entry = ComparisonEntry.objects.get(
                id=entry_id,
                comparison__order=self.order
            )
        except ComparisonEntry.DoesNotExist:
            raise ValueError("Invalid comparison entry")

        comparison = entry.comparison

        # Assign mover to order
        self.order.mover = entry.mover
        self.order.status = Order.Status.QUOTED

        # Copy pricing to order fields
        breakdown = entry.pricing_breakdown
        self.order.items_subtotal = Decimal(str(breakdown.get('items_subtotal', '0')))
        self.order.origin_floor_surcharge = Decimal(str(breakdown.get('origin_floor_surcharge', '0')))
        self.order.destination_floor_surcharge = Decimal(str(breakdown.get('destination_floor_surcharge', '0')))
        self.order.distance_surcharge = Decimal(str(breakdown.get('distance_surcharge', '0')))
        self.order.travel_cost = Decimal(str(breakdown.get('travel_cost', '0')))
        self.order.seasonal_adjustment = Decimal(str(breakdown.get('seasonal_adjustment', '0')))
        self.order.day_of_week_adjustment = Decimal(str(breakdown.get('day_of_week_adjustment', '0')))
        self.order.discount = Decimal(str(breakdown.get('discount', '0')))
        self.order.total_price = entry.total_price
        self.order.save()

        # Create a real Quote
        quote = Quote(
            order=self.order,
            status=Quote.Status.SENT,
            subtotal=entry.total_price,
            total_amount=entry.total_price,
            items_data=breakdown.get('items_breakdown', []),
            pricing_data=breakdown,
        )
        quote.save()

        # Update entry statuses
        entry.status = ComparisonEntry.Status.SELECTED
        entry.quote = quote
        entry.save()

        # Mark other entries as rejected
        comparison.entries.exclude(id=entry.id).update(
            status=ComparisonEntry.Status.REJECTED
        )

        # Update comparison
        comparison.status = OrderComparison.Status.SELECTED
        comparison.selected_entry = entry
        comparison.save()

        return entry

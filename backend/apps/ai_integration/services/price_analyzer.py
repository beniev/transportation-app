"""
Price analyzer service for calculating order prices.
Applies all pricing factors and rules.
"""
import logging
from decimal import Decimal
from datetime import date, datetime
from typing import Dict, Any, List, Optional

from apps.movers.models import MoverPricing, PricingFactors, ItemType
from apps.accounts.models import MoverProfile

logger = logging.getLogger(__name__)


class PriceAnalyzerService:
    """
    Service for calculating complete order prices based on:
    - Item prices from mover's pricing
    - Floor surcharges (no charge when elevator available)
    - Distance surcharges
    - Travel costs
    - Seasonal adjustments
    - Day of week adjustments
    """

    PEAK_MONTHS = [7, 8]  # July, August

    def __init__(self, mover_id: str):
        """
        Initialize with a mover's ID.

        Args:
            mover_id: UUID of the mover profile
        """
        self.mover_id = mover_id
        self._mover_pricing = None
        self._pricing_factors = None

    @property
    def mover_pricing(self) -> Dict[str, MoverPricing]:
        """Lazy load mover's item pricing."""
        if self._mover_pricing is None:
            self._mover_pricing = {}
            for pricing in MoverPricing.objects.filter(
                mover_id=self.mover_id,
                is_active=True
            ).select_related('item_type'):
                self._mover_pricing[str(pricing.item_type_id)] = pricing
        return self._mover_pricing

    @property
    def pricing_factors(self) -> PricingFactors:
        """Lazy load mover's pricing factors."""
        if self._pricing_factors is None:
            self._pricing_factors, _ = PricingFactors.objects.get_or_create(
                mover_id=self.mover_id
            )
        return self._pricing_factors

    def calculate_item_price(
        self,
        item_type_id: Optional[str],
        quantity: int = 1,
        requires_assembly: bool = False,
        requires_disassembly: bool = False,
        requires_special_handling: bool = False,
    ) -> Dict[str, Decimal]:
        """
        Calculate price for a single item.

        Returns:
            Dict with unit_price, assembly_cost, etc.
        """
        result = {
            'unit_price': Decimal('0.00'),
            'assembly_cost': Decimal('0.00'),
            'disassembly_cost': Decimal('0.00'),
            'special_handling_cost': Decimal('0.00'),
            'total': Decimal('0.00'),
        }

        if not item_type_id:
            return result

        # Get mover's pricing for this item
        if item_type_id in self.mover_pricing:
            pricing = self.mover_pricing[item_type_id]
            result['unit_price'] = pricing.base_price

            if requires_assembly:
                result['assembly_cost'] = pricing.assembly_price

            if requires_disassembly:
                result['disassembly_cost'] = pricing.disassembly_price

            if requires_special_handling:
                result['special_handling_cost'] = pricing.special_handling_price
        else:
            # Fall back to default prices
            try:
                item_type = ItemType.objects.get(id=item_type_id)
                result['unit_price'] = item_type.default_base_price

                if requires_assembly:
                    result['assembly_cost'] = item_type.default_assembly_price

                if requires_disassembly:
                    result['disassembly_cost'] = item_type.default_disassembly_price

                if requires_special_handling:
                    result['special_handling_cost'] = item_type.default_special_handling_price
            except ItemType.DoesNotExist:
                logger.warning(f"Item type {item_type_id} not found")

        # Calculate total
        result['total'] = (
            (result['unit_price'] * quantity) +
            result['assembly_cost'] +
            result['disassembly_cost'] +
            result['special_handling_cost']
        )

        return result

    def calculate_floor_surcharge(
        self,
        floor: int,
        has_elevator: bool,
        base_amount: Decimal,
    ) -> Decimal:
        """
        Calculate floor-based surcharge.

        If an elevator is available, no floor surcharge is applied because
        the effort is the same regardless of floor number.

        Args:
            floor: Floor number
            has_elevator: Whether elevator is available
            base_amount: Base amount to apply percentage to

        Returns:
            Surcharge amount
        """
        # Elevator = no floor surcharge (same effort for any floor)
        if has_elevator:
            return Decimal('0.00')

        factors = self.pricing_factors
        ground_floor = factors.ground_floor_number

        # Floors above ground
        floors_to_charge = max(0, floor - ground_floor)

        if floors_to_charge == 0:
            return Decimal('0.00')

        # Calculate surcharge: percentage per floor above ground
        surcharge_percent = factors.floor_surcharge_percent * floors_to_charge
        surcharge = base_amount * (surcharge_percent / Decimal('100'))

        return surcharge.quantize(Decimal('0.01'))

    def calculate_distance_surcharge(
        self,
        origin_distance: int,
        destination_distance: int,
        base_amount: Decimal = Decimal('0.00'),
    ) -> Decimal:
        """
        Calculate surcharge for distance from truck to building.
        Percentage of items subtotal per 10 meters of walking distance.

        Args:
            origin_distance: Distance at origin in meters
            destination_distance: Distance at destination in meters
            base_amount: Items subtotal to calculate percentage from

        Returns:
            Surcharge amount
        """
        factors = self.pricing_factors
        total_distance = origin_distance + destination_distance

        if total_distance <= 0 or base_amount <= 0:
            return Decimal('0.00')

        # Charge percentage per 10 meters
        surcharge_units = total_distance // 10
        surcharge = base_amount * (factors.distance_surcharge_percent / Decimal('100')) * surcharge_units

        return surcharge.quantize(Decimal('0.01'))

    def calculate_travel_cost(self, distance_km: Decimal) -> Decimal:
        """
        Calculate travel cost between origin and destination.

        Args:
            distance_km: Distance in kilometers

        Returns:
            Travel cost
        """
        factors = self.pricing_factors
        cost = factors.travel_distance_per_km * distance_km

        # Apply minimum charge
        return max(cost, factors.minimum_travel_charge).quantize(Decimal('0.01'))

    def calculate_seasonal_adjustment(
        self,
        order_date: date,
        base_amount: Decimal,
    ) -> Decimal:
        """
        Calculate seasonal price adjustment (peak season markup).

        Args:
            order_date: Date of the order
            base_amount: Base amount to apply multiplier to

        Returns:
            Adjustment amount (positive for increase)
        """
        factors = self.pricing_factors
        peak_months = factors.peak_months or self.PEAK_MONTHS

        if order_date.month in peak_months:
            multiplier = factors.peak_season_multiplier - Decimal('1')
            adjustment = base_amount * multiplier
            return adjustment.quantize(Decimal('0.01'))

        return Decimal('0.00')

    def calculate_day_adjustment(
        self,
        order_date: date,
        base_amount: Decimal,
    ) -> Decimal:
        """
        Calculate day-of-week adjustment (weekend/Friday surcharge).

        Args:
            order_date: Date of the order
            base_amount: Base amount to apply percentage to

        Returns:
            Adjustment amount
        """
        factors = self.pricing_factors
        weekday = order_date.weekday()

        # Friday (4 in Israel, weekday 5 is Saturday)
        # Note: In Israel, weekend is Friday-Saturday
        if weekday == 4:  # Friday
            adjustment = base_amount * (factors.friday_surcharge_percent / Decimal('100'))
            return adjustment.quantize(Decimal('0.01'))
        elif weekday == 5:  # Saturday
            adjustment = base_amount * (factors.weekend_surcharge_percent / Decimal('100'))
            return adjustment.quantize(Decimal('0.01'))

        return Decimal('0.00')

    def calculate_order_total(
        self,
        items: List[Dict[str, Any]],
        origin_floor: int = 0,
        origin_has_elevator: bool = False,
        origin_distance_to_truck: int = 0,
        destination_floor: int = 0,
        destination_has_elevator: bool = False,
        destination_distance_to_truck: int = 0,
        distance_km: Decimal = Decimal('0'),
        order_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Calculate complete order price with all factors.

        Args:
            items: List of order items with item_type_id, quantity, etc.
            origin_floor: Floor at origin
            origin_has_elevator: Elevator at origin
            origin_distance_to_truck: Distance from truck to origin building
            destination_floor: Floor at destination
            destination_has_elevator: Elevator at destination
            destination_distance_to_truck: Distance from truck to destination
            distance_km: Distance between locations
            order_date: Scheduled date (for seasonal pricing)

        Returns:
            Complete pricing breakdown
        """
        if order_date is None:
            order_date = date.today()

        # Calculate items subtotal
        items_breakdown = []
        items_subtotal = Decimal('0.00')

        for item in items:
            item_price = self.calculate_item_price(
                item_type_id=item.get('item_type_id') or item.get('matched_item_type_id'),
                quantity=item.get('quantity', 1),
                requires_assembly=item.get('requires_assembly', False),
                requires_disassembly=item.get('requires_disassembly', False),
                requires_special_handling=item.get('requires_special_handling', False),
            )
            items_breakdown.append({
                'name': item.get('name', item.get('name_en', 'Unknown')),
                **item_price
            })
            items_subtotal += item_price['total']

        # Calculate floor surcharges
        origin_floor_surcharge = self.calculate_floor_surcharge(
            origin_floor, origin_has_elevator, items_subtotal
        )
        destination_floor_surcharge = self.calculate_floor_surcharge(
            destination_floor, destination_has_elevator, items_subtotal
        )

        # Calculate distance surcharge (truck to building) - percentage of items subtotal
        distance_surcharge = self.calculate_distance_surcharge(
            origin_distance_to_truck,
            destination_distance_to_truck,
            items_subtotal
        )

        # Calculate travel cost (between locations)
        travel_cost = self.calculate_travel_cost(distance_km)

        # Calculate subtotal before adjustments
        subtotal_before_adjustments = (
            items_subtotal +
            origin_floor_surcharge +
            destination_floor_surcharge +
            distance_surcharge +
            travel_cost
        )

        # Calculate seasonal adjustment
        seasonal_adjustment = self.calculate_seasonal_adjustment(
            order_date, subtotal_before_adjustments
        )

        # Calculate day-of-week adjustment
        day_adjustment = self.calculate_day_adjustment(
            order_date, subtotal_before_adjustments
        )

        # Calculate total
        total = (
            subtotal_before_adjustments +
            seasonal_adjustment +
            day_adjustment
        )

        # Apply minimum order amount
        minimum = self.pricing_factors.minimum_order_amount
        if total < minimum:
            total = minimum

        return {
            'items_breakdown': items_breakdown,
            'items_subtotal': items_subtotal,
            'origin_floor_surcharge': origin_floor_surcharge,
            'destination_floor_surcharge': destination_floor_surcharge,
            'distance_surcharge': distance_surcharge,
            'travel_cost': travel_cost,
            'seasonal_adjustment': seasonal_adjustment,
            'day_of_week_adjustment': day_adjustment,
            'discount': Decimal('0.00'),
            'total': total.quantize(Decimal('0.01')),
            'currency': 'ILS',
        }

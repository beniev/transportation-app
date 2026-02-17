"""
Analytics service for tracking events and generating statistics.
"""
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from django.db.models import Sum, Count, Avg, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType

from ..models import AnalyticsEvent, DailyAnalytics, MonthlyAnalytics, PopularItem

logger = logging.getLogger(__name__)


class AnalyticsService:
    """
    Service for tracking analytics events and generating reports.
    """

    def __init__(self, mover):
        self.mover = mover

    # Event tracking methods

    def track_event(
        self,
        event_type: str,
        related_object=None,
        value: Decimal = None,
        metadata: Dict = None
    ) -> AnalyticsEvent:
        """
        Track an analytics event.

        Args:
            event_type: Type of event (from AnalyticsEvent.EventType)
            related_object: Optional related Django model instance
            value: Optional monetary value
            metadata: Optional additional data

        Returns:
            Created AnalyticsEvent instance
        """
        now = timezone.now()

        # Get content type for related object
        content_type = None
        object_id = None
        if related_object:
            content_type = ContentType.objects.get_for_model(related_object)
            object_id = str(related_object.pk)

        event = AnalyticsEvent.objects.create(
            mover=self.mover,
            event_type=event_type,
            content_type=content_type,
            object_id=object_id,
            value=value,
            metadata=metadata or {},
            event_date=now.date(),
            event_time=now.time()
        )

        # Update daily aggregates
        self._update_daily_analytics(event)

        logger.info(f"Tracked event: {event_type} for {self.mover.company_name}")
        return event

    def track_order_created(self, order):
        """Track order created event."""
        return self.track_event(
            event_type=AnalyticsEvent.EventType.ORDER_CREATED,
            related_object=order,
            value=order.total_price,
            metadata={
                'origin': order.origin_address,
                'destination': order.destination_address,
                'items_count': order.items.count()
            }
        )

    def track_order_completed(self, order):
        """Track order completed event."""
        return self.track_event(
            event_type=AnalyticsEvent.EventType.ORDER_COMPLETED,
            related_object=order,
            value=order.total_price
        )

    def track_quote_sent(self, quote):
        """Track quote sent event."""
        return self.track_event(
            event_type=AnalyticsEvent.EventType.QUOTE_SENT,
            related_object=quote,
            value=quote.total_amount
        )

    def track_quote_accepted(self, quote):
        """Track quote accepted event."""
        return self.track_event(
            event_type=AnalyticsEvent.EventType.QUOTE_ACCEPTED,
            related_object=quote,
            value=quote.total_amount
        )

    def track_payment_received(self, payment):
        """Track payment received event."""
        return self.track_event(
            event_type=AnalyticsEvent.EventType.PAYMENT_RECEIVED,
            related_object=payment,
            value=payment.amount
        )

    def track_ai_usage(self, usage_type: str = 'parsing', metadata: Dict = None):
        """Track AI usage event."""
        if usage_type == 'parsing':
            event_type = AnalyticsEvent.EventType.AI_PARSING_USED
        else:
            event_type = AnalyticsEvent.EventType.AI_IMAGE_ANALYZED

        return self.track_event(
            event_type=event_type,
            metadata=metadata
        )

    def _update_daily_analytics(self, event: AnalyticsEvent):
        """Update daily aggregated analytics."""
        daily, created = DailyAnalytics.objects.get_or_create(
            mover=self.mover,
            date=event.event_date,
            defaults={}
        )

        # Update counters based on event type
        event_type = event.event_type

        if event_type == AnalyticsEvent.EventType.ORDER_CREATED:
            daily.orders_received += 1
        elif event_type == AnalyticsEvent.EventType.ORDER_APPROVED:
            daily.orders_approved += 1
        elif event_type == AnalyticsEvent.EventType.ORDER_COMPLETED:
            daily.orders_completed += 1
            if event.value:
                daily.total_revenue += event.value
        elif event_type == AnalyticsEvent.EventType.ORDER_CANCELLED:
            daily.orders_cancelled += 1
        elif event_type == AnalyticsEvent.EventType.QUOTE_SENT:
            daily.quotes_sent += 1
            if event.value:
                daily.total_quote_value += event.value
        elif event_type == AnalyticsEvent.EventType.QUOTE_ACCEPTED:
            daily.quotes_accepted += 1
        elif event_type == AnalyticsEvent.EventType.QUOTE_REJECTED:
            daily.quotes_rejected += 1
        elif event_type == AnalyticsEvent.EventType.BOOKING_CREATED:
            daily.bookings_created += 1
        elif event_type == AnalyticsEvent.EventType.BOOKING_COMPLETED:
            daily.bookings_completed += 1
        elif event_type == AnalyticsEvent.EventType.AI_PARSING_USED:
            daily.ai_parsing_count += 1
        elif event_type == AnalyticsEvent.EventType.AI_IMAGE_ANALYZED:
            daily.ai_image_count += 1

        daily.calculate_rates()
        daily.save()

    # Dashboard and reporting methods

    def get_dashboard_summary(self, days: int = 30) -> Dict:
        """
        Get summary statistics for the dashboard.

        Args:
            days: Number of days to look back

        Returns:
            Dict with summary statistics
        """
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        # Get daily analytics for period
        daily_stats = DailyAnalytics.objects.filter(
            mover=self.mover,
            date__gte=start_date,
            date__lte=end_date
        ).aggregate(
            total_orders=Sum('orders_received'),
            completed_orders=Sum('orders_completed'),
            total_revenue=Sum('total_revenue'),
            quotes_sent=Sum('quotes_sent'),
            quotes_accepted=Sum('quotes_accepted'),
            ai_usage=Sum('ai_parsing_count') + Sum('ai_image_count')
        )

        # Calculate rates
        total_orders = daily_stats['total_orders'] or 0
        completed_orders = daily_stats['completed_orders'] or 0
        quotes_sent = daily_stats['quotes_sent'] or 0
        quotes_accepted = daily_stats['quotes_accepted'] or 0

        completion_rate = (
            (completed_orders / total_orders * 100) if total_orders > 0 else 0
        )
        quote_rate = (
            (quotes_accepted / quotes_sent * 100) if quotes_sent > 0 else 0
        )

        # Get previous period for comparison
        prev_start = start_date - timedelta(days=days)
        prev_end = start_date - timedelta(days=1)

        prev_stats = DailyAnalytics.objects.filter(
            mover=self.mover,
            date__gte=prev_start,
            date__lte=prev_end
        ).aggregate(
            total_orders=Sum('orders_received'),
            total_revenue=Sum('total_revenue')
        )

        prev_orders = prev_stats['total_orders'] or 0
        prev_revenue = prev_stats['total_revenue'] or Decimal('0')

        # Calculate growth
        orders_growth = (
            ((total_orders - prev_orders) / prev_orders * 100)
            if prev_orders > 0 else 0
        )
        current_revenue = daily_stats['total_revenue'] or Decimal('0')
        revenue_growth = (
            ((current_revenue - prev_revenue) / prev_revenue * 100)
            if prev_revenue > 0 else 0
        )

        return {
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            },
            'orders': {
                'total': total_orders,
                'completed': completed_orders,
                'completion_rate': round(completion_rate, 1),
                'growth': round(orders_growth, 1)
            },
            'revenue': {
                'total': float(current_revenue),
                'average_per_order': float(
                    current_revenue / completed_orders if completed_orders > 0 else 0
                ),
                'growth': round(float(revenue_growth), 1)
            },
            'quotes': {
                'sent': quotes_sent,
                'accepted': quotes_accepted,
                'acceptance_rate': round(quote_rate, 1)
            },
            'ai_usage': daily_stats['ai_usage'] or 0
        }

    def get_revenue_chart_data(
        self,
        start_date: date,
        end_date: date,
        granularity: str = 'daily'
    ) -> List[Dict]:
        """
        Get revenue data for charts.

        Args:
            start_date: Start date
            end_date: End date
            granularity: 'daily' or 'monthly'

        Returns:
            List of data points
        """
        if granularity == 'monthly':
            data = DailyAnalytics.objects.filter(
                mover=self.mover,
                date__gte=start_date,
                date__lte=end_date
            ).annotate(
                period=TruncMonth('date')
            ).values('period').annotate(
                revenue=Sum('total_revenue'),
                orders=Sum('orders_completed')
            ).order_by('period')

            return [
                {
                    'date': item['period'].strftime('%Y-%m'),
                    'revenue': float(item['revenue'] or 0),
                    'orders': item['orders'] or 0
                }
                for item in data
            ]
        else:
            data = DailyAnalytics.objects.filter(
                mover=self.mover,
                date__gte=start_date,
                date__lte=end_date
            ).values('date').annotate(
                revenue=Sum('total_revenue'),
                orders=Sum('orders_completed')
            ).order_by('date')

            return [
                {
                    'date': item['date'].isoformat(),
                    'revenue': float(item['revenue'] or 0),
                    'orders': item['orders'] or 0
                }
                for item in data
            ]

    def get_order_statistics(
        self,
        start_date: date,
        end_date: date
    ) -> Dict:
        """
        Get detailed order statistics.
        """
        from apps.orders.models import Order

        orders = Order.objects.filter(
            mover=self.mover,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )

        # Status breakdown
        status_breakdown = orders.values('status').annotate(
            count=Count('id')
        )

        # Average metrics
        completed_orders = orders.filter(status='completed')
        avg_metrics = completed_orders.aggregate(
            avg_price=Avg('total_price'),
            avg_items=Avg('items__quantity')
        )

        # Top origins and destinations
        origins = orders.values('origin_address').annotate(
            count=Count('id')
        ).order_by('-count')[:5]

        destinations = orders.values('destination_address').annotate(
            count=Count('id')
        ).order_by('-count')[:5]

        return {
            'total': orders.count(),
            'status_breakdown': {
                item['status']: item['count']
                for item in status_breakdown
            },
            'average_price': float(avg_metrics['avg_price'] or 0),
            'average_items': float(avg_metrics['avg_items'] or 0),
            'top_origins': list(origins),
            'top_destinations': list(destinations)
        }

    def get_popular_items(
        self,
        start_date: date,
        end_date: date,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get most popular item types.
        """
        from apps.orders.models import OrderItem

        items = OrderItem.objects.filter(
            order__mover=self.mover,
            order__created_at__date__gte=start_date,
            order__created_at__date__lte=end_date,
            item_type__isnull=False
        ).values(
            'item_type__id',
            'item_type__name_en',
            'item_type__name_he'
        ).annotate(
            order_count=Count('order', distinct=True),
            total_quantity=Sum('quantity'),
            total_revenue=Sum('calculated_price')
        ).order_by('-order_count')[:limit]

        return [
            {
                'item_type_id': str(item['item_type__id']),
                'name': item['item_type__name_en'],
                'name_he': item['item_type__name_he'],
                'order_count': item['order_count'],
                'total_quantity': item['total_quantity'] or 0,
                'total_revenue': float(item['total_revenue'] or 0)
            }
            for item in items
        ]

    def get_customer_statistics(
        self,
        start_date: date,
        end_date: date
    ) -> Dict:
        """
        Get customer-related statistics.
        """
        from apps.orders.models import Order

        orders = Order.objects.filter(
            mover=self.mover,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )

        # Unique customers
        unique_customers = orders.values('customer').distinct().count()

        # Repeat customers (more than 1 order)
        repeat_customers = orders.values('customer').annotate(
            order_count=Count('id')
        ).filter(order_count__gt=1).count()

        # Customer lifetime value (average)
        customer_values = orders.values('customer').annotate(
            total_value=Sum('total_price')
        ).aggregate(
            avg_value=Avg('total_value')
        )

        return {
            'unique_customers': unique_customers,
            'repeat_customers': repeat_customers,
            'repeat_rate': round(
                (repeat_customers / unique_customers * 100) if unique_customers > 0 else 0,
                1
            ),
            'average_lifetime_value': float(customer_values['avg_value'] or 0)
        }

    def aggregate_monthly(self, year: int, month: int):
        """
        Aggregate monthly analytics from daily data.
        """
        from calendar import monthrange

        _, last_day = monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        # Aggregate from daily analytics
        daily_agg = DailyAnalytics.objects.filter(
            mover=self.mover,
            date__gte=start_date,
            date__lte=end_date
        ).aggregate(
            total_orders=Sum('orders_received'),
            completed_orders=Sum('orders_completed'),
            total_revenue=Sum('total_revenue'),
            total_quotes=Sum('quotes_sent'),
            accepted_quotes=Sum('quotes_accepted'),
            ai_requests=Sum('ai_parsing_count') + Sum('ai_image_count')
        )

        # Calculate averages
        total_orders = daily_agg['total_orders'] or 0
        completed_orders = daily_agg['completed_orders'] or 0
        total_revenue = daily_agg['total_revenue'] or Decimal('0')
        total_quotes = daily_agg['total_quotes'] or 0
        accepted_quotes = daily_agg['accepted_quotes'] or 0

        avg_order_value = (
            total_revenue / completed_orders if completed_orders > 0 else None
        )
        quote_rate = (
            Decimal(str(accepted_quotes / total_quotes * 100)) if total_quotes > 0 else None
        )

        # Get customer stats
        customer_stats = self.get_customer_statistics(start_date, end_date)

        # Update or create monthly record
        monthly, created = MonthlyAnalytics.objects.update_or_create(
            mover=self.mover,
            year=year,
            month=month,
            defaults={
                'total_orders': total_orders,
                'completed_orders': completed_orders,
                'total_revenue': total_revenue,
                'average_order_value': avg_order_value,
                'total_quotes': total_quotes,
                'accepted_quotes': accepted_quotes,
                'quote_acceptance_rate': quote_rate,
                'new_customers': customer_stats['unique_customers'],
                'repeat_customers': customer_stats['repeat_customers'],
                'ai_requests': daily_agg['ai_requests'] or 0
            }
        )

        logger.info(f"Aggregated monthly analytics for {self.mover.company_name} {year}/{month}")
        return monthly

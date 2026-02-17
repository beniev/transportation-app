"""
Serializers for the analytics app.
"""
from rest_framework import serializers
from datetime import date, timedelta

from .models import AnalyticsEvent, DailyAnalytics, MonthlyAnalytics, PopularItem


class AnalyticsEventSerializer(serializers.ModelSerializer):
    """Serializer for analytics events."""

    class Meta:
        model = AnalyticsEvent
        fields = [
            'id', 'event_type', 'value', 'metadata',
            'event_date', 'event_time', 'created_at'
        ]


class DailyAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for daily analytics."""

    class Meta:
        model = DailyAnalytics
        fields = [
            'date',
            'orders_received', 'orders_approved', 'orders_completed', 'orders_cancelled',
            'quotes_sent', 'quotes_accepted', 'quotes_rejected',
            'total_revenue', 'total_quote_value',
            'bookings_created', 'bookings_completed',
            'ai_parsing_count', 'ai_image_count',
            'quote_acceptance_rate', 'order_completion_rate'
        ]


class MonthlyAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for monthly analytics."""

    period = serializers.SerializerMethodField()

    class Meta:
        model = MonthlyAnalytics
        fields = [
            'id', 'year', 'month', 'period',
            'total_orders', 'completed_orders',
            'total_revenue', 'average_order_value',
            'total_quotes', 'accepted_quotes', 'quote_acceptance_rate',
            'new_customers', 'repeat_customers',
            'ai_requests'
        ]

    def get_period(self, obj):
        return f"{obj.year}-{obj.month:02d}"


class PopularItemSerializer(serializers.ModelSerializer):
    """Serializer for popular items."""

    item_name = serializers.CharField(source='item_type.name_en', read_only=True)
    item_name_he = serializers.CharField(source='item_type.name_he', read_only=True)

    class Meta:
        model = PopularItem
        fields = [
            'id', 'item_type', 'item_name', 'item_name_he',
            'period_start', 'period_end',
            'order_count', 'total_quantity', 'total_revenue'
        ]


class DashboardSummarySerializer(serializers.Serializer):
    """Serializer for dashboard summary."""

    period = serializers.DictField()
    orders = serializers.DictField()
    revenue = serializers.DictField()
    quotes = serializers.DictField()
    ai_usage = serializers.IntegerField()


class RevenueChartDataSerializer(serializers.Serializer):
    """Serializer for revenue chart data."""

    date = serializers.CharField()
    revenue = serializers.FloatField()
    orders = serializers.IntegerField()


class OrderStatisticsSerializer(serializers.Serializer):
    """Serializer for order statistics."""

    total = serializers.IntegerField()
    status_breakdown = serializers.DictField()
    average_price = serializers.FloatField()
    average_items = serializers.FloatField()
    top_origins = serializers.ListField()
    top_destinations = serializers.ListField()


class CustomerStatisticsSerializer(serializers.Serializer):
    """Serializer for customer statistics."""

    unique_customers = serializers.IntegerField()
    repeat_customers = serializers.IntegerField()
    repeat_rate = serializers.FloatField()
    average_lifetime_value = serializers.FloatField()


class DateRangeSerializer(serializers.Serializer):
    """Serializer for date range queries."""

    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    days = serializers.IntegerField(required=False, min_value=1, max_value=365)

    def validate(self, data):
        # Set defaults
        if 'days' in data:
            data['end_date'] = date.today()
            data['start_date'] = data['end_date'] - timedelta(days=data['days'])
        else:
            if 'end_date' not in data:
                data['end_date'] = date.today()
            if 'start_date' not in data:
                data['start_date'] = data['end_date'] - timedelta(days=30)

        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Start date must be before end date")

        return data


class MonthYearSerializer(serializers.Serializer):
    """Serializer for month/year queries."""

    year = serializers.IntegerField(min_value=2020, max_value=2100)
    month = serializers.IntegerField(min_value=1, max_value=12)


class ExportOptionsSerializer(serializers.Serializer):
    """Serializer for export options."""

    start_date = serializers.DateField()
    end_date = serializers.DateField()
    format = serializers.ChoiceField(
        choices=['csv', 'json', 'zip'],
        default='csv'
    )
    report_type = serializers.ChoiceField(
        choices=['revenue', 'orders', 'quotes', 'monthly_summary', 'full'],
        default='revenue'
    )

    def validate(self, data):
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Start date must be before end date")
        return data

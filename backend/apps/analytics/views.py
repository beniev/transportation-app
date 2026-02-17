"""
Views for the analytics app.
"""
from datetime import date, timedelta

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsMover
from .models import DailyAnalytics, MonthlyAnalytics
from .serializers import (
    DailyAnalyticsSerializer,
    MonthlyAnalyticsSerializer,
    DashboardSummarySerializer,
    RevenueChartDataSerializer,
    OrderStatisticsSerializer,
    CustomerStatisticsSerializer,
    DateRangeSerializer,
    MonthYearSerializer,
    ExportOptionsSerializer
)
from .services.analytics_service import AnalyticsService
from .services.report_generator import ReportGenerator


class DashboardView(APIView):
    """
    Main analytics dashboard view.
    """
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get(self, request):
        """Get dashboard summary."""
        serializer = DateRangeSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        days = serializer.validated_data.get('days', 30)
        analytics = AnalyticsService(request.user.mover_profile)
        summary = analytics.get_dashboard_summary(days=days)

        return Response(DashboardSummarySerializer(summary).data)


class RevenueView(APIView):
    """
    Revenue analytics view.
    """
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get(self, request):
        """Get revenue chart data."""
        serializer = DateRangeSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']
        granularity = request.query_params.get('granularity', 'daily')

        analytics = AnalyticsService(request.user.mover_profile)
        data = analytics.get_revenue_chart_data(start_date, end_date, granularity)

        return Response({
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'granularity': granularity
            },
            'data': RevenueChartDataSerializer(data, many=True).data,
            'totals': {
                'revenue': sum(d['revenue'] for d in data),
                'orders': sum(d['orders'] for d in data)
            }
        })


class OrderStatisticsView(APIView):
    """
    Order statistics view.
    """
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get(self, request):
        """Get order statistics."""
        serializer = DateRangeSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']

        analytics = AnalyticsService(request.user.mover_profile)
        stats = analytics.get_order_statistics(start_date, end_date)

        return Response(OrderStatisticsSerializer(stats).data)


class CustomerStatisticsView(APIView):
    """
    Customer statistics view.
    """
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get(self, request):
        """Get customer statistics."""
        serializer = DateRangeSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']

        analytics = AnalyticsService(request.user.mover_profile)
        stats = analytics.get_customer_statistics(start_date, end_date)

        return Response(CustomerStatisticsSerializer(stats).data)


class PopularItemsView(APIView):
    """
    Popular items view.
    """
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get(self, request):
        """Get popular items."""
        serializer = DateRangeSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']
        limit = int(request.query_params.get('limit', 10))

        analytics = AnalyticsService(request.user.mover_profile)
        items = analytics.get_popular_items(start_date, end_date, limit)

        return Response({
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'items': items
        })


class DailyAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for daily analytics data.
    """
    serializer_class = DailyAnalyticsSerializer
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get_queryset(self):
        queryset = DailyAnalytics.objects.filter(
            mover=self.request.user.mover_profile
        )

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset.order_by('-date')


class MonthlyAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for monthly analytics data.
    """
    serializer_class = MonthlyAnalyticsSerializer
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get_queryset(self):
        queryset = MonthlyAnalytics.objects.filter(
            mover=self.request.user.mover_profile
        )

        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(year=year)

        return queryset.order_by('-year', '-month')

    @action(detail=False, methods=['post'])
    def aggregate(self, request):
        """Trigger monthly aggregation."""
        serializer = MonthYearSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        analytics = AnalyticsService(request.user.mover_profile)
        monthly = analytics.aggregate_monthly(
            serializer.validated_data['year'],
            serializer.validated_data['month']
        )

        return Response(MonthlyAnalyticsSerializer(monthly).data)


class ExportView(APIView):
    """
    Analytics export view.
    """
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get(self, request):
        """Export analytics data."""
        serializer = ExportOptionsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']
        format_type = serializer.validated_data['format']
        report_type = serializer.validated_data['report_type']

        generator = ReportGenerator(request.user.mover_profile)

        if report_type == 'revenue':
            return generator.generate_revenue_report(start_date, end_date, format_type)
        elif report_type == 'orders':
            return generator.generate_orders_report(start_date, end_date, format_type)
        elif report_type == 'quotes':
            return generator.generate_quotes_report(start_date, end_date, format_type)
        elif report_type == 'monthly_summary':
            # Use year/month from start_date
            return generator.generate_monthly_summary(
                start_date.year, start_date.month, format_type
            )
        elif report_type == 'full':
            return generator.generate_full_export(start_date, end_date)

        return Response(
            {'error': 'Invalid report type'},
            status=status.HTTP_400_BAD_REQUEST
        )


class AnalyticsComparisonView(APIView):
    """
    Compare analytics between periods.
    """
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get(self, request):
        """Compare two periods."""
        # Current period
        current_start = request.query_params.get('current_start')
        current_end = request.query_params.get('current_end')

        # Previous period
        previous_start = request.query_params.get('previous_start')
        previous_end = request.query_params.get('previous_end')

        if not all([current_start, current_end, previous_start, previous_end]):
            # Default: compare last 30 days to previous 30 days
            current_end = date.today()
            current_start = current_end - timedelta(days=30)
            previous_end = current_start - timedelta(days=1)
            previous_start = previous_end - timedelta(days=30)
        else:
            current_start = date.fromisoformat(current_start)
            current_end = date.fromisoformat(current_end)
            previous_start = date.fromisoformat(previous_start)
            previous_end = date.fromisoformat(previous_end)

        analytics = AnalyticsService(request.user.mover_profile)

        # Get stats for both periods
        current_stats = analytics.get_order_statistics(current_start, current_end)
        previous_stats = analytics.get_order_statistics(previous_start, previous_end)

        # Calculate changes
        def calc_change(current, previous):
            if previous == 0:
                return 100 if current > 0 else 0
            return round((current - previous) / previous * 100, 1)

        return Response({
            'current_period': {
                'start': current_start.isoformat(),
                'end': current_end.isoformat(),
                'stats': current_stats
            },
            'previous_period': {
                'start': previous_start.isoformat(),
                'end': previous_end.isoformat(),
                'stats': previous_stats
            },
            'changes': {
                'orders': calc_change(
                    current_stats['total'],
                    previous_stats['total']
                ),
                'average_price': calc_change(
                    current_stats['average_price'],
                    previous_stats['average_price']
                )
            }
        })

"""
Report generator service for creating analytics reports.
"""
import io
import csv
from datetime import date, timedelta
from typing import Dict, List
from decimal import Decimal

from django.http import HttpResponse

from .analytics_service import AnalyticsService


class ReportGenerator:
    """
    Generates downloadable reports from analytics data.
    """

    def __init__(self, mover):
        self.mover = mover
        self.analytics = AnalyticsService(mover)

    def generate_revenue_report(
        self,
        start_date: date,
        end_date: date,
        format: str = 'csv'
    ) -> HttpResponse:
        """
        Generate a revenue report.

        Args:
            start_date: Report start date
            end_date: Report end date
            format: Output format ('csv' or 'json')

        Returns:
            HttpResponse with report data
        """
        data = self.analytics.get_revenue_chart_data(
            start_date, end_date, 'daily'
        )

        if format == 'csv':
            return self._generate_csv(
                data,
                filename=f'revenue_report_{start_date}_{end_date}.csv',
                headers=['Date', 'Revenue (ILS)', 'Orders Completed']
            )

        # JSON format
        from django.http import JsonResponse
        return JsonResponse({
            'report': 'revenue',
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'mover': self.mover.company_name,
            'data': data,
            'totals': {
                'revenue': sum(d['revenue'] for d in data),
                'orders': sum(d['orders'] for d in data)
            }
        })

    def generate_orders_report(
        self,
        start_date: date,
        end_date: date,
        format: str = 'csv'
    ) -> HttpResponse:
        """
        Generate an orders report with detailed breakdown.
        """
        from apps.orders.models import Order

        orders = Order.objects.filter(
            mover=self.mover,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).select_related('customer__user').order_by('-created_at')

        data = []
        for order in orders:
            customer = order.customer.user
            data.append({
                'order_id': str(order.id)[:8],
                'date': order.created_at.strftime('%Y-%m-%d'),
                'customer': customer.get_full_name() or customer.email,
                'origin': order.origin_address,
                'destination': order.destination_address,
                'status': order.status,
                'total_price': float(order.total_price or 0),
                'items_count': order.items.count()
            })

        if format == 'csv':
            return self._generate_csv(
                data,
                filename=f'orders_report_{start_date}_{end_date}.csv',
                headers=[
                    'Order ID', 'Date', 'Customer', 'Origin',
                    'Destination', 'Status', 'Total Price', 'Items'
                ]
            )

        from django.http import JsonResponse
        return JsonResponse({
            'report': 'orders',
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'mover': self.mover.company_name,
            'data': data,
            'summary': self.analytics.get_order_statistics(start_date, end_date)
        })

    def generate_quotes_report(
        self,
        start_date: date,
        end_date: date,
        format: str = 'csv'
    ) -> HttpResponse:
        """
        Generate a quotes report.
        """
        from apps.quotes.models import Quote

        quotes = Quote.objects.filter(
            order__mover=self.mover,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).select_related('order__customer__user').order_by('-created_at')

        data = []
        for quote in quotes:
            customer = quote.order.customer.user
            data.append({
                'quote_number': quote.quote_number,
                'date': quote.created_at.strftime('%Y-%m-%d'),
                'customer': customer.get_full_name() or customer.email,
                'status': quote.status,
                'total_amount': float(quote.total_amount),
                'sent_at': quote.sent_at.strftime('%Y-%m-%d %H:%M') if quote.sent_at else '',
                'is_signed': 'Yes' if hasattr(quote, 'signature') and quote.signature else 'No'
            })

        if format == 'csv':
            return self._generate_csv(
                data,
                filename=f'quotes_report_{start_date}_{end_date}.csv',
                headers=[
                    'Quote Number', 'Date', 'Customer', 'Status',
                    'Total Amount', 'Sent At', 'Signed'
                ]
            )

        from django.http import JsonResponse

        # Calculate summary
        total_quotes = len(data)
        accepted = sum(1 for d in data if d['status'] == 'accepted')
        total_value = sum(d['total_amount'] for d in data)

        return JsonResponse({
            'report': 'quotes',
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'mover': self.mover.company_name,
            'data': data,
            'summary': {
                'total_quotes': total_quotes,
                'accepted': accepted,
                'acceptance_rate': round(accepted / total_quotes * 100, 1) if total_quotes > 0 else 0,
                'total_value': total_value
            }
        })

    def generate_monthly_summary(
        self,
        year: int,
        month: int,
        format: str = 'csv'
    ) -> HttpResponse:
        """
        Generate a monthly summary report.
        """
        from calendar import monthrange

        _, last_day = monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        # Get all statistics
        dashboard = self.analytics.get_dashboard_summary(days=last_day)
        order_stats = self.analytics.get_order_statistics(start_date, end_date)
        customer_stats = self.analytics.get_customer_statistics(start_date, end_date)
        popular_items = self.analytics.get_popular_items(start_date, end_date, 10)

        if format == 'csv':
            # Create multi-section CSV
            output = io.StringIO()
            writer = csv.writer(output)

            # Header
            writer.writerow([f'Monthly Summary Report - {year}/{month:02d}'])
            writer.writerow([f'Company: {self.mover.company_name}'])
            writer.writerow([])

            # Overview section
            writer.writerow(['=== OVERVIEW ==='])
            writer.writerow(['Metric', 'Value'])
            writer.writerow(['Total Orders', dashboard['orders']['total']])
            writer.writerow(['Completed Orders', dashboard['orders']['completed']])
            writer.writerow(['Completion Rate', f"{dashboard['orders']['completion_rate']}%"])
            writer.writerow(['Total Revenue', f"₪{dashboard['revenue']['total']:,.2f}"])
            writer.writerow(['Average Order Value', f"₪{dashboard['revenue']['average_per_order']:,.2f}"])
            writer.writerow([])

            # Quotes section
            writer.writerow(['=== QUOTES ==='])
            writer.writerow(['Quotes Sent', dashboard['quotes']['sent']])
            writer.writerow(['Quotes Accepted', dashboard['quotes']['accepted']])
            writer.writerow(['Acceptance Rate', f"{dashboard['quotes']['acceptance_rate']}%"])
            writer.writerow([])

            # Customers section
            writer.writerow(['=== CUSTOMERS ==='])
            writer.writerow(['Unique Customers', customer_stats['unique_customers']])
            writer.writerow(['Repeat Customers', customer_stats['repeat_customers']])
            writer.writerow(['Repeat Rate', f"{customer_stats['repeat_rate']}%"])
            writer.writerow([])

            # Popular items section
            writer.writerow(['=== POPULAR ITEMS ==='])
            writer.writerow(['Item', 'Orders', 'Quantity', 'Revenue'])
            for item in popular_items:
                writer.writerow([
                    item['name'],
                    item['order_count'],
                    item['total_quantity'],
                    f"₪{item['total_revenue']:,.2f}"
                ])

            output.seek(0)
            response = HttpResponse(output.read(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="monthly_summary_{year}_{month:02d}.csv"'
            return response

        from django.http import JsonResponse
        return JsonResponse({
            'report': 'monthly_summary',
            'period': {
                'year': year,
                'month': month
            },
            'mover': self.mover.company_name,
            'overview': dashboard,
            'order_statistics': order_stats,
            'customer_statistics': customer_stats,
            'popular_items': popular_items
        })

    def generate_full_export(
        self,
        start_date: date,
        end_date: date
    ) -> HttpResponse:
        """
        Generate a full data export (all orders, quotes, bookings).
        """
        import zipfile
        from django.http import HttpResponse

        # Create in-memory ZIP file
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Orders CSV
            orders_response = self.generate_orders_report(start_date, end_date, 'csv')
            zf.writestr('orders.csv', orders_response.content)

            # Quotes CSV
            quotes_response = self.generate_quotes_report(start_date, end_date, 'csv')
            zf.writestr('quotes.csv', quotes_response.content)

            # Revenue CSV
            revenue_response = self.generate_revenue_report(start_date, end_date, 'csv')
            zf.writestr('revenue.csv', revenue_response.content)

            # Summary JSON
            from django.http import JsonResponse
            import json

            summary = {
                'export_date': date.today().isoformat(),
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'mover': self.mover.company_name,
                'dashboard': self.analytics.get_dashboard_summary(
                    days=(end_date - start_date).days
                ),
                'order_statistics': self.analytics.get_order_statistics(start_date, end_date),
                'customer_statistics': self.analytics.get_customer_statistics(start_date, end_date),
                'popular_items': self.analytics.get_popular_items(start_date, end_date)
            }
            zf.writestr('summary.json', json.dumps(summary, indent=2))

        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="analytics_export_{start_date}_{end_date}.zip"'
        return response

    def _generate_csv(
        self,
        data: List[Dict],
        filename: str,
        headers: List[str]
    ) -> HttpResponse:
        """Helper to generate CSV response."""
        output = io.StringIO()
        writer = csv.writer(output)

        # Write headers
        writer.writerow(headers)

        # Write data
        for row in data:
            writer.writerow(row.values())

        output.seek(0)
        response = HttpResponse(output.read(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

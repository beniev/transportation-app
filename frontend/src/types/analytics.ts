/**
 * TypeScript types for the analytics module.
 */

export interface DashboardSummary {
  period: {
    start: string
    end: string
    days: number
  }
  orders: {
    total: number
    completed: number
    pending: number
    cancelled: number
    completion_rate: number
  }
  revenue: {
    total: number
    average_per_order: number
    average_per_day: number
  }
  quotes: {
    sent: number
    accepted: number
    rejected: number
    pending: number
    acceptance_rate: number
    total_value: number
  }
  ai_usage: number
}

export interface RevenueChartData {
  date: string
  revenue: number
  orders: number
}

export interface OrderStatistics {
  total: number
  status_breakdown: Record<string, number>
  average_price: number
  average_items: number
  top_origins: {
    city: string
    count: number
  }[]
  top_destinations: {
    city: string
    count: number
  }[]
}

export interface CustomerStatistics {
  unique_customers: number
  repeat_customers: number
  repeat_rate: number
  average_lifetime_value: number
}

export interface PopularItem {
  id: string
  item_type: string
  name: string
  name_he: string
  order_count: number
  total_quantity: number
  total_revenue: number
}

export interface DailyAnalytics {
  date: string
  orders_received: number
  orders_approved: number
  orders_completed: number
  orders_cancelled: number
  quotes_sent: number
  quotes_accepted: number
  quotes_rejected: number
  total_revenue: number
  total_quote_value: number
  bookings_created: number
  bookings_completed: number
  ai_parsing_count: number
  ai_image_count: number
  quote_acceptance_rate: number
  order_completion_rate: number
}

export interface MonthlyAnalytics {
  id: string
  year: number
  month: number
  period: string
  total_orders: number
  completed_orders: number
  total_revenue: number
  average_order_value: number
  total_quotes: number
  accepted_quotes: number
  quote_acceptance_rate: number
  new_customers: number
  repeat_customers: number
  ai_requests: number
}

export interface ComparisonData {
  current_period: {
    start: string
    end: string
    stats: OrderStatistics
  }
  previous_period: {
    start: string
    end: string
    stats: OrderStatistics
  }
  changes: {
    orders: number
    average_price: number
  }
}

export interface DateRangeParams {
  start_date?: string
  end_date?: string
  days?: number
}

export interface ExportOptions {
  start_date: string
  end_date: string
  format: 'csv' | 'json' | 'zip'
  report_type: 'revenue' | 'orders' | 'quotes' | 'monthly_summary' | 'full'
}

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}

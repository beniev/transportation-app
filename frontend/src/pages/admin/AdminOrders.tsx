import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { adminOrdersAPI, type AdminOrderListItem } from '../../api/endpoints/adminOrders'
import type { Order, OrderItem, OrderImage } from '../../types/orders'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  comparing: 'bg-blue-100 text-blue-800',
  quoted: 'bg-indigo-100 text-indigo-800',
  approved: 'bg-green-100 text-green-800',
  scheduled: 'bg-cyan-100 text-cyan-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-rose-100 text-rose-800',
}

const statusLabels: Record<string, Record<string, string>> = {
  draft: { en: 'Draft', he: 'טיוטה' },
  pending: { en: 'Pending', he: 'ממתין' },
  comparing: { en: 'Comparing', he: 'משווה' },
  quoted: { en: 'Quoted', he: 'הצעה' },
  approved: { en: 'Approved', he: 'מאושר' },
  scheduled: { en: 'Scheduled', he: 'מתוזמן' },
  in_progress: { en: 'In Progress', he: 'בביצוע' },
  completed: { en: 'Completed', he: 'הושלם' },
  cancelled: { en: 'Cancelled', he: 'בוטל' },
  rejected: { en: 'Rejected', he: 'נדחה' },
}

type TabKey = 'all' | 'draft' | 'pending' | 'comparing' | 'quoted' | 'approved' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

const TABS: { key: TabKey; en: string; he: string }[] = [
  { key: 'all', en: 'All', he: 'הכל' },
  { key: 'pending', en: 'Pending', he: 'ממתין' },
  { key: 'comparing', en: 'Comparing', he: 'משווה' },
  { key: 'approved', en: 'Approved', he: 'מאושר' },
  { key: 'scheduled', en: 'Scheduled', he: 'מתוזמן' },
  { key: 'in_progress', en: 'In Progress', he: 'בביצוע' },
  { key: 'completed', en: 'Completed', he: 'הושלם' },
  { key: 'cancelled', en: 'Cancelled', he: 'בוטל' },
]

export default function AdminOrders() {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const lang = isRTL ? 'he' : 'en'

  const [orders, setOrders] = useState<AdminOrderListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<Order | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const PAGE_SIZE = 20

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: Record<string, string | number> = { page }
      if (activeTab !== 'all') params.status = activeTab
      if (search.trim()) params.search = search.trim()
      const data = await adminOrdersAPI.list(params as { status?: string; search?: string; page?: number })
      setOrders(data.results)
      setTotalCount(data.count)
      setHasNext(!!data.next)
      setHasPrev(!!data.previous)
    } catch {
      toast.error(isRTL ? 'שגיאה בטעינת הזמנות' : 'Error loading orders')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, search, page, isRTL])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Reset page when tab or search changes
  useEffect(() => {
    setPage(1)
  }, [activeTab, search])

  const handleExpandOrder = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setExpandedOrder(null)
      return
    }
    setExpandedId(id)
    setLoadingDetail(true)
    try {
      const detail = await adminOrdersAPI.detail(id)
      setExpandedOrder(detail)
    } catch {
      toast.error(isRTL ? 'שגיאה בטעינת פרטים' : 'Error loading details')
    } finally {
      setLoadingDetail(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '—'
    return `₪${Number(price).toLocaleString()}`
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? 'הזמנות' : 'Orders'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isRTL ? `${totalCount} הזמנות` : `${totalCount} orders`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isRTL ? 'חיפוש לפי שם, אימייל, עיר...' : 'Search by name, email, city...'}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab[lang]}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {isRTL ? 'אין הזמנות' : 'No orders found'}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'לקוח' : 'Customer'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'סטטוס' : 'Status'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'מוצא → יעד' : 'Origin → Dest'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'מוביל' : 'Mover'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'תאריך' : 'Date'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'פריטים' : 'Items'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'מחיר' : 'Price'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'נוצר' : 'Created'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <>
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleExpandOrder(order.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {order.customer_name || '—'}
                        </div>
                        <div className="text-xs text-gray-500">{order.customer_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabels[order.status]?.[lang] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {order.origin_city || '—'} → {order.destination_city || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {order.mover_name || <span className="text-gray-400">{isRTL ? 'לא שוייך' : 'Unassigned'}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {order.preferred_date_display || formatDate(order.preferred_date) || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">
                        {order.items_count}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatPrice(order.total_price)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {expandedId === order.id && (
                      <tr key={`${order.id}-detail`}>
                        <td colSpan={8} className="px-4 py-4 bg-gray-50">
                          {loadingDetail ? (
                            <div className="flex justify-center py-4">
                              <LoadingSpinner />
                            </div>
                          ) : expandedOrder ? (
                            <OrderDetailPanel order={expandedOrder} isRTL={isRTL} />
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                {isRTL
                  ? `עמוד ${page} מתוך ${totalPages}`
                  : `Page ${page} of ${totalPages}`}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!hasPrev}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  {isRTL ? 'הקודם' : 'Previous'}
                </button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        page === pageNum
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNext}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  {isRTL ? 'הבא' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ===== Order Detail Panel (expanded row) =====

function OrderDetailPanel({ order, isRTL }: { order: Order; isRTL: boolean }) {
  const items: OrderItem[] = order.items || []
  const images: OrderImage[] = order.order_images || order.images || []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left: Locations & Details */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-700">
          {isRTL ? 'פרטי הזמנה' : 'Order Details'}
        </h4>

        {/* Description */}
        {order.original_description && (
          <div>
            <span className="text-xs text-gray-500 block mb-1">
              {isRTL ? 'תיאור מקורי' : 'Original Description'}
            </span>
            <p className="text-sm text-gray-700 bg-white p-2 rounded border whitespace-pre-wrap">
              {order.original_description}
            </p>
          </div>
        )}

        {/* Origin */}
        <div className="bg-white p-3 rounded border">
          <span className="text-xs font-medium text-green-600 block mb-1">
            {isRTL ? '📍 מוצא' : '📍 Origin'}
          </span>
          <p className="text-sm">{order.origin_address || '—'}</p>
          <p className="text-xs text-gray-500">
            {isRTL ? 'קומה' : 'Floor'}: {order.origin_floor} |{' '}
            {isRTL ? 'מעלית' : 'Elevator'}: {order.origin_has_elevator ? '✓' : '✗'}
          </p>
        </div>

        {/* Destination */}
        <div className="bg-white p-3 rounded border">
          <span className="text-xs font-medium text-blue-600 block mb-1">
            {isRTL ? '📍 יעד' : '📍 Destination'}
          </span>
          <p className="text-sm">{order.destination_address || '—'}</p>
          <p className="text-xs text-gray-500">
            {isRTL ? 'קומה' : 'Floor'}: {order.destination_floor} |{' '}
            {isRTL ? 'מעלית' : 'Elevator'}: {order.destination_has_elevator ? '✓' : '✗'}
          </p>
        </div>

        {/* Distance */}
        {order.distance_km > 0 && (
          <p className="text-sm text-gray-600">
            {isRTL ? 'מרחק' : 'Distance'}: {Number(order.distance_km).toFixed(1)} km
          </p>
        )}

        {/* Notes */}
        {order.customer_notes && (
          <div>
            <span className="text-xs text-gray-500">{isRTL ? 'הערות לקוח' : 'Customer Notes'}</span>
            <p className="text-sm text-gray-700">{order.customer_notes}</p>
          </div>
        )}
      </div>

      {/* Right: Items & Pricing */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-700">
          {isRTL ? `פריטים (${items.length})` : `Items (${items.length})`}
        </h4>

        {items.length > 0 ? (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={item.id || idx} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                <div className="flex-1">
                  <span className="font-medium">
                    {item.name || 'Unknown'}
                  </span>
                  <span className="text-gray-500 ms-2">×{item.quantity}</span>
                  {/* Tags */}
                  <div className="flex gap-1 mt-0.5">
                    {item.is_fragile && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">{isRTL ? 'שביר' : 'Fragile'}</span>}
                    {item.requires_assembly && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">{isRTL ? 'הרכבה' : 'Assembly'}</span>}
                    {item.requires_disassembly && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded">{isRTL ? 'פירוק' : 'Disassembly'}</span>}
                    {item.requires_special_handling && <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded">{isRTL ? 'מיוחד' : 'Special'}</span>}
                  </div>
                </div>
                <span className="text-gray-700 font-medium">
                  {item.total_price ? `₪${Number(item.total_price).toLocaleString()}` : '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">{isRTL ? 'אין פריטים' : 'No items'}</p>
        )}

        {/* Pricing Breakdown */}
        <div className="bg-white p-3 rounded border space-y-1">
          <h5 className="text-xs font-medium text-gray-500 mb-2">
            {isRTL ? 'פירוט מחיר' : 'Price Breakdown'}
          </h5>
          <PriceLine label={isRTL ? 'פריטים' : 'Items'} value={order.items_subtotal} />
          <PriceLine label={isRTL ? 'תוספת קומות מוצא' : 'Origin floor'} value={order.origin_floor_surcharge} />
          <PriceLine label={isRTL ? 'תוספת קומות יעד' : 'Dest floor'} value={order.destination_floor_surcharge} />
          <PriceLine label={isRTL ? 'תוספת מרחק' : 'Distance'} value={order.distance_surcharge} />
          <PriceLine label={isRTL ? 'נסיעה' : 'Travel'} value={order.travel_cost} />
          <PriceLine label={isRTL ? 'עונתי' : 'Seasonal'} value={order.seasonal_adjustment} />
          <PriceLine label={isRTL ? 'יום בשבוע' : 'Day adj.'} value={order.day_of_week_adjustment} />
          {order.discount > 0 && (
            <PriceLine label={isRTL ? 'הנחה' : 'Discount'} value={-order.discount} />
          )}
          <div className="border-t pt-1 mt-1 flex justify-between font-bold text-sm">
            <span>{isRTL ? 'סה"כ' : 'Total'}</span>
            <span>₪{Number(order.total_price || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Images */}
        {images.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-500 mb-1">
              {isRTL ? `תמונות (${images.length})` : `Images (${images.length})`}
            </h5>
            <div className="flex gap-2 flex-wrap">
              {images.map((img, idx) => {
                const imgUrl = img.image_url || img.image
                return (
                  <a
                    key={img.id || idx}
                    href={imgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-16 h-16 bg-gray-200 rounded overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={imgUrl}
                      alt={`Image ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PriceLine({ label, value }: { label: string; value: number | null | undefined }) {
  if (!value || Number(value) === 0) return null
  return (
    <div className="flex justify-between text-xs text-gray-600">
      <span>{label}</span>
      <span>₪{Number(value).toLocaleString()}</span>
    </div>
  )
}

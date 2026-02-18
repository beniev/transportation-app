import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { adminMoversAPI, type AdminMoverProfile } from '../../api/endpoints/adminMovers'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-800',
}

const statusLabels: Record<string, Record<string, string>> = {
  pending: { en: 'Pending', he: 'ממתין' },
  approved: { en: 'Approved', he: 'מאושר' },
  rejected: { en: 'Rejected', he: 'נדחה' },
  suspended: { en: 'Suspended', he: 'מושעה' },
}

type TabKey = 'pending' | 'approved' | 'rejected' | 'all'

export default function MoverApprovals() {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [movers, setMovers] = useState<AdminMoverProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const fetchMovers = async (statusFilter?: string) => {
    setIsLoading(true)
    try {
      const data = await adminMoversAPI.list(statusFilter === 'all' ? undefined : statusFilter)
      setMovers(data)
    } catch (err) {
      toast.error(isRTL ? 'שגיאה בטעינת מובילים' : 'Error loading movers')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMovers(activeTab)
  }, [activeTab])

  const handleApprove = async (id: string) => {
    try {
      await adminMoversAPI.approve(id)
      toast.success(isRTL ? 'המוביל אושר' : 'Mover approved')
      fetchMovers(activeTab)
    } catch {
      toast.error(isRTL ? 'שגיאה' : 'Error')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await adminMoversAPI.reject(id, rejectReason)
      toast.success(isRTL ? 'המוביל נדחה' : 'Mover rejected')
      setRejectingId(null)
      setRejectReason('')
      fetchMovers(activeTab)
    } catch {
      toast.error(isRTL ? 'שגיאה' : 'Error')
    }
  }

  const handleSuspend = async (id: string) => {
    try {
      await adminMoversAPI.suspend(id, rejectReason || 'Suspended by admin')
      toast.success(isRTL ? 'המוביל הושעה' : 'Mover suspended')
      setRejectingId(null)
      setRejectReason('')
      fetchMovers(activeTab)
    } catch {
      toast.error(isRTL ? 'שגיאה' : 'Error')
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'pending', label: isRTL ? 'ממתינים' : 'Pending' },
    { key: 'approved', label: isRTL ? 'מאושרים' : 'Approved' },
    { key: 'rejected', label: isRTL ? 'נדחו' : 'Rejected' },
    { key: 'all', label: isRTL ? 'הכל' : 'All' },
  ]

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6">
        {isRTL ? 'ניהול מובילים' : 'Mover Management'}
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Movers List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : movers.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          {isRTL ? 'אין מובילים' : 'No movers'}
        </p>
      ) : (
        <div className="space-y-4">
          {movers.map((mover) => (
            <div key={mover.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">
                      {isRTL ? (mover.company_name_he || mover.company_name) : mover.company_name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[mover.verification_status] || 'bg-gray-100'
                    }`}>
                      {statusLabels[mover.verification_status]?.[isRTL ? 'he' : 'en'] || mover.verification_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">{isRTL ? 'אימייל:' : 'Email:'}</span>{' '}
                      {mover.email}
                    </div>
                    <div>
                      <span className="font-medium">{isRTL ? 'טלפון:' : 'Phone:'}</span>{' '}
                      {mover.phone || '—'}
                    </div>
                    <div>
                      <span className="font-medium">{isRTL ? 'שם:' : 'Name:'}</span>{' '}
                      {mover.full_name}
                    </div>
                    <div>
                      <span className="font-medium">{isRTL ? 'עיר:' : 'City:'}</span>{' '}
                      {mover.city || '—'}
                    </div>
                    <div>
                      <span className="font-medium">{isRTL ? 'דירוג:' : 'Rating:'}</span>{' '}
                      {mover.rating > 0 ? `${mover.rating}★ (${mover.total_reviews})` : '—'}
                    </div>
                    <div>
                      <span className="font-medium">{isRTL ? 'הזמנות:' : 'Orders:'}</span>{' '}
                      {mover.completed_orders}
                    </div>
                  </div>

                  {mover.website && (
                    <div className="mt-2 text-sm">
                      <a href={mover.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {mover.website}
                      </a>
                    </div>
                  )}

                  {mover.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                      <span className="font-medium">{isRTL ? 'סיבת דחייה:' : 'Rejection reason:'}</span>{' '}
                      {mover.rejection_reason}
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-2">
                    {isRTL ? 'נרשם:' : 'Registered:'}{' '}
                    {new Date(mover.created_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                {mover.verification_status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(mover.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      {isRTL ? 'אשר' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setRejectingId(rejectingId === mover.id ? null : mover.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                    >
                      {isRTL ? 'דחה' : 'Reject'}
                    </button>
                  </>
                )}
                {mover.verification_status === 'approved' && (
                  <button
                    onClick={() => setRejectingId(rejectingId === mover.id ? null : mover.id)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
                  >
                    {isRTL ? 'השעה' : 'Suspend'}
                  </button>
                )}
                {mover.verification_status === 'rejected' && (
                  <button
                    onClick={() => handleApprove(mover.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    {isRTL ? 'אשר מחדש' : 'Re-approve'}
                  </button>
                )}
                {mover.verification_status === 'suspended' && (
                  <button
                    onClick={() => handleApprove(mover.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    {isRTL ? 'בטל השעיה' : 'Unsuspend'}
                  </button>
                )}
              </div>

              {/* Reject/Suspend reason input */}
              {rejectingId === mover.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={isRTL ? 'סיבה (אופציונלי)' : 'Reason (optional)'}
                    className="flex-1 input"
                  />
                  <button
                    onClick={() =>
                      mover.verification_status === 'approved'
                        ? handleSuspend(mover.id)
                        : handleReject(mover.id)
                    }
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    {isRTL ? 'אישור' : 'Confirm'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

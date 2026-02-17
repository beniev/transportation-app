import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authAPI } from '../../api/endpoints/auth'
import AddressAutocomplete from '../../components/common/AddressAutocomplete'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ServiceArea() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['moverProfile'],
    queryFn: authAPI.getMoverProfile,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authAPI.updateMoverProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moverProfile'] })
      toast.success(isRTL ? 'אזור השירות עודכן בהצלחה!' : 'Service area updated successfully!')
      navigate('/mover')
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בעדכון' : 'Error updating service area')
    },
  })

  const [baseAddress, setBaseAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [radius, setRadius] = useState(50)

  // Sync state from profile when loaded
  useEffect(() => {
    if (profile) {
      setLat(profile.base_latitude)
      setLng(profile.base_longitude)
      setRadius(Number(profile.service_radius_km) || 50)
      setBaseAddress(profile.address || '')
    }
  }, [profile])

  const handleSave = () => {
    updateMutation.mutate({
      base_latitude: lat,
      base_longitude: lng,
      service_radius_km: radius,
      address: baseAddress,
    })
  }

  const hasChanges = profile && (
    lat !== profile.base_latitude ||
    lng !== profile.base_longitude ||
    radius !== Number(profile.service_radius_km) ||
    baseAddress !== (profile.address || '')
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-2">{t('mover.serviceAreaTitle')}</h1>
      <p className="text-gray-600 mb-8">{t('mover.serviceAreaDescription')}</p>

      {/* Current settings display */}
      {profile?.base_latitude && profile?.base_longitude ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-green-800 mb-2">
            {t('mover.currentSettings')}
          </h3>
          <div className="text-sm text-green-700 space-y-1">
            {profile.address && (
              <p>
                {isRTL ? 'כתובת בסיס:' : 'Base address:'} {profile.address}
              </p>
            )}
            <p>
              {t('mover.serviceRadius')}: {Number(profile.service_radius_km)} {t('mover.km')}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 text-sm">{t('mover.noBaseLocation')}</p>
        </div>
      )}

      {/* Base Location */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('mover.baseLocation')}</h2>
        <AddressAutocomplete
          value={baseAddress}
          onChange={(val) => setBaseAddress(val)}
          onPlaceSelect={(place) => {
            setBaseAddress(place.address)
            if (place.lat && place.lng) {
              setLat(place.lat)
              setLng(place.lng)
            }
          }}
          placeholder={t('mover.baseLocationPlaceholder')}
          className="input w-full"
          isRTL={isRTL}
        />
      </div>

      {/* Service Radius */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('mover.serviceRadius')}</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={10}
              max={200}
              step={5}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="w-24 text-center">
              <span className="text-2xl font-bold text-blue-600">{radius}</span>
              <span className="text-sm text-gray-500 ms-1">{t('mover.km')}</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400" dir="ltr">
            <span>10 km</span>
            <span>50 km</span>
            <span>100 km</span>
            <span>150 km</span>
            <span>200 km</span>
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!lat || !lng || updateMutation.isPending || !hasChanges}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {updateMutation.isPending
          ? (isRTL ? 'שומר...' : 'Saving...')
          : (isRTL ? 'שמור אזור שירות' : 'Save Service Area')}
      </button>
    </div>
  )
}

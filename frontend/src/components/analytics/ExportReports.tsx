import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { format, subDays } from 'date-fns'
import { ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { useExportAnalytics } from '../../api/hooks'
import type { ExportOptions } from '../../types'

const PRESET_RANGES = [
  { key: 'last7', days: 7 },
  { key: 'last30', days: 30 },
  { key: 'last90', days: 90 },
  { key: 'lastYear', days: 365 },
]

export default function ExportReports() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [selectedPreset, setSelectedPreset] = useState<string | null>('last30')

  const exportMutation = useExportAnalytics()

  const today = new Date()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { },
  } = useForm<ExportOptions>({
    defaultValues: {
      start_date: format(subDays(today, 30), 'yyyy-MM-dd'),
      end_date: format(today, 'yyyy-MM-dd'),
      format: 'csv',
      report_type: 'revenue',
    },
  })

  const handlePresetClick = (preset: typeof PRESET_RANGES[0]) => {
    setSelectedPreset(preset.key)
    setValue('end_date', format(today, 'yyyy-MM-dd'))
    setValue('start_date', format(subDays(today, preset.days), 'yyyy-MM-dd'))
  }

  const onSubmit = async (data: ExportOptions) => {
    try {
      const blob = await exportMutation.mutateAsync(data)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const extension = data.format === 'zip' ? 'zip' : data.format
      link.download = `${data.report_type}_report_${data.start_date}_${data.end_date}.${extension}`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const reportTypes = [
    { value: 'revenue', label: t('analytics.revenueReport') },
    { value: 'orders', label: t('analytics.ordersReport') },
    { value: 'quotes', label: t('analytics.quotesReport') },
    { value: 'monthly_summary', label: t('analytics.monthlySummary') },
    { value: 'full', label: t('analytics.fullExport') },
  ]

  const formats = [
    { value: 'csv', label: 'CSV' },
    { value: 'json', label: 'JSON' },
    { value: 'zip', label: `ZIP (${t('analytics.allFormats')})` },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 mb-6">
        <DocumentArrowDownIcon className="h-6 w-6 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">{t('analytics.exportReports')}</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Preset Ranges */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('analytics.quickSelect')}
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_RANGES.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedPreset === preset.key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t(`analytics.presets.${preset.key}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('analytics.startDate')}
            </label>
            <input
              type="date"
              {...register('start_date', { required: true })}
              onChange={(e) => {
                setSelectedPreset(null)
                register('start_date').onChange(e)
              }}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('analytics.endDate')}
            </label>
            <input
              type="date"
              {...register('end_date', { required: true })}
              onChange={(e) => {
                setSelectedPreset(null)
                register('end_date').onChange(e)
              }}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('analytics.reportType')}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {reportTypes.map((type) => (
              <label
                key={type.value}
                className={`flex items-center justify-center px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  watch('report_type') === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  {...register('report_type')}
                  value={type.value}
                  className="sr-only"
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('analytics.format')}
          </label>
          <div className="flex gap-2">
            {formats.map((fmt) => (
              <label
                key={fmt.value}
                className={`flex items-center justify-center px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  watch('format') === fmt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  {...register('format')}
                  value={fmt.value}
                  className="sr-only"
                />
                {fmt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={exportMutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          {exportMutation.isPending ? t('analytics.exporting') : t('analytics.downloadReport')}
        </button>
      </form>
    </div>
  )
}

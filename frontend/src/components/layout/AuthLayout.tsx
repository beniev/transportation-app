import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../common/LanguageSwitcher'

export default function AuthLayout() {
  useTranslation()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="p-4 flex justify-end">
        <LanguageSwitcher />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-600">Movers App</h1>
            <p className="text-gray-600 mt-2">אפליקציית הובלות חכמה</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}

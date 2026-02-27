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
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-teal-700">Tovil</h1>
            <p className="text-gray-500 mt-1 text-sm">פלטפורמת הובלות חכמה</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}

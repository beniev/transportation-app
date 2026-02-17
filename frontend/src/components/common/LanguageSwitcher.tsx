import { useLanguage } from '../../contexts/LanguageContext'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <button
      onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
      className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 transition-colors"
    >
      {language === 'he' ? 'EN' : 'עב'}
    </button>
  )
}

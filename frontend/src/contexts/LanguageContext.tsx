import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Language = 'he' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language
    return saved || 'he'
  })

  useEffect(() => {
    i18n.changeLanguage(language)
    localStorage.setItem('language', language)
    document.documentElement.lang = language
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'
  }, [language, i18n])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      isRTL: language === 'he',
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

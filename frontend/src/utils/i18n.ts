import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enTranslations from '../../public/locales/en/translation.json'
import heTranslations from '../../public/locales/he/translation.json'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslations },
    he: { translation: heTranslations },
  },
  lng: 'he',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n

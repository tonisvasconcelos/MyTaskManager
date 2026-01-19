import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'

export function useLanguage() {
  const { i18n } = useTranslation()

  const currentLanguage = useMemo(() => {
    return i18n.language === 'pt-BR' ? 'PT_BR' : 'EN'
  }, [i18n.language])

  const changeLanguage = (lang: 'EN' | 'PT_BR') => {
    const i18nLang = lang === 'PT_BR' ? 'pt-BR' : 'en'
    i18n.changeLanguage(i18nLang)
    localStorage.setItem('i18nextLng', i18nLang)
  }

  return {
    currentLanguage,
    changeLanguage,
    language: i18n.language,
  }
}

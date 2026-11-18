import { t } from '../lib/i18n'
import type { Language } from '../lib/types'

interface LanguageSwitchProps {
  language: Language
  onLanguage: (language: Language) => void
  className?: string
}

/** A compact RU/EN control; the mobile version lives in the search footer so
 *  the masthead never crowds at narrow widths. */
export function LanguageSwitch({ language, onLanguage, className }: LanguageSwitchProps) {
  return (
    <div className={`lang-switch ${className ?? ''}`} role="group" aria-label={t('topbar.language')}>
      <button
        type="button"
        className={language === 'ru' ? 'is-active' : ''}
        aria-pressed={language === 'ru'}
        onClick={() => onLanguage('ru')}
        lang="ru"
      >
        RU
      </button>
      <button
        type="button"
        className={language === 'en' ? 'is-active' : ''}
        aria-pressed={language === 'en'}
        onClick={() => onLanguage('en')}
        lang="en"
      >
        EN
      </button>
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { setAppLocale, type AppLocale } from './index'
import './language-switcher.css'

const LOCALE_OPTIONS: { locale: AppLocale; flag: string; labelKey: string }[] = [
  { locale: 'en', flag: '🇺🇸', labelKey: 'language.en' },
  { locale: 'it', flag: '🇮🇹', labelKey: 'language.it' },
]

interface Props {
  className?: string
}

export function LanguageSwitcher({ className }: Props) {
  const { t, i18n } = useTranslation()
  const current = (i18n.language === 'it' ? 'it' : 'en') as AppLocale
  const active = LOCALE_OPTIONS.find((option) => option.locale === current) ?? LOCALE_OPTIONS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn('lang-switcher-trigger', className)}
          aria-label={t('language.switch', { language: t(active.labelKey) })}
        >
          <span className="lang-switcher-flag" aria-hidden="true">
            {active.flag}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="lang-switcher-menu">
        {LOCALE_OPTIONS.map(({ locale, flag, labelKey }) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => setAppLocale(locale)}
            className={cn('lang-switcher-item', current === locale && 'lang-switcher-item-active')}
          >
            <span className="lang-switcher-flag" aria-hidden="true">
              {flag}
            </span>
            <span>{t(labelKey)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

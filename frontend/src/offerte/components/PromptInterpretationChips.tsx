import { useTranslation } from 'react-i18next'
import type { PromptInterpretationItem } from '../promptTerms'
import './PromptInterpretationChips.css'

interface Props {
  items: PromptInterpretationItem[]
  compact?: boolean
}

export function PromptInterpretationChips({ items, compact = false }: Props) {
  const { t } = useTranslation()

  const kindLabels: Record<PromptInterpretationItem['kind'], string> = {
    role: t('offerte.promptRole'),
    location: t('offerte.promptLocation'),
    period: t('offerte.promptPeriod'),
    title: t('offerte.promptTitle'),
  }

  if (!items.length) return null

  return (
    <div className={`prompt-interpretation${compact ? ' prompt-interpretation-compact' : ''}`}>
      <span className="prompt-interpretation-title">{t('offerte.promptInterpretationTitle')}</span>
      <div className="prompt-interpretation-chips">
        {items.map((item, index) => (
          <span
            key={`${item.kind}-${item.label}-${index}`}
            className={`prompt-interpretation-chip prompt-interpretation-${item.kind}`}
            title={kindLabels[item.kind]}
          >
            <span className="prompt-interpretation-kind">{kindLabels[item.kind]}</span>
            <span className="prompt-interpretation-value">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

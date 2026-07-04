import type { JobOffer, SearchCommand } from './types'
import { promptSearchTerms } from './promptTerms'

export { promptSearchTerms, promptInterpretationItems, promptInterpretationLabels, inferAllowedRolesFromPrompt } from './promptTerms'

export function offerRelevanceScore(offer: JobOffer, terms: string[]): number {
  if (!terms.length) return 100
  const hay = `${offer.role} ${offer.company} ${offer.location ?? ''} ${offer.status_reason ?? ''}`.toLowerCase()
  let best = 0
  for (const term of terms) {
    if (!term) continue
    if (hay.includes(term)) {
      best = Math.max(best, 100)
      continue
    }
    const words = term.split(/\s+/).filter((w) => w.length > 2)
    if (words.length && words.every((w) => hay.includes(w))) {
      best = Math.max(best, 85)
      continue
    }
    if (words.length) {
      const matched = words.filter((w) => hay.includes(w)).length
      best = Math.max(best, Math.round((matched / words.length) * 70))
    }
  }
  return best
}

export function offerPromptRelevanceScore(offer: JobOffer, command: SearchCommand | undefined): number {
  const ai = offer.web_dev_fit != null && offer.web_dev_fit > 0 ? offer.web_dev_fit : 50
  const text = offerRelevanceScore(offer, promptSearchTerms(command))
  return Math.max(ai, text)
}

export const PROMPT_MATCH_SCORE_YES = 85
export const PROMPT_MATCH_SCORE_UNCLASSIFIED = 65
export const PROMPT_MATCH_SCORE_NO = 25
export const PROMPT_MATCH_MIN_SCORE = PROMPT_MATCH_SCORE_UNCLASSIFIED

export function offerMatchesPromptIntent(offer: { web_dev_fit?: number }): boolean {
  const score = offer.web_dev_fit ?? 0
  if (score > 0 && score <= PROMPT_MATCH_SCORE_NO) return false
  if (score >= PROMPT_MATCH_MIN_SCORE || score >= 92 || score === 55) return true
  return false
}

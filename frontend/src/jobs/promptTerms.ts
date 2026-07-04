import type { SearchCommand, PostedWithin, WorkMode } from './types'
import { POSTED_OPTIONS } from './searchFilterOptions'

export type PromptInterpretationItem = {
  kind: 'role' | 'location' | 'period' | 'title'
  label: string
}

function expandRoleTerms(roles: string[]): string[] {
  const expanded: string[] = []
  const seen = new Set<string>()
  for (const role of roles) {
    for (const chunk of role.split(/[,;/|]+/)) {
      const term = chunk.trim().toLowerCase()
      if (!term || term.length < 3 || seen.has(term)) continue
      seen.add(term)
      expanded.push(term)
    }
    const whole = role.trim().toLowerCase()
    if (whole && !seen.has(whole)) {
      seen.add(whole)
      expanded.push(whole)
    }
  }
  return expanded
}

function cleanPromptPhrase(text: string): string {
  return text.trim().replace(/\s+/g, ' ').replace(/[.,;:!?]+$/g, '').toLowerCase()
}

export function inferAllowedRolesFromPrompt(prompt: string): string[] {
  const cleaned = cleanPromptPhrase(prompt)
  if (!cleaned) return []
  return [cleaned]
}

export function promptSearchTerms(command: SearchCommand | undefined): string[] {
  if (!command) return []
  const roles = expandRoleTerms(command.allowed_roles.map((r) => r.trim()).filter(Boolean))
  if (roles.length) return roles
  const prompt = cleanPromptPhrase(command.prompt_text || '')
  if (prompt) return [prompt]
  return []
}

function postedWithinLabel(value: PostedWithin): string | null {
  if (!value || value === 'any') return null
  return POSTED_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function postedPeriodLabel(command: SearchCommand): string | null {
  const days = command.posted_within_days
  if (days != null && days > 0) {
    if (days === 1) return 'Ultimo giorno'
    return `Ultimi ${days} giorni`
  }
  return postedWithinLabel(command.posted_within)
}

function workModePrefix(workMode: WorkMode | undefined): string | null {
  if (!workMode || workMode === 'any') return null
  return { remote: 'Remoto', hybrid: 'Ibrido', onsite: 'In sede' }[workMode]
}

function compactAreasLabel(areas: string[]): string {
  const cleaned = areas.map((v) => v.trim()).filter(Boolean)
  if (!cleaned.length) return ''
  if (cleaned.length === 1) return cleaned[0]

  const composite = cleaned.find((a) => a.includes(','))
  if (composite) return composite

  const ascii = cleaned.filter((a) => /^[\x00-\x7F]+$/.test(a))
  if (ascii.length >= 2) {
    const sorted = [...ascii].sort((a, b) => a.length - b.length)
    return `${sorted[0]}, ${sorted[sorted.length - 1]}`
  }

  return cleaned.slice(0, 2).join(', ')
}

function compactLocationSummary(command: SearchCommand): string | null {
  const rules = command.location_rules || []
  if (rules.length) {
    const parts = rules.map((rule) => {
      const base = compactAreasLabel(rule.areas)
      const prefix = workModePrefix(rule.work_mode)
      return prefix && base ? `${prefix} · ${base}` : base
    }).filter(Boolean)
    if (!parts.length) return null
    return parts.join(' oppure ')
  }

  const remoteAreas = (command.remote_only_areas || []).map((v) => v.trim()).filter(Boolean)
  const remoteKeys = new Set(remoteAreas.map((v) => v.toLowerCase()))
  const onsiteLocations = command.locations.filter((loc) => {
    const key = loc.trim().toLowerCase()
    return key && !remoteKeys.has(key) && !remoteAreas.some((area) => {
      const areaKey = area.toLowerCase()
      return key.includes(areaKey) || areaKey.includes(key)
    })
  })

  const segments: string[] = []
  const onsite = compactAreasLabel(onsiteLocations)
  if (onsite) segments.push(onsite)
  const remote = compactAreasLabel(remoteAreas)
  if (remote) segments.push(`Remoto · ${remote}`)
  return segments.length ? segments.join(' oppure ') : null
}

export function promptInterpretationItems(command: SearchCommand | undefined): PromptInterpretationItem[] {
  if (!command) return []
  const items: PromptInterpretationItem[] = []

  const roles = command.allowed_roles.map((r) => r.trim()).filter(Boolean)
  if (roles.length === 1) {
    items.push({ kind: 'role', label: roles[0].toLowerCase() })
  } else if (roles.length > 1) {
    items.push({ kind: 'role', label: roles.map((r) => r.toLowerCase()).join(' oppure ') })
  }

  const location = compactLocationSummary(command)
  if (location) items.push({ kind: 'location', label: location })

  const titleKeywords = (command.title_keywords || []).map((value) => value.trim()).filter(Boolean)
  if (titleKeywords.length) {
    items.push({ kind: 'title', label: titleKeywords.join(' oppure ') })
  }

  const period = postedPeriodLabel(command)
  if (period) items.push({ kind: 'period', label: period })

  if (items.length) return items
  const prompt = cleanPromptPhrase(command.prompt_text || '')
  if (prompt && !titleKeywords.length) items.push({ kind: 'role', label: prompt })
  return items
}

export function promptInterpretationLabels(command: SearchCommand | undefined): string[] {
  return promptInterpretationItems(command).map((item) => item.label)
}

export interface LlmOperationStats {
  operation: string
  calls: number
  cost_usd: number
}

export interface LlmRecentCall {
  operation: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  created_at: string
}

export interface LlmStats {
  configured: boolean
  ready: boolean
  reason: string
  access_message: string
  provider: string
  model: string
  monthly_budget_usd: number
  month_spend_usd: number
  month_remaining_usd: number | null
  today_spend_usd: number
  today_remaining_usd: number | null
  month_calls: number
  today_calls: number
  budget_exceeded: boolean
  budget_ceiling_usd: number
  daily_budget_usd: number
  max_daily_calls: number
  parse_prompt_enabled: boolean
  discover_company_enabled: boolean
  auto_discover_enabled: boolean
  by_operation: LlmOperationStats[]
  recent: LlmRecentCall[]
}

export interface LlmControlsUpdate {
  parse_prompt_enabled?: boolean
  discover_company_enabled?: boolean
  auto_discover_enabled?: boolean
}

import { useState } from 'react'
import type { LlmControlsUpdate, LlmStats } from '../types/llm'
import { formatUsd, formatUsdSpend } from '../formatUsd'
import './AiCreditsPanel.css'

interface Props {
  stats: LlmStats | null
  onRefresh: () => void
  onBudgetChange: (budget: number) => Promise<void>
  onControlsChange: (controls: LlmControlsUpdate) => Promise<void>
  embedded?: boolean
}

function formatOpLabel(op: string): string {
  if (op === 'parse_prompt') return 'Analisi prompt'
  if (op === 'discover_company') return 'Discovery azienda'
  if (op === 'map_apply_form') return 'Compilazione form'
  if (op === 'map_apply_form_retry') return 'Compilazione campi mancanti'
  if (op === 'learn_profile_summary') return 'Aggiornamento bio'
  if (op === 'learn_profile_summary_cv') return 'Bio da CV'
  if (op === 'classify_roles') return 'Affinita ruoli'
  if (op === 'analyze_job_url') return 'Job posting analysis'
  if (op === 'classify_offers') return 'Pertinenza prompt'
  if (op === 'rag_assistant') return 'Assistente RAG'
  if (op.startsWith('embed_')) return 'Embedding vettoriale'
  if (op === 'auto_discover') return 'Scoperta automatica'
  return op.replace(/_/g, ' ')
}

export function AiCreditsPanel({ stats, onRefresh, onBudgetChange, onControlsChange, embedded }: Props) {
  const [budgetInput, setBudgetInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingControl, setSavingControl] = useState<string | null>(null)

  if (!stats) return null

  const budgetPercent = stats.monthly_budget_usd > 0
    ? Math.min(100, (stats.month_spend_usd / stats.monthly_budget_usd) * 100)
    : 0

  const saveBudget = async () => {
    const value = parseFloat(budgetInput.replace(',', '.'))
    if (Number.isNaN(value) || value < 0) return
    setSaving(true)
    try {
      await onBudgetChange(value)
      setBudgetInput('')
    } finally {
      setSaving(false)
    }
  }

  const toggleControl = async (key: keyof LlmControlsUpdate, value: boolean) => {
    setSavingControl(key)
    try {
      await onControlsChange({ [key]: value })
    } finally {
      setSavingControl(null)
    }
  }

  const ceilingLabel = formatUsd(stats.budget_ceiling_usd)

  return (
    <section className={`ai-credits-panel ${embedded ? 'ai-credits-embedded' : ''}`}>
      <div className="ai-credits-header">
        <div>
          {!embedded && <h2>Controllo Gemini AI</h2>}
          <p className="ai-credits-sub">
            {stats.ready
              ? `${stats.model} · ${formatUsd(stats.month_remaining_usd ?? 0)} disponibili questo mese`
              : 'Configura chiave API e budget sul server'}
          </p>
        </div>
        <button type="button" className="ai-refresh-btn" onClick={onRefresh}>
          Aggiorna
        </button>
      </div>

      <div className="ai-credits-grid">
        <div className="ai-stat-card">
          <span className="ai-stat-value">{formatUsdSpend(stats.today_spend_usd)}</span>
          <span className="ai-stat-label">Speso oggi</span>
          <span className="ai-stat-meta">{stats.today_calls} chiamate</span>
        </div>
        <div className="ai-stat-card">
          <span className="ai-stat-value">{formatUsdSpend(stats.month_spend_usd)}</span>
          <span className="ai-stat-label">Speso questo mese</span>
          <span className="ai-stat-meta">{stats.month_calls} chiamate</span>
        </div>
        <div className="ai-stat-card">
          <span className="ai-stat-value">
            {stats.month_remaining_usd != null ? formatUsd(stats.month_remaining_usd) : '—'}
          </span>
          <span className="ai-stat-label">Budget residuo</span>
          <span className="ai-stat-meta">su {formatUsd(stats.monthly_budget_usd)}</span>
        </div>
        <div className="ai-stat-card">
          <span className="ai-stat-value">{ceilingLabel}</span>
          <span className="ai-stat-label">Tetto massimo</span>
          <span className="ai-stat-meta">configurato in .env</span>
        </div>
      </div>

      {stats.monthly_budget_usd > 0 && (
        <div className="ai-budget-progress">
          <div className="ai-budget-progress-top">
            <span>Utilizzo mensile</span>
            <span>{Math.round(budgetPercent)}%</span>
          </div>
          <div className="ai-budget-bar">
            <div className="ai-budget-fill" style={{ width: `${budgetPercent}%` }} />
          </div>
        </div>
      )}

      {(stats.daily_budget_usd > 0 || stats.max_daily_calls > 0) && (
        <div className="ai-limits-row">
          {stats.daily_budget_usd > 0 && (
            <span>
              Oggi {formatUsdSpend(stats.today_spend_usd)} / {formatUsd(stats.daily_budget_usd)}
              {stats.today_remaining_usd != null && ` · restano ${formatUsd(stats.today_remaining_usd)}`}
            </span>
          )}
          {stats.max_daily_calls > 0 && (
            <span>Chiamate oggi {stats.today_calls} / {stats.max_daily_calls}</span>
          )}
        </div>
      )}

      {stats.access_message && !stats.ready && (
        <div className="ai-callout ai-callout-warn">{stats.access_message}</div>
      )}

      <div className="ai-callout ai-callout-info">
        Limite interno app, non il credito Google. Ricarica su{' '}
        <a href="https://aistudio.google.com/billing" target="_blank" rel="noopener noreferrer">
          Google AI Studio
        </a>
        .
      </div>

      <div className="ai-controls-section">
        <h3>Operazioni consentite</h3>
        <div className="ai-controls-grid">
          <label className="ai-control-item">
            <input
              type="checkbox"
              checked={stats.parse_prompt_enabled}
              disabled={savingControl === 'parse_prompt_enabled'}
              onChange={(e) => toggleControl('parse_prompt_enabled', e.target.checked)}
            />
            <span>Analisi prompt</span>
          </label>
          <label className="ai-control-item">
            <input
              type="checkbox"
              checked={stats.discover_company_enabled}
              disabled={savingControl === 'discover_company_enabled'}
              onChange={(e) => toggleControl('discover_company_enabled', e.target.checked)}
            />
            <span>Discovery azienda</span>
          </label>
          <label className="ai-control-item ai-control-danger">
            <input
              type="checkbox"
              checked={stats.auto_discover_enabled}
              disabled={savingControl === 'auto_discover_enabled'}
              onChange={(e) => toggleControl('auto_discover_enabled', e.target.checked)}
            />
            <span>Scoperta automatica</span>
          </label>
        </div>
      </div>

      <div className="ai-budget-row">
        <input
          className="ai-budget-input"
          type="text"
          inputMode="decimal"
          placeholder={`Budget mensile USD (max ${ceilingLabel.replace('$', '')})`}
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveBudget()}
        />
        <button type="button" className="ai-budget-save" onClick={saveBudget} disabled={saving}>
          {saving ? 'Salvo...' : 'Imposta'}
        </button>
      </div>

      {stats.by_operation.length > 0 && (
        <div className="ai-table-block">
          <h3>Riepilogo per operazione</h3>
          <table className="ai-table">
            <thead>
              <tr>
                <th>Operazione</th>
                <th>Chiamate</th>
                <th>Costo</th>
              </tr>
            </thead>
            <tbody>
              {stats.by_operation.map((op) => (
                <tr key={op.operation}>
                  <td>{formatOpLabel(op.operation)}</td>
                  <td>{op.calls}</td>
                  <td className="ai-table-num">{formatUsdSpend(op.cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.recent.length > 0 && (
        <div className="ai-table-block">
          <h3>Ultime chiamate</h3>
          <table className="ai-table">
            <thead>
              <tr>
                <th>Operazione</th>
                <th>Token</th>
                <th>Costo</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((call, i) => (
                <tr key={`${call.created_at}-${i}`}>
                  <td>{formatOpLabel(call.operation)}</td>
                  <td className="ai-table-num">{call.input_tokens + call.output_tokens}</td>
                  <td className="ai-table-num">{formatUsdSpend(call.cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

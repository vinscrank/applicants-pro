import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlatformPageHeader } from '../layout/PlatformPageHeader'
import { UpgradeGate } from '../offerte/components/UpgradeGate'
import { billingApi, type BillingStatus } from '../billing/api'
import { vectorApi, type AssistantResponse, type VectorStatus } from '../vector/api'
import '../offerte/offerte-theme.css'
import './assistant.css'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources?: AssistantResponse['sources']
}

export function AssistantView({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [status, setStatus] = useState<VectorStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const starterQuestions = useMemo(
    () => [
      t('assistant.starter1'),
      t('assistant.starter2'),
      t('assistant.starter3'),
      t('assistant.starter4'),
    ],
    [t],
  )

  useEffect(() => {
    billingApi.status().then(setBilling).catch(() => setBilling(null)).finally(() => setBillingLoading(false))
    vectorApi.status().then(setStatus).catch(() => setStatus(null)).finally(() => setStatusLoading(false))
  }, [])

  const canUse = billing?.features.offerte_live === true
  const vectorReady = status?.enabled === true

  const sendQuestion = useCallback(async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || loading || !vectorReady) return
    if (trimmed.length < 3) {
      setError(t('assistant.questionTooShort'))
      return
    }
    setError('')
    setInfo('')
    setQuestion('')
    const userMessage: ChatMessage = { id: `${Date.now()}-u`, role: 'user', text: trimmed }
    setMessages((current) => [...current, userMessage])
    setLoading(true)
    try {
      const response = await vectorApi.ask(trimmed)
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          text: response.answer,
          sources: response.sources,
        },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('assistant.askFailed'))
    } finally {
      setLoading(false)
    }
  }, [loading, t, vectorReady])

  const handleReindex = useCallback(async () => {
    setReindexing(true)
    setError('')
    setInfo('')
    try {
      const result = await vectorApi.reindex()
      setInfo(t('assistant.reindexSuccess', {
        profile: result.profile_indexed ? t('assistant.profileOk') : t('assistant.profileMissing'),
        count: result.applications_indexed,
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('assistant.reindexFailed'))
    } finally {
      setReindexing(false)
    }
  }, [t])

  if (billingLoading) {
    return <div className="assistant-shell"><p className="assistant-muted">{t('common.loading')}</p></div>
  }

  if (!canUse) {
    return (
      <div className="assistant-shell candidature-view">
        <UpgradeGate />
      </div>
    )
  }

  const statusMessage = statusLoading
    ? t('assistant.vectorLoading')
    : vectorReady
      ? t('assistant.vectorActive', {
          model: status?.embedding_model ?? '',
          features: status?.features.join(', ') ?? '',
        })
      : t('assistant.vectorUnavailable')

  return (
    <div className="assistant-shell candidature-view">
      {!embedded && (
      <PlatformPageHeader
        title={t('assistant.title')}
        subtitle={t('assistant.subtitle')}
      />
      )}

      <section className="assistant-toolbar card">
        <div className="assistant-toolbar-copy">
          <h2>{t('assistant.knowledgeBase')}</h2>
          <p>{statusMessage}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleReindex} disabled={reindexing || !vectorReady}>
          {reindexing ? t('assistant.reindexing') : t('assistant.reindex')}
        </button>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {info && <div className="success-banner">{info}</div>}

      <section className="assistant-chat card">
        <div className="assistant-starters">
          {starterQuestions.map((item) => (
            <button
              key={item}
              type="button"
              className="assistant-starter-btn"
              onClick={() => sendQuestion(item)}
              disabled={loading || !vectorReady}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="assistant-messages" aria-live="polite">
          {messages.length === 0 && (
            <p className="assistant-empty">{t('assistant.emptyChat')}</p>
          )}
          {messages.map((message) => (
            <article key={message.id} className={`assistant-message assistant-message-${message.role}`}>
              <p>{message.text}</p>
              {message.sources && message.sources.length > 0 && (
                <ul className="assistant-sources">
                  {message.sources.map((source) => (
                    <li key={`${source.doc_type}-${source.source_key}`}>
                      {source.title} · {source.doc_type}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
          {loading && <p className="assistant-muted">{t('assistant.generating')}</p>}
        </div>

        <form
          className="assistant-composer"
          onSubmit={(event) => {
            event.preventDefault()
            sendQuestion(question)
          }}
        >
          <textarea
            className="assistant-textarea"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                if (!loading && vectorReady) sendQuestion(question)
              }
            }}
            placeholder={t('assistant.placeholder')}
            rows={3}
            disabled={loading}
            aria-label={t('assistant.placeholder')}
          />
          <div className="assistant-composer-bar">
            <span className="assistant-send-hint">{t('assistant.sendHint')}</span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !question.trim() || !vectorReady}
            >
              {t('assistant.ask')}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

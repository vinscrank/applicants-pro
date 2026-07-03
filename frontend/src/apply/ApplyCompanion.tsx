import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { profileToAutofillPayload } from '../auth/types'
import {
  finalizeCompanionApplication,
  dismissCompanionOffer,
  isCompanionCompleted,
  isExtensionAvailable,
  readCompanionContext,
  requestAutofill,
} from './extensionBridge'
import './apply-companion.css'

interface CopyField {
  key: string
  label: string
  value: string
}

export function ApplyCompanion() {
  const { profile, loading } = useAuth()
  const [status, setStatus] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null)
  const [autofillLoading, setAutofillLoading] = useState(false)
  const [finalizeLoading, setFinalizeLoading] = useState(false)
  const [dismissLoading, setDismissLoading] = useState(false)
  const [completed, setCompleted] = useState(() => isCompanionCompleted())
  const [stepInfo, setStepInfo] = useState<{
    requiredTotal: number
    requiredFilled: number
    requiredMissing: string[]
    hasNext: boolean
    hasSubmit: boolean
  } | null>(null)
  const context = useMemo(() => readCompanionContext(), [])
  const offerLabel = context?.label ?? ''
  const applyUrl = context?.applyUrl ?? ''
  const canDismiss = Boolean(context?.offerId)
  const extensionReady = isExtensionAvailable()

  const openFormTab = () => {
    if (!applyUrl) return
    window.open(applyUrl, '_blank')
    setStatus({
      kind: 'info',
      text: extensionReady
        ? 'Form aperto. Vai su quella tab, attendi il caricamento, poi usa Compila con AI.'
        : 'Form aperto. Copia i campi da questa finestra e incollali nel form.',
    })
  }

  const fields: CopyField[] = useMemo(() => {
    if (!profile) return []
    const p = profileToAutofillPayload(profile)
    return [
      { key: 'full_name', label: 'Nome completo', value: p.full_name },
      { key: 'first_name', label: 'Nome', value: p.first_name },
      { key: 'last_name', label: 'Cognome', value: p.last_name },
      { key: 'email', label: 'Email', value: p.email },
      { key: 'phone', label: 'Telefono', value: p.phone },
      { key: 'city', label: 'Città', value: p.city },
      { key: 'country', label: 'Paese', value: p.country },
      { key: 'address_line', label: 'Indirizzo', value: p.address_line },
      { key: 'headline', label: 'Titolo', value: p.headline },
      { key: 'linkedin_url', label: 'LinkedIn', value: p.linkedin_url },
      { key: 'github_url', label: 'GitHub', value: p.github_url },
      { key: 'website_url', label: 'Sito web', value: p.website_url },
      { key: 'portfolio_url', label: 'Portfolio', value: p.portfolio_url },
      { key: 'work_authorization', label: 'Permesso lavoro', value: p.work_authorization },
      { key: 'years_experience', label: 'Anni esperienza', value: p.years_experience },
      { key: 'skills', label: 'Competenze', value: p.skills },
      { key: 'summary', label: 'Bio', value: p.summary },
    ].filter((f) => f.value)
  }, [profile])

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setStatus({ kind: 'ok', text: `${label} copiato` })
    } catch {
      setStatus({ kind: 'err', text: 'Copia non riuscita' })
    }
  }

  const autofill = async () => {
    if (!profile) return
    setAutofillLoading(true)
    setStatus({ kind: 'info', text: 'AI in analisi del form ATS...' })
    const result = await requestAutofill(profileToAutofillPayload(profile))
    setAutofillLoading(false)
    if (result.step) setStepInfo(result.step)
    setStatus({
      kind: result.ok ? 'ok' : 'err',
      text: result.message,
    })
  }

  const markCompleted = async () => {
    setFinalizeLoading(true)
    setStatus(null)
    try {
      await finalizeCompanionApplication()
      setCompleted(true)
      setStatus({ kind: 'ok', text: 'Candidatura registrata come inviata nel tracker.' })
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Registrazione non riuscita',
      })
    } finally {
      setFinalizeLoading(false)
    }
  }

  const dismissOffer = async () => {
    setDismissLoading(true)
    setStatus(null)
    try {
      await dismissCompanionOffer()
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Impossibile scartare l\'offerta',
      })
      setDismissLoading(false)
    }
  }

  if (loading) {
    return <div className="companion-shell"><p>Caricamento profilo...</p></div>
  }

  if (!profile) {
    return <div className="companion-shell"><p>Accedi per usare il companion.</p></div>
  }

  return (
    <div className="companion-shell">
      <header className="companion-header">
        <h1>Companion candidatura</h1>
        <p>Finestra affiancata all&apos;app. Continua a navigare Offerte Live nella finestra principale.</p>
        <p>
          {extensionReady
            ? 'Form multi-step: 1. Apri form · 2. Compila con AI · 3. Avanti/Next · 4. Ripeti · 5. Invia · 6. Conferma qui'
            : '1. Apri il form · 2. Copia i campi · 3. Invia · 4. Conferma qui sotto'}
        </p>
        {!extensionReady && (
          <p className="companion-extension-warn">Estensione non attiva: imposta l&apos;Extension ID nel profilo per usare Compila con AI.</p>
        )}
        {offerLabel && <div className="companion-offer">{offerLabel}</div>}
      </header>

      <div className="companion-actions">
        {applyUrl && (
          <button type="button" className="companion-open-form" onClick={openFormTab}>
            Apri form candidatura
          </button>
        )}
        {extensionReady && (
          <button type="button" className="companion-autofill" onClick={autofill} disabled={autofillLoading}>
            {autofillLoading ? 'Compilazione AI...' : 'Compila con AI (tab form)'}
          </button>
        )}
        <button
          type="button"
          className="companion-complete"
          onClick={markCompleted}
          disabled={finalizeLoading || completed || dismissLoading}
        >
          {completed ? 'Candidatura registrata' : finalizeLoading ? 'Registrazione...' : 'Ho completato la candidatura'}
        </button>
        {canDismiss && (
          <button
            type="button"
            className="companion-dismiss"
            onClick={dismissOffer}
            disabled={dismissLoading || finalizeLoading || completed}
          >
            {dismissLoading ? 'Scarto in corso...' : 'Scarta offerta'}
          </button>
        )}
      </div>

      {stepInfo && (
        <div className="companion-step card">
          <strong>Step corrente</strong>
          <p>
            Obbligatori compilati: {stepInfo.requiredFilled}/{stepInfo.requiredTotal}
            {stepInfo.hasNext ? ' · Clicca Avanti nel form e ricompila' : ''}
            {stepInfo.hasSubmit ? ' · Pronto per invio (controlla prima di submit)' : ''}
          </p>
          {stepInfo.requiredMissing.length > 0 && (
            <p className="companion-step-missing">
              Da completare: {stepInfo.requiredMissing.join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="companion-fields">
        {fields.map((field) => (
          <div key={field.key} className="companion-field">
            <div className="companion-field-top">
              <label>{field.label}</label>
              <button type="button" className="companion-copy" onClick={() => copy(field.value, field.label)}>
                Copia
              </button>
            </div>
            <div className="companion-value">{field.value}</div>
          </div>
        ))}
      </div>

      {status && <p className={`companion-status ${status.kind}`}>{status.text}</p>}
    </div>
  )
}

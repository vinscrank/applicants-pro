import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authApi } from '../auth/api'
import { dataApi } from '../data/api'
import { useAuth } from '../auth/AuthContext'
import { EMPTY_PROFILE_FORM, profileToForm, type ProfileFormData } from '../auth/types'
import { ProfileField } from './ProfileField'
import {
  IconBriefcase,
  IconCalendar,
  IconCode,
  IconFlag,
  IconGitHub,
  IconGlobe,
  IconHome,
  IconLinkedIn,
  IconMapPin,
  IconPhone,
  IconPortfolio,
  IconShield,
  IconText,
  IconUser,
} from './ProfileIcons'
import { PageLayout } from '@/layout/PageLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const EXTENSION_ID_KEY = 'candidature_extension_id'

const textareaClass =
  'flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'

export function ProfileView({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation()
  const { profile, setProfile, user } = useAuth()
  const [form, setForm] = useState<ProfileFormData>(EMPTY_PROFILE_FORM)
  const [extensionId, setExtensionId] = useState(localStorage.getItem(EXTENSION_ID_KEY) || '')
  const [saving, setSaving] = useState(false)
  const [exportingDb, setExportingDb] = useState(false)
  const [importingDb, setImportingDb] = useState(false)
  const [cvUploading, setCvUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) setForm(profileToForm(profile))
  }, [profile])

  const update = (key: keyof ProfileFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await authApi.updateProfile(form)
      setProfile(updated)
      if (updated.profile_complete) {
        setMessage(t('profile.successComplete'))
      } else {
        setMessage(t('profile.successIncomplete'))
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.genericSave'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 8000)
    return () => window.clearTimeout(timer)
  }, [message])

  const saveExtensionId = () => {
    localStorage.setItem(EXTENSION_ID_KEY, extensionId.trim())
    setMessage('ID estensione salvato')
  }

  const uploadCv = async (file: File | null) => {
    if (!file) return
    setCvUploading(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await authApi.uploadCv(file)
      setProfile(updated)
      setForm(profileToForm(updated))
      setMessage('CV caricato. La bio viene arricchita automaticamente dal contenuto del CV.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload CV fallito')
    } finally {
      setCvUploading(false)
    }
  }

  const removeCv = async () => {
    setCvUploading(true)
    setError(null)
    try {
      const updated = await authApi.deleteCv()
      setProfile(updated)
      setMessage('CV rimosso')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rimozione CV fallita')
    } finally {
      setCvUploading(false)
    }
  }

  const exportDatabase = async () => {
    setExportingDb(true)
    setError(null)
    setMessage(null)
    try {
      await dataApi.exportDatabase()
      setMessage('Backup database scaricato')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Esportazione fallita')
    } finally {
      setExportingDb(false)
    }
  }

  const importDatabase = async (file: File | null) => {
    if (!file) return
    const confirmed = window.confirm(
      'Importare questo backup sostituisce tutti i dati nel database locale (candidature, profilo, offerte, impostazioni). Continuare?',
    )
    if (!confirmed) return
    setImportingDb(true)
    setError(null)
    setMessage(null)
    try {
      await dataApi.importDatabase(file)
      setMessage('Database importato. Ricarica la pagina se qualcosa non si aggiorna.')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Importazione fallita')
    } finally {
      setImportingDb(false)
    }
  }

  const content = (
    <>
      {error && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}
      {message && !error && (
        <div
          className={cn(
            'rounded-md border px-4 py-3 text-sm',
            profile?.profile_complete
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800'
              : 'border-border bg-muted text-foreground',
          )}
          role="status"
        >
          {message}
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Dati personali</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ProfileField id="first_name" label="Nome" icon={<IconUser />}>
              <Input id="first_name" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
            </ProfileField>
            <ProfileField id="last_name" label="Cognome" icon={<IconUser />}>
              <Input id="last_name" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
            </ProfileField>
            <ProfileField id="phone" label="Telefono" icon={<IconPhone />}>
              <Input id="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+39 333 1234567" />
            </ProfileField>
            <ProfileField id="nationality" label="Nazionalità" icon={<IconFlag />}>
              <Input id="nationality" value={form.nationality} onChange={(e) => update('nationality', e.target.value)} placeholder="Italiana" />
            </ProfileField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Ubicazione</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ProfileField id="city" label="Città" icon={<IconMapPin />}>
              <Input id="city" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Città" />
            </ProfileField>
            <ProfileField id="country" label="Paese" icon={<IconGlobe />}>
              <Input id="country" value={form.country} onChange={(e) => update('country', e.target.value)} placeholder="Paese" />
            </ProfileField>
            <ProfileField id="address_line" label="Indirizzo" icon={<IconHome />}>
              <Input id="address_line" value={form.address_line} onChange={(e) => update('address_line', e.target.value)} />
            </ProfileField>
            <ProfileField id="work_authorization" label="Permesso di lavoro" icon={<IconShield />}>
              <Input id="work_authorization" value={form.work_authorization} onChange={(e) => update('work_authorization', e.target.value)} placeholder="Stamp 1, EU citizen..." />
            </ProfileField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Link professionali</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ProfileField id="linkedin_url" label="LinkedIn" icon={<IconLinkedIn />}>
              <Input id="linkedin_url" value={form.linkedin_url} onChange={(e) => update('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
            </ProfileField>
            <ProfileField id="github_url" label="GitHub" icon={<IconGitHub />}>
              <Input id="github_url" value={form.github_url} onChange={(e) => update('github_url', e.target.value)} placeholder="https://github.com/username" />
            </ProfileField>
            <ProfileField id="website_url" label="Sito web" icon={<IconGlobe />}>
              <Input id="website_url" value={form.website_url} onChange={(e) => update('website_url', e.target.value)} placeholder="https://tuosito.com" />
            </ProfileField>
            <ProfileField id="portfolio_url" label="Portfolio" icon={<IconPortfolio />}>
              <Input id="portfolio_url" value={form.portfolio_url} onChange={(e) => update('portfolio_url', e.target.value)} placeholder="https://behance.net/..." />
            </ProfileField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">CV e bio allenata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileField id="cv_upload" label="Curriculum (PDF/DOC)" icon={<IconBriefcase />}>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="cv_upload"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  disabled={cvUploading}
                  onChange={(e) => uploadCv(e.target.files?.[0] ?? null)}
                  className="max-w-full cursor-pointer file:mr-3"
                />
                {profile?.has_cv && (
                  <Button type="button" variant="outline" size="sm" onClick={removeCv} disabled={cvUploading}>
                    Rimuovi CV
                  </Button>
                )}
              </div>
              {profile?.cv_filename && (
                <p className="mt-1 text-xs text-muted-foreground">File: {profile.cv_filename}</p>
              )}
            </ProfileField>
            <ProfileField id="summary" label="Bio allenata (AI)" icon={<IconText />}>
              <textarea
                id="summary"
                className={textareaClass}
                value={form.summary}
                onChange={(e) => update('summary', e.target.value)}
                placeholder="Si aggiorna automaticamente ad ogni compilazione form e dopo il caricamento del CV. Puoi modificarla manualmente."
              />
            </ProfileField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Carriera</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ProfileField id="headline" label="Titolo professionale" icon={<IconBriefcase />}>
              <Input id="headline" value={form.headline} onChange={(e) => update('headline', e.target.value)} placeholder="Frontend Engineer" />
            </ProfileField>
            <ProfileField id="years_experience" label="Anni di esperienza" icon={<IconCalendar />}>
              <Input id="years_experience" type="number" min="0" value={form.years_experience} onChange={(e) => update('years_experience', e.target.value)} />
            </ProfileField>
            <ProfileField id="skills" label="Competenze" icon={<IconCode />}>
              <Input id="skills" value={form.skills} onChange={(e) => update('skills', e.target.value)} placeholder="React, TypeScript, Flutter" />
            </ProfileField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Estensione Chrome autofill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Installa l&apos;estensione dalla cartella <code className="rounded bg-muted px-1 py-0.5 text-xs">extension/</code>, poi incolla qui il suo ID da chrome://extensions.
            </p>
            <ProfileField id="extension_id" label="Extension ID" icon={<IconCode />}>
              <Input id="extension_id" value={extensionId} onChange={(e) => setExtensionId(e.target.value)} placeholder="abcdefghijklmnopqrstuvwxyz123456" />
            </ProfileField>
            <Button type="button" variant="secondary" onClick={saveExtensionId}>
              Salva ID estensione
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Backup database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esporta o importa tutti i dati locali: candidature, profilo, ricerche offerte, scarti e impostazioni. Utile per spostare il progetto su un altro computer.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={exportDatabase} disabled={exportingDb || importingDb}>
                {exportingDb ? 'Esportazione...' : 'Esporta database'}
              </Button>
              <Button type="button" variant="outline" disabled={exportingDb || importingDb} asChild>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".sql,application/sql,text/plain"
                    disabled={exportingDb || importingDb}
                    className="sr-only"
                    onChange={(e) => {
                      void importDatabase(e.target.files?.[0] ?? null)
                      e.target.value = ''
                    }}
                  />
                  {importingDb ? 'Importazione...' : 'Importa database'}
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? t('profile.saving') : t('profile.saveProfile')}
        </Button>
      </div>
    </>
  )

  if (embedded) return content

  return (
    <PageLayout
      title={t('profile.title')}
      description={t('profile.descriptionWithEmail', { email: user?.email ?? '' })}
      actions={
        <Badge variant={profile?.profile_complete ? 'default' : 'secondary'}>
          {profile?.profile_complete ? t('profile.complete') : t('profile.incomplete')}
        </Badge>
      }
      width="lg"
    >
      {content}
    </PageLayout>
  )
}

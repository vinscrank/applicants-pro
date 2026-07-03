import { useCallback, useEffect, useRef, useState } from 'react'
import { offerteFetchHtml } from '../offerte/api'

type FrameMode = 'live' | 'preview'

interface Props {
  url: string
  onOpenLive?: () => void
}

function isFrameBlocked(doc: Document | null | undefined): boolean {
  if (!doc?.body) return true
  const text = doc.body.innerText || ''
  if (!doc.body.children.length && text.trim().length < 20) return true
  return /refused to connect|X-Frame-Options|frame ancestors|cannot display|non pu[oò] essere visualizzat/i.test(text)
}

export function AnnuncioJobFrame({ url, onOpenLive }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const blobRef = useRef<string | null>(null)
  const [mode, setMode] = useState<FrameMode>('live')
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [liveBlocked, setLiveBlocked] = useState(false)
  const [frameLoading, setFrameLoading] = useState(true)

  const revokeBlob = useCallback(() => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current)
      blobRef.current = null
    }
  }, [])

  const loadPreview = useCallback(async (switchMode: boolean) => {
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const html = await offerteFetchHtml(
        `/api/offerte/page-embed?url=${encodeURIComponent(url)}`,
      )
      revokeBlob()
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const next = URL.createObjectURL(blob)
      blobRef.current = next
      setPreviewSrc(next)
      if (switchMode) setMode('preview')
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Anteprima non disponibile')
    } finally {
      setPreviewLoading(false)
    }
  }, [revokeBlob, url])

  useEffect(() => {
    setMode('live')
    setLiveBlocked(false)
    setFrameLoading(true)
    setPreviewError(null)
    revokeBlob()
    setPreviewSrc(null)
    void loadPreview(false)
  }, [url, loadPreview, revokeBlob])

  useEffect(() => () => revokeBlob(), [revokeBlob])

  const handleLiveLoad = useCallback(() => {
    setFrameLoading(false)
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument
      if (doc && isFrameBlocked(doc)) {
        setLiveBlocked(true)
        if (previewSrc) setMode('preview')
        else void loadPreview(true)
        return
      }
      setLiveBlocked(false)
    } catch {
      setLiveBlocked(false)
    }
  }, [loadPreview, previewSrc])

  const handlePreviewLoad = useCallback(() => {
    setFrameLoading(false)
  }, [])

  const openExternal = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
    onOpenLive?.()
  }

  const switchToLive = () => {
    setMode('live')
    setFrameLoading(true)
  }

  const reloadFrame = () => {
    setFrameLoading(true)
    if (mode === 'live') {
      const iframe = iframeRef.current
      if (iframe) iframe.src = url
      return
    }
    void loadPreview(true)
  }

  const iframeSrc = mode === 'live' ? url : previewSrc || 'about:blank'

  return (
    <div className="annuncio-frame">
      <div className="annuncio-frame-toolbar">
        <div className="annuncio-frame-tabs">
          <button
            type="button"
            className={`annuncio-frame-tab${mode === 'live' ? ' is-active' : ''}`}
            onClick={switchToLive}
          >
            Pagina live
          </button>
          <button
            type="button"
            className={`annuncio-frame-tab${mode === 'preview' ? ' is-active' : ''}`}
            onClick={() => {
              if (previewSrc) setMode('preview')
              else void loadPreview(true)
            }}
            disabled={previewLoading}
          >
            {previewLoading ? 'Anteprima...' : 'Anteprima'}
          </button>
        </div>
        <div className="annuncio-frame-toolbar-actions">
          <button type="button" className="annuncio-frame-tool" onClick={reloadFrame}>
            Ricarica
          </button>
          <button type="button" className="annuncio-frame-tool" onClick={openExternal}>
            Nuova scheda
          </button>
        </div>
      </div>

      {liveBlocked && mode === 'preview' && (
        <div className="annuncio-frame-notice">
          Il sito blocca l&apos;incorporamento nel frame. Stai vedendo l&apos;anteprima.
          Per candidarti usa <strong>Pagina live</strong> o <strong>Nuova scheda</strong>.
        </div>
      )}

      {previewError && mode === 'preview' && !previewSrc && (
        <div className="annuncio-frame-notice annuncio-frame-notice-error">{previewError}</div>
      )}

      <div className="annuncio-frame-viewport">
        {frameLoading && (
          <div className="annuncio-frame-loading" aria-busy="true">
            <span className="spinner" />
            Caricamento pagina...
          </div>
        )}
        <iframe
          ref={iframeRef}
          title="Annuncio di lavoro"
          className="annuncio-frame-iframe"
          src={iframeSrc}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-downloads"
          onLoad={mode === 'live' ? handleLiveLoad : handlePreviewLoad}
        />
      </div>
    </div>
  )
}

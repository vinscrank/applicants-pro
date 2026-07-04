import { ExternalLink, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  url: string
  onOpenLive?: () => void
}

function isFrameBlocked(iframe: HTMLIFrameElement): boolean {
  try {
    const href = iframe.contentWindow?.location.href ?? ''
    if (href.startsWith('chrome-error://') || href.startsWith('about:blank')) {
      return href.startsWith('chrome-error://')
    }
  } catch {
    return false
  }

  const doc = iframe.contentDocument
  if (!doc?.body) return false
  const text = doc.body.innerText || ''
  if (!doc.body.children.length && text.trim().length < 20) return false
  return /refused to connect|X-Frame-Options|frame ancestors|cannot display|non pu[oò] essere visualizzat/i.test(text)
}

export function JobPostingFrame({ url, onOpenLive }: Props) {
  const { t } = useTranslation()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const retryCountRef = useRef(0)
  const [liveBlocked, setLiveBlocked] = useState(false)
  const [frameLoading, setFrameLoading] = useState(true)

  useEffect(() => {
    retryCountRef.current = 0
    setLiveBlocked(false)
    setFrameLoading(true)
  }, [url])

  const assignFrameSrc = useCallback((targetUrl: string) => {
    const iframe = iframeRef.current
    if (!iframe) return
    iframe.src = targetUrl
  }, [])

  const handleLiveLoad = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    window.setTimeout(() => {
      const blocked = isFrameBlocked(iframe)
      if (blocked && retryCountRef.current < 1) {
        retryCountRef.current += 1
        setLiveBlocked(false)
        setFrameLoading(true)
        window.setTimeout(() => assignFrameSrc(url), 250)
        return
      }

      setFrameLoading(false)
      setLiveBlocked(blocked)
    }, 150)
  }, [assignFrameSrc, url])

  const openExternal = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
    onOpenLive?.()
  }

  const reloadFrame = () => {
    retryCountRef.current = 0
    setFrameLoading(true)
    setLiveBlocked(false)
    assignFrameSrc(url)
  }

  return (
    <div className="job-posting-frame">
      <div className="job-posting-frame-toolbar">
        <span className="job-posting-frame-label">{t('jobPosting.frameLive')}</span>
        <div className="job-posting-frame-toolbar-actions">
          <button
            type="button"
            className="job-posting-frame-tool job-posting-frame-tool-icon"
            onClick={reloadFrame}
            aria-label={t('jobPosting.frameReload')}
          >
            <RefreshCw aria-hidden />
          </button>
          <button type="button" className="job-posting-frame-tool job-posting-frame-tool-primary" onClick={openExternal}>
            <ExternalLink aria-hidden />
            {t('jobPosting.frameOpenTab')}
          </button>
        </div>
      </div>

      {liveBlocked && (
        <div className="job-posting-frame-notice">
          <p>{t('jobPosting.frameBlocked')}</p>
          <button type="button" className="job-posting-frame-notice-action" onClick={openExternal}>
            {t('jobPosting.frameOpenTab')}
          </button>
        </div>
      )}

      <div className="job-posting-frame-viewport">
        {frameLoading && (
          <div className="job-posting-frame-loading" aria-busy="true">
            <span className="spinner" />
            {t('jobPosting.frameLoading')}
          </div>
        )}
        <iframe
          key={url}
          ref={iframeRef}
          title={t('jobPosting.frameTitle')}
          className="job-posting-frame-iframe"
          src={url}
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-downloads"
          onLoad={handleLiveLoad}
        />
      </div>
    </div>
  )
}

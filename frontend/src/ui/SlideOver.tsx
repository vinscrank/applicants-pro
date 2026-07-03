import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

const closeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export function SlideOver({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="ui-slide-over-backdrop" onClick={onClose} />
      <aside className="ui-slide-over" role="dialog" aria-modal="true" aria-label={title}>
        <header className="ui-slide-over-header">
          <h2 className="ui-slide-over-title">{title}</h2>
          <button type="button" className="ui-slide-over-close" onClick={onClose} aria-label="Chiudi">
            {closeIcon}
          </button>
        </header>
        <div className="ui-slide-over-body">{children}</div>
        {footer && <footer className="ui-slide-over-footer">{footer}</footer>}
      </aside>
    </>
  )
}

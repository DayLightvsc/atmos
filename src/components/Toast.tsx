import { useEffect } from 'react'
import { t } from '../lib/i18n'
import type { ToastMessage } from '../lib/types'
import { CloseIcon } from './Icons'

interface ToastProps {
  message: ToastMessage | null
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(onDismiss, 7000)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className={`toast ${message.tone === 'warn' ? 'is-warn' : ''}`} role="status" aria-live="polite">
      <span className="toast-mark" aria-hidden="true" />
      <div className="toast-copy">
        <p className="toast-title">{message.title}</p>
        {message.detail && <p className="toast-detail">{message.detail}</p>}
      </div>
      <button type="button" className="icon-btn toast-close" onClick={onDismiss} aria-label={t('toast.dismiss')}>
        <CloseIcon size={14} />
      </button>
    </div>
  )
}

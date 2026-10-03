import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { CheckIcon, CloseIcon } from '../icons'

const ToastContext = createContext(null)
const DURATION = 6000

/**
 * One toast at a time, announced politely. Sits above the mobile bottom bar.
 * show({ message, action?: { label, to } | { label, onClick } })
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()

  const hide = useCallback(() => setToast(null), [])
  const show = useCallback((t) => {
    clearTimeout(timer.current)
    setToast({ ...t, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), t.duration || DURATION)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const value = useMemo(() => ({ show, hide }), [show, hide])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastView toast={toast} onClose={hide} />
    </ToastContext.Provider>
  )
}

function ToastView({ toast, onClose }) {
  const { t } = useI18n()
  const action = toast?.action
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bar-h)+env(safe-area-inset-bottom)+0.75rem)] z-[80] flex justify-center px-4 md:bottom-6"
    >
      {toast && (
        <div
          key={toast.key}
          role="status"
          className="dk-toast on-dark pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-card border border-gold/50 bg-ink py-2 pr-2 pl-4 text-cream shadow-overlay"
        >
          <CheckIcon className="h-6 w-6 shrink-0 text-gold" />
          <p className="min-w-0 flex-1 font-bold">{toast.message}</p>
          {action &&
            (action.to ? (
              <Link to={action.to} onClick={onClose} className="inline-flex min-h-12 shrink-0 items-center rounded-control px-3 font-bold text-gold-light underline underline-offset-4">
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  action.onClick()
                  onClose()
                }}
                className="inline-flex min-h-12 shrink-0 items-center rounded-control px-3 font-bold text-gold-light underline underline-offset-4"
              >
                {action.label}
              </button>
            ))}
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="grid h-12 w-12 shrink-0 place-items-center rounded-control text-muted hover:bg-white/10">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

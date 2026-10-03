import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useModal, usePresence } from '../../hooks/useModal'
import { CloseIcon } from '../icons'

const DURATION = 300
const SWIPE_CLOSE_PX = 110
const SWIPE_CLOSE_VELOCITY = 0.6 // px per ms

/**
 * Bottom sheet on phones, side panel from 768px.
 * role="dialog" + aria-modal, focus trap, Esc closes, focus returns to the opener,
 * page scroll is locked, the mobile bottom bar hides, and on phones the top strip
 * (handle + title) can be dragged down to close.
 *   footer: sticky area under the scrolling body (e.g. "Add to cart ₹549")
 */
export default function Sheet({ open, onClose, title, children, footer }) {
  const { t } = useI18n()
  const [mounted, shown] = usePresence(open, DURATION)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const drag = useRef(null)
  const [dragY, setDragY] = useState(0)
  const titleId = useId()

  useModal(open && mounted, { ref: panelRef, onClose, initialFocusRef: closeRef })

  if (!mounted) return null

  const isPhone = () => !window.matchMedia('(min-width: 768px)').matches
  const onPointerDown = (e) => {
    if (!isPhone() || e.target.closest('button')) return
    drag.current = { y: e.clientY, time: performance.now() }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (drag.current) setDragY(Math.max(0, e.clientY - drag.current.y))
  }
  const onPointerEnd = (e) => {
    if (!drag.current) return
    const dy = Math.max(0, e.clientY - drag.current.y)
    const velocity = dy / Math.max(1, performance.now() - drag.current.time)
    drag.current = null
    setDragY(0)
    if (dy > SWIPE_CLOSE_PX || velocity > SWIPE_CLOSE_VELOCITY) onClose()
  }

  const dragging = dragY > 0
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/60 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={dragging ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        className={`absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-overlay bg-cream shadow-overlay outline-none transition-transform duration-300 ease-out-soft md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[480px] md:rounded-none ${
          shown ? 'translate-x-0 translate-y-0' : 'translate-y-full md:translate-x-full md:translate-y-0'
        }`}
      >
        <div
          className="shrink-0 touch-none border-b border-line px-5 pt-2 pb-3 md:touch-auto md:pt-4"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <div aria-hidden="true" className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-control-line md:hidden" />
          <div className="flex items-center gap-3">
            <h2 id={titleId} className="t-h3 min-w-0 flex-1">
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-control px-3 font-bold text-brown transition-colors hover:bg-champagne"
            >
              <CloseIcon className="h-6 w-6" />
              <span className="t-small font-bold">{t('common.close')}</span>
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line bg-cream px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}

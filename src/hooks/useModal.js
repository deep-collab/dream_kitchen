import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/* ---------- open-overlay counter (the mobile bottom bar hides while > 0) ---------- */
let openCount = 0
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useAnyOverlayOpen = () => useSyncExternalStore(subscribe, () => openCount > 0, () => false)

/* ---------- scroll lock that also holds on iOS Safari ---------- */
let lockDepth = 0
let savedY = 0
function lockScroll() {
  if (lockDepth++ > 0) return
  savedY = window.scrollY
  Object.assign(document.body.style, { position: 'fixed', top: `-${savedY}px`, left: '0', right: '0', width: '100%' })
}
function unlockScroll() {
  if (--lockDepth > 0) return
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '' })
  window.scrollTo({ top: savedY, behavior: 'instant' })
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog behaviour shared by Sheet and MobileMenu: traps Tab inside `ref`, closes on
 * Esc, locks page scroll, makes the app behind it inert, and returns focus to
 * whatever opened it.
 */
export function useModal(open, { ref, onClose, initialFocusRef }) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const app = document.getElementById('dk-app')
    lockScroll()
    app?.setAttribute('inert', '')
    openCount += 1
    emit()

    const focusFirst = () => {
      const target = initialFocusRef?.current || ref.current?.querySelector(FOCUSABLE) || ref.current
      target?.focus({ preventScroll: true })
    }
    const raf = requestAnimationFrame(focusFirst)

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || !ref.current.contains(document.activeElement))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      app?.removeAttribute('inert')
      unlockScroll()
      openCount -= 1
      emit()
      if (opener && opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [open, ref, initialFocusRef])
}

/**
 * Keeps a component mounted while its exit transition plays.
 * Returns [mounted, shown]: render while `mounted`, apply the open styles while `shown`.
 */
export function usePresence(open, duration = 280) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      // two frames: the closed styles must paint once before the open styles apply
      let inner
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true))
      })
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
      }
    }
    setShown(false)
    const timer = setTimeout(() => setMounted(false), duration)
    return () => clearTimeout(timer)
  }, [open, duration])
  return [mounted, shown]
}

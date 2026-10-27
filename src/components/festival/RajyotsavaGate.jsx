import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useRajyotsava } from '../../context/MenuProvider'

// The popup itself is its own small file, fetched only while the offer is live
const RajyotsavaPopup = lazy(() => import('./RajyotsavaPopup'))

// Once per visit (this tab's session): not again when moving between pages, again on a new visit
const SEEN_KEY = 'dk_raj_popup'
let seenOnThisPage = false
const seen = () => {
  if (seenOnThisPage) return true
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}
const markSeen = () => {
  seenOnThisPage = true
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* storage blocked: still once on this page */
  }
}
// Never over paying or a booking in progress (the next page of the visit gets it instead)
const QUIET = /^\/(checkout|pay|order|classes\/book)/

/**
 * Kannada Rajyotsava: decides when the popup shows. Every new visit while the offer is live, once
 * the page is up (and after the first-visit loading screen), never on the admin (its own page) and
 * never from the phone's saved copy of the offers: only once /api/menu has said it is live, so an
 * offer Hema just turned off never pops up.
 */
export default function RajyotsavaGate() {
  const raj = useRajyotsava()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const wanted = Boolean(raj?.fresh) && !QUIET.test(pathname) && !open && !seen()

  useEffect(() => {
    if (!wanted) return undefined
    let timer = 0
    const go = () => {
      // The page first; the loading screen (first visit) finishes before the popup comes
      if (!window.__dkReady || document.documentElement.classList.contains('dk-intro-on')) return void (timer = setTimeout(go, 250))
      markSeen()
      setOpen(true)
    }
    timer = setTimeout(go, 600)
    return () => clearTimeout(timer)
  }, [wanted])

  if (!open || !raj) return null
  return (
    <Suspense fallback={null}>
      <RajyotsavaPopup offer={raj} onClose={() => setOpen(false)} />
    </Suspense>
  )
}

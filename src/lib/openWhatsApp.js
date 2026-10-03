/**
 * Opens a wa.me link in a new tab. Call it directly inside the tap or submit
 * handler, before any await, or phone browsers treat it as a pop-up and block it.
 * Returns false when the browser blocked it (the page then shows its fallback).
 */
export function openWhatsApp(url) {
  const win = window.open(url, '_blank')
  if (!win) return false
  try {
    win.opener = null
  } catch {
    /* some browsers don't allow this once the tab has left our site; harmless */
  }
  return true
}

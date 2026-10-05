import { useCallback, useEffect, useState } from 'react'
import { getOrder } from '../services'
import { phoneForOrder, rememberOrder } from '../lib/deviceStore'
import { normaliseOrderId } from '../lib/orderId'

/**
 * One order for the Pay and confirmation pages. Works after a reload: the phone number it was
 * placed with is remembered on this phone (src/lib/deviceStore.js); on another phone the page
 * asks for it (lookup(phone)).
 *   status: 'loading' | 'ok' | 'needPhone' | 'notFound' | 'error'
 */
export function useOrder(codeParam, initialOrder = null) {
  const code = normaliseOrderId(codeParam)
  const [state, setState] = useState(() => (initialOrder?.code === code ? { status: 'ok', order: initialOrder, error: null } : { status: 'loading', order: null, error: null }))

  const lookup = useCallback(
    async (phone) => {
      setState((s) => ({ ...s, status: s.order ? 'ok' : 'loading' }))
      const r = await getOrder(code, phone)
      if (r.ok) {
        rememberOrder(code, phone)
        setState({ status: 'ok', order: r.data.order, error: null })
      } else setState({ status: r.error === 'notFound' || r.error === 'badRequest' ? 'notFound' : 'error', order: null, error: r })
      return r
    },
    [code],
  )

  useEffect(() => {
    const phone = phoneForOrder(code)
    if (!phone) {
      if (!initialOrder) setState({ status: 'needPhone', order: null, error: null })
      return
    }
    lookup(phone) // fresh status, even when the page already has the order
  }, [code, lookup, initialOrder])

  const update = useCallback((order) => setState({ status: 'ok', order, error: null }), [])
  return { code, ...state, lookup, update, phone: phoneForOrder(code) }
}

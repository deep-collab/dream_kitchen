import { useCallback, useRef, useState } from 'react'
import { startRazorpay, verifyRazorpay } from '../../services'

let script = null
function loadRazorpay() {
  script ||= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = resolve
    s.onerror = () => {
      script = null
      reject(new Error('razorpay'))
    }
    document.head.appendChild(s)
  })
  return script
}

/**
 * Razorpay Checkout for an order (DK-…) or a class booking (DK-CL-…). The server makes the
 * Razorpay order for the saved amount; the payment counts only after the server checks its
 * signature (or Razorpay's webhook confirms it).
 *   pay(): opens the Razorpay window. Closing it, or a failed card, leaves the order unpaid and
 *   the customer can simply tap Pay again (the same Razorpay order is reused).
 *   state: 'idle' | 'opening' | 'open' | 'verifying'
 *   problem: null | 'notFinished' | 'failed' | 'onlineFailed' | 'checkLater' | { error } (server)
 */
export function useRazorpay({ code, phone, onPaid }) {
  const [state, setState] = useState('idle')
  const [problem, setProblem] = useState(null)
  const paid = useRef(false)

  const pay = useCallback(async () => {
    if (state !== 'idle') return
    setProblem(null)
    setState('opening')
    const r = await startRazorpay(code, phone)
    if (!r.ok) {
      setState('idle')
      return setProblem(r)
    }
    try {
      await loadRazorpay()
    } catch {
      /* handled below */
    }
    if (!window.Razorpay) {
      setState('idle')
      return setProblem('onlineFailed')
    }
    const d = r.data
    const rzp = new window.Razorpay({
      key: d.keyId,
      order_id: d.razorpayOrderId,
      amount: d.amount,
      currency: d.currency,
      name: d.name,
      description: d.description,
      prefill: d.prefill,
      theme: { color: '#0F0F0F' },
      modal: {
        // Closed without paying: nothing was charged, and the button works again
        ondismiss: () => {
          if (paid.current) return
          setState('idle')
          setProblem((p) => (p === 'failed' ? p : 'notFinished'))
        },
      },
      handler: async (resp) => {
        paid.current = true
        setState('verifying')
        const v = await verifyRazorpay({ code, phone, razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature })
        setState('idle')
        if (v.ok) onPaid(v.data)
        // The money went through but we couldn't confirm it here (signal lost): the webhook will
        else setProblem('checkLater')
      },
    })
    rzp.on('payment.failed', () => setProblem('failed'))
    setState('open')
    rzp.open()
  }, [state, code, phone, onPaid])

  return { pay, state, problem, busy: state !== 'idle' }
}

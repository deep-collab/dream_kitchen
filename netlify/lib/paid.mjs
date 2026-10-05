// Marks an order paid by Razorpay (from the checkout callback or the webhook). Safe to call twice.
export async function markPaidByRazorpay(store, row, paymentId) {
  if (row.payment_status === 'confirmed' || row.status !== 'placed') return row
  return store.adminUpdateOrder(
    row.order_code,
    { status: 'payment_confirmed', payment_status: 'confirmed', payment_method: 'razorpay', razorpay_payment_id: paymentId },
    { kind: 'status', to_status: 'payment_confirmed', by: 'razorpay', note: `Razorpay ${paymentId}` },
  )
}

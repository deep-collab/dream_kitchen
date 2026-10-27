import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminCall } from './api'
import { day, ErrorText, formatINR, Loading, useAdminData } from './ui'
import { site } from '../config/site'
import { formatPhone } from '../lib/validation'

/**
 * A clean page to print and put in the box (or stick on it): where it goes, in big letters, and
 * what is inside with every choice. No prices (it travels with the parcel). The buttons don't print.
 */
export default function PackingSlip() {
  const { code } = useParams()
  const { data, error } = useAdminData(() => adminCall('order', { code }), [code])
  const o = data?.order
  useEffect(() => {
    document.title = o ? `Packing slip ${o.code}` : 'Packing slip'
  }, [o])
  if (error) return <ErrorText>{error}</ErrorText>
  if (!o) return <Loading />
  const a = o.address
  return (
    <div className="min-h-dvh bg-white text-black print:min-h-0" data-admin-packing-slip>
      <style>{'@media print { @page { margin: 12mm } .no-print { display: none !important } body { background: #fff } }'}</style>
      <div className="no-print sticky top-0 flex flex-wrap gap-2 border-b border-line bg-cream px-4 py-3">
        <Link to={`/orders/${o.code}`} className="inline-flex min-h-12 items-center rounded-control border-[1.5px] border-brown px-4 font-bold">
          Back to the order
        </Link>
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-12 items-center rounded-control bg-ink px-5 font-bold text-gold-light" data-admin-print>
          Print
        </button>
      </div>
      <div className="mx-auto max-w-2xl p-6 font-body">
        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="font-wordmark text-2xl">Dream Kitchen</p>
            <p className="text-sm">Turning your cravings into sweet memories · WhatsApp {site.phone.display}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold whitespace-nowrap tabular-nums">{o.code}</p>
            <p className="text-sm whitespace-nowrap">Dispatch {day(o.dispatchDate)}</p>
          </div>
        </div>

        <section className="mt-5 rounded border-2 border-black p-4">
          <p className="text-sm font-bold tracking-wide uppercase">Ship to</p>
          <p className="mt-1 text-2xl font-bold">{o.name}</p>
          <p className="text-xl leading-snug">
            {a.line1}
            <br />
            {a.line2}
            {a.landmark && (
              <>
                <br />
                Landmark: {a.landmark}
              </>
            )}
            <br />
            {a.city} – <strong>{a.pincode}</strong>
            <br />
            {a.state}
          </p>
          <p className="mt-2 text-xl font-bold">Phone: {formatPhone(o.phone)}</p>
        </section>

        <section className="mt-5">
          <p className="text-sm font-bold tracking-wide uppercase">In this parcel</p>
          <table className="mt-2 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1 pr-2">Item</th>
                <th className="w-16 py-1 text-right">Qty</th>
                <th className="w-40 py-1 pl-2 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i, n) => (
                <tr key={n} className="border-b border-gray-400 align-top">
                  <td className="py-2 pr-2">
                    <strong>{i.name.en}</strong>
                    {i.size && ` · ${i.size.label}`}
                    {i.ragi && ' · Ragi'}
                    {i.nameOnBox && <div>Name on the box: “{i.nameOnBox}”</div>}
                    {i.drawing && <div>Drawing: {i.drawingText}</div>}
                  </td>
                  <td className="py-2 text-right text-lg font-bold">{i.qty}</td>
                  <td className="py-2 pl-2 text-right tabular-nums" data-admin-slip-price>
                    {i.offer && (
                      <>
                        <s className="block text-sm">{formatINR(i.regularLineTotal)}</s>
                        <span className="block text-sm font-bold">{i.offer.label?.en || 'Offer'}</span>
                      </>
                    )}
                    <strong>{formatINR(i.lineTotal)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-2 ml-auto max-w-xs text-right">
            {o.savings && (
              <>
                <div className="flex justify-between gap-4">
                  <dt>Regular price</dt>
                  <dd className="tabular-nums">{formatINR(o.savings.regularSubtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4 font-bold" data-admin-slip-saving>
                  <dt>{o.savings.labels.map((l) => l.en).join(', ')}</dt>
                  <dd className="tabular-nums">−{formatINR(o.savings.saved)}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between gap-4">
              <dt>Items</dt>
              <dd className="tabular-nums">{formatINR(o.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Courier</dt>
              <dd className="tabular-nums">{formatINR(o.courier)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-black font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatINR(o.total)}</dd>
            </div>
          </dl>
          {o.notes && (
            <p className="mt-3">
              <strong>Customer’s note:</strong> {o.notes}
            </p>
          )}
        </section>

        <p className="mt-8 border-t border-black pt-2 text-sm">From: Dream Kitchen · {site.phone.display} · Thank you for ordering!</p>
      </div>
    </div>
  )
}

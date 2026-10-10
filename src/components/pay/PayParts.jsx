import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { formatINR, upiLink } from '../../lib/pricing'
import { copyText } from '../../lib/clipboard'
import { errorText } from '../../lib/api'
import Button from '../ui/Button'
import { useToast } from '../ui/Toast'
import { AlertIcon, CopyIcon, WalletIcon } from '../icons'
import 'virtual:dk-strings/pay'

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

/**
 * The UPI fallback (only while Razorpay isn't set up): Hema's QR code, a "Pay with a UPI app"
 * button on phones (upi://pay with the amount and the code filled in), and her UPI ID to copy.
 */
export function UpiBox({ upi, amount, code }) {
  const { t } = useI18n()
  const toast = useToast()
  const [phoneUi] = useState(isPhone)
  const total = formatINR(amount)
  return (
    <section className="rounded-card border border-line bg-[#fffcf5] p-4 sm:p-5">
      {upi.upiQr && (
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <img src={upi.upiQr} alt={t('pay.qrAlt')} width="200" height="200" className="h-48 w-48 shrink-0 rounded-control border border-line bg-white object-contain p-2" />
          <p>{t('pay.scan', { price: total })}</p>
        </div>
      )}
      {phoneUi && (
        <Button href={upiLink({ upiId: upi.upiId, name: upi.upiName, amount, orderCode: code })} icon={WalletIcon} size="lg" fullWidth className={upi.upiQr ? 'mt-4' : ''} data-dk-upi>
          {t('pay.app', { price: total })}
        </Button>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-control bg-champagne px-4 py-2">
        <span>
          <span className="t-small block text-brown-2">{t('pay.upiId')}</span>
          <span className="font-bold break-all">{upi.upiId}</span>
        </span>
        <button
          type="button"
          onClick={async () => (await copyText(upi.upiId)) && toast.show({ message: t('pay.upiCopied') })}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-control px-3 font-bold underline underline-offset-4"
        >
          <CopyIcon className="h-5 w-5" />
          {t('pay.copyUpi')}
        </button>
      </div>
      <p className="t-small mt-3 text-brown-2">{t('pay.amountNote', { price: total, code })}</p>
    </section>
  )
}

/** "Card, UPI or net banking, through Razorpay." and what went wrong with the last try, in plain words */
export function RazorpayNote({ problem }) {
  const { t } = useI18n()
  const text = !problem ? null : typeof problem === 'string' ? t(`pay.${problem}`) : errorText(t, problem)
  return (
    <div className="space-y-3">
      {text && (
        <p role="alert" className="flex items-start gap-2 rounded-control border-[1.5px] border-error bg-error-bg p-3 font-bold" data-dk-pay-problem={typeof problem === 'string' ? problem : problem.error}>
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <span>{text}</span>
        </p>
      )}
      <p className="t-small text-brown-2">{t('pay.secure')}</p>
    </div>
  )
}

/** The Pay button's words while Razorpay is opening, open or confirming */
export const razorpayLabel = (t, state, total) => (state === 'opening' || state === 'open' ? t('pay.opening') : state === 'verifying' ? t('pay.verifying') : t('pay.payNow', { price: total }))

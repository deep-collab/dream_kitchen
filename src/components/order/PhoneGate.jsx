import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { site } from '../../config/site'
import { phoneError } from '../../lib/validation'
import Button from '../ui/Button'
import { PhoneField } from '../ui/TextField'
import 'virtual:dk-strings/order'
import 'virtual:dk-strings/track'

/** On a phone that didn't place the order: ask for the number it was placed with */
export default function PhoneGate({ onLookup, notFound }) {
  const { t } = useI18n()
  const [phone, setPhone] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const err = phoneError(phone)
  const submit = async (e) => {
    e.preventDefault()
    setTried(true)
    if (err) return
    setBusy(true)
    await onLookup(phone)
    setBusy(false)
  }
  return (
    <form noValidate onSubmit={submit} className="max-w-md space-y-4">
      <p>{t('order.needPhone')}</p>
      <PhoneField id="gate-phone" label={t('track.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} error={tried && err ? t(`track.errors.phone.${err}`) : undefined} />
      {notFound && (
        <p role="alert" className="font-bold text-error">
          {t('order.notFound', { phone: site.phone.display })}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? t('track.checking') : t('order.show')}
      </Button>
    </form>
  )
}

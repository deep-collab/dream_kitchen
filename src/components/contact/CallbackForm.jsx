import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { createCallback } from '../../services'
import { loadDetails } from '../../lib/deviceStore'
import { NAME_MAX } from '../../lib/order'
import { openWhatsApp } from '../../lib/openWhatsApp'
import { formatPhone, phoneError, tidyPhoneInput } from '../../lib/validation'
import { CALLBACK_TIMES, callbackWhatsAppUrl } from '../../lib/whatsappMessage'
import Button from '../ui/Button'
import Chip from '../ui/Chip'
import TextField, { PhoneField } from '../ui/TextField'
import { CheckIcon, InfoIcon } from '../icons'

/**
 * "Request a call back": phone (required), name (optional), a time chip (optional).
 * Sending opens WhatsApp with the request for Hema and shows a confirmation with a
 * way to reopen WhatsApp or simply call. services.createCallback keeps a copy
 * (Stage B: Supabase `callbacks`, listed in the admin panel).
 *   onDone: shows a "Done" button on the confirmation (e.g. to close a sheet)
 */
export default function CallbackForm({ onDone }) {
  const { t, lang } = useI18n()
  const uid = useId()
  const ids = { phone: `${uid}-phone`, name: `${uid}-name`, time: `${uid}-time` }
  const [saved] = useState(loadDetails)
  const [phone, setPhone] = useState(tidyPhoneInput(saved?.phone || ''))
  const [name, setName] = useState(saved?.name || '')
  const [time, setTime] = useState(null)
  const [touched, setTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sent, setSent] = useState(null)
  const doneRef = useRef(null)

  const code = phoneError(phone)
  const error = (touched || submitted) && code ? t(`callback.errors.phone.${code}`) : undefined

  useEffect(() => {
    if (sent) doneRef.current?.focus()
  }, [sent])

  const onSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    if (code) {
      document.getElementById(ids.phone)?.focus()
      return
    }
    const request = { phone, name, time }
    const url = callbackWhatsAppUrl(request)
    const opened = openWhatsApp(url) // first, inside the tap, so the browser allows it
    createCallback({ ...request, lang })
    setSent({ phone: formatPhone(phone), time, url, opened })
  }

  // The browser blocked the WhatsApp tab: nothing has happened yet, so say so and
  // make "Open WhatsApp" the next step (never "ready in WhatsApp")
  if (sent && !sent.opened) {
    return (
      <div>
        <h3 ref={doneRef} tabIndex={-1} className="t-h3 flex items-start gap-2.5 outline-none">
          <InfoIcon className="mt-1 h-7 w-7 shrink-0" />
          <span>{t('callback.blockedTitle')}</span>
        </h3>
        <p className="t-lead mt-3">{t('callback.blockedText')}</p>
        <div className="mt-6 grid gap-3">
          <Button variant="whatsapp" size="lg" href={sent.url} fullWidth>
            {t('callback.openWhatsApp')}
          </Button>
          <Button variant="call" fullWidth>
            {t('callOptions.call')}
          </Button>
        </div>
        {onDone && (
          <Button variant="secondary" fullWidth className="mt-5" onClick={onDone}>
            {t('common.close')}
          </Button>
        )}
      </div>
    )
  }

  if (sent) {
    return (
      <div>
        <h3 ref={doneRef} tabIndex={-1} className="t-h3 flex items-start gap-2.5 outline-none">
          <CheckIcon className="mt-1 h-7 w-7 shrink-0" />
          <span>{t('callback.doneTitle')}</span>
        </h3>
        <p className="t-lead mt-3">
          {sent.time ? t('callback.doneTextWhen', { phone: sent.phone, when: t(`callback.when.${sent.time}`) }) : t('callback.doneText', { phone: sent.phone })}
        </p>
        <div className="mt-6 rounded-card bg-champagne p-5">
          <p className="font-bold">{t('callback.notOpened')}</p>
          <div className="mt-3 grid gap-3">
            <Button variant="whatsapp" href={sent.url} fullWidth>
              {t('callback.openAgain')}
            </Button>
            <Button variant="call" fullWidth>
              {t('callOptions.call')}
            </Button>
          </div>
        </div>
        {onDone && (
          <Button variant="secondary" fullWidth className="mt-5" onClick={onDone}>
            {t('callback.done')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      <p className="text-brown-2">{t('callback.intro')}</p>
      <PhoneField
        id={ids.phone}
        label={t('callback.phone')}
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onBlur={() => {
          setTouched(true)
          setPhone(tidyPhoneInput)
        }}
        error={error}
      />
      <TextField id={ids.name} label={t('callback.name')} optional autoComplete="name" maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} />
      <div role="group" aria-labelledby={ids.time} aria-describedby={`${ids.time}-hint`}>
        <p id={ids.time} className="leading-snug font-bold">
          {t('callback.time')}
          <span className="t-small ml-2 font-normal text-brown-2">({t('common.optional')})</span>
        </p>
        <p id={`${ids.time}-hint`} className="t-small mt-1 text-brown-2">
          {t('callback.timeHint')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CALLBACK_TIMES.map((k) => (
            <Chip key={k} selected={time === k} onClick={() => setTime(time === k ? null : k)}>
              {t(`callback.times.${k}`)}
            </Chip>
          ))}
        </div>
      </div>
      <Button type="submit" variant="whatsapp" size="lg" fullWidth>
        {t('callback.submit')}
      </Button>
    </form>
  )
}

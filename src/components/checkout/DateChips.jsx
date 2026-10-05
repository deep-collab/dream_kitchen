import { useId } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { dateParts, formatDay } from '../../lib/dates'
import Badge from '../ui/Badge'
import TextField from '../ui/TextField'
import { AlertIcon, CheckIcon, DateIcon } from '../icons'
import 'virtual:dk-strings/checkout'

const chip =
  'flex h-full min-h-14 items-center justify-center rounded-control border-[1.5px] border-control-line bg-[#fffdf8] px-2 pt-4 pb-2.5 text-center leading-tight transition-colors hover:border-brown-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-cream peer-focus-visible:shadow-[0_0_0_3px_var(--color-ink)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-gold'

/**
 * "Preferred dispatch date": the next allowed dates as big chips (earliest marked), plus
 * "Pick another date" with a native date input that can't go earlier than the
 * earliest date. Real radio inputs underneath, so arrow keys and screen readers
 * work natively. Sundays and closed dates never appear (src/lib/dates.js).
 *   value: 'YYYY-MM-DD' | ''   mode: 'chip' | 'other'
 *   onChange({ date, mode })   onOtherBlur()
 */
export default function DateChips({ name, choices, earliest, latest, value, mode, onChange, onOtherBlur, error, hint }) {
  const { t } = useI18n()
  const names = t('dates')
  const uid = useId()
  const hintId = `${uid}-hint`
  const errId = `${uid}-error`
  const groupError = mode === 'chip' ? error : undefined
  const describedBy = [groupError && errId, hintId].filter(Boolean).join(' ')

  return (
    <fieldset id={`${name}-group`} className="scroll-mt-28">
      <legend className="w-full text-[1.125rem] font-bold">{t('checkout.dispatchTitle')}</legend>
      <p id={hintId} className="t-small mt-1 text-brown-2">
        {hint}
      </p>
      {groupError && (
        <p id={errId} className="t-small mt-3 flex items-start gap-2 font-bold text-error">
          <AlertIcon className="mt-[0.15em] h-5 w-5 shrink-0" />
          {groupError}
        </p>
      )}

      <ul className={`mt-5 grid grid-cols-3 gap-x-2 gap-y-4 lg:grid-cols-6 ${groupError ? 'rounded-control outline-2 outline-offset-4 outline-error outline-dashed' : ''}`}>
        {choices.map((iso, i) => {
          const p = dateParts(iso)
          const checked = mode === 'chip' && value === iso
          return (
            <li key={iso}>
              <label className="relative block h-full cursor-pointer">
                <input
                  type="radio"
                  name={name}
                  value={iso}
                  checked={checked}
                  onChange={() => onChange({ date: iso, mode: 'chip' })}
                  aria-describedby={describedBy}
                  aria-label={`${formatDay(iso, names, { year: true })}${i === 0 ? `, ${t('checkout.earliest')}` : ''}`}
                  className="peer sr-only"
                />
                <span className={`${chip} relative flex-col`}>
                  {checked && <CheckIcon className="absolute top-1.5 left-1.5 h-5 w-5" />}
                  <span className="text-base">{names.weekdays[p.weekday]}</span>
                  <span className="text-[1.125rem] font-bold [&:lang(kn)]:text-base">
                    {p.day} {names.months[p.month - 1]}
                  </span>
                </span>
                {i === 0 && (
                  <span aria-hidden="true" className="pointer-events-none absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <Badge className="px-2 leading-[1.4] ring-2 ring-cream [&:lang(kn)]:px-1.5 [&:lang(kn)]:text-[0.875rem]">{t('checkout.earliest')}</Badge>
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>

      <label className="relative mt-4 block cursor-pointer sm:inline-block">
        <input
          type="radio"
          name={name}
          value="other"
          checked={mode === 'other'}
          onChange={() => onChange({ date: value, mode: 'other' })}
          aria-describedby={hintId}
          className="peer sr-only"
        />
        <span className={`${chip} gap-2 px-4 pt-2.5 font-bold`}>
          <DateIcon className="h-5 w-5 shrink-0" />
          {t('checkout.otherDate')}
        </span>
      </label>

      {mode === 'other' && (
        <TextField
          id={`${name}-other`}
          type="date"
          className="mt-4 max-w-[20rem]"
          label={t('checkout.otherDateLabel')}
          hint={t('checkout.otherDateHint', { date: formatDay(earliest, names) })}
          min={earliest}
          max={latest}
          required
          value={value}
          onChange={(e) => onChange({ date: e.target.value, mode: 'other' })}
          onBlur={onOtherBlur}
          error={error}
        />
      )}
    </fieldset>
  )
}

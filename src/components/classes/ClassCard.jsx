import { useI18n } from '../../i18n/I18nProvider'
import { formatINR } from '../../lib/pricing'
import ProductArt from '../art/ProductArt'
import Button from '../ui/Button'
import { ClockIcon, KidsIcon, OnlineIcon, PinIcon, UsersIcon } from '../icons'
import { batchText, durationText, locationText, modeText, seatsText } from './classText'

/**
 * One class: title, what you'll learn, upcoming dates with seats left, duration,
 * mode, price, and "Book a seat" (opens the booking sheet).
 * Phones: one column with a small illustration by the title. From 768px: art on the left.
 */
export default function ClassCard({ cls, onBook }) {
  const { t, pick } = useI18n()
  const title = pick(cls.title)
  const open = cls.batches.some((b) => b.seatsLeft > 0)
  const facts = [
    [cls.mode === 'online' ? OnlineIcon : PinIcon, modeText(cls.mode, t)],
    [ClockIcon, durationText(cls.durationMinutes, t)],
    [UsersIcon, t('classes.groupSize', { count: cls.capacity })],
    ...(cls.ages ? [[KidsIcon, t('classes.ages', cls.ages)]] : []),
  ]

  return (
    <article id={cls.slug} aria-labelledby={`${cls.slug}-title`} className="card overflow-hidden md:grid md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <ProductArt kind={cls.image} variant={cls.sort} rounded="rounded-none" className="hidden h-full w-full md:block" />
      <div className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <ProductArt kind={cls.image} variant={cls.sort} className="h-20 w-20 shrink-0 md:hidden" />
          <h3 id={`${cls.slug}-title`} className="t-h3 min-w-0 self-center md:self-auto">
            {title}
          </h3>
        </div>
        <p className="mt-3 text-brown-2 md:mt-1">{pick(cls.summary)}</p>

        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {facts.map(([Icon, text]) => (
            <li key={text} className="flex items-center gap-2">
              <Icon className="h-5 w-5 shrink-0 text-brown-2" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          <span className="t-price">{formatINR(cls.price)}</span> <span className="text-brown-2">{t('classes.perPerson')}</span>
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <section aria-labelledby={`${cls.slug}-learn`}>
            <h4 id={`${cls.slug}-learn`} className="font-body text-[1.125rem] font-bold">
              {t('classes.learn')}
            </h4>
            <ul className="mt-2 space-y-1.5">
              {cls.learn.map((point) => (
                <li key={point.en} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                  <span>{pick(point)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby={`${cls.slug}-dates`}>
            <h4 id={`${cls.slug}-dates`} className="font-body text-[1.125rem] font-bold">
              {t('classes.dates')}
            </h4>
            {cls.batches.length ? (
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {cls.batches.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
                    <span>{batchText(b, t)}</span>
                    <span className={`t-small ${b.seatsLeft < 1 ? 'font-bold' : 'text-brown-2'}`}>{seatsText(b, t)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-brown-2">{t('classes.noDates')}</p>
            )}
          </section>
        </div>

        <p className="t-small mt-5 flex items-start gap-2 text-brown-2">
          <PinIcon className="mt-0.5 h-5 w-5 shrink-0" />
          {locationText(cls.mode, t)}
        </p>
        {open ? (
          <Button size="lg" className="mt-5 w-full sm:w-auto sm:min-w-60" aria-haspopup="dialog" aria-label={t('classes.bookLabel', { class: title })} onClick={() => onBook(cls)}>
            {t('classes.book')}
          </Button>
        ) : (
          <Button variant="call" className="mt-5 w-full sm:w-auto">
            {t('callOptions.call')}
          </Button>
        )}
      </div>
    </article>
  )
}

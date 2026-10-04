import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useAsync } from '../hooks/useAsync'
import { getClasses } from '../services'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import CallOptions from '../components/contact/CallOptions'
import CertificationNote from '../components/classes/CertificationNote'
import ClassCard from '../components/classes/ClassCard'
import BookingSheet from '../components/classes/BookingSheet'

const STEPS = ['pick', 'send', 'confirm']
const USER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown']

export default function Classes() {
  useSeo('classes')
  const { t } = useI18n()
  const { hash } = useLocation()
  const { data: list } = useAsync(() => getClasses(), [])
  const [sheet, setSheet] = useState({ open: false, cls: null, key: 0 })

  // /classes#slug (from the home page) scrolls to that class once the list is in. Web
  // fonts change the cards' heights as they arrive (the Kannada ones load on demand, and
  // later still on a slow phone), so it scrolls again whenever the page's layout changes
  // size. It stops once the fonts are in and the layout has been still for a second
  // (10 seconds at most), or as soon as the person scrolls or taps themselves.
  useEffect(() => {
    if (!list || !hash) return
    let alive = true
    let quiet
    const scroll = () => alive && document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start', behavior: 'instant' })
    const stop = () => {
      alive = false
      clearTimeout(quiet)
      clearTimeout(cap)
      resized?.disconnect()
      document.fonts?.removeEventListener('loadingdone', settle)
      USER_INPUT.forEach((e) => window.removeEventListener(e, stop))
    }
    const settle = () => {
      if (!alive) return
      requestAnimationFrame(scroll)
      clearTimeout(quiet)
      quiet = setTimeout(() => (!document.fonts || document.fonts.status === 'loaded' ? stop() : settle()), 1000)
    }
    const resized = typeof ResizeObserver === 'function' ? new ResizeObserver(settle) : null
    const cap = setTimeout(stop, 10000)
    settle()
    resized?.observe(document.getElementById('main'))
    document.fonts?.ready.then(settle)
    document.fonts?.addEventListener('loadingdone', settle)
    USER_INPUT.forEach((e) => window.addEventListener(e, stop, { passive: true }))
    return stop
  }, [list, hash])

  return (
    <>
      <PageHero title={t('classes.title')} subtitle={t('classes.subtitle')} />
      <Container className="py-10 lg:py-14">
        <CertificationNote className="max-w-[46rem]" />

        <section aria-labelledby="class-list-title" className="mt-10 lg:mt-14">
          <h2 id="class-list-title" className="t-h2">
            {t('classes.listTitle')}
          </h2>
          <div className="mt-6 space-y-6 lg:space-y-8" aria-busy={!list}>
            {list?.map((cls) => (
              <ClassCard key={cls.id} cls={cls} onBook={(c) => setSheet((s) => ({ open: true, cls: c, key: s.key + 1 }))} />
            ))}
          </div>
        </section>

        <section aria-labelledby="how-title" className="mt-12 lg:mt-16">
          <h2 id="how-title" className="t-h2">
            {t('classes.how.title')}
          </h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-4 md:flex-col">
                <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-[1.125rem] font-bold text-gold-light">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-body text-[1.125rem] leading-snug font-bold">{t(`classes.how.${s}.title`)}</h3>
                  <p className="mt-1 text-brown-2">{t(`classes.how.${s}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <CallOptions title={t('classes.ask.title')} text={t('classes.ask.text')} variant="feature" className="mt-12 max-w-[46rem] lg:mt-16" />
      </Container>

      <BookingSheet key={sheet.key} cls={sheet.cls} open={sheet.open} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </>
  )
}

import 'virtual:dk-strings/contact'

import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { classesEnabled, hasCallHours, site, telLink } from '../config/site'
import { formatCallHours } from '../lib/hours'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import CallbackForm from '../components/contact/CallbackForm'
import VoiceMessageButton from '../components/contact/VoiceMessageButton'
import { ClockIcon, FaqIcon, InstagramIcon, MailIcon, PhoneIcon, TruckIcon } from '../components/icons'

/**
 * Every way to reach Hema, easiest first: call, WhatsApp (or a voice message),
 * or leave a number for a call back. Email and FSSAI show only once filled in config.
 */
export default function Contact() {
  useSeo('contact')
  const { t } = useI18n()

  const more = [
    { icon: InstagramIcon, label: t('contact.instagram'), value: site.instagram.handle, href: site.instagram.url },
    site.email && { icon: MailIcon, label: t('contact.email'), value: site.email, href: `mailto:${site.email}` },
    hasCallHours() && { icon: ClockIcon, label: t('contact.hours'), value: formatCallHours(t) },
    { icon: TruckIcon, label: t('contact.delivery'), value: t('contact.deliveryText') },
    site.fssai && { icon: FaqIcon, label: t('contact.fssai'), value: site.fssai },
  ].filter(Boolean)

  return (
    <>
      <PageHero title={t('contact.title')} subtitle={t('contact.subtitle')} />
      <Container className="grid gap-6 py-10 lg:grid-cols-2 lg:items-start lg:gap-8 lg:py-14">
        <div className="grid gap-6 lg:gap-8">
          <section aria-labelledby="call-title" className="rounded-card border-2 border-ink p-5 sm:p-6">
            <h2 id="call-title" className="t-h2">
              {t('contact.call.title')}
            </h2>
            <p className="mt-2 text-brown-2">{t(classesEnabled() ? 'contact.call.textClasses' : 'contact.call.text')}</p>
            <a href={telLink} className="mt-3 inline-flex min-h-12 items-center gap-3 text-[1.5rem] font-bold tabular-nums">
              <PhoneIcon className="h-7 w-7 shrink-0" />
              {site.phone.display}
            </a>
            <Button variant="call" size="lg" fullWidth className="mt-3">
              {t('callOptions.call')}
            </Button>
            {hasCallHours() && (
              <p className="t-small mt-3 flex items-start gap-2 text-brown-2">
                <ClockIcon className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  {t('hours.label')}: {formatCallHours(t)}
                </span>
              </p>
            )}
          </section>

          <section aria-labelledby="wa-title" className="rounded-card border border-line p-5 sm:p-6">
            <h2 id="wa-title" className="t-h2">
              {t('contact.whatsapp.title')}
            </h2>
            <p className="mt-2 text-brown-2">{t('contact.whatsapp.text')}</p>
            <div className="mt-5 grid gap-3">
              <Button variant="whatsapp" size="lg" fullWidth>
                {t('mobileMenu.chat')}
              </Button>
              <VoiceMessageButton fullWidth />
            </div>
          </section>
        </div>

        <section aria-labelledby="cb-title" className="rounded-card border border-line bg-champagne p-5 sm:p-6">
          <h2 id="cb-title" className="t-h2">
            {t('contact.callback.title')}
          </h2>
          <div className="mt-4">
            <CallbackForm />
          </div>
        </section>

        <section aria-labelledby="more-title" className="lg:col-span-2">
          <h2 id="more-title" className="t-h3">
            {t('contact.more')}
          </h2>
          <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {more.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex gap-3">
                <Icon className="mt-1 h-6 w-6 shrink-0" />
                <div className="min-w-0">
                  <p className="t-small text-brown-2">{label}</p>
                  {href ? (
                    <a
                      className="link inline-flex min-h-12 items-center font-bold break-all"
                      href={href}
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="font-bold">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex flex-wrap items-center gap-x-3 text-brown-2">
            {t('contact.questions')}
            <Link to="/faq" className="link inline-flex min-h-12 items-center font-bold text-brown">
              {t('contact.faqLink')}
            </Link>
          </p>
        </section>
      </Container>
    </>
  )
}

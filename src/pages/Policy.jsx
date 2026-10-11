import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useShopStatus } from '../context/MenuProvider'
import { site } from '../config/site'
import { dateParts } from '../lib/dates'
import { policyContent, policyVars } from '../data/policies'
import Container from '../components/ui/Container'
import BusinessDetails from '../components/layout/BusinessDetails'
import { POLICY_PAGES } from '../components/layout/nav'
import 'virtual:dk-strings/policy'

/** /terms, /refund, /shipping, /privacy: the text is in src/data/policies.js (English only) */
export default function Policy({ page }) {
  useSeo(page)
  const { t, lang } = useI18n()
  const { settings } = useShopStatus()
  const doc = policyContent(page, policyVars(settings))
  const d = dateParts(site.policiesUpdated)
  const updated = `${d.day} ${t('dates').months[d.month - 1]} ${d.year}`

  return (
    <Container className="py-6 lg:py-12">
      <article className="max-w-2xl" data-dk-policy={page}>
        <h1 className="t-h2">{t(`policy.${page}`)}</h1>
        <p className="t-small mt-1 text-brown-2">{t('policy.updated', { date: updated })}</p>
        {lang === 'kn' && <p className="mt-4 rounded-control bg-champagne p-3 font-bold">{t('policy.english')}</p>}

        <div lang="en" className="mt-5 space-y-6">
          <p>{doc.intro}</p>
          {doc.sections.map((s, i) => (
            <section key={s.heading} aria-labelledby={`policy-${i}`}>
              <h2 id={`policy-${i}`} className="t-h3">
                {s.heading}
              </h2>
              {s.body.map((part, j) =>
                Array.isArray(part) ? (
                  <ul key={j} className="mt-2 list-disc space-y-1 pl-6">
                    {part.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={j} className="mt-2">
                    {part}
                  </p>
                ),
              )}
            </section>
          ))}
        </div>

        <section aria-labelledby="policy-contact" className="mt-8 rounded-card bg-champagne p-5">
          <h2 id="policy-contact" className="t-h3">
            {t('policy.contactTitle')}
          </h2>
          <BusinessDetails className="mt-2 space-y-1" />
        </section>

        <nav aria-labelledby="policy-others" className="mt-8">
          <h2 id="policy-others" className="font-bold">
            {t('policy.others')}
          </h2>
          <ul className="mt-1 flex flex-wrap gap-x-6">
            {POLICY_PAGES.filter((p) => p !== page).map((p) => (
              <li key={p}>
                <Link to={`/${p}`} className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
                  {t(`policy.${p}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </Container>
  )
}

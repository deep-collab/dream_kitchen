import { useEffect, useState } from 'react'
import { I18nScope, useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { site } from '../config/site'
import { loadKannadaFonts } from '../config/fonts'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Chip from '../components/ui/Chip'
import RadioCardGroup from '../components/ui/RadioCard'
import Toggle from '../components/ui/Toggle'
import QuantityStepper from '../components/ui/QuantityStepper'
import TextField, { PhoneField } from '../components/ui/TextField'
import Badge from '../components/ui/Badge'
import Notice from '../components/ui/Notice'
import SectionHeading from '../components/ui/SectionHeading'
import Sheet from '../components/ui/Sheet'
import LanguageToggle from '../components/ui/LanguageToggle'
import Wordmark from '../components/brand/Wordmark'
import * as Icons from '../components/icons'
import ProductArt, { ART_KINDS } from '../components/art/ProductArt'

// Dev-only QA page (see App.jsx). Shows every component in English and Kannada.
const SWATCHES = [
  ['ink', '#0F0F0F', 'text-cream'],
  ['gold', '#C9A227', 'text-ink'],
  ['champagne', '#F3E7CF', 'text-brown'],
  ['cream', '#FFF9EF', 'text-brown'],
  ['brown', '#2A1D16', 'text-cream'],
  ['muted', '#CDBF9E', 'text-ink'],
  ['brown-2', '#5C4A3F', 'text-cream'],
  ['line', '#E6D7BA', 'text-brown'],
  ['whatsapp', '#1A7A43', 'text-white'],
  ['error', '#A1281E', 'text-white'],
]

function Section({ title, children, dark = false }) {
  return (
    <section className={`border-t border-line py-10 ${dark ? 'on-dark -mx-[var(--gutter)] bg-ink px-[var(--gutter)] text-cream' : ''}`}>
      <h2 className="t-h2 mb-6">{title}</h2>
      {children}
    </section>
  )
}

function Demo() {
  const { t } = useI18n()
  const [size, setSize] = useState('s250')
  const [flavours, setFlavours] = useState(['chocolate'])
  const [named, setNamed] = useState(true)
  const [qty, setQty] = useState(1)
  const [sheet, setSheet] = useState(false)
  const toggleFlavour = (f) => setFlavours((list) => (list.includes(f) ? list.filter((x) => x !== f) : [...list, f]))
  const s = (k) => t(`styleguide.${k}`)

  return (
    <>
      <Section title={s('sections.type')}>
        <div className="space-y-4">
          <p className="t-h1">{s('typeSample')}</p>
          <p className="t-h2">{s('headingTitle')}</p>
          <p className="t-h3">{s('headingTitle')}</p>
          <p className="t-lead">{s('headingLead')}</p>
          <p>{s('headingLead')}</p>
          <p className="t-small">{s('nameHint')}</p>
          <p className="t-price">₹1,499</p>
          <SectionHeading title={s('headingTitle')} lead={s('headingLead')} />
        </div>
      </Section>

      <Section title={s('sections.buttons')}>
        <p className="mb-3 font-bold">{s('onLight')}</p>
        <div className="flex flex-wrap gap-3">
          <Button>{s('buttons.primary')}</Button>
          <Button variant="secondary">{s('buttons.secondary')}</Button>
          <Button variant="call">{s('buttons.call')}</Button>
          <Button variant="whatsapp">{s('buttons.whatsapp')}</Button>
          <Button disabled>{s('buttons.disabled')}</Button>
        </div>
        <div className="mt-4 grid max-w-md gap-3">
          <Button size="lg" fullWidth>
            {s('buttons.primary')}
          </Button>
          <Button variant="call" size="lg" fullWidth>
            {s('buttons.call')}
          </Button>
        </div>
        <div className="mt-4 flex gap-3">
          <IconButton icon={Icons.CloseIcon} label={t('common.close')} />
          <IconButton icon={Icons.CloseIcon} label={t('common.close')} showLabel />
        </div>
        <div className="on-dark mt-8 rounded-card bg-ink p-6 text-cream">
          <p className="mb-3 font-bold">{s('onDark')}</p>
          <div className="flex flex-wrap gap-3">
            <Button>{s('buttons.primary')}</Button>
            <Button variant="secondary">{s('buttons.secondary')}</Button>
            <Button variant="call">{s('buttons.call')}</Button>
            <Button variant="whatsapp">{s('buttons.whatsapp')}</Button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <LanguageToggle />
            <LanguageToggle variant="compact" />
            <LanguageToggle size="lg" />
          </div>
        </div>
      </Section>

      <Section title={s('sections.controls')}>
        <div className="grid gap-8 lg:grid-cols-2">
          <RadioCardGroup
            legend={s('sizeLegend')}
            value={size}
            onChange={setSize}
            options={[
              { value: 's250', label: s('sizes.s250'), price: 549 },
              { value: 's500', label: s('sizes.s500'), price: 999 },
              { value: 's750', label: s('sizes.s750'), price: 1499 },
            ]}
          />
          <div className="space-y-6">
            <fieldset>
              <legend className="mb-3 font-bold">{s('flavourLegend')}</legend>
              <div className="flex flex-wrap gap-2">
                {['chocolate', 'strawberry', 'mango', 'butterscotch'].map((f) => (
                  <Chip key={f} selected={flavours.includes(f)} onClick={() => toggleFlavour(f)}>
                    {s(`flavours.${f}`)}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <Toggle label={s('nameToggle')} description={s('nameToggleDesc')} checked={named} onChange={setNamed} onText={s('on')} offText={s('off')} />
            <QuantityStepper value={qty} onChange={setQty} />
          </div>
        </div>
      </Section>

      <Section title={s('sections.fields')}>
        <div className="grid gap-6 lg:grid-cols-2">
          <TextField label={s('name')} hint={s('nameHint')} maxLength={20} defaultValue="Amma" />
          <PhoneField label={s('phone')} defaultValue="98765" error={s('phoneError')} />
          <TextField as="textarea" rows={2} label={s('note')} optional />
          <TextField as="select" label={s('time')} defaultValue="evening">
            {['morning', 'afternoon', 'evening'].map((k) => (
              <option key={k} value={k}>
                {s(`times.${k}`)}
              </option>
            ))}
          </TextField>
        </div>
      </Section>

      <Section title={s('sections.display')}>
        <div className="flex flex-wrap gap-2">
          <Badge>{s('badges.signature')}</Badge>
          <Badge>{s('badges.top')}</Badge>
          <Badge tone="soft">{s('badges.soldOut')}</Badge>
        </div>
        <Notice className="mt-6 max-w-xl">
          <p>{t('notice.prebook', { days: site.ordering.dispatchBusinessDays })}</p>
        </Notice>
        <hr className="rule-gold mt-8" />
      </Section>

      <Section title={s('sections.overlay')}>
        <Button onClick={() => setSheet(true)}>{s('sheetOpen')}</Button>
        <Sheet
          open={sheet}
          onClose={() => setSheet(false)}
          title={s('sheetTitle')}
          footer={
            <>
              <Button size="lg" fullWidth onClick={() => setSheet(false)}>
                {s('sheetAdd')}
              </Button>
              <p className="t-small mt-2 text-center text-brown-2">
                <a className="link inline-flex min-h-12 items-center" href={`tel:${site.phone.tel}`}>
                  {s('sheetCall').replace('{phone}', site.phone.short)}
                </a>
              </p>
            </>
          }
        >
          <p>{s('sheetBody')}</p>
          <div className="mt-6">
            <RadioCardGroup
              legend={s('sizeLegend')}
              value={size}
              onChange={setSize}
              options={[
                { value: 's250', label: s('sizes.s250'), price: 549 },
                { value: 's500', label: s('sizes.s500'), price: 999 },
                { value: 's750', label: s('sizes.s750'), price: 1499 },
              ]}
            />
          </div>
          <div className="mt-6">
            <Toggle label={s('nameToggle')} checked={named} onChange={setNamed} onText={s('on')} offText={s('off')} />
          </div>
          <div className="mt-6">
            <QuantityStepper value={qty} onChange={setQty} />
          </div>
        </Sheet>
      </Section>
    </>
  )
}

export default function Styleguide() {
  useSeo('styleguide')
  const { t } = useI18n()

  useEffect(() => {
    loadKannadaFonts()
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <Container className="py-10">
      <h1 className="t-h1">{t('styleguide.title')}</h1>
      <p className="t-lead mt-2 text-brown-2">{t('styleguide.intro')}</p>

      <Section title={t('styleguide.sections.colours')}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SWATCHES.map(([name, hex, text]) => (
            <li key={name} className={`rounded-card border border-line p-4 ${text}`} style={{ background: hex }}>
              <span className="block font-bold">{name}</span>
              <span className="t-small">{hex}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-card p-6" style={{ background: 'var(--gold-gradient)' }} />
      </Section>

      <Section title={t('styleguide.sections.brand')} dark>
        <div className="flex flex-wrap items-end gap-12">
          <Wordmark />
          <Wordmark variant="stacked" size="sm" />
          <Wordmark variant="stacked" />
        </div>
      </Section>

      <Section title={t('styleguide.sections.art')}>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ART_KINDS.map((kind, i) => (
            <li key={kind}>
              <ProductArt kind={kind} variant={i} rounded="rounded-card" className="w-full" />
              <span className="t-small mt-1 block text-brown-2">{kind}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('styleguide.sections.icons')}>
        <ul className="flex flex-wrap gap-4">
          {Object.entries(Icons)
            .filter(([name]) => name.endsWith('Icon'))
            .map(([name, Icon]) => (
              <li key={name} title={name} className="grid h-12 w-12 place-items-center rounded-control border border-line">
                <Icon className="h-6 w-6" />
              </li>
            ))}
        </ul>
      </Section>

      <div className="grid gap-x-12 xl:grid-cols-2">
        <div lang="en">
          <I18nScope lang="en">
            <p className="t-h3 mt-10 text-brown-2">English</p>
            <Demo />
          </I18nScope>
        </div>
        <div lang="kn">
          <I18nScope lang="kn">
            <p className="t-h3 mt-10 text-brown-2">ಕನ್ನಡ</p>
            <Demo />
          </I18nScope>
        </div>
      </div>
    </Container>
  )
}

import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useAsync } from '../hooks/useAsync'
import { getProducts } from '../services'
import { site } from '../config/site'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import { InstagramIcon } from '../components/Icons'

export default function Gallery() {
  useSeo('gallery')
  const { t, pick } = useI18n()
  const { data: list = [] } = useAsync(() => getProducts(), [])
  return (
    <>
      <PageHero title={t('gallery.title')} subtitle={t('gallery.subtitle')} />
      <div className="container-dk py-8 sm:py-12">
        <ul className="columns-2 gap-3 sm:gap-5 lg:columns-3">
          {list.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 3) * 60} className="mb-3 break-inside-avoid sm:mb-5">
              <figure className="card overflow-hidden">
                <img src={p.image} alt={pick(p.name)} loading="lazy" width="400" height="400" className={`w-full object-cover ${i % 3 === 1 ? 'aspect-[4/5]' : 'aspect-square'}`} />
                <figcaption className="px-3 py-2.5 text-[0.95rem] font-bold text-dark">{pick(p.name)}</figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
        <div className="mt-8 text-center">
          <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <InstagramIcon /> {t('gallery.follow')}
          </a>
        </div>
      </div>
    </>
  )
}

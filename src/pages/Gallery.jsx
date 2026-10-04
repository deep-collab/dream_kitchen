import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useAsync } from '../hooks/useAsync'
import { getGalleryPhotos } from '../services'
import { site } from '../config/site'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import { InstagramIcon } from '../components/icons'

/**
 * Real photos arrive with the admin panel (Stage B: services.getGalleryPhotos).
 * Until then the page says so plainly and points to Instagram. Illustrations are
 * never passed off as photos.
 * photo: { id, src, alt: {en, kn}, width, height }
 */
export default function Gallery() {
  useSeo('gallery')
  const { t, pick } = useI18n()
  const { data: photos } = useAsync(() => getGalleryPhotos(), [])

  return (
    <>
      <PageHero title={t('gallery.title')} subtitle={photos?.length ? null : t('gallery.subtitle')} />
      <Container className="py-12 lg:py-16">
        {photos?.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {photos.map((p) => (
              <li key={p.id}>
                <img src={p.src} alt={pick(p.alt)} width={p.width} height={p.height} loading="lazy" decoding="async" className="block aspect-square h-auto w-full rounded-card object-cover" />
              </li>
            ))}
          </ul>
        ) : (
          <section aria-labelledby="gallery-empty" className="flex max-w-[40rem] flex-col gap-5 rounded-card border border-line bg-champagne p-6 sm:p-8">
            <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-ink text-gold">
              <InstagramIcon className="h-7 w-7" />
            </span>
            <div>
              <h2 id="gallery-empty" className="t-h2">
                {t('gallery.emptyTitle')}
              </h2>
              <p className="t-lead mt-3 text-brown-2">{t('gallery.emptyText')}</p>
              <p className="mt-2 font-bold break-all">{site.instagram.handle}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href={site.instagram.url} icon={InstagramIcon} size="lg" aria-label={`${t('gallery.follow')} ${t('common.newTab')}`}>
                {t('gallery.follow')}
              </Button>
              <Button to="/shop" variant="secondary" size="lg">
                {t('gallery.browse')}
              </Button>
            </div>
          </section>
        )}
      </Container>
    </>
  )
}

import { useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { site } from '../config/site'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// The page's address on the main domain (site.url), whichever address it was opened on
// (www, the netlify.app address): Google lists one address per page, and shared links use it.
function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

// useSeo('home') reads seo.home.title / seo.home.desc; or pass {title, desc} directly.
// noindex: for the 404 page. Netlify answers every unknown address with the site (status 200,
// see public/_redirects), so this tells search engines not to list it.
export function useSeo(page, override, { noindex = false } = {}) {
  const { t } = useI18n()
  const title = override?.title || t(`seo.${page}.title`)
  const desc = override?.desc || t(`seo.${page}.desc`)
  useEffect(() => {
    document.title = title
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', desc)
    const href = site.url.replace(/\/$/, '') + window.location.pathname
    setMeta('property', 'og:url', href)
    setCanonical(href)
    if (noindex) setMeta('name', 'robots', 'noindex')
    else document.head.querySelector('meta[name="robots"]')?.remove()
  }, [title, desc, noindex])
}
